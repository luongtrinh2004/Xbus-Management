from datetime import date, timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from plane.db.models import (
    Issue,
    Project,
    ProjectMember,
    ProjectOverviewDetails,
    ProjectStatusUpdate,
    State,
    User,
    WorkspaceMember,
)


@pytest.fixture
def overview_setup(workspace, create_user):
    project = Project.objects.create(
        workspace=workspace, name="Overview project", identifier="OVR", description="User description"
    )
    ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=20)
    state = State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted", default=True)
    return project, state


def url(workspace, project, suffix="overview/"):
    return f"/api/workspaces/{workspace.slug}/projects/{project.pk}/{suffix}"


def report(**overrides):
    return {
        "client_request_id": str(uuid4()),
        "status": "on_track",
        "title": "Weekly report",
        "summary": "User-entered results",
        **overrides,
    }


def details(**overrides):
    return {
        "revision": 0,
        "start_date": "2026-10-01",
        "target_date": "2026-10-31",
        "links": [{"title": "My document", "url": "https://example.org/brief"}],
        **overrides,
    }


def other_user(workspace, project, role=15, workspace_role=15):
    unique = uuid4().hex
    user = User.objects.create(username=unique, email=f"{unique}@example.test", display_name="User name")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=workspace_role)
    ProjectMember.objects.create(workspace=workspace, project=project, member=user, role=role)
    client = APIClient()
    client.force_authenticate(user)
    return user, client


@pytest.mark.contract
@pytest.mark.django_db
class TestProjectOverview:
    def test_initial_overview_preserves_project_data(self, workspace, create_user, session_client, overview_setup):
        project, _ = overview_setup
        response = session_client.get(url(workspace, project))
        assert response.status_code == 200
        assert response.data["project"]["description"] == "User description"
        assert response.data["latest_update"] is None
        assert response.data["details"] == {"start_date": None, "target_date": None, "links": [], "revision": 0}
        assert response.data["can_edit"] is True
        assert response.data["members"][0]["user_id"] == str(create_user.pk)
        assert ProjectOverviewDetails.objects.count() == 0  # read has no side effects

    def test_save_dates_and_links_does_not_change_task_dates(self, workspace, session_client, overview_setup):
        project, state = overview_setup
        issue = Issue.objects.create(
            project=project, workspace=workspace, state=state, name="Task", target_date=date(2026, 10, 9)
        )
        response = session_client.put(url(workspace, project), details(), format="json")
        assert response.status_code == 200
        assert response.data["revision"] == 1
        assert response.data["links"] == details()["links"]
        assert session_client.get(url(workspace, project)).data["details"] == response.data
        issue.refresh_from_db()
        assert issue.target_date == date(2026, 10, 9)
        project.refresh_from_db()
        assert project.description == "User description"

    def test_stale_revision_does_not_overwrite(self, workspace, session_client, overview_setup):
        project, _ = overview_setup
        assert session_client.put(url(workspace, project), details(), format="json").status_code == 200
        response = session_client.put(url(workspace, project), details(links=[]), format="json")
        assert response.status_code == 409
        assert response.data["code"] == "overview_conflict"
        assert ProjectOverviewDetails.objects.get(project=project).links == details()["links"]
        assert (
            session_client.put(
                url(workspace, project), details(revision=1, links=[], start_date=None, target_date=None), format="json"
            ).status_code
            == 200
        )
        saved = ProjectOverviewDetails.objects.get(project=project)
        assert saved.links == [] and saved.start_date is None and saved.target_date is None and saved.revision == 2

    @pytest.mark.parametrize(
        "changes",
        [
            {"start_date": "2026-11-01"},
            {"start_date": "not a date"},
            {"revision": -1},
            {"links": [{"title": "Bad", "url": "javascript:alert(1)"}]},
            {"links": [{"title": "Bad", "url": "ftp://example.org/x"}]},
            {"links": [{"title": "", "url": "https://example.org"}]},
            {"links": [{"title": "ok", "url": "https://example.org"}] * 21},
            {"links": [{"title": "ok", "url": "https://example.org", "owner": "injected"}]},
            {"workspace_id": str(uuid4())},
            {"target_date": "bad"},
        ],
    )
    def test_invalid_details_do_not_write(self, workspace, session_client, overview_setup, changes):
        project, _ = overview_setup
        response = session_client.put(url(workspace, project), details(**changes), format="json")
        assert response.status_code == 400
        assert not ProjectOverviewDetails.objects.exists()

    @pytest.mark.parametrize("status", ["on_track", "at_risk", "off_track", "on_hold", "complete"])
    def test_report_statuses_and_latest_do_not_complete_tasks(
        self, workspace, session_client, create_user, overview_setup, status
    ):
        project, state = overview_setup
        issue = Issue.objects.create(project=project, workspace=workspace, state=state, name="Existing task")
        body = report(status=status)
        response = session_client.post(url(workspace, project, "status-updates/"), body, format="json")
        assert response.status_code == 201
        assert response.data["summary"] == body["summary"]
        assert response.data["author_id"] == str(create_user.pk)
        assert session_client.get(url(workspace, project)).data["latest_update"] == response.data
        issue.refresh_from_db()
        assert issue.state_id == state.pk
        assert Issue.objects.count() == 1

    def test_report_retry_is_idempotent_and_mismatch_rejected(self, workspace, session_client, overview_setup):
        project, _ = overview_setup
        endpoint = url(workspace, project, "status-updates/")
        body = report()
        first = session_client.post(endpoint, body, format="json")
        second = session_client.post(endpoint, body, format="json")
        assert (first.status_code, second.status_code) == (201, 200)
        assert first.data == second.data
        conflict = session_client.post(endpoint, {**body, "summary": "Edited"}, format="json")
        assert conflict.status_code == 409 and conflict.data["code"] == "report_request_conflict"
        assert ProjectStatusUpdate.objects.count() == 1

    def test_same_request_by_other_author_is_not_replayed(self, workspace, session_client, overview_setup):
        project, _ = overview_setup
        _, client = other_user(workspace, project)
        body = report()
        endpoint = url(workspace, project, "status-updates/")
        assert session_client.post(endpoint, body, format="json").status_code == 201
        assert client.post(endpoint, body, format="json").status_code == 409

    @pytest.mark.parametrize(
        "changes",
        [
            {"status": "bogus"},
            {"title": "   "},
            {"summary": ""},
            {"summary": "x" * 10001},
            {"title": "x" * 256},
            {"client_request_id": "bad"},
            {"author_id": str(uuid4())},
        ],
    )
    def test_invalid_report_does_not_write(self, workspace, session_client, overview_setup, changes):
        project, _ = overview_setup
        assert (
            session_client.post(
                url(workspace, project, "status-updates/"), report(**changes), format="json"
            ).status_code
            == 400
        )
        assert not ProjectStatusUpdate.objects.exists()

    def test_history_pagination_and_isolation(self, workspace, create_user, session_client, overview_setup):
        project, _ = overview_setup
        for index in range(23):
            ProjectStatusUpdate.objects.create(
                project=project, workspace=workspace, author=create_user, author_name="Name", **report(title=str(index))
            )
        first = session_client.get(url(workspace, project, "status-updates/"))
        second = session_client.get(url(workspace, project, "status-updates/"), {"page": 2})
        assert first.status_code == second.status_code == 200
        assert first.data["count"] == 23 and first.data["next_page"] == 2
        assert len(first.data["results"]) == 20 and len(second.data["results"]) == 3
        assert second.data["next_page"] is None
        assert not {row["id"] for row in first.data["results"]} & {row["id"] for row in second.data["results"]}
        assert first.data["results"][0]["title"] == "22"
        assert session_client.get(url(workspace, project)).data["latest_update"]["title"] == "22"
        assert session_client.get(url(workspace, project, "status-updates/"), {"page": 0}).status_code == 400
        other = Project.objects.create(workspace=workspace, name="Other", identifier="OTH")
        ProjectMember.objects.create(project=other, workspace=workspace, member=create_user, role=20)
        assert session_client.get(url(workspace, other, "status-updates/")).data["count"] == 0

    @pytest.mark.parametrize("revocation", ["workspace", "project", "account"])
    def test_inactive_members_cannot_read_or_write(self, workspace, overview_setup, revocation):
        project, _ = overview_setup
        user, client = other_user(workspace, project)
        if revocation == "workspace":
            WorkspaceMember.objects.filter(member=user).update(is_active=False)
        elif revocation == "project":
            ProjectMember.objects.filter(member=user).update(is_active=False)
        else:
            User.objects.filter(pk=user.pk).update(is_active=False)
            user.refresh_from_db()
        assert client.get(url(workspace, project)).status_code == 403
        assert client.get(url(workspace, project, "status-updates/")).status_code == 403
        assert client.post(url(workspace, project, "status-updates/"), report(), format="json").status_code == 403
        assert client.put(url(workspace, project), details(), format="json").status_code == 403

    def test_workspace_member_without_project_membership_denied(self, workspace, overview_setup):
        project, _ = overview_setup
        user, client = other_user(workspace, project)
        ProjectMember.objects.filter(member=user).delete(soft=False)
        assert client.get(url(workspace, project)).status_code == 403
        assert client.post(url(workspace, project, "status-updates/"), report(), format="json").status_code == 403

    def test_guest_read_policy_and_write_denied(self, workspace, overview_setup):
        project, _ = overview_setup
        _, client = other_user(workspace, project, role=5)
        assert client.get(url(workspace, project)).status_code == 403
        Project.objects.filter(pk=project.pk).update(guest_view_all_features=True)
        response = client.get(url(workspace, project))
        assert response.status_code == 200 and response.data["can_edit"] is False
        assert client.post(url(workspace, project, "status-updates/"), report(), format="json").status_code == 403
        assert client.put(url(workspace, project), details(), format="json").status_code == 403

    def test_project_member_can_publish(self, workspace, overview_setup):
        project, _ = overview_setup
        _, client = other_user(workspace, project)
        assert client.get(url(workspace, project)).data["can_edit"] is True
        assert client.post(url(workspace, project, "status-updates/"), report(), format="json").status_code == 201

    def test_archive_readable_but_not_writable(self, workspace, session_client, overview_setup):
        project, _ = overview_setup
        Project.objects.filter(pk=project.pk).update(archived_at=timezone.now())
        response = session_client.get(url(workspace, project))
        assert response.status_code == 200 and response.data["can_edit"] is False
        assert (
            session_client.post(url(workspace, project, "status-updates/"), report(), format="json").status_code == 409
        )
        assert session_client.put(url(workspace, project), details(), format="json").status_code == 409

    def test_deleted_project_not_visible(self, workspace, session_client, overview_setup):
        project, _ = overview_setup
        Project.objects.filter(pk=project.pk).update(deleted_at=timezone.now())
        assert session_client.get(url(workspace, project)).status_code == 404

    def test_counts_exclude_drafts_archives_triage_and_deleted(self, workspace, session_client, overview_setup):
        project, todo = overview_setup
        done = State.objects.create(project=project, workspace=workspace, name="Done", group="completed")
        cancelled = State.objects.create(project=project, workspace=workspace, name="Cancelled", group="cancelled")
        triage = State.triage_objects.create(project=project, workspace=workspace, name="Triage", group="triage")
        yesterday = timezone.now().date() - timedelta(days=1)
        for state, fields in [
            (todo, {}),
            (done, {}),
            (cancelled, {}),
            (todo, {"is_draft": True}),
            (todo, {"archived_at": date.today()}),
            (todo, {"deleted_at": timezone.now()}),
            (triage, {}),
        ]:
            Issue.objects.create(
                project=project, workspace=workspace, state=state, name="Task", target_date=yesterday, **fields
            )
        response = session_client.get(url(workspace, project))
        assert response.status_code == 200
        assert response.data["task_counts"] == {"total": 3, "completed": 1, "overdue": 1}

    def test_other_workspace_slug_not_visible(self, workspace, session_client, overview_setup):
        project, _ = overview_setup
        assert (
            session_client.get(f"/api/workspaces/not-this-workspace/projects/{project.pk}/overview/").status_code == 404
        )

    @pytest.mark.django_db(transaction=True)
    @pytest.mark.parametrize("kind", ["report", "details"])
    def test_concurrent_writes_are_serialized(self, workspace, create_user, overview_setup, kind):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import connections

        project, _ = overview_setup
        body = report() if kind == "report" else details()
        endpoint = url(workspace, project, "status-updates/" if kind == "report" else "overview/")
        ready = Barrier(2)

        def write(_):
            connections.close_all()
            try:
                client = APIClient()
                client.force_authenticate(create_user)
                ready.wait(timeout=10)
                method = client.post if kind == "report" else client.put
                return method(endpoint, body, format="json").status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = sorted(executor.map(write, [0, 1]))
        if kind == "report":
            assert statuses == [200, 201]
            assert ProjectStatusUpdate.objects.filter(project=project).count() == 1
        else:
            assert statuses == [200, 409]
            assert ProjectOverviewDetails.objects.get(project=project).revision == 1
