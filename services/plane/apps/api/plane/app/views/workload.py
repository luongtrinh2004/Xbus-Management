from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from plane.app.views.base import BaseAPIView
from plane.db.models import Issue, IssueAssignee, ProjectMember, WorkspaceMember


class WorkloadQuery(serializers.Serializer):
    start = serializers.DateField(required=False)
    weeks = serializers.IntegerField(default=4, min_value=1, max_value=12)


class WorkloadCapacity(serializers.Serializer):
    weekly_limit = serializers.IntegerField(min_value=1, max_value=1000)


def week_condition(start, end):
    return (
        Q(issue__start_date__lte=end, issue__target_date__gte=start)
        | Q(issue__start_date__isnull=True, issue__target_date__range=(start, end))
        | Q(issue__target_date__isnull=True, issue__start_date__range=(start, end))
    )


def workload_member(request, slug):
    member = get_object_or_404(
        WorkspaceMember.objects.select_related("workspace"),
        workspace__slug=slug,
        workspace__deleted_at__isnull=True,
        member=request.user,
        is_active=True,
    )
    if not request.user.is_active or member.role < 15:
        raise PermissionDenied()
    return member


class WorkspaceWorkload(BaseAPIView):
    def get(self, request, slug):
        member = workload_member(request, slug)
        query = WorkloadQuery(data=request.query_params)
        query.is_valid(raise_exception=True)
        start = (
            query.validated_data.get("start") or timezone.now().astimezone(ZoneInfo(member.workspace.timezone)).date()
        )
        start -= timedelta(days=start.weekday())
        weeks = [start + timedelta(weeks=i) for i in range(query.validated_data["weeks"])]
        memberships = ProjectMember.objects.filter(
            project_id=OuterRef("project_id"),
            workspace=member.workspace,
            member=request.user,
            is_active=True,
        )
        assigned = IssueAssignee.objects.filter(issue_id=OuterRef("pk"), assignee=request.user)
        issues = (
            Issue.objects.filter(
                workspace=member.workspace,
                project__workspace=member.workspace,
                project__deleted_at__isnull=True,
                project__archived_at__isnull=True,
                archived_at__isnull=True,
                is_draft=False,
            )
            .exclude(state__group__in=["completed", "cancelled"])
            .annotate(
                allowed_member=Exists(memberships),
                full_member=Exists(memberships.filter(role__gte=15)),
                assigned_to_viewer=Exists(assigned),
            )
            .filter(allowed_member=True)
            .filter(
                Q(full_member=True)
                | Q(project__guest_view_all_features=True)
                | Q(created_by=request.user)
                | Q(assigned_to_viewer=True)
            )
        )
        roster = (
            WorkspaceMember.objects.filter(
                workspace=member.workspace,
                is_active=True,
                member__is_active=True,
                member__is_bot=False,
            )
            .select_related("member")
            .order_by("member__display_name", "member_id")
        )
        counts = {
            str(row["assignee_id"]): row
            for row in IssueAssignee.objects.filter(issue__in=issues, assignee_id__in=roster.values("member_id"))
            .values("assignee_id")
            .annotate(
                unscheduled=Count(
                    "issue_id", distinct=True, filter=Q(issue__start_date__isnull=True, issue__target_date__isnull=True)
                ),
                **{
                    f"week_{i}": Count("issue_id", distinct=True, filter=week_condition(day, day + timedelta(days=6)))
                    for i, day in enumerate(weeks)
                },
            )
        }
        rows = []
        for row in roster:
            prefs = row.view_props if isinstance(row.view_props, dict) else {}
            limit = prefs.get("workload_weekly_limit", 20)
            if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 1000:
                limit = 20
            values = counts.get(str(row.member_id), {})
            rows.append(
                {
                    "user_id": str(row.member_id),
                    "name": row.member.display_name or row.member.first_name or row.member.email,
                    "weekly_limit": limit,
                    "counts": [values.get(f"week_{i}", 0) for i in range(len(weeks))],
                    "unscheduled": values.get("unscheduled", 0),
                }
            )
        return Response(
            {"weeks": [day.isoformat() for day in weeks], "members": rows, "can_edit_capacity": member.role == 20}
        )


class WorkspaceWorkloadCapacity(BaseAPIView):
    def put(self, request, slug, user_id):
        viewer = workload_member(request, slug)
        if viewer.role != 20:
            raise PermissionDenied()
        serializer = WorkloadCapacity(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            member = get_object_or_404(
                WorkspaceMember.objects.select_for_update(),
                workspace=viewer.workspace,
                member_id=user_id,
                is_active=True,
                member__is_active=True,
            )
            prefs = dict(member.view_props) if isinstance(member.view_props, dict) else {}
            prefs["workload_weekly_limit"] = serializer.validated_data["weekly_limit"]
            member.view_props = prefs
            member.save(update_fields=["view_props", "updated_at"])
        return Response({"user_id": str(user_id), "weekly_limit": serializer.validated_data["weekly_limit"]})
