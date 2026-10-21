# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from uuid import UUID
from math import isfinite

from django.db import transaction
from django.db.models import Exists, OuterRef, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .base import BaseAPIView
from plane.app.serializers import IssueSerializer
from plane.db.models import Issue, IssueAssignee, IssueUserPlan, ProjectMember, WorkspaceMember


class UserPlanSerializer(serializers.Serializer):
    bucket = serializers.ChoiceField(choices=IssueUserPlan.BUCKETS)
    sort_order = serializers.FloatField(min_value=-1e15, max_value=1e15)

    def validate_sort_order(self, value):
        if not isfinite(value):
            raise serializers.ValidationError("Order must be a finite number.")
        return value


class MyTaskPlanningBase(BaseAPIView):
    def assigned_issues(self, request, slug):
        if not request.user.is_active or not WorkspaceMember.objects.filter(
            workspace__slug=slug, workspace__deleted_at__isnull=True, member=request.user, is_active=True
        ).exists():
            raise PermissionDenied()
        memberships = ProjectMember.objects.filter(
            project_id=OuterRef("project_id"), member=request.user, is_active=True,
            workspace__slug=slug, project__deleted_at__isnull=True,
        )
        return Issue.objects.filter(
            workspace__slug=slug, project__workspace__slug=slug, project__deleted_at__isnull=True,
            is_draft=False, archived_at__isnull=True, project__archived_at__isnull=True,
        ).annotate(
            active_project_member=Exists(memberships),
            full_project_member=Exists(memberships.filter(role__gte=15)),
            current_assignment=Exists(IssueAssignee.objects.filter(issue_id=OuterRef("pk"), assignee=request.user)),
        ).filter(active_project_member=True, current_assignment=True).filter(
            Q(full_project_member=True) | Q(project__guest_view_all_features=True) | Q(created_by=request.user)
        ).distinct()


class MyTaskPlanningList(MyTaskPlanningBase):
    def get(self, request, slug):
        issues = self.assigned_issues(request, slug)
        if request.query_params.get("include_completed") != "true":
            issues = issues.exclude(state__group__in=["completed", "cancelled"])
        cursor = request.query_params.get("cursor")
        if cursor:
            try:
                issues = issues.filter(id__gt=UUID(cursor))
            except (ValueError, TypeError, AttributeError):
                raise ValidationError({"cursor": "Invalid cursor."})
        page = list(issues.select_related("state", "project").prefetch_related(
            Prefetch("issue_assignee", queryset=IssueAssignee.objects.all(), to_attr="planning_assignees")
        ).order_by("id")[:101])
        has_more = len(page) > 100
        page = page[:100]
        plans = {row.issue_id: row for row in IssueUserPlan.objects.filter(user=request.user, issue__in=page)}
        results = []
        for issue in page:
            plan = plans.get(issue.id)
            data = IssueSerializer(issue).data
            data["assignee_ids"] = [str(assignment.assignee_id) for assignment in issue.planning_assignees]
            data["type_id"] = str(issue.type_id) if issue.type_id else None
            results.append({
                "issue": data,
                "bucket": plan.bucket if plan else "recently_assigned",
                "sort_order": plan.sort_order if plan else -issue.created_at.timestamp() * 1000,
            })
        return Response({"results": results, "next_cursor": str(page[-1].id) if has_more else None})


class MyTaskPlanningDetail(MyTaskPlanningBase):
    def patch(self, request, slug, issue_id):
        serializer = UserPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            # The workspace member is a per-user lock, including the first placement for an issue.
            get_object_or_404(WorkspaceMember.objects.select_for_update(), workspace__slug=slug, member=request.user, is_active=True)
            issue = get_object_or_404(self.assigned_issues(request, slug), pk=issue_id)
            plan, _ = IssueUserPlan.objects.update_or_create(
                user=request.user, issue=issue,
                defaults={**serializer.validated_data, "created_by": request.user, "updated_by": request.user},
            )
        return Response({"issue_id": str(issue.id), "bucket": plan.bucket, "sort_order": plan.sort_order})
