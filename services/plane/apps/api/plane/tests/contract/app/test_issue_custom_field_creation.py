from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

import pytest
from crum import impersonate
from django.db import IntegrityError
from rest_framework.exceptions import PermissionDenied, ValidationError

from plane.app.serializers.issue import IssueCreateSerializer
from plane.app.serializers.draft import DraftIssueCreateSerializer, DraftIssueDetailSerializer
from plane.db.models import (
    DraftIssue,
    Issue,
    IssueCustomField,
    IssueCustomFieldValue,
    Project,
    ProjectMember,
    State,
    WorkspaceMember,
)


@pytest.fixture
def creation_project(workspace, create_user):
    project = Project.objects.create(name="Create fields", identifier="CRF", workspace=workspace)
    ProjectMember.objects.create(project=project, member=create_user, workspace=workspace, role=20)
    State.objects.create(name="Todo", group="unstarted", project=project, workspace=workspace, default=True)
    return project


def custom_field(project, kind="text", **kwargs):
    return IssueCustomField.objects.create(project=project, name=kwargs.pop("name", kind), field_type=kind, **kwargs)


def serializer_for(project, user, values=None, *, draft=False, instance=None):
    data = {"name": "Created with fields"}
    if values is not None:
        data["custom_field_values"] = values
    cls = DraftIssueCreateSerializer if draft else IssueCreateSerializer
    return cls(
        instance,
        data=data,
        partial=instance is not None,
        context={
            "project_id": project.id,
            "workspace_id": project.workspace_id,
            "default_assignee_id": None,
            "request": SimpleNamespace(user=user),
        },
    )


@pytest.mark.contract
@pytest.mark.django_db
class TestCustomFieldCreation:
    @pytest.mark.parametrize("draft", [False, True])
    def test_all_six_types_are_saved_with_create(self, creation_project, create_user, draft):
        project = creation_project
        option = str(uuid4())
        fields = [
            custom_field(
                project, kind, options=[{"id": option, "name": "Option", "color": "#112233", "is_active": True}]
            )
            for kind in ["text", "number", "date", "single_select", "multi_select", "people"]
        ]
        values = dict(
            zip(
                [str(field.id) for field in fields],
                ["Details", 0, "2026-10-20", option, [option], [str(create_user.id)]],
            )
        )
        serializer = serializer_for(project, create_user, values, draft=draft)
        assert serializer.is_valid(), serializer.errors
        instance = serializer.save()
        if draft:
            assert DraftIssue.objects.get(pk=instance.pk).custom_field_values == values
            assert DraftIssueDetailSerializer(instance).data["custom_field_values"] == values
        else:
            assert {
                str(row.field_id): row.value for row in IssueCustomFieldValue.objects.filter(issue=instance)
            } == values
            assert serializer.data["custom_field_values"] == values

    @pytest.mark.parametrize("draft", [False, True])
    def test_invalid_values_reject_before_creating_task(self, creation_project, create_user, draft):
        field = custom_field(creation_project, "number")
        serializer = serializer_for(creation_project, create_user, {str(field.id): "invalid"}, draft=draft)
        assert not serializer.is_valid()
        assert not Issue.objects.exists()
        assert not DraftIssue.objects.exists()

    @pytest.mark.parametrize("draft", [False, True])
    def test_unknown_foreign_and_inactive_fields_rejected(self, creation_project, create_user, workspace, draft):
        other = Project.objects.create(name="Other", identifier="CFX", workspace=workspace)
        foreign = custom_field(other)
        inactive = custom_field(creation_project, is_active=False)
        for field_id in [str(uuid4()), str(foreign.id), str(inactive.id), "invalid"]:
            serializer = serializer_for(creation_project, create_user, {field_id: "value"}, draft=draft)
            assert not serializer.is_valid()
        assert not Issue.objects.exists()
        assert not DraftIssue.objects.exists()

    def test_value_write_failure_rolls_back_the_task(self, creation_project, create_user):
        field = custom_field(creation_project)
        serializer = serializer_for(creation_project, create_user, {str(field.id): "value"})
        assert serializer.is_valid(), serializer.errors
        with mock.patch.object(
            IssueCustomFieldValue.objects, "update_or_create", side_effect=IntegrityError("write failed")
        ):
            with pytest.raises(IntegrityError):
                serializer.save()
        assert not Issue.objects.exists()
        assert not IssueCustomFieldValue.objects.exists()

    def test_archive_between_validation_and_save_does_not_create_partial_task(self, creation_project, create_user):
        field = custom_field(creation_project)
        serializer = serializer_for(creation_project, create_user, {str(field.id): "value"})
        assert serializer.is_valid(), serializer.errors
        field.is_active = False
        field.save()
        with pytest.raises(ValidationError):
            serializer.save()
        assert not Issue.objects.exists()

    @pytest.mark.parametrize("draft", [False, True])
    def test_inactive_workspace_members_cannot_save_values(self, creation_project, create_user, draft):
        field = custom_field(creation_project)
        WorkspaceMember.objects.filter(workspace=creation_project.workspace, member=create_user).update(is_active=False)
        serializer = serializer_for(creation_project, create_user, {str(field.id): "value"}, draft=draft)
        with pytest.raises(PermissionDenied):
            serializer.is_valid(raise_exception=True)
        assert not Issue.objects.exists()
        assert not DraftIssue.objects.exists()

    @pytest.mark.parametrize("draft", [False, True])
    def test_older_clients_can_create_without_custom_values(self, creation_project, create_user, draft):
        serializer = serializer_for(creation_project, create_user, draft=draft)
        assert serializer.is_valid(), serializer.errors
        assert serializer.save().name == "Created with fields"

    def test_draft_update_preserves_values_and_publish_without_payload_carries_them(
        self, creation_project, create_user, session_client
    ):
        field = custom_field(creation_project)
        values = {str(field.id): "Preserve this"}
        draft = DraftIssue.objects.create(
            name="Draft", project=creation_project, workspace=creation_project.workspace, custom_field_values=values
        )
        DraftIssue.objects.filter(pk=draft.pk).update(created_by=create_user)
        draft.refresh_from_db()
        serializer = serializer_for(creation_project, create_user, draft=True, instance=draft)
        assert serializer.is_valid(), serializer.errors
        with impersonate(create_user):
            assert serializer.save().custom_field_values == values
        with (
            mock.patch("plane.app.views.workspace.draft.issue_activity"),
            mock.patch("plane.app.views.workspace.draft.base_host", return_value="http://testserver"),
            mock.patch("plane.db.mixins.soft_delete_related_objects"),
        ):
            response = session_client.post(
                f"/api/workspaces/{creation_project.workspace.slug}/draft-to-issue/{draft.id}/",
                {"name": "Published"},
                format="json",
            )
        assert response.status_code == 201, response.data
        assert IssueCustomFieldValue.objects.get(issue_id=response.data["id"], field=field).value == "Preserve this"
        assert not DraftIssue.objects.filter(pk=draft.pk).exists()
