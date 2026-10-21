from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.db import connections
from rest_framework.test import APIClient

from plane.db.models import DraftIssue, Issue, Project, ProjectMember, State, User, WorkspaceMember


@pytest.fixture
def draft_access(workspace, create_user):
    project = Project.objects.create(workspace=workspace, name="Draft access", identifier="DRA")
    ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=15)
    State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted", default=True)
    draft = DraftIssue(name="Owned draft", project=project, workspace=workspace)
    draft.save(created_by_id=create_user.id)
    return draft


def publish_url(draft):
    return f"/api/workspaces/{draft.workspace.slug}/draft-to-issue/{draft.id}/"


@pytest.mark.contract
@pytest.mark.django_db
class TestDraftProjectAccess:
    def test_activity_is_queued_only_after_publication_commits(
        self, draft_access, session_client, django_capture_on_commit_callbacks
    ):
        with (
            patch("plane.app.views.workspace.draft.issue_activity") as activity,
            patch("plane.app.views.workspace.draft.base_host", return_value="http://testserver"),
            patch("plane.db.mixins.soft_delete_related_objects"),
        ):
            with django_capture_on_commit_callbacks(execute=False) as callbacks:
                response = session_client.post(publish_url(draft_access), {"name": "Committed task"}, format="json")
            assert response.status_code == 201, response.data
            activity.delay.assert_not_called()
            assert len(callbacks) == 1
            callbacks[0]()
            activity.delay.assert_called_once()

    def test_publish_rechecks_revoked_project_membership(self, draft_access, create_user, session_client):
        ProjectMember.objects.filter(project=draft_access.project, member=create_user).update(is_active=False)
        response = session_client.post(publish_url(draft_access), {"name": "Published"}, format="json")
        assert response.status_code == 403
        assert not Issue.objects.exists()
        assert DraftIssue.objects.filter(pk=draft_access.pk).exists()

    def test_workspace_member_with_project_guest_role_cannot_publish(self, draft_access, create_user, session_client):
        WorkspaceMember.objects.filter(workspace=draft_access.workspace, member=create_user).update(role=15)
        ProjectMember.objects.filter(project=draft_access.project, member=create_user).update(role=5)
        assert session_client.post(publish_url(draft_access), {"name": "Published"}, format="json").status_code == 403

    def test_cannot_save_draft_pointing_at_unjoined_project(self, draft_access, session_client):
        hidden = Project.objects.create(workspace=draft_access.workspace, name="Other", identifier="OTH")
        response = session_client.post(
            f"/api/workspaces/{draft_access.workspace.slug}/draft-issues/",
            {"name": "Private project draft", "project_id": str(hidden.id)},
            format="json",
        )
        assert response.status_code == 403

    def test_other_users_private_draft_is_unavailable(self, draft_access):
        username = uuid4().hex
        other = User.objects.create(username=username, email=f"{username}@example.test")
        WorkspaceMember.objects.create(workspace=draft_access.workspace, member=other, role=15)
        ProjectMember.objects.create(
            workspace=draft_access.workspace, project=draft_access.project, member=other, role=15
        )
        client = APIClient()
        client.force_authenticate(other)
        assert client.post(publish_url(draft_access), {"name": "Stolen"}, format="json").status_code == 404
        assert not Issue.objects.exists()


@pytest.mark.contract
@pytest.mark.django_db(transaction=True)
def test_concurrent_publish_creates_only_one_task(draft_access, create_user):
    barrier = Barrier(2)

    def publish():
        connections.close_all()
        client = APIClient()
        client.force_authenticate(create_user)
        barrier.wait(timeout=10)
        try:
            return client.post(publish_url(draft_access), {"name": "Only one"}, format="json").status_code
        finally:
            connections.close_all()

    with (
        patch("plane.app.views.workspace.draft.issue_activity") as activity,
        patch("plane.app.views.workspace.draft.base_host", return_value="http://testserver"),
        patch("plane.db.mixins.soft_delete_related_objects"),
    ):
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: publish(), range(2)))
    assert activity.delay.call_count == 1
    assert sorted(results) == [201, 404]
    assert Issue.objects.filter(name="Only one").count() == 1
