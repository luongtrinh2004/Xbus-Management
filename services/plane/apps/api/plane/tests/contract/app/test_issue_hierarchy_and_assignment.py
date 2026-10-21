from types import SimpleNamespace
from uuid import uuid4

import pytest
from crum import impersonate

from plane.app.serializers.issue import IssueCreateSerializer
from plane.db.models import Issue, IssueAssignee, IssueSubscriber, Project, ProjectMember, State, User, WorkspaceMember


@pytest.fixture
def hierarchy(workspace, create_user):
    project = Project.objects.create(workspace=workspace, name="Hierarchy", identifier="TREE")
    State.objects.create(workspace=workspace, project=project, name="Todo", group="unstarted", default=True)
    ProjectMember.objects.create(workspace=workspace, project=project, member=create_user, role=20)
    parent = Issue.objects.create(workspace=workspace, project=project, name="Parent")
    child = Issue.objects.create(workspace=workspace, project=project, name="Child", parent=parent)
    grandchild = Issue.objects.create(workspace=workspace, project=project, name="Grandchild", parent=child)
    return parent, child, grandchild


def patch_serializer(instance, user, data):
    return IssueCreateSerializer(
        instance,
        data=data,
        partial=True,
        context={
            "project_id": instance.project_id,
            "workspace_id": instance.workspace_id,
            "request": SimpleNamespace(user=user),
        },
    )


@pytest.mark.contract
@pytest.mark.django_db
class TestHierarchyAndAssignment:
    def test_rejects_self_and_descendant_as_parent(self, hierarchy, create_user):
        parent, _, grandchild = hierarchy
        for target in [parent, grandchild]:
            serializer = patch_serializer(parent, create_user, {"parent_id": str(target.id)})
            assert not serializer.is_valid()
            assert "parent_id" in serializer.errors
        parent.refresh_from_db()
        assert parent.parent_id is None

    def test_revalidates_latest_parent_chain_inside_transaction(self, hierarchy, create_user):
        parent, child, grandchild = hierarchy
        serializer = patch_serializer(parent, create_user, {"parent_id": str(grandchild.id)})
        # Initially independent; a concurrent change makes the target a descendant after validation.
        Issue.objects.filter(pk=child.pk).update(parent=None)
        assert serializer.is_valid(), serializer.errors
        Issue.objects.filter(pk=child.pk).update(parent=parent)
        from rest_framework.exceptions import ValidationError

        with pytest.raises(ValidationError):
            serializer.save()

    def test_can_detach_subtask_without_deleting_children(self, hierarchy, create_user):
        _, child, grandchild = hierarchy
        serializer = patch_serializer(child, create_user, {"parent_id": None})
        assert serializer.is_valid(), serializer.errors
        with impersonate(create_user):
            serializer.save()
        child.refresh_from_db()
        grandchild.refresh_from_db()
        assert child.parent_id is None
        assert grandchild.parent_id == child.id

    def test_replaced_assignee_becomes_collaborator_once(self, hierarchy, create_user):
        parent, _, _ = hierarchy
        IssueAssignee.objects.create(
            workspace=parent.workspace, project=parent.project, issue=parent, assignee=create_user
        )
        username = uuid4().hex
        replacement = User.objects.create(username=username, email=f"{username}@example.test")
        WorkspaceMember.objects.create(workspace=parent.workspace, member=replacement, role=15)
        ProjectMember.objects.create(workspace=parent.workspace, project=parent.project, member=replacement, role=15)
        serializer = patch_serializer(parent, create_user, {"assignee_ids": [str(replacement.id)]})
        assert serializer.is_valid(), serializer.errors
        with impersonate(create_user):
            serializer.save()
        assert IssueSubscriber.objects.filter(issue=parent, subscriber=create_user).count() == 1
        assert set(IssueAssignee.objects.filter(issue=parent).values_list("assignee_id", flat=True)) == {replacement.id}

    def test_revoked_assignee_is_not_added_as_collaborator(self, hierarchy, create_user):
        parent, _, _ = hierarchy
        IssueAssignee.objects.create(
            workspace=parent.workspace, project=parent.project, issue=parent, assignee=create_user
        )
        WorkspaceMember.objects.filter(workspace=parent.workspace, member=create_user).update(is_active=False)
        serializer = patch_serializer(parent, create_user, {"assignee_ids": []})
        assert serializer.is_valid(), serializer.errors
        serializer.save()
        assert not IssueSubscriber.objects.filter(issue=parent, subscriber=create_user).exists()
