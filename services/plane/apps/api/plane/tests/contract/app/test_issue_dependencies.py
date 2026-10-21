"""POST relation contract: valid links stay 201; invalid/cyclic batches are atomic 400s.

The existing relation payload and response shape are retained. Rejections expose
an additive ``code`` so clients can translate them. Graph validation and insertion
share a workspace row lock, including cross-project relations and concurrent writes.
"""

from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.db import connections
from rest_framework.test import APIClient

from plane.db.models import Issue, IssueRelation, Project, ProjectMember


@pytest.fixture
def dependency_project(workspace, create_user):
    project = Project.objects.create(name="Dependency test", identifier="DEP", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    return project


@pytest.fixture
def tasks(dependency_project, workspace, create_user):
    result = []
    for name in ("A", "B", "C", "D"):
        issue = Issue(name=name, project=dependency_project, workspace=workspace)
        issue.save(created_by_id=create_user.id)
        result.append(issue)
    return result


def relation_url(issue, project=None):
    return (
        f"/api/workspaces/{issue.workspace.slug}/projects/{project or issue.project_id}"
        f"/issues/{issue.id}/issue-relation/"
    )


@pytest.fixture(autouse=True)
def no_relation_notifications(monkeypatch):
    monkeypatch.setattr("plane.app.views.issue.relation.issue_activity.delay", lambda **kwargs: None)
    monkeypatch.setattr("plane.app.views.issue.relation.base_host", lambda **kwargs: "http://testserver")


@pytest.mark.contract
@pytest.mark.django_db
class TestIssueDependencies:
    def test_create_and_retry_are_idempotent(self, session_client, tasks):
        a, b, *_ = tasks
        payload = {"relation_type": "blocking", "issues": [str(b.id)]}
        assert session_client.post(relation_url(a), payload, format="json").status_code == 201
        assert session_client.post(relation_url(a), payload, format="json").status_code == 201
        assert IssueRelation.objects.filter(issue=b, related_issue=a, relation_type="blocked_by").count() == 1

    def test_existing_relation_type_cannot_silently_ignore_requested_dependency(self, session_client, tasks):
        a, b, *_ = tasks
        assert (
            session_client.post(
                relation_url(a), {"relation_type": "relates_to", "issues": [str(b.id)]}, format="json"
            ).status_code
            == 201
        )
        response = session_client.post(
            relation_url(a), {"relation_type": "blocked_by", "issues": [str(b.id)]}, format="json"
        )
        assert response.status_code == 400
        assert response.data["code"] == "relation_conflict"
        assert IssueRelation.objects.get(issue=a, related_issue=b).relation_type == "relates_to"

    @pytest.mark.parametrize(
        "relation_type", ["blocked_by", "blocking", "start_before", "start_after", "finish_before", "finish_after"]
    )
    def test_rejects_self_relation(self, session_client, tasks, relation_type):
        a = tasks[0]
        response = session_client.post(
            relation_url(a), {"relation_type": relation_type, "issues": [str(a.id)]}, format="json"
        )
        assert response.status_code == 400
        assert response.data["code"] == "self_dependency"
        assert not IssueRelation.objects.exists()

    def test_rejects_transitive_cycle_and_whole_batch(self, session_client, tasks):
        a, b, c, d = tasks
        for parent, child in [(a, b), (b, c)]:
            assert (
                session_client.post(
                    relation_url(parent), {"relation_type": "blocking", "issues": [str(child.id)]}, format="json"
                ).status_code
                == 201
            )
        response = session_client.post(
            relation_url(c), {"relation_type": "blocking", "issues": [str(d.id), str(a.id)]}, format="json"
        )
        assert response.status_code == 400
        assert response.data["code"] == "dependency_cycle"
        assert IssueRelation.objects.count() == 2
        assert not IssueRelation.objects.filter(issue=d, related_issue=c).exists()

    def test_cross_project_cycle_is_rejected(self, session_client, tasks, workspace, create_user):
        a = tasks[0]
        other = Project.objects.create(name="Other", identifier="OTH", workspace=workspace)
        ProjectMember.objects.create(project=other, workspace=workspace, member=create_user, role=20)
        b = Issue.objects.create(name="Other task", project=other, workspace=workspace)
        assert (
            session_client.post(
                relation_url(a), {"relation_type": "blocking", "issues": [str(b.id)]}, format="json"
            ).status_code
            == 201
        )
        response = session_client.post(
            relation_url(b), {"relation_type": "blocking", "issues": [str(a.id)]}, format="json"
        )
        assert response.status_code == 400
        assert response.data["code"] == "dependency_cycle"

    def test_rejects_origin_from_another_project(self, session_client, tasks, workspace):
        a, b, *_ = tasks
        other = Project.objects.create(name="Other", identifier="OTH", workspace=workspace)
        hidden = Issue.objects.create(name="Other task", project=other, workspace=workspace)
        response = session_client.post(
            relation_url(hidden, a.project_id), {"relation_type": "blocking", "issues": [str(b.id)]}, format="json"
        )
        assert response.status_code == 404
        assert not IssueRelation.objects.exists()

    @pytest.mark.parametrize(
        "payload,code",
        [
            ({"relation_type": "unknown", "issues": []}, "invalid_relation_type"),
            ({"relation_type": "blocking", "issues": "bad"}, "related_issues_required"),
            ({"relation_type": "blocking", "issues": ["not-uuid"]}, "invalid_related_issue"),
            ({"relation_type": "blocking", "issues": [str(uuid4())]}, "invalid_related_issue"),
        ],
    )
    def test_invalid_payload_has_stable_error_code(self, session_client, tasks, payload, code):
        response = session_client.post(relation_url(tasks[0]), payload, format="json")
        assert response.status_code == 400
        assert response.data["code"] == code
        assert not IssueRelation.objects.exists()

    @pytest.mark.django_db(transaction=True)
    @pytest.mark.parametrize("opposite", [False, True])
    def test_concurrent_writes_cannot_create_duplicates_or_cycles(self, tasks, create_user, opposite):
        a, b, *_ = tasks
        ready = Barrier(2)

        def write_link(reverse):
            connections.close_all()
            try:
                client = APIClient()
                client.force_authenticate(user=create_user)
                source, target = (b, a) if reverse else (a, b)
                ready.wait(timeout=10)
                response = client.post(
                    relation_url(source),
                    {
                        "relation_type": "blocking",
                        "issues": [str(target.id)],
                    },
                    format="json",
                )
                return response.status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = sorted(executor.map(write_link, [False, opposite]))
        assert statuses == ([201, 400] if opposite else [201, 201])
        assert IssueRelation.objects.count() == 1
