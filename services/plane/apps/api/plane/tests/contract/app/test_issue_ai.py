from uuid import uuid4
import pytest
from django.core.cache import cache
from plane.db.models import Issue, Project, ProjectMember, State, IssueAIApplication


@pytest.fixture
def ai_setup(workspace, create_user, settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    cache.clear()
    p = Project.objects.create(workspace=workspace, name="AI test", identifier="AITEST")
    ProjectMember.objects.create(project=p, workspace=workspace, member=create_user, role=20)
    state = State.objects.create(project=p, workspace=workspace, name="Todo", group="unstarted", default=True)
    issue = Issue.objects.create(
        project=p, workspace=workspace, state=state, name="Plan release", description_html="<p>Release scope</p>"
    )
    return p, issue, f"/api/workspaces/{workspace.slug}/projects/{p.pk}/ai-assistance/"


@pytest.mark.contract
@pytest.mark.django_db
class TestAI:
    @pytest.mark.parametrize("action", ["summary", "description", "subtasks"])
    def test_generation_does_not_mutate_tasks(self, session_client, ai_setup, mocker, action):
        _, issue, url = ai_setup
        generate = mocker.patch("plane.app.views.issue_ai.generate_assistance", return_value={"text": "Preview"})
        response = session_client.post(
            url, {"issue_id": str(issue.pk), "action": action, "language": "vi-VN"}, format="json"
        )
        assert response.status_code == 200
        assert generate.call_args.args[2]["description"] == "Release scope"
        issue.refresh_from_db()
        assert issue.description_html == "<p>Release scope</p>"
        assert Issue.objects.count() == 1

    def test_draft_generation(self, session_client, ai_setup, mocker):
        _, _, url = ai_setup
        generate = mocker.patch("plane.app.views.issue_ai.generate_assistance", return_value={"text": "Draft"})
        assert (
            session_client.post(
                url,
                {"name": "Draft title", "description": "<p>Scope</p>", "action": "description", "language": "en"},
                format="json",
            ).status_code
            == 200
        )
        assert generate.call_args.args[2] == {"name": "Draft title", "description": "Scope"}

    @pytest.mark.parametrize(
        "body",
        [
            {"action": "unknown", "language": "en", "name": "x"},
            {"action": "summary", "language": "en"},
            {"action": "summary", "language": "invalid", "name": "x"},
            {"action": "summary", "language": "en", "name": "x", "api_key": "injected"},
        ],
    )
    def test_invalid_request_does_not_call_provider(self, session_client, ai_setup, mocker, body):
        _, _, url = ai_setup
        generate = mocker.patch("plane.app.views.issue_ai.generate_assistance")
        assert session_client.post(url, body, format="json").status_code == 400
        generate.assert_not_called()

    def test_guest_denied(self, workspace, create_user, session_client, ai_setup, mocker):
        p, issue, url = ai_setup
        ProjectMember.objects.filter(project=p, member=create_user).update(role=5)
        generate = mocker.patch("plane.app.views.issue_ai.generate_assistance")
        assert (
            session_client.post(
                url, {"issue_id": str(issue.pk), "action": "summary", "language": "en"}, format="json"
            ).status_code
            == 403
        )
        generate.assert_not_called()

    def test_other_project_issue_denied(self, workspace, session_client, ai_setup, mocker):
        _, issue, url = ai_setup
        other = Project.objects.create(workspace=workspace, name="Private", identifier="PRIV")
        Issue.objects.filter(pk=issue.pk).update(project=other)
        generate = mocker.patch("plane.app.views.issue_ai.generate_assistance")
        assert (
            session_client.post(
                url, {"issue_id": str(issue.pk), "action": "summary", "language": "en"}, format="json"
            ).status_code
            == 404
        )
        generate.assert_not_called()

    def test_provider_errors_safe_and_unlock(self, session_client, ai_setup, mocker):
        from plane.utils.gemini import GeminiError

        _, issue, url = ai_setup
        generate = mocker.patch(
            "plane.app.views.issue_ai.generate_assistance", side_effect=GeminiError("ai_timeout", 504)
        )
        body = {"issue_id": str(issue.pk), "action": "summary", "language": "en"}
        assert session_client.post(url, body, format="json").status_code == 504
        assert session_client.post(url, body, format="json").data == {"code": "ai_timeout"}
        assert generate.call_count == 2

    def test_access_revoked_during_generation(self, session_client, create_user, ai_setup, mocker):
        p, issue, url = ai_setup

        def generate(*args):
            ProjectMember.objects.filter(project=p, member=create_user).update(is_active=False)
            return {"text": "Secret"}

        mocker.patch("plane.app.views.issue_ai.generate_assistance", side_effect=generate)
        response = session_client.post(
            url, {"issue_id": str(issue.pk), "action": "summary", "language": "en"}, format="json"
        )
        assert response.status_code == 403 and "Secret" not in str(response.data)

    def test_subtask_apply_retry_and_content_escaping(self, session_client, ai_setup, mocker):
        p, issue, url = ai_setup
        mocker.patch("plane.bgtasks.issue_activities_task.issue_activity.delay")
        body = {
            "request_id": str(uuid4()),
            "issue_id": str(issue.pk),
            "subtasks": [{"name": "Child", "description": "<script>alert(1)</script>"}],
        }
        first = session_client.post(url + "apply-subtasks/", body, format="json")
        assert first.status_code == 201, first.data
        second = session_client.post(url + "apply-subtasks/", body, format="json")
        assert second.status_code == 200 and first.data == second.data
        child = Issue.objects.get(pk=first.data["issue_ids"][0])
        assert child.parent_id == issue.pk and child.project_id == p.pk
        assert "<script>" not in child.description_html
        assert IssueAIApplication.objects.count() == 1 and Issue.objects.count() == 2
        body["subtasks"][0]["name"] = "Changed"
        assert session_client.post(url + "apply-subtasks/", body, format="json").status_code == 409
        assert Issue.objects.count() == 2

    def test_invalid_batch_is_atomic(self, session_client, ai_setup):
        _, issue, url = ai_setup
        body = {
            "request_id": str(uuid4()),
            "issue_id": str(issue.pk),
            "subtasks": [{"name": "Valid", "description": ""}, {"name": "", "description": ""}],
        }
        assert session_client.post(url + "apply-subtasks/", body, format="json").status_code == 400
        assert Issue.objects.count() == 1

    @pytest.mark.django_db(transaction=True)
    def test_concurrent_apply_creates_one_batch(self, session_client, create_user, ai_setup, mocker):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Barrier
        from django.db import connections
        from rest_framework.test import APIClient

        _, issue, url = ai_setup
        mocker.patch("plane.bgtasks.issue_activities_task.issue_activity.delay")
        body = {
            "request_id": str(uuid4()),
            "issue_id": str(issue.pk),
            "subtasks": [{"name": "One child", "description": ""}],
        }
        ready = Barrier(2)

        def write(_):
            connections.close_all()
            try:
                client = APIClient()
                client.force_authenticate(create_user)
                ready.wait(timeout=10)
                return client.post(url + "apply-subtasks/", body, format="json").status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = sorted(executor.map(write, [0, 1]))
        assert statuses == [200, 201]
        assert Issue.objects.filter(parent=issue).count() == 1

    def test_busy_request_does_not_call_provider(self, session_client, create_user, ai_setup, mocker):
        _, issue, url = ai_setup
        cache.set(f"issue-ai:{create_user.pk}", True, 60)
        generate = mocker.patch("plane.app.views.issue_ai.generate_assistance")
        response = session_client.post(
            url, {"issue_id": str(issue.pk), "action": "summary", "language": "en"}, format="json"
        )
        assert response.status_code == 429 and response.data["code"] == "ai_busy"
        generate.assert_not_called()
