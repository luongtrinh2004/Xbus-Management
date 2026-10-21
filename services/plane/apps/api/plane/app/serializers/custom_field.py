# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import math
import re
from datetime import date
from uuid import UUID
from crum import get_current_user
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from plane.db.models import IssueCustomField, IssueCustomFieldValue, Project, ProjectMember, WorkspaceMember


def validate_project_custom_values(serializer, values, *, lock=False):
    """Validate create/update values using the same contract as the cell editor."""
    if not isinstance(values, dict) or len(values) > 100:
        raise serializers.ValidationError("Expected up to 100 custom field values.")
    try:
        canonical = {str(UUID(key)): value for key, value in values.items()}
        if len(canonical) != len(values):
            raise ValueError
    except (ValueError, TypeError, AttributeError):
        raise serializers.ValidationError("Invalid or duplicate custom field ID.")
    if not canonical:
        return {}
    project_id = serializer.context.get("project_id", getattr(serializer.instance, "project_id", None))
    workspace_id = serializer.context.get("workspace_id", getattr(serializer.instance, "workspace_id", None))
    projects = Project.objects.filter(pk=project_id, archived_at__isnull=True, workspace__deleted_at__isnull=True)
    if workspace_id:
        projects = projects.filter(workspace_id=workspace_id)
    project = projects.first()
    if not project:
        raise serializers.ValidationError("Select an active project for custom fields.")
    request = serializer.context.get("request")
    actor = getattr(request, "user", None) or get_current_user()
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise PermissionDenied()
    workspace_member = WorkspaceMember.objects.filter(workspace=project.workspace, member=actor, is_active=True).first()
    member = ProjectMember.objects.filter(project=project, member=actor, is_active=True).first()
    if not workspace_member or not member or (member.role < 15 and workspace_member.role < 20):
        raise PermissionDenied()
    previous = serializer.context.get("custom_field_previous_values", {})
    instance = serializer.instance
    if instance and str(instance.project_id) == str(project_id):
        stored = getattr(instance, "custom_field_values", None)
        previous = stored if isinstance(stored, dict) else {
            str(row.field_id): row.value for row in IssueCustomFieldValue.objects.filter(issue=instance)
        }
    fields = IssueCustomField.objects.filter(project=project, pk__in=canonical)
    if lock:
        fields = fields.select_for_update()
    fields = list(fields)
    if len(fields) != len(canonical):
        raise serializers.ValidationError("Unknown custom field for this project.")
    result = {}
    for field in fields:
        key = str(field.id)
        if not field.is_active and (key not in previous or canonical[key] != previous[key]):
            raise serializers.ValidationError({key: "This custom field is inactive."})
        result[key] = validate_custom_value(field, canonical[key], previous.get(key))
    return result


def save_issue_custom_values(serializer, issue, values, *, creating=False):
    values = validate_project_custom_values(serializer, values, lock=True)
    for field_id, value in values.items():
        previous = IssueCustomFieldValue.objects.filter(issue=issue, field_id=field_id).first()
        old_value = previous.value if previous else None
        if old_value == value:
            continue
        if value is None:
            IssueCustomFieldValue.objects.filter(issue=issue, field_id=field_id).delete()
        else:
            IssueCustomFieldValue.objects.update_or_create(
                issue=issue, field_id=field_id,
                defaults={"project_id": issue.project_id, "value": value},
            )
        if not creating:
            # Import after app initialization; the existing cell endpoint owns
            # the activity/notification contract for custom field changes.
            from plane.app.views.custom_field import record_change
            request = serializer.context.get("request")
            actor = getattr(request, "user", None) or get_current_user()
            field = IssueCustomField.objects.get(pk=field_id)
            record_change(issue, field, old_value, value, actor)


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueCustomField
        fields = ["id", "project", "name", "field_type", "options", "number_format", "sort_order", "is_active"]
        read_only_fields = ["id", "project"]
        validators = []

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        duplicates = IssueCustomField.objects.filter(project=self.context["project"], name__iexact=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("A field with this name already exists.")
        return value

    def validate(self, attrs):
        if self.instance and attrs.get("field_type", self.instance.field_type) != self.instance.field_type:
            raise serializers.ValidationError(
                {"field_type": "Field type cannot be changed. Create a new field instead."}
            )
        return attrs

    def validate_options(self, options):
        if not isinstance(options, list) or len(options) > 100:
            raise serializers.ValidationError("Expected up to 100 options.")
        result, ids = [], set()
        for option in options:
            if not isinstance(option, dict):
                raise serializers.ValidationError("Each option must be an object.")
            try:
                option_id = str(UUID(str(option.get("id"))))
            except (ValueError, TypeError, AttributeError):
                raise serializers.ValidationError("Each option needs a valid UUID.")
            name = option.get("name")
            color = option.get("color", "#6b7280")
            active = option.get("is_active", True)
            if option_id in ids or not isinstance(name, str) or not name.strip() or len(name) > 100:
                raise serializers.ValidationError("Option IDs must be unique and names nonempty.")
            if (
                not isinstance(color, str)
                or not re.fullmatch(r"#[0-9a-fA-F]{6}", color)
                or not isinstance(active, bool)
            ):
                raise serializers.ValidationError("Invalid option color or visibility.")
            ids.add(option_id)
            result.append({"id": option_id, "name": name.strip(), "color": color, "is_active": active})
        if self.instance and not {o["id"] for o in self.instance.options}.issubset(ids):
            raise serializers.ValidationError("Hide existing options instead of removing their IDs.")
        return result


def validate_custom_value(field, value, previous=None):
    if value is None:
        return None
    kind = field.field_type
    if kind == "text":
        valid = isinstance(value, str) and len(value) <= 10000
    elif kind == "number":
        valid = isinstance(value, (int, float)) and not isinstance(value, bool)
        if valid:
            try:
                valid = math.isfinite(value)
            except OverflowError:
                valid = False
    elif kind == "date":
        try:
            valid = isinstance(value, str) and date.fromisoformat(value).isoformat() == value
        except (ValueError, TypeError):
            valid = False
    elif kind in ("single_select", "multi_select"):
        selected = [value] if kind == "single_select" else value
        valid = isinstance(selected, list) and all(isinstance(item, str) for item in selected)
        if valid:
            valid = len(selected) == len(set(selected))
            previous_ids = previous if isinstance(previous, list) else [previous]
            allowed = {o["id"] for o in field.options if o.get("is_active", True) or o["id"] in previous_ids}
            valid = valid and set(selected).issubset(allowed)
    elif kind == "people":
        valid = isinstance(value, list) and len(value) <= 100 and all(isinstance(item, str) for item in value)
        if valid:
            try:
                canonical = [str(UUID(item)) for item in value]
            except ValueError:
                canonical = []
                valid = False
            if valid:
                active_workspace_ids = WorkspaceMember.objects.filter(
                    workspace_id=field.workspace_id,
                    is_active=True,
                    member__is_active=True,
                ).values_list("member_id", flat=True)
                allowed = (
                    ProjectMember.objects.filter(
                        project_id=field.project_id,
                        is_active=True,
                        member_id__in=active_workspace_ids,
                    )
                    .filter(member_id__in=canonical)
                    .values_list("member_id", flat=True)
                )
                valid = len(set(canonical)) == len(value) and set(canonical) == {str(pk) for pk in allowed}
    else:
        valid = False
    if not valid:
        raise serializers.ValidationError({str(field.id): "Invalid value for this field type."})
    return value
