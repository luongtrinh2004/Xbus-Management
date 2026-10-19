# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import timedelta
from zoneinfo import ZoneInfo

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.db.models import Exists, OuterRef
from django.utils import timezone

from plane.db.models import (
    Issue, IssueAssignee, IssueDueReminder, Notification, ProjectMember, User, WorkspaceMember,
)


@shared_task
def send_issue_due_reminders():
    """Notify active XBus assignees once per due date and reminder kind.

    Run hourly so a restarted worker can catch overdue work. Due dates are
    calendar dates in the office timezone, not rolling 24-hour intervals.
    Notifications and their deduplication keys are written atomically.
    """
    today = timezone.localdate(timezone.now(), ZoneInfo(settings.XBUS_WORK_TIME_ZONE))
    tomorrow = today + timedelta(days=1)
    candidates = Issue.issue_objects.filter(
        workspace__slug=settings.XBUS_WORKSPACE_SLUG,
        workspace__deleted_at__isnull=True,
        project__deleted_at__isnull=True,
        state__deleted_at__isnull=True,
        state__group__in=["backlog", "unstarted", "started"],
        target_date__lte=tomorrow,
    ).exclude(target_date=today)
    created_count = 0
    for issue_id in candidates.values_list("id", flat=True).iterator(chunk_size=500):
        with transaction.atomic():
            # Serialize concurrent scheduled runs and recheck eligibility after
            # acquiring the lock (the issue may have been completed/rescheduled).
            issue = candidates.select_for_update(of=("self",)).select_related(
                "project", "workspace", "state"
            ).filter(pk=issue_id).first()
            if issue is None:
                continue
            kind = "due_soon" if issue.target_date == tomorrow else "overdue"
            recipients = User.objects.filter(is_active=True, is_bot=False).annotate(
                assigned=Exists(IssueAssignee.objects.filter(issue=issue, assignee_id=OuterRef("pk"))),
                in_project=Exists(ProjectMember.objects.filter(
                    project_id=issue.project_id, member_id=OuterRef("pk"), is_active=True,
                )),
                in_workspace=Exists(WorkspaceMember.objects.filter(
                    workspace_id=issue.workspace_id, member_id=OuterRef("pk"), is_active=True,
                )),
            ).filter(assigned=True, in_project=True, in_workspace=True)
            title = "Công việc sắp đến hạn" if kind == "due_soon" else "Công việc đã quá hạn"
            for receiver in recipients.iterator(chunk_size=100):
                # Keep delivery history separate from notifications so the
                # notification retention/deletion policy cannot resend reminders.
                _, created = IssueDueReminder.objects.get_or_create(
                    issue=issue, receiver=receiver, target_date=issue.target_date, kind=kind,
                )
                if not created:
                    continue
                Notification.objects.create(
                    workspace_id=issue.workspace_id,
                    project_id=issue.project_id,
                    receiver_id=receiver.id,
                    entity_identifier=issue.id,
                    entity_name="issue",
                    sender=f"in_app:issue_due_reminder:{kind}",
                    title=title,
                    message=title,
                    data={
                        "issue": {
                            "id": str(issue.id),
                            "name": issue.name,
                            "identifier": issue.project.identifier,
                            "sequence_id": issue.sequence_id,
                            "state_name": issue.state.name,
                            "state_group": issue.state.group,
                            "project_id": str(issue.project_id),
                            "workspace_slug": issue.workspace.slug,
                        },
                        "issue_activity": {
                            "id": None,
                            "actor": None,
                            "field": kind,
                            "verb": "updated",
                            "new_value": issue.target_date.isoformat(),
                            "old_value": None,
                        },
                    },
                )
                created_count += 1
    return created_count
