# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import math
import re
from datetime import date
from uuid import UUID
from rest_framework import serializers
from plane.db.models import IssueCustomField, ProjectMember, WorkspaceMember


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
