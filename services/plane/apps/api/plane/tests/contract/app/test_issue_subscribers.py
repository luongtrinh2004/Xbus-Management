from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from plane.db.models import Issue, IssueSubscriber, Project, ProjectMember, State, User, WorkspaceMember


@pytest.fixture
def subscription_issue(workspace, create_user):
    project = Project.objects.create(name="Subscribers", identifier="SUB", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=create_user, role=20)
    State.objects.create(name="Todo", group="unstarted", default=True, project=project, workspace=workspace)
    return Issue.objects.create(name="Watch this", project=project, workspace=workspace, created_by=create_user)


def subscriber_url(issue, project_id=None):
    return f"/api/workspaces/{issue.workspace.slug}/projects/{project_id or issue.project_id}/issues/{issue.id}/issue-subscribers/"


def self_url(issue, project_id=None):
    return subscriber_url(issue, project_id).replace("issue-subscribers/", "subscribe/")


def add_member(issue, role=15):
    username = str(uuid4())
    user = User.objects.create(email=f"{username}@example.com", username=username, first_name="Watcher")
    WorkspaceMember.objects.create(workspace=issue.workspace, member=user, role=15)
    ProjectMember.objects.create(project=issue.project, workspace=issue.workspace, member=user, role=role)
    return user


def subscribe(issue, user):
    return IssueSubscriber.objects.create(
        issue=issue, project=issue.project, workspace=issue.workspace, subscriber=user
    )


@pytest.mark.contract
@pytest.mark.django_db
class TestIssueSubscribers:
    def test_list_omits_revoked_subscribers_so_member_picker_can_save(self, session_client, subscription_issue):
        active = add_member(subscription_issue)
        revoked = add_member(subscription_issue)
        subscribe(subscription_issue, active)
        subscribe(subscription_issue, revoked)
        ProjectMember.objects.filter(project=subscription_issue.project, member=revoked).update(is_active=False)
        response = session_client.get(subscriber_url(subscription_issue))
        assert response.status_code == 200
        assert [str(row["subscriber"]) for row in response.data] == [str(active.id)]
        saved = session_client.put(
            subscriber_url(subscription_issue), {"subscriber_ids": [str(active.id)]}, format="json"
        )
        assert saved.status_code == 200
        assert not IssueSubscriber.objects.filter(issue=subscription_issue, subscriber=revoked).exists()

    def test_list_is_actual_subscribers_not_project_roster(self, session_client, subscription_issue):
        watcher = add_member(subscription_issue)
        add_member(subscription_issue)
        row = subscribe(subscription_issue, watcher)
        response = session_client.get(subscriber_url(subscription_issue))
        assert response.status_code == 200
        assert [(str(item["id"]), str(item["subscriber"])) for item in response.data] == [
            (str(row.id), str(watcher.id))
        ]

    def test_replace_add_remove_and_keep_existing_row(self, session_client, subscription_issue):
        old = add_member(subscription_issue)
        kept = add_member(subscription_issue)
        new = add_member(subscription_issue)
        subscribe(subscription_issue, old)
        kept_row = subscribe(subscription_issue, kept)
        response = session_client.put(
            subscriber_url(subscription_issue), {"subscriber_ids": [str(kept.id), str(new.id)]}, format="json"
        )
        assert response.status_code == 200, response.data
        assert set(
            IssueSubscriber.objects.filter(issue=subscription_issue).values_list("subscriber_id", flat=True)
        ) == {kept.id, new.id}
        assert IssueSubscriber.objects.get(issue=subscription_issue, subscriber=kept).id == kept_row.id
        assert (
            session_client.put(subscriber_url(subscription_issue), {"subscriber_ids": []}, format="json").status_code
            == 200
        )
        assert not IssueSubscriber.objects.filter(issue=subscription_issue).exists()

    @pytest.mark.parametrize(
        "body", [{}, [], {"subscriber_ids": "bad"}, {"subscriber_ids": ["bad"]}, {"subscriber_ids": [str(uuid4())]}]
    )
    def test_invalid_replace_is_atomic(self, session_client, subscription_issue, create_user, body):
        existing = subscribe(subscription_issue, create_user)
        response = session_client.put(subscriber_url(subscription_issue), body, format="json")
        assert response.status_code == 400
        assert IssueSubscriber.objects.filter(id=existing.id).exists()

    def test_duplicate_ids_rejected(self, session_client, subscription_issue, create_user):
        uid = str(create_user.id)
        assert (
            session_client.put(
                subscriber_url(subscription_issue), {"subscriber_ids": [uid, uid]}, format="json"
            ).status_code
            == 400
        )

    @pytest.mark.parametrize("scope", ["workspace", "project", "account", "outside_project"])
    def test_ineligible_recipient_rejected(self, session_client, subscription_issue, scope):
        watcher = add_member(subscription_issue)
        if scope == "workspace":
            WorkspaceMember.objects.filter(member=watcher).update(is_active=False)
        elif scope == "project":
            ProjectMember.objects.filter(member=watcher).update(is_active=False)
        elif scope == "account":
            User.objects.filter(id=watcher.id).update(is_active=False)
        else:
            ProjectMember.objects.filter(member=watcher).delete()
        body = {"subscriber_ids": [str(watcher.id)]}
        assert session_client.put(subscriber_url(subscription_issue), body, format="json").status_code == 400
        assert (
            session_client.post(
                subscriber_url(subscription_issue), {"subscriber": str(watcher.id)}, format="json"
            ).status_code
            == 400
        )
        assert not IssueSubscriber.objects.filter(issue=subscription_issue).exists()

    @pytest.mark.parametrize("scope", ["workspace", "project"])
    def test_inactive_caller_rejected(self, session_client, subscription_issue, create_user, scope):
        model = WorkspaceMember if scope == "workspace" else ProjectMember
        model.objects.filter(member=create_user).update(is_active=False)
        assert session_client.get(subscriber_url(subscription_issue)).status_code == 403
        assert session_client.get(self_url(subscription_issue)).status_code == 403
        assert (
            session_client.put(subscriber_url(subscription_issue), {"subscriber_ids": []}, format="json").status_code
            == 403
        )

    def test_cross_project_issue_rejected_on_every_action(self, session_client, subscription_issue, create_user):
        other = Project.objects.create(name="Other", identifier="OTH", workspace=subscription_issue.workspace)
        ProjectMember.objects.create(project=other, workspace=other.workspace, member=create_user, role=20)
        list_url = subscriber_url(subscription_issue, other.id)
        own_url = self_url(subscription_issue, other.id)
        assert session_client.get(list_url).status_code == 404
        assert session_client.put(list_url, {"subscriber_ids": []}, format="json").status_code == 404
        assert session_client.post(list_url, {"subscriber": str(create_user.id)}, format="json").status_code == 404
        assert session_client.delete(f"{list_url}{create_user.id}/").status_code == 404
        assert session_client.get(own_url).status_code == 404
        assert session_client.post(own_url, {}, format="json").status_code == 404
        assert session_client.delete(own_url).status_code == 404

    def test_self_subscribe_and_leave_are_idempotent(self, session_client, subscription_issue, create_user):
        url = self_url(subscription_issue)
        assert session_client.post(url, {}, format="json").status_code == 201
        assert session_client.post(url, {}, format="json").status_code == 200
        assert session_client.get(url).data == {"subscribed": True}
        assert IssueSubscriber.objects.filter(issue=subscription_issue, subscriber=create_user).count() == 1
        assert session_client.delete(url).status_code == 204
        assert session_client.delete(url).status_code == 204
        assert session_client.get(url).data == {"subscribed": False}

    def test_individual_add_cannot_forge_scope(self, session_client, subscription_issue, create_user):
        watcher = add_member(subscription_issue)
        body = {
            "subscriber": str(watcher.id),
            "project": str(uuid4()),
            "issue": str(uuid4()),
            "created_by": str(watcher.id),
        }
        response = session_client.post(subscriber_url(subscription_issue), body, format="json")
        assert response.status_code == 201
        row = IssueSubscriber.objects.get(pk=response.data["id"])
        assert row.project_id == subscription_issue.project_id
        assert row.issue_id == subscription_issue.id
        assert row.created_by_id == create_user.id

    def test_guest_can_self_subscribe_only_to_visible_issue(self, subscription_issue):
        guest = add_member(subscription_issue, role=5)
        subscription_issue.project.guest_view_all_features = False
        subscription_issue.project.save()
        client = APIClient()
        client.force_authenticate(user=guest)
        assert client.get(subscriber_url(subscription_issue)).status_code == 404
        assert client.post(self_url(subscription_issue), {}, format="json").status_code == 404
        subscription_issue.created_by = guest
        subscription_issue.save(created_by_id=guest.id)
        assert client.get(subscriber_url(subscription_issue)).status_code == 200
        assert client.post(self_url(subscription_issue), {}, format="json").status_code == 201
        assert client.put(subscriber_url(subscription_issue), {"subscriber_ids": []}, format="json").status_code == 403
        assert client.delete(self_url(subscription_issue)).status_code == 204

    def test_guest_recipient_requires_existing_visibility(self, session_client, subscription_issue):
        guest = add_member(subscription_issue, role=5)
        subscription_issue.project.guest_view_all_features = False
        subscription_issue.project.save()
        body = {"subscriber_ids": [str(guest.id)]}
        assert session_client.put(subscriber_url(subscription_issue), body, format="json").status_code == 400
        subscription_issue.created_by = guest
        subscription_issue.save(created_by_id=guest.id)
        assert session_client.put(subscriber_url(subscription_issue), body, format="json").status_code == 200

    @pytest.mark.parametrize("scope", ["issue", "project"])
    def test_archived_cannot_add_but_can_leave(self, session_client, subscription_issue, create_user, scope):
        subscribe(subscription_issue, create_user)
        target = subscription_issue if scope == "issue" else subscription_issue.project
        target.archived_at = timezone.now().date() if scope == "issue" else timezone.now()
        target.save()
        assert (
            session_client.put(subscriber_url(subscription_issue), {"subscriber_ids": []}, format="json").status_code
            == 400
        )
        assert session_client.post(self_url(subscription_issue), {}, format="json").status_code == 400
        assert session_client.delete(self_url(subscription_issue)).status_code == 204
