# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from uuid import uuid4

import pytest
from plane.db.models import (
    Issue,
    IssueActivity,
    IssueCustomField,
    IssueCustomFieldValue,
    Project,
    ProjectMember,
    State,
    User,
    WorkspaceMember,
)


@pytest.fixture
def field_project(workspace, create_user):
    project = Project.objects.create(name="Fields", identifier="FLD", workspace=workspace)
    ProjectMember.objects.create(project=project, member=create_user, workspace=workspace, role=20)
    State.objects.create(name="Todo", group="unstarted", project=project, workspace=workspace, default=True)
    return project


@pytest.fixture
def field_issue(field_project, workspace, create_user):
    issue = Issue(name="Report", project=field_project, workspace=workspace)
    issue.save(created_by_id=create_user.id)
    return issue


def field_url(project):
    return f"/api/workspaces/{project.workspace.slug}/projects/{project.id}/custom-fields/"


def value_url(issue):
    return f"/api/workspaces/{issue.workspace.slug}/projects/{issue.project_id}/issues/{issue.id}/custom-field-values/"


def create_field(project, kind="text", **kwargs):
    return IssueCustomField.objects.create(
        project=project, name=kwargs.pop("name", "Test field"), field_type=kind, **kwargs
    )


@pytest.mark.contract
@pytest.mark.django_db
class TestIssueCustomFields:
    def test_create_edit_archive_field_and_keep_values(self, session_client, field_project, field_issue):
        response = session_client.post(
            field_url(field_project), {"name": "Result", "field_type": "text"}, format="json"
        )
        assert response.status_code == 201
        field_id = response.data["id"]
        assert (
            session_client.put(value_url(field_issue), {"values": {field_id: "Passed"}}, format="json").status_code
            == 200
        )
        response = session_client.patch(
            f"{field_url(field_project)}{field_id}/", {"name": "Test result", "is_active": False}, format="json"
        )
        assert response.status_code == 200
        assert IssueCustomFieldValue.objects.get(field_id=field_id).value == "Passed"
        assert session_client.get(field_url(field_project)).data[0]["is_active"] is False
        assert (
            session_client.put(value_url(field_issue), {"values": {field_id: "New"}}, format="json").status_code == 400
        )

    @pytest.mark.parametrize(
        "kind,value",
        [
            ("text", "Details"),
            ("number", 12.5),
            ("number", 0),
            ("date", "2026-10-19"),
            ("single_select", "OPTION"),
            ("multi_select", ["OPTION"]),
            ("people", ["USER"]),
        ],
    )
    def test_supported_types_round_trip(self, session_client, field_project, field_issue, create_user, kind, value):
        option = str(uuid4())
        field = create_field(
            field_project,
            kind,
            options=[{"id": option, "name": "Passed", "color": "#22c55e", "is_active": True}]
            if "select" in kind
            else [],
        )
        value = (
            option
            if value == "OPTION"
            else [option]
            if value == ["OPTION"]
            else [str(create_user.id)]
            if value == ["USER"]
            else value
        )
        response = session_client.put(value_url(field_issue), {"values": {str(field.id): value}}, format="json")
        assert response.status_code == 200, response.data
        assert response.data[str(field.id)] == value
        assert IssueCustomFieldValue.objects.get(issue=field_issue, field=field).value == value
        assert IssueActivity.objects.filter(issue=field_issue, field="custom_field").count() == 1

    @pytest.mark.parametrize(
        "kind,value",
        [
            ("text", 123),
            ("number", True),
            ("number", "12"),
            ("date", "2026-02-30"),
            ("single_select", "unknown"),
            ("multi_select", "not-an-array"),
            ("people", [str(uuid4())]),
        ],
    )
    def test_rejects_invalid_values(self, session_client, field_project, field_issue, kind, value):
        field = create_field(field_project, kind)
        response = session_client.put(value_url(field_issue), {"values": {str(field.id): value}}, format="json")
        assert response.status_code == 400
        assert not IssueCustomFieldValue.objects.exists()

    def test_multi_field_update_is_atomic(self, session_client, field_project, field_issue):
        text = create_field(field_project)
        number = create_field(field_project, "number", name="Number")
        response = session_client.put(
            value_url(field_issue), {"values": {str(text.id): "OK", str(number.id): "bad"}}, format="json"
        )
        assert response.status_code == 400
        assert not IssueCustomFieldValue.objects.exists()
        assert not IssueActivity.objects.filter(issue=field_issue, field="custom_field").exists()

    def test_partial_update_and_clear(self, session_client, field_project, field_issue):
        field = create_field(field_project)
        url = value_url(field_issue)
        assert session_client.put(url, {"values": {str(field.id): "Keep"}}, format="json").status_code == 200
        assert session_client.put(url, {"values": {}}, format="json").data[str(field.id)] == "Keep"
        assert session_client.put(url, {"values": {str(field.id): None}}, format="json").status_code == 200
        assert str(field.id) not in session_client.get(url).data

    def test_cannot_change_field_type(self, session_client, field_project):
        field = create_field(field_project)
        response = session_client.patch(
            f"{field_url(field_project)}{field.id}/", {"field_type": "number"}, format="json"
        )
        assert response.status_code == 400
        field.refresh_from_db()
        assert field.field_type == "text"

    def test_options_rename_reorder_and_hide_without_losing_values(self, session_client, field_project, field_issue):
        option = str(uuid4())
        field = create_field(
            field_project,
            "single_select",
            options=[{"id": option, "name": "Old", "color": "#22c55e", "is_active": True}],
        )
        assert (
            session_client.put(value_url(field_issue), {"values": {str(field.id): option}}, format="json").status_code
            == 200
        )
        response = session_client.patch(
            f"{field_url(field_project)}{field.id}/",
            {"options": [{"id": option, "name": "Renamed", "color": "#000000", "is_active": False}]},
            format="json",
        )
        assert response.status_code == 200
        assert session_client.get(value_url(field_issue)).data[str(field.id)] == option
        assert (
            session_client.put(value_url(field_issue), {"values": {str(field.id): option}}, format="json").status_code
            == 200
        )
        assert (
            session_client.patch(f"{field_url(field_project)}{field.id}/", {"options": []}, format="json").status_code
            == 400
        )

    @pytest.mark.parametrize("role", [15, 5])
    def test_plane_roles(self, session_client, field_project, field_issue, create_user, role):
        field = create_field(field_project)
        ProjectMember.objects.filter(project=field_project, member=create_user).update(role=role)
        assert session_client.get(field_url(field_project)).status_code == 200
        expected = 201 if role == 15 else 403
        # Use a workspace Member so admin elevation cannot mask Guest checks.
        WorkspaceMember.objects.filter(workspace=field_project.workspace, member=create_user).update(role=15)
        assert (
            session_client.post(
                field_url(field_project), {"name": "Another", "field_type": "text"}, format="json"
            ).status_code
            == expected
        )
        assert session_client.put(
            value_url(field_issue), {"values": {str(field.id): "value"}}, format="json"
        ).status_code == (200 if role == 15 else 403)

    @pytest.mark.parametrize("scope", ["workspace", "project"])
    def test_inactive_members_cannot_access(self, session_client, field_project, create_user, scope):
        model = WorkspaceMember if scope == "workspace" else ProjectMember
        model.objects.filter(member=create_user).update(is_active=False)
        assert session_client.get(field_url(field_project)).status_code == 403

    def test_cross_project_ids_rejected(self, session_client, field_project, field_issue, workspace):
        other = Project.objects.create(name="Other", identifier="OTH", workspace=workspace)
        foreign = create_field(other)
        assert (
            session_client.put(value_url(field_issue), {"values": {str(foreign.id): "leak"}}, format="json").status_code
            == 400
        )
        assert session_client.get(f"{field_url(field_project)}{foreign.id}/").status_code == 404
        field_issue.project = other
        field_issue.save()
        assert (
            session_client.get(value_url(field_issue).replace(str(other.id), str(field_project.id))).status_code == 404
        )

    def test_guest_bulk_read_does_not_leak_other_issues(self, session_client, field_project, field_issue, create_user):
        field = create_field(field_project)
        session_client.put(value_url(field_issue), {"values": {str(field.id): "Secret"}}, format="json")
        other = User.objects.create(email="other@example.com", username="other")
        Issue.objects.filter(pk=field_issue.pk).update(created_by=other)
        ProjectMember.objects.filter(project=field_project, member=create_user).update(role=5)
        WorkspaceMember.objects.filter(workspace=field_project.workspace, member=create_user).update(role=15)
        url = field_url(field_project).replace("custom-fields/", "custom-field-values/")
        assert session_client.get(url, {"issues": str(field_issue.id)}).data == {}
        assert session_client.get(value_url(field_issue)).status_code == 404

    @pytest.mark.parametrize("body", [[], None, "bad", {"values": []}, {"values": {"not-uuid": "bad"}}])
    def test_malformed_payload_returns_400(self, session_client, field_issue, body):
        assert session_client.put(value_url(field_issue), body, format="json").status_code == 400

    def test_updates_are_idempotent_and_refresh_work_item_timestamp(self, session_client, field_project, field_issue):
        field = create_field(field_project)
        previous = field_issue.updated_at
        url = value_url(field_issue)
        payload = {"values": {str(field.id): "Saved"}}
        assert session_client.put(url, payload, format="json").status_code == 200
        assert session_client.put(url, payload, format="json").status_code == 200
        field_issue.refresh_from_db()
        assert field_issue.updated_at >= previous
        assert IssueActivity.objects.filter(issue=field_issue, field="custom_field").count() == 1

    def test_hidden_option_cannot_be_newly_selected(self, session_client, field_project, field_issue):
        option = str(uuid4())
        field = create_field(
            field_project,
            "single_select",
            options=[{"id": option, "name": "Old", "color": "#000000", "is_active": False}],
        )
        assert (
            session_client.put(value_url(field_issue), {"values": {str(field.id): option}}, format="json").status_code
            == 400
        )

    def test_uppercase_field_uuid_is_handled_without_server_error(self, session_client, field_project, field_issue):
        field = create_field(field_project)
        response = session_client.put(
            value_url(field_issue), {"values": {str(field.id).upper(): "Saved"}}, format="json"
        )
        assert response.status_code == 200
        assert response.data[str(field.id)] == "Saved"

    def test_active_subscribers_receive_notifications_and_inactive_members_do_not(
        self, session_client, field_project, field_issue
    ):
        from plane.db.models import IssueSubscriber, Notification

        field = create_field(field_project)
        for suffix, active in [("active", True), ("inactive", False)]:
            user = User.objects.create(email=f"{suffix}@example.com", username=suffix)
            WorkspaceMember.objects.create(workspace=field_project.workspace, member=user, role=15, is_active=active)
            ProjectMember.objects.create(project=field_project, member=user, workspace=field_project.workspace, role=15)
            IssueSubscriber.objects.create(issue=field_issue, project=field_project, subscriber=user)
        response = session_client.put(value_url(field_issue), {"values": {str(field.id): "Saved"}}, format="json")
        assert response.status_code == 200
        notifications = Notification.objects.filter(entity_identifier=field_issue.id)
        assert notifications.count() == 1
        assert notifications.get().receiver.email == "active@example.com"
        assert notifications.get().data["issue_activity"]["field"] == "custom_field"
