from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from plane.app.views.my_task_planning import UserPlanSerializer
from plane.db.models import Issue, IssueAssignee, IssueUserPlan, Project, ProjectMember, State, User, WorkspaceMember


@pytest.fixture
def planning_issue(workspace, create_user):
    project = Project.objects.create(name="Planning", identifier="PLN", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=15)
    state = State.objects.create(name="Todo", group="unstarted", default=True, project=project, workspace=workspace)
    issue = Issue(name="My task", project=project, workspace=workspace, state=state,
                  start_date="2026-10-20", target_date="2026-10-23")
    issue.save(created_by_id=create_user.id)
    assign(issue, create_user)
    return issue


def assign(issue, user):
    IssueAssignee.objects.create(issue=issue, assignee=user, project=issue.project, workspace=issue.workspace)


def planning_url(issue, detail=False):
    url = f"/api/workspaces/{issue.workspace.slug}/my-tasks/planning/"
    return f"{url}{issue.id}/" if detail else url


def member(issue, role=15):
    key = str(uuid4())
    user = User.objects.create(email=f"{key}@example.com", username=key)
    WorkspaceMember.objects.create(workspace=issue.workspace, member=user, role=15)
    ProjectMember.objects.create(project=issue.project, workspace=issue.workspace, member=user, role=role)
    return user


@pytest.mark.contract
@pytest.mark.django_db
class TestMyTaskPlanning:
    def test_default_group_without_creating_metadata(self, session_client, planning_issue, create_user):
        response = session_client.get(planning_url(planning_issue))
        assert response.status_code == 200, response.data
        result = response.data["results"][0]
        assert str(result["issue"]["id"]) == str(planning_issue.id)
        assert result["bucket"] == "recently_assigned"
        assert str(create_user.id) in result["issue"]["assignee_ids"]
        assert response.data["next_cursor"] is None
        assert not IssueUserPlan.objects.exists()

    def test_move_persists_without_changing_task_dates_state_or_shared_order(self, session_client, planning_issue, create_user):
        old = Issue.objects.values("state_id", "start_date", "target_date", "sort_order", "updated_at").get(id=planning_issue.id)
        url = planning_url(planning_issue, detail=True)
        response = session_client.patch(url, {"bucket": "today", "sort_order": 100}, format="json")
        assert response.status_code == 200, response.data
        assert response.data["bucket"] == "today"
        assert Issue.objects.values(*old).get(id=planning_issue.id) == old
        assert session_client.patch(url, {"bucket": "later", "sort_order": 200}, format="json").status_code == 200
        row = IssueUserPlan.objects.get(user=create_user, issue=planning_issue)
        assert row.bucket == "later"
        assert IssueUserPlan.objects.count() == 1
        assert session_client.get(planning_url(planning_issue)).data["results"][0]["bucket"] == "later"

    def test_plan_is_private_to_each_assignee(self, session_client, planning_issue):
        other = member(planning_issue)
        assign(planning_issue, other)
        body = {"bucket": "today", "sort_order": 100}
        assert session_client.patch(planning_url(planning_issue, True), body, format="json").status_code == 200
        client = APIClient()
        client.force_authenticate(user=other)
        assert client.get(planning_url(planning_issue)).data["results"][0]["bucket"] == "recently_assigned"
        assert client.patch(planning_url(planning_issue, True), {"bucket": "later", "sort_order": 50}, format="json").status_code == 200
        assert session_client.get(planning_url(planning_issue)).data["results"][0]["bucket"] == "today"

    def test_other_members_tasks_cannot_be_read_or_moved(self, planning_issue):
        other = member(planning_issue)
        client = APIClient()
        client.force_authenticate(user=other)
        assert client.get(planning_url(planning_issue)).data["results"] == []
        assert client.patch(planning_url(planning_issue, True), {"bucket": "today", "sort_order": 0}, format="json").status_code == 404
        assert not IssueUserPlan.objects.exists()

    @pytest.mark.parametrize("scope", ["workspace", "project", "unassigned", "archived_issue", "archived_project", "draft"])
    def test_lost_access_removes_tasks_and_rejects_moves(self, session_client, planning_issue, create_user, scope):
        if scope == "workspace":
            WorkspaceMember.objects.filter(member=create_user).update(is_active=False)
        elif scope == "project":
            ProjectMember.objects.filter(member=create_user).update(is_active=False)
        elif scope == "unassigned":
            IssueAssignee.objects.filter(issue=planning_issue).delete()
        elif scope == "archived_issue":
            Issue.objects.filter(id=planning_issue.id).update(archived_at=timezone.now().date())
        elif scope == "archived_project":
            Project.objects.filter(id=planning_issue.project_id).update(archived_at=timezone.now())
        else:
            Issue.objects.filter(id=planning_issue.id).update(is_draft=True)
        response = session_client.get(planning_url(planning_issue))
        if scope == "workspace":
            assert response.status_code == 403
        else:
            assert response.status_code == 200
            assert response.data["results"] == []
        assert session_client.patch(planning_url(planning_issue, True), {"bucket": "today", "sort_order": 0}, format="json").status_code in (403, 404)

    @pytest.mark.parametrize("body", [{}, [], {"bucket": "other", "sort_order": 0}, {"bucket": "today", "sort_order": 1e16}, {"bucket": "today", "sort_order": "bad"}])
    def test_invalid_move_keeps_plan(self, session_client, planning_issue, body):
        assert session_client.patch(planning_url(planning_issue, True), body, format="json").status_code == 400
        assert not IssueUserPlan.objects.exists()

    def test_nonfinite_order_rejected(self):
        for value in (float("nan"), float("inf"), float("-inf")):
            assert not UserPlanSerializer(data={"bucket": "today", "sort_order": value}).is_valid()

    def test_guest_visibility_preserved(self, planning_issue):
        guest = member(planning_issue, role=5)
        assign(planning_issue, guest)
        Project.objects.filter(id=planning_issue.project_id).update(guest_view_all_features=False)
        client = APIClient()
        client.force_authenticate(user=guest)
        assert client.get(planning_url(planning_issue)).data["results"] == []
        assert client.patch(planning_url(planning_issue, True), {"bucket": "today", "sort_order": 0}, format="json").status_code == 404
        planning_issue.save(created_by_id=guest.id)
        assert len(client.get(planning_url(planning_issue)).data["results"]) == 1
        assert client.patch(planning_url(planning_issue, True), {"bucket": "today", "sort_order": 0}, format="json").status_code == 200

    def test_completed_filter_and_cursor_validation(self, session_client, planning_issue):
        done = State.objects.create(name="Done", group="completed", project=planning_issue.project, workspace=planning_issue.workspace)
        planning_issue.state = done
        planning_issue.save()
        assert session_client.get(planning_url(planning_issue)).data["results"] == []
        assert len(session_client.get(planning_url(planning_issue), {"include_completed": "true"}).data["results"]) == 1
        assert session_client.get(planning_url(planning_issue), {"cursor": "bad"}).status_code == 400

    def test_pagination_has_no_duplicates_and_keeps_every_assigned_task(self, session_client, planning_issue, create_user):
        issues = [Issue(id=uuid4(), name=f"Task {index}", sequence_id=index + 2, project=planning_issue.project,
                        workspace=planning_issue.workspace, state=planning_issue.state) for index in range(102)]
        Issue.objects.bulk_create(issues)
        IssueAssignee.objects.bulk_create([IssueAssignee(issue=issue, assignee=create_user, project=issue.project, workspace=issue.workspace) for issue in issues])
        first = session_client.get(planning_url(planning_issue)).data
        assert len(first["results"]) == 100
        second = session_client.get(planning_url(planning_issue), {"cursor": first["next_cursor"]}).data
        ids = [str(row["issue"]["id"]) for row in first["results"] + second["results"]]
        assert len(ids) == len(set(ids)) == 103
        assert second["next_cursor"] is None
