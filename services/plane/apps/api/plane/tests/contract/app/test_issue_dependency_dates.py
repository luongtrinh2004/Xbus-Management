from datetime import date
from unittest.mock import patch

import pytest

from plane.db.models import Issue, IssueRelation, Project, ProjectMember, State
from plane.utils.issue_dependency_dates import dependency_date_conflicts, suggested_dependent_dates


@pytest.fixture
def schedule(workspace, create_user):
    project = Project.objects.create(workspace=workspace, name="Schedule", identifier="SCH")
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    state = State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted", default=True)
    blocker = Issue.objects.create(
        workspace=workspace, project=project, state=state, name="Blocker", target_date=date(2026, 10, 19)
    )
    dependent = Issue.objects.create(
        workspace=workspace,
        project=project,
        state=state,
        name="Dependent",
        start_date=date(2026, 10, 20),
        target_date=date(2026, 10, 24),
    )
    IssueRelation.objects.create(
        workspace=workspace, project=project, issue=dependent, related_issue=blocker, relation_type="blocked_by"
    )
    return project, blocker, dependent


def task_url(issue):
    return f"/api/workspaces/{issue.workspace.slug}/projects/{issue.project_id}/issues/{issue.id}/"


def bulk_url(issue):
    return f"/api/workspaces/{issue.workspace.slug}/projects/{issue.project_id}/issue-dates/"


@pytest.mark.contract
@pytest.mark.django_db
class TestDependencyDatePreview:
    def test_suggested_shift_keeps_duration(self):
        assert suggested_dependent_dates(date(2026, 10, 27), date(2026, 10, 20), date(2026, 10, 24)) == (
            date(2026, 10, 27),
            date(2026, 10, 31),
        )

    def test_single_preview_does_not_save_or_send_activity(self, schedule, session_client):
        _, blocker, _ = schedule
        with patch("plane.app.views.issue.base.issue_activity") as activity:
            response = session_client.patch(
                task_url(blocker) + "?preview_dependency_dates=1", {"target_date": "2026-10-27"}, format="json"
            )
        assert response.status_code == 200, response.data
        assert response.data["conflicts"][0]["suggested_target_date"] == "2026-10-31"
        blocker.refresh_from_db()
        assert blocker.target_date == date(2026, 10, 19)
        activity.delay.assert_not_called()

    def test_batch_compares_proposed_dates_together(self, schedule, session_client):
        _, blocker, dependent = schedule
        response = session_client.post(
            bulk_url(blocker) + "?preview_dependency_dates=1",
            {
                "updates": [
                    {"id": str(blocker.id), "target_date": "2026-10-27"},
                    {"id": str(dependent.id), "start_date": "2026-10-27", "target_date": "2026-10-31"},
                ]
            },
            format="json",
        )
        assert response.status_code == 200, response.data
        assert response.data["conflicts"] == []
        blocker.refresh_from_db()
        assert blocker.target_date == date(2026, 10, 19)

    def test_preview_omits_inaccessible_dependent_metadata(self, schedule, session_client, create_user):
        project, blocker, dependent = schedule
        hidden = Project.objects.create(workspace=project.workspace, name="Secret", identifier="SEC")
        hidden_state = State.objects.create(
            workspace=project.workspace, project=hidden, name="Todo", group="unstarted", default=True
        )
        Issue.objects.filter(pk=dependent.pk).update(project=hidden, state=hidden_state, name="Private task name")
        response = session_client.patch(
            task_url(blocker) + "?preview_dependency_dates=1", {"target_date": "2026-10-27"}, format="json"
        )
        assert response.status_code == 200, response.data
        assert response.data["conflicts"] == []
        assert "Private task" not in str(response.data)

    def test_inactive_membership_cannot_reveal_dependency(self, schedule, create_user):
        project, blocker, _ = schedule
        ProjectMember.objects.filter(project=project, member=create_user).update(is_active=False)
        assert (
            dependency_date_conflicts(
                project.workspace_id, {str(blocker.id): {"target_date": date(2026, 10, 27)}}, create_user
            )
            == []
        )

    def test_invalid_date_preview_rejected(self, schedule, session_client):
        _, _, dependent = schedule
        response = session_client.patch(
            task_url(dependent) + "?preview_dependency_dates=1", {"start_date": "2026-11-01"}, format="json"
        )
        assert response.status_code == 400

    def test_clearing_date_batch_is_supported(self, schedule, session_client):
        _, _, dependent = schedule
        response = session_client.post(
            bulk_url(dependent), {"updates": [{"id": str(dependent.id), "start_date": None}]}, format="json"
        )
        assert response.status_code == 200, response.data
        dependent.refresh_from_db()
        assert dependent.start_date is None

    def test_invalid_batch_is_atomic(self, schedule, session_client):
        _, blocker, dependent = schedule
        response = session_client.post(
            bulk_url(blocker),
            {
                "updates": [
                    {"id": str(blocker.id), "target_date": "2026-10-21"},
                    {"id": str(dependent.id), "start_date": "2026-11-01"},
                ]
            },
            format="json",
        )
        assert response.status_code == 400
        blocker.refresh_from_db()
        assert blocker.target_date == date(2026, 10, 19)

    @pytest.mark.parametrize("updates", [[{}], "bad", [{"id": "bad", "start_date": "2026-10-20"}]])
    def test_malformed_batch_is_400(self, schedule, session_client, updates):
        _, blocker, _ = schedule
        assert session_client.post(bulk_url(blocker), {"updates": updates}, format="json").status_code == 400
