# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import json
from uuid import UUID

# Django imports
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q, OuterRef, F, Func, UUIDField, Value, CharField, Subquery
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.functions import Coalesce
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields import ArrayField

# Third Party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from .. import BaseViewSet
from plane.app.serializers import IssueRelationSerializer, RelatedIssueSerializer
from plane.app.permissions import ProjectEntityPermission
from plane.db.models import (
    Project,
    IssueRelation,
    Issue,
    FileAsset,
    IssueLink,
    CycleIssue,
    Workspace,
)
from plane.bgtasks.issue_activities_task import issue_activity
from plane.utils.issue_relation_mapper import get_actual_relation
from plane.utils.host import base_host
from plane.utils.issue_dependencies import DEPENDENCY_RELATIONS, find_dependency_cycle


class IssueRelationViewSet(BaseViewSet):
    serializer_class = IssueRelationSerializer
    model = IssueRelation
    permission_classes = [ProjectEntityPermission]

    def list(self, request, slug, project_id, issue_id):
        issue_relations = (
            IssueRelation.objects.filter(Q(issue_id=issue_id) | Q(related_issue=issue_id))
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("project")
            .select_related("workspace")
            .select_related("issue")
            .order_by("-created_at")
            .distinct()
        )
        # get all blocking issues
        blocking_issues = issue_relations.filter(relation_type="blocked_by", related_issue_id=issue_id).values_list(
            "issue_id", flat=True
        )

        # get all blocked by issues
        blocked_by_issues = issue_relations.filter(relation_type="blocked_by", issue_id=issue_id).values_list(
            "related_issue_id", flat=True
        )

        # get all duplicate issues
        duplicate_issues = issue_relations.filter(issue_id=issue_id, relation_type="duplicate").values_list(
            "related_issue_id", flat=True
        )

        # get all relates to issues
        duplicate_issues_related = issue_relations.filter(
            related_issue_id=issue_id, relation_type="duplicate"
        ).values_list("issue_id", flat=True)

        # get all relates to issues
        relates_to_issues = issue_relations.filter(issue_id=issue_id, relation_type="relates_to").values_list(
            "related_issue_id", flat=True
        )

        # get all relates to issues
        relates_to_issues_related = issue_relations.filter(
            related_issue_id=issue_id, relation_type="relates_to"
        ).values_list("issue_id", flat=True)

        # get all start after issues
        start_after_issues = issue_relations.filter(
            relation_type="start_before", related_issue_id=issue_id
        ).values_list("issue_id", flat=True)

        # get all start_before issues
        start_before_issues = issue_relations.filter(relation_type="start_before", issue_id=issue_id).values_list(
            "related_issue_id", flat=True
        )

        # get all finish after issues
        finish_after_issues = issue_relations.filter(
            relation_type="finish_before", related_issue_id=issue_id
        ).values_list("issue_id", flat=True)

        # get all finish before issues
        finish_before_issues = issue_relations.filter(relation_type="finish_before", issue_id=issue_id).values_list(
            "related_issue_id", flat=True
        )

        queryset = (
            Issue.issue_objects.filter(workspace__slug=slug)
            .select_related("workspace", "project", "state", "parent")
            .prefetch_related("assignees", "labels", "issue_module__module")
            .annotate(
                cycle_id=Subquery(
                    CycleIssue.objects.filter(issue=OuterRef("id"), deleted_at__isnull=True).values("cycle_id")[:1]
                )
            )
            .annotate(
                link_count=IssueLink.objects.filter(issue=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                attachment_count=FileAsset.objects.filter(
                    issue_id=OuterRef("id"),
                    entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
                )
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                label_ids=Coalesce(
                    ArrayAgg(
                        "labels__id",
                        distinct=True,
                        filter=Q(~Q(labels__id__isnull=True) & (Q(label_issue__deleted_at__isnull=True))),
                    ),
                    Value([], output_field=ArrayField(UUIDField())),
                ),
                assignee_ids=Coalesce(
                    ArrayAgg(
                        "assignees__id",
                        distinct=True,
                        filter=Q(
                            ~Q(assignees__id__isnull=True)
                            & Q(assignees__member_project__is_active=True)
                            & Q(issue_assignee__deleted_at__isnull=True)
                        ),
                    ),
                    Value([], output_field=ArrayField(UUIDField())),
                ),
            )
        ).distinct()

        # Fields
        fields = [
            "id",
            "name",
            "state_id",
            "sort_order",
            "priority",
            "sequence_id",
            "project_id",
            "label_ids",
            "assignee_ids",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "relation_type",
        ]

        response_data = {
            "blocking": queryset.filter(pk__in=blocking_issues)
            .annotate(relation_type=Value("blocking", output_field=CharField()))
            .values(*fields),
            "blocked_by": queryset.filter(pk__in=blocked_by_issues)
            .annotate(relation_type=Value("blocked_by", output_field=CharField()))
            .values(*fields),
            "duplicate": queryset.filter(pk__in=duplicate_issues)
            .annotate(relation_type=Value("duplicate", output_field=CharField()))
            .values(*fields)
            | queryset.filter(pk__in=duplicate_issues_related)
            .annotate(relation_type=Value("duplicate", output_field=CharField()))
            .values(*fields),
            "relates_to": queryset.filter(pk__in=relates_to_issues)
            .annotate(relation_type=Value("relates_to", output_field=CharField()))
            .values(*fields)
            | queryset.filter(pk__in=relates_to_issues_related)
            .annotate(relation_type=Value("relates_to", output_field=CharField()))
            .values(*fields),
            "start_after": queryset.filter(pk__in=start_after_issues)
            .annotate(relation_type=Value("start_after", output_field=CharField()))
            .values(*fields),
            "start_before": queryset.filter(pk__in=start_before_issues)
            .annotate(relation_type=Value("start_before", output_field=CharField()))
            .values(*fields),
            "finish_after": queryset.filter(pk__in=finish_after_issues)
            .annotate(relation_type=Value("finish_after", output_field=CharField()))
            .values(*fields),
            "finish_before": queryset.filter(pk__in=finish_before_issues)
            .annotate(relation_type=Value("finish_before", output_field=CharField()))
            .values(*fields),
        }

        return Response(response_data, status=status.HTTP_200_OK)

    def create(self, request, slug, project_id, issue_id):
        relation_type = request.data.get("relation_type", None)
        if relation_type is None:
            return Response(
                {"message": "Issue relation type is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = {
            "blocked_by",
            "blocking",
            "start_before",
            "start_after",
            "finish_before",
            "finish_after",
            "relates_to",
            "duplicate",
            "implemented_by",
            "implements",
        }
        if relation_type not in allowed_types:
            return Response({"error": "Invalid issue relation type", "code": "invalid_relation_type"}, status=400)

        requested_issues = request.data.get("issues", [])
        if not isinstance(requested_issues, list) or not requested_issues:
            return Response({"error": "Select at least one issue", "code": "related_issues_required"}, status=400)
        try:
            requested_ids = {UUID(str(value)) for value in requested_issues}
        except (ValueError, TypeError, AttributeError):
            return Response({"error": "Invalid related issue identifier", "code": "invalid_related_issue"}, status=400)

        if UUID(str(issue_id)) in requested_ids:
            return Response({"error": "A task cannot depend on itself", "code": "self_dependency"}, status=400)

        project = get_object_or_404(Project, pk=project_id, workspace__slug=slug)
        actual_type = get_actual_relation(relation_type)
        reverse = relation_type in ["blocking", "start_after", "finish_after"]
        with transaction.atomic():
            # Relations may span projects. Serialize graph checks across the workspace so
            # concurrent A -> B and B -> A requests cannot both pass validation.
            Workspace.objects.select_for_update().get(pk=project.workspace_id)
            get_object_or_404(Issue.issue_objects, pk=issue_id, project_id=project_id, workspace__slug=slug)
            issues = list(
                Issue.issue_objects.filter(workspace__slug=slug, pk__in=requested_ids).values_list("id", flat=True)
            )
            if set(issues) != requested_ids:
                return Response({"error": "A related task is unavailable", "code": "invalid_related_issue"}, status=400)

            proposed = [
                (actual_type, issue if reverse else issue_id, issue_id if reverse else issue) for issue in issues
            ]
            pair_filter = (
                Q(issue_id__in=issues, related_issue_id=issue_id)
                if reverse
                else Q(issue_id=issue_id, related_issue_id__in=issues)
            )
            if IssueRelation.objects.filter(pair_filter).exclude(relation_type=actual_type).exists():
                return Response(
                    {
                        "error": "Another relation already links these tasks. Remove it before adding a new relation.",
                        "code": "relation_conflict",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if actual_type in DEPENDENCY_RELATIONS:
                existing = IssueRelation.objects.filter(
                    workspace_id=project.workspace_id,
                    relation_type__in=DEPENDENCY_RELATIONS,
                    deleted_at__isnull=True,
                    issue__deleted_at__isnull=True,
                    related_issue__deleted_at__isnull=True,
                ).values_list("relation_type", "issue_id", "related_issue_id")
                if find_dependency_cycle(existing, proposed):
                    return Response(
                        {
                            "error": "This dependency would create a circular dependency",
                            "code": "dependency_cycle",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            issue_relation = IssueRelation.objects.bulk_create(
                [
                    IssueRelation(
                        issue_id=source,
                        related_issue_id=target,
                        relation_type=stored_type,
                        project_id=project_id,
                        workspace_id=project.workspace_id,
                        created_by=request.user,
                        updated_by=request.user,
                    )
                    for stored_type, source, target in proposed
                ],
                batch_size=10,
                ignore_conflicts=True,
            )

        issue_activity.delay(
            type="issue_relation.activity.created",
            requested_data=json.dumps(request.data, cls=DjangoJSONEncoder),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )

        if reverse:
            return Response(
                RelatedIssueSerializer(issue_relation, many=True).data,
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                IssueRelationSerializer(issue_relation, many=True).data,
                status=status.HTTP_201_CREATED,
            )

    def remove_relation(self, request, slug, project_id, issue_id):
        related_issue = request.data.get("related_issue", None)

        issue_relations = IssueRelation.objects.filter(
            workspace__slug=slug,
        ).filter(
            Q(issue_id=related_issue, related_issue_id=issue_id) | Q(issue_id=issue_id, related_issue_id=related_issue)
        )
        issue_relations = issue_relations.first()
        current_instance = json.dumps(IssueRelationSerializer(issue_relations).data, cls=DjangoJSONEncoder)
        issue_relations.delete()
        issue_activity.delay(
            type="issue_relation.activity.deleted",
            requested_data=json.dumps(request.data, cls=DjangoJSONEncoder),
            actor_id=str(request.user.id),
            issue_id=str(issue_id),
            project_id=str(project_id),
            current_instance=current_instance,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
