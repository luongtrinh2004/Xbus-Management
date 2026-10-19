# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date, datetime, timezone
from unittest.mock import patch

import pytest

from plane.db.models import (
    Issue, IssueAssignee, IssueDueReminder, IssueSubscriber, Notification, Project, ProjectMember,
    State, User, WorkspaceMember,
)


@pytest.fixture
def reminder_project(workspace, create_user):
    workspace.slug = "xbus-office"
    workspace.save()
    project = Project.objects.create(name="Reminder project", identifier="REM", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    State.objects.create(name="Todo", group="unstarted", default=True, project=project, workspace=workspace)
    return project


@pytest.fixture
def due_issue(reminder_project, workspace, create_user):
    issue = Issue.objects.create(
        name="Prepare report", project=reminder_project, workspace=workspace,
        target_date=date(2026, 10, 20), created_by=create_user,
    )
    IssueAssignee.objects.create(
        issue=issue, project=reminder_project, workspace=workspace, assignee=create_user,
    )
    return issue


def run_reminders(now=None):
    from plane.bgtasks.issue_due_reminder_task import send_issue_due_reminders

    # 08:00 in Vietnam, with a different UTC calendar date covered separately.
    now = now or datetime(2026, 10, 19, 1, tzinfo=timezone.utc)
    with patch("plane.bgtasks.issue_due_reminder_task.timezone.now", return_value=now):
        return send_issue_due_reminders()


@pytest.mark.contract
@pytest.mark.django_db
class TestIssueDueReminders:
    def test_reminds_before_due_then_once_when_overdue(self, due_issue, create_user):
        assert run_reminders() == 1
        reminder = Notification.objects.get(receiver=create_user)
        assert reminder.triggered_by_id is None
        assert reminder.data["issue_activity"]["field"] == "due_soon"
        assert reminder.data["issue"]["id"] == str(due_issue.id)
        assert run_reminders() == 0
        assert run_reminders(datetime(2026, 10, 20, 1, tzinfo=timezone.utc)) == 0
        assert run_reminders(datetime(2026, 10, 21, 1, tzinfo=timezone.utc)) == 1
        assert run_reminders(datetime(2026, 10, 22, 1, tzinfo=timezone.utc)) == 0
        assert Notification.objects.count() == 2

    def test_uses_vietnam_date_at_utc_date_boundary(self, due_issue):
        # Oct 18 UTC is already Oct 19 in Vietnam.
        assert run_reminders(datetime(2026, 10, 18, 17, tzinfo=timezone.utc)) == 1

    @pytest.mark.parametrize("group", ["completed", "cancelled", "triage"])
    def test_skips_closed_or_intake_states(self, due_issue, group):
        state = State.objects.create(
            name=group, group=group, project=due_issue.project, workspace=due_issue.workspace,
        )
        due_issue.state = state
        due_issue.save()
        assert run_reminders() == 0

    @pytest.mark.parametrize("change", ["draft", "archived", "deleted", "project_archived", "project_deleted", "workspace_deleted", "no_date"])
    def test_skips_ineligible_issues(self, due_issue, change):
        if change == "draft":
            Issue.objects.filter(pk=due_issue.pk).update(is_draft=True)
        elif change == "archived":
            Issue.objects.filter(pk=due_issue.pk).update(archived_at=date(2026, 10, 18))
        elif change == "deleted":
            Issue.objects.filter(pk=due_issue.pk).update(deleted_at=datetime.now(timezone.utc))
        elif change == "project_archived":
            Project.objects.filter(pk=due_issue.project_id).update(archived_at=datetime.now(timezone.utc))
        elif change == "project_deleted":
            Project.objects.filter(pk=due_issue.project_id).update(deleted_at=datetime.now(timezone.utc))
        elif change == "workspace_deleted":
            type(due_issue.workspace).objects.filter(pk=due_issue.workspace_id).update(deleted_at=datetime.now(timezone.utc))
        else:
            Issue.objects.filter(pk=due_issue.pk).update(target_date=None)
        assert run_reminders() == 0

    @pytest.mark.parametrize("change", ["user_disabled", "project_left", "workspace_left", "assignee_removed"])
    def test_skips_recipients_without_access(self, due_issue, create_user, change):
        if change == "user_disabled":
            User.objects.filter(pk=create_user.pk).update(is_active=False)
        elif change == "project_left":
            ProjectMember.objects.filter(project=due_issue.project, member=create_user).update(is_active=False)
        elif change == "workspace_left":
            WorkspaceMember.objects.filter(workspace=due_issue.workspace, member=create_user).update(is_active=False)
        else:
            IssueAssignee.objects.filter(issue=due_issue).delete()
        assert run_reminders() == 0

    def test_only_assignees_receive_reminders(self, due_issue, create_user):
        other = User.objects.create(email="watcher@example.com", username="watcher")
        WorkspaceMember.objects.create(workspace=due_issue.workspace, member=other, role=15)
        ProjectMember.objects.create(project=due_issue.project, workspace=due_issue.workspace, member=other, role=15)
        IssueSubscriber.objects.create(issue=due_issue, project=due_issue.project, workspace=due_issue.workspace, subscriber=other)
        assert run_reminders() == 1
        assert list(Notification.objects.values_list("receiver_id", flat=True)) == [create_user.id]

    def test_rescheduled_date_gets_a_new_reminder(self, due_issue):
        assert run_reminders() == 1
        Issue.objects.filter(pk=due_issue.pk).update(target_date=date(2026, 10, 21))
        assert run_reminders(datetime(2026, 10, 20, 1, tzinfo=timezone.utc)) == 1

    def test_soft_deleted_notification_is_not_recreated(self, due_issue):
        assert run_reminders() == 1
        Notification.objects.all().delete()
        assert run_reminders() == 0

    def test_other_workspaces_are_not_affected(self, due_issue):
        workspace = due_issue.workspace
        workspace.slug = "another-office"
        workspace.save()
        assert run_reminders() == 0

    def test_multiple_assignees_each_receive_one_reminder(self, due_issue):
        other = User.objects.create(email="assignee2@example.com", username="assignee2")
        WorkspaceMember.objects.create(workspace=due_issue.workspace, member=other, role=15)
        ProjectMember.objects.create(project=due_issue.project, workspace=due_issue.workspace, member=other, role=15)
        IssueAssignee.objects.create(issue=due_issue, project=due_issue.project, workspace=due_issue.workspace, assignee=other)
        assert run_reminders() == 2
        assert run_reminders() == 0

    def test_future_issue_is_not_notified_early(self, due_issue):
        Issue.objects.filter(pk=due_issue.pk).update(target_date=date(2026, 10, 22))
        assert run_reminders() == 0

    def test_notification_can_be_opened_read_and_archived(self, due_issue, session_client):
        assert run_reminders() == 1
        root = f"/api/workspaces/{due_issue.workspace.slug}/users/notifications/"
        response = session_client.get(root)
        assert response.status_code == 200
        assert len(response.data) == 1
        notification = response.data[0]
        assert notification["triggered_by_details"] is None
        assert notification["is_inbox_issue"] is False
        assert notification["data"]["issue_activity"]["field"] == "due_soon"
        detail = f"{root}{notification['id']}/"
        assert session_client.post(f"{detail}read/").status_code == 200
        assert session_client.post(f"{detail}archive/").status_code == 200
        assert session_client.get(root).data == []
        assert run_reminders() == 0

    def test_office_timezone_is_configurable(self, due_issue, settings):
        settings.XBUS_WORK_TIME_ZONE = "UTC"
        assert run_reminders(datetime(2026, 10, 18, 17, tzinfo=timezone.utc)) == 0


    def test_hard_deleted_notification_does_not_resend(self, due_issue):
        assert run_reminders() == 1
        Notification.all_objects.all().delete()
        assert run_reminders() == 0
        assert IssueDueReminder.objects.count() == 1

    def test_notification_failure_rolls_back_delivery_marker(self, due_issue):
        with patch("plane.bgtasks.issue_due_reminder_task.Notification.objects.create", side_effect=RuntimeError("test failure")):
            with pytest.raises(RuntimeError, match="test failure"):
                run_reminders()
        assert IssueDueReminder.objects.count() == 0
        assert run_reminders() == 1

    def test_database_rejects_duplicate_delivery_markers(self, due_issue, create_user):
        from django.db import IntegrityError, transaction

        assert run_reminders() == 1
        with pytest.raises(IntegrityError), transaction.atomic():
            IssueDueReminder.objects.create(
                issue=due_issue, receiver=create_user, target_date=due_issue.target_date, kind="due_soon",
            )
        assert IssueDueReminder.objects.count() == 1

    def test_reminders_preserve_work_item_data(self, due_issue, create_user):
        assert run_reminders() == 1
        due_issue.refresh_from_db()
        assert due_issue.name == "Prepare report"
        assert due_issue.target_date == date(2026, 10, 20)
        assert due_issue.state.group == "unstarted"
        assert list(due_issue.assignees.values_list("id", flat=True)) == [create_user.id]
