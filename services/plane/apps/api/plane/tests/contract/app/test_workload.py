from datetime import date
from uuid import uuid4

import pytest
from rest_framework.test import APIClient

from plane.db.models import Issue, IssueAssignee, Project, ProjectMember, State, User, WorkspaceMember


@pytest.fixture
def workload_setup(workspace, create_user):
    project = Project.objects.create(workspace=workspace, name="Workload", identifier="LOAD")
    ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=20)
    todo = State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted", default=True)
    done = State.objects.create(workspace=workspace, project=project, name="Done", group="completed")
    username = uuid4().hex
    coworker = User.objects.create(username=username, email=f"{username}@example.test", display_name="Coworker")
    WorkspaceMember.objects.create(workspace=workspace, member=coworker, role=15)
    ProjectMember.objects.create(workspace=workspace, project=project, member=coworker, role=15)

    def task(name="Work", assignees=None, **fields):
        issue = Issue.objects.create(
            workspace=workspace, project=project, name=name, state=fields.pop("state", todo), **fields
        )
        for assignee in assignees or [create_user]:
            IssueAssignee.objects.create(workspace=workspace, project=project, issue=issue, assignee=assignee)
        return issue

    return project, todo, done, coworker, task


def url(workspace):
    return f"/api/workspaces/{workspace.slug}/workload/"


@pytest.mark.contract
@pytest.mark.django_db
class TestWorkspaceWorkload:
    def test_overlapping_weeks_multi_assignees_and_unscheduled(
        self, workspace, create_user, session_client, workload_setup
    ):
        _, _, done, coworker, task = workload_setup
        task(
            "spans two weeks",
            start_date=date(2026, 10, 20),
            target_date=date(2026, 10, 29),
            assignees=[create_user, coworker],
        )
        task("due only", target_date=date(2026, 10, 23))
        task("start only", start_date=date(2026, 10, 28))
        task("not scheduled")
        task("done excluded", state=done, target_date=date(2026, 10, 23))
        task("draft excluded", is_draft=True, target_date=date(2026, 10, 23))
        response = session_client.get(url(workspace), {"start": "2026-10-25", "weeks": 2})
        assert response.status_code == 200
        assert response.data["weeks"] == ["2026-10-19", "2026-10-26"]
        rows = {row["user_id"]: row for row in response.data["members"]}
        assert rows[str(create_user.id)]["counts"] == [2, 2]
        assert rows[str(create_user.id)]["unscheduled"] == 1
        assert rows[str(coworker.id)]["counts"] == [1, 1]

    def test_private_project_without_membership_not_counted(
        self, workspace, session_client, workload_setup, create_user
    ):
        _, _, _, coworker, _ = workload_setup
        hidden = Project.objects.create(workspace=workspace, name="Hidden", identifier="HID", network=0)
        state = State.objects.create(workspace=workspace, project=hidden, name="Todo", group="unstarted", default=True)
        issue = Issue.objects.create(
            workspace=workspace, project=hidden, state=state, name="Secret", target_date=date(2026, 10, 23)
        )
        IssueAssignee.objects.create(workspace=workspace, project=hidden, issue=issue, assignee=coworker)
        response = session_client.get(url(workspace), {"start": "2026-10-19", "weeks": 1})
        assert response.status_code == 200
        assert all(row["counts"] == [0] for row in response.data["members"])

    def test_guest_workspace_cannot_read_or_set_capacity(self, workspace, workload_setup):
        _, _, _, coworker, _ = workload_setup
        WorkspaceMember.objects.filter(workspace=workspace, member=coworker).update(role=5)
        client = APIClient()
        client.force_authenticate(coworker)
        assert client.get(url(workspace)).status_code == 403
        assert (
            client.put(url(workspace) + f"capacities/{coworker.id}/", {"weekly_limit": 5}, format="json").status_code
            == 403
        )

    def test_member_can_read_but_only_admin_can_change_limits(self, workspace, workload_setup):
        _, _, _, coworker, _ = workload_setup
        client = APIClient()
        client.force_authenticate(coworker)
        assert client.get(url(workspace)).status_code == 200
        assert (
            client.put(url(workspace) + f"capacities/{coworker.id}/", {"weekly_limit": 5}, format="json").status_code
            == 403
        )

    def test_capacity_is_persisted_and_other_preferences_preserved(self, workspace, workload_setup, session_client):
        _, _, _, coworker, _ = workload_setup
        member = WorkspaceMember.objects.get(workspace=workspace, member=coworker)
        member.view_props = {"filters": {"priority": "high"}, "unrelated": True}
        member.save()
        endpoint = url(workspace) + f"capacities/{coworker.id}/"
        for _ in range(2):
            assert session_client.put(endpoint, {"weekly_limit": 5}, format="json").status_code == 200
        member.refresh_from_db()
        assert member.view_props == {"filters": {"priority": "high"}, "unrelated": True, "workload_weekly_limit": 5}
        data = session_client.get(url(workspace)).data
        assert next(row for row in data["members"] if row["user_id"] == str(coworker.id))["weekly_limit"] == 5

    @pytest.mark.parametrize("limit", [0, -1, 1001, "oops", True, None])
    def test_bad_capacity_does_not_write(self, workspace, workload_setup, session_client, limit):
        _, _, _, coworker, _ = workload_setup
        response = session_client.put(
            url(workspace) + f"capacities/{coworker.id}/", {"weekly_limit": limit}, format="json"
        )
        assert response.status_code == 400

    @pytest.mark.parametrize("params", [{"weeks": 0}, {"weeks": 13}, {"start": "invalid"}])
    def test_invalid_period(self, workspace, session_client, params):
        assert session_client.get(url(workspace), params).status_code == 400

    def test_unknown_or_inactive_member_capacity_not_writable(self, workspace, workload_setup, session_client):
        _, _, _, coworker, _ = workload_setup
        assert (
            session_client.put(
                url(workspace) + f"capacities/{uuid4()}/", {"weekly_limit": 5}, format="json"
            ).status_code
            == 404
        )
        WorkspaceMember.objects.filter(workspace=workspace, member=coworker).update(is_active=False)
        assert (
            session_client.put(
                url(workspace) + f"capacities/{coworker.id}/", {"weekly_limit": 5}, format="json"
            ).status_code
            == 404
        )
