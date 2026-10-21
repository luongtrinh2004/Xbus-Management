import json
from uuid import uuid4

import pytest

from plane.bgtasks.notification_task import extract_mentions_as_subscribers, notifications
from plane.db.models import (
    Issue,
    IssueSubscriber,
    Notification,
    Project,
    ProjectMember,
    State,
    User,
    WorkspaceMember,
    UserNotificationPreference,
)


@pytest.fixture
def notification_setup(workspace, create_user):
    project = Project.objects.create(workspace=workspace, name="Notifications", identifier="NOTE")
    state = State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted", default=True)
    ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=20)
    issue = Issue.objects.create(workspace=workspace, project=project, state=state, name="Visible task")
    Issue.objects.filter(pk=issue.pk).update(created_by=create_user)
    issue.refresh_from_db()
    username = uuid4().hex
    watcher = User.objects.create(username=username, email=f"{username}@example.test")
    WorkspaceMember.objects.create(workspace=workspace, member=watcher, role=15)
    ProjectMember.objects.create(workspace=workspace, project=project, member=watcher, role=15)
    IssueSubscriber.objects.create(workspace=workspace, project=project, issue=issue, subscriber=watcher)
    UserNotificationPreference.objects.update_or_create(user=watcher, defaults={"property_change": False})
    return issue, watcher


def run_notifications(issue, actor):
    notifications.run(
        type="issue.activity.updated",
        issue_id=str(issue.id),
        project_id=str(issue.project_id),
        actor_id=str(actor.id),
        subscriber=False,
        requested_data=json.dumps({"name": "Updated"}),
        current_instance=json.dumps({"name": "Before"}),
        issue_activities_created=json.dumps(
            [
                {
                    "id": str(uuid4()),
                    "field": "name",
                    "verb": "updated",
                    "comment": "Changed task name",
                    "issue_detail": {"id": str(issue.id)},
                    "actor_id": str(actor.id),
                    "new_value": "Updated",
                    "old_value": "Before",
                }
            ]
        ),
    )


@pytest.mark.contract
@pytest.mark.django_db
class TestNotificationVisibility:
    def test_active_subscriber_receives_notification(self, notification_setup, create_user):
        issue, watcher = notification_setup
        run_notifications(issue, create_user)
        assert Notification.objects.filter(receiver=watcher).count() == 1

    @pytest.mark.parametrize("revoked", ["account", "workspace", "project", "guest"])
    def test_revoked_access_gets_no_notification(self, notification_setup, create_user, revoked):
        issue, watcher = notification_setup
        if revoked == "account":
            User.objects.filter(pk=watcher.pk).update(is_active=False)
        elif revoked == "workspace":
            WorkspaceMember.objects.filter(workspace=issue.workspace, member=watcher).update(is_active=False)
        elif revoked == "project":
            ProjectMember.objects.filter(project=issue.project, member=watcher).update(is_active=False)
        else:
            ProjectMember.objects.filter(project=issue.project, member=watcher).update(role=5)
            Project.objects.filter(pk=issue.project_id).update(guest_view_all_features=False)
        run_notifications(issue, create_user)
        assert not Notification.objects.filter(receiver=watcher).exists()

    def test_mentions_cannot_resubscribe_a_revoked_member(self, notification_setup):
        issue, watcher = notification_setup
        IssueSubscriber.objects.filter(issue=issue, subscriber=watcher).delete()
        WorkspaceMember.objects.filter(workspace=issue.workspace, member=watcher).update(is_active=False)
        assert extract_mentions_as_subscribers(issue.project_id, issue.id, [str(watcher.id)]) == []

    def test_eligible_mention_is_added_once_to_pending_subscribers(self, notification_setup):
        issue, watcher = notification_setup
        IssueSubscriber.objects.filter(issue=issue, subscriber=watcher).delete()
        pending = extract_mentions_as_subscribers(issue.project_id, issue.id, [str(watcher.id)])
        assert [str(row.subscriber_id) for row in pending] == [str(watcher.id)]
