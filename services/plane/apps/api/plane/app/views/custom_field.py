# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json
from uuid import UUID
from django.db import transaction, IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from .base import BaseAPIView
from plane.app.serializers.custom_field import CustomFieldSerializer, validate_custom_value
from plane.db.models import (
    Issue,
    IssueActivity,
    IssueCustomField,
    IssueCustomFieldValue,
    Notification,
    IssueAssignee,
    IssueSubscriber,
    Project,
    ProjectMember,
    WorkspaceMember,
)


class CustomFieldBase(BaseAPIView):
    def project_access(self, request, slug, project_id, write=False):
        project = get_object_or_404(
            Project.objects, pk=project_id, workspace__slug=slug, workspace__deleted_at__isnull=True
        )
        workspace_member = WorkspaceMember.objects.filter(
            workspace=project.workspace, member=request.user, is_active=True
        ).first()
        member = ProjectMember.objects.filter(project=project, member=request.user, is_active=True).first()
        if not workspace_member or not member or (write and member.role < 15 and workspace_member.role < 20):
            raise PermissionDenied()
        if write and project.archived_at:
            raise ValidationError({"project": "Archived projects cannot be edited."})
        return project, member

    def visible_issues(self, request, project, member):
        issues = Issue.objects.filter(project=project, workspace=project.workspace)
        if member.role == 5 and not project.guest_view_all_features:
            issues = issues.filter(created_by=request.user)
        return issues


class CustomFieldList(CustomFieldBase):
    def get(self, request, slug, project_id):
        project, _ = self.project_access(request, slug, project_id)
        return Response(CustomFieldSerializer(IssueCustomField.objects.filter(project=project), many=True).data)

    def post(self, request, slug, project_id):
        project, _ = self.project_access(request, slug, project_id, write=True)
        serializer = CustomFieldSerializer(data=request.data, context={"project": project})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                serializer.save(project=project)
        except IntegrityError:
            raise ValidationError({"name": "A field with this name already exists."})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CustomFieldDetail(CustomFieldBase):
    def get(self, request, slug, project_id, field_id):
        project, _ = self.project_access(request, slug, project_id)
        return Response(
            CustomFieldSerializer(get_object_or_404(IssueCustomField.objects, project=project, pk=field_id)).data
        )

    def patch(self, request, slug, project_id, field_id):
        project, _ = self.project_access(request, slug, project_id, write=True)
        try:
            with transaction.atomic():
                field = get_object_or_404(IssueCustomField.objects.select_for_update(), project=project, pk=field_id)
                serializer = CustomFieldSerializer(field, data=request.data, partial=True, context={"project": project})
                serializer.is_valid(raise_exception=True)
                serializer.save()
        except IntegrityError:
            raise ValidationError({"name": "A field with this name already exists."})
        return Response(serializer.data)


def values_for_issue(issue):
    return {
        str(row.field_id): row.value
        for row in IssueCustomFieldValue.objects.filter(issue=issue, field__deleted_at__isnull=True)
    }


def record_change(issue, field, old_value, new_value, actor):
    activity = IssueActivity.objects.create(
        project=issue.project,
        issue=issue,
        actor=actor,
        verb="updated",
        field="custom_field",
        old_value=json.dumps({"name": field.name, "value": old_value}, ensure_ascii=False),
        new_value=json.dumps({"name": field.name, "value": new_value}, ensure_ascii=False),
        old_identifier=field.id,
        new_identifier=field.id,
        epoch=timezone.now().timestamp(),
    )
    subscribed = IssueSubscriber.objects.filter(issue=issue).values_list("subscriber_id", flat=True)
    assigned = IssueAssignee.objects.filter(issue=issue).values_list("assignee_id", flat=True)
    workspace_ids = WorkspaceMember.objects.filter(workspace=issue.workspace, is_active=True).values_list(
        "member_id", flat=True
    )
    members = ProjectMember.objects.filter(
        project=issue.project,
        is_active=True,
        member__is_active=True,
        member_id__in=workspace_ids,
    ).exclude(member=actor)
    recipients = set(subscribed) | set(assigned)
    notifications = []
    for member in members.filter(member_id__in=recipients):
        if member.role == 5 and not issue.project.guest_view_all_features and issue.created_by_id != member.member_id:
            continue
        notifications.append(
            Notification(
                workspace=issue.workspace,
                project=issue.project,
                receiver_id=member.member_id,
                triggered_by=actor,
                entity_name="issue",
                entity_identifier=issue.id,
                sender="in_app:issue_activities:custom_field",
                title=f"{issue.name}: {field.name}",
                data={
                    "issue": {
                        "id": str(issue.id),
                        "name": issue.name,
                        "identifier": issue.project.identifier,
                        "sequence_id": issue.sequence_id,
                        "state_name": issue.state.name if issue.state else "",
                        "state_group": issue.state.group if issue.state else "",
                    },
                    "issue_activity": {
                        "id": str(activity.id),
                        "actor": str(actor.id),
                        "field": "custom_field",
                        "verb": "updated",
                        "new_value": field.name,
                        "old_value": None,
                    },
                },
            )
        )
    Notification.objects.bulk_create(notifications)


class CustomFieldValues(CustomFieldBase):
    def get(self, request, slug, project_id, issue_id):
        project, member = self.project_access(request, slug, project_id)
        issue = get_object_or_404(self.visible_issues(request, project, member), pk=issue_id)
        return Response(values_for_issue(issue))

    def put(self, request, slug, project_id, issue_id):
        project, member = self.project_access(request, slug, project_id, write=True)
        if not isinstance(request.data, dict) or not isinstance(request.data.get("values"), dict):
            raise ValidationError({"values": "Expected an object."})
        updates = request.data["values"]
        if len(updates) > 100:
            raise ValidationError({"values": "Too many fields."})
        try:
            field_ids = [UUID(key) for key in updates]
            canonical_updates = {str(UUID(key)): value for key, value in updates.items()}
            if len(canonical_updates) != len(updates):
                raise ValidationError({"values": "Duplicate field IDs."})
            updates = canonical_updates
        except (ValueError, TypeError, AttributeError):
            raise ValidationError({"values": "Invalid field ID."})
        with transaction.atomic():
            issue = get_object_or_404(self.visible_issues(request, project, member).select_for_update(), pk=issue_id)
            if issue.archived_at or issue.is_draft or project.archived_at:
                raise ValidationError({"values": "Archived or draft work items cannot be edited here."})
            fields = list(
                IssueCustomField.objects.select_for_update().filter(project=project, pk__in=field_ids, is_active=True)
            )
            if len(fields) != len(updates):
                raise ValidationError({"values": "Unknown or inactive field."})
            previous = values_for_issue(issue)
            validated = {
                str(field.id): validate_custom_value(field, updates[str(field.id)], previous.get(str(field.id)))
                for field in fields
            }
            changed = False
            for field in fields:
                new_value, old_value = validated[str(field.id)], previous.get(str(field.id))
                if new_value == old_value:
                    continue
                if new_value is None:
                    IssueCustomFieldValue.objects.filter(issue=issue, field=field).delete()
                else:
                    IssueCustomFieldValue.objects.update_or_create(
                        issue=issue, field=field, defaults={"project": project, "value": new_value}
                    )
                record_change(issue, field, old_value, new_value, request.user)
                changed = True
            if changed:
                Issue.objects.filter(pk=issue.pk).update(updated_at=timezone.now(), updated_by=request.user)
            return Response(values_for_issue(issue))


class CustomFieldValuesBulk(CustomFieldBase):
    def get(self, request, slug, project_id):
        project, member = self.project_access(request, slug, project_id)
        try:
            ids = [UUID(key) for key in request.query_params.get("issues", "").split(",") if key]
        except (ValueError, TypeError):
            raise ValidationError({"issues": "Invalid work item IDs."})
        if len(ids) > 200:
            raise ValidationError({"issues": "Request at most 200 work items."})
        visible = self.visible_issues(request, project, member).filter(pk__in=ids).values_list("id", flat=True)
        result = {str(pk): {} for pk in visible}
        for row in IssueCustomFieldValue.objects.filter(
            issue_id__in=visible, project=project, field__deleted_at__isnull=True
        ):
            result[str(row.issue_id)][str(row.field_id)] = row.value
        return Response(result)
