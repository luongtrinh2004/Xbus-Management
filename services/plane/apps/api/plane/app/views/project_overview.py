from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response

from plane.app.views.base import BaseAPIView
from plane.db.models import Issue, Project, ProjectMember, ProjectOverviewDetails, ProjectStatusUpdate, WorkspaceMember
from plane.db.models.project_overview import PROJECT_HEALTH_STATUSES


class OverviewConflict(APIException):
    status_code = 409

    def __init__(self, code):
        super().__init__({"code": code})


class StrictInput(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict) and set(data) - set(self.fields):
            raise serializers.ValidationError({"code": "unknown_fields"})
        return super().to_internal_value(data)


class OverviewLink(StrictInput):
    title = serializers.CharField(max_length=255)
    url = serializers.URLField(max_length=2048)

    def validate_url(self, value):
        if not value.lower().startswith(("https://", "http://")):
            raise serializers.ValidationError("HTTP(S) required.")
        return value


class OverviewInput(StrictInput):
    revision = serializers.IntegerField(min_value=0)
    start_date = serializers.DateField(allow_null=True)
    target_date = serializers.DateField(allow_null=True)
    links = OverviewLink(many=True, max_length=20)

    def validate(self, attrs):
        if attrs["start_date"] and attrs["target_date"] and attrs["start_date"] > attrs["target_date"]:
            raise serializers.ValidationError({"code": "invalid_date_range"})
        return attrs


class StatusUpdateInput(StrictInput):
    client_request_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=PROJECT_HEALTH_STATUSES)
    title = serializers.CharField(max_length=255)
    summary = serializers.CharField(max_length=10000)


class HistoryQuery(serializers.Serializer):
    page = serializers.IntegerField(default=1, min_value=1, max_value=10000)


def project_access(request, slug, project_id, write=False):
    projects = Project.objects.select_related("workspace")
    if write:
        projects = projects.select_for_update(of=("self",))
    project = get_object_or_404(projects, pk=project_id, workspace__slug=slug, workspace__deleted_at__isnull=True)
    workspace_members = WorkspaceMember.objects.filter(workspace=project.workspace, member=request.user, is_active=True)
    project_members = ProjectMember.objects.filter(
        project=project, workspace=project.workspace, member=request.user, is_active=True
    )
    if write:
        workspace_members = workspace_members.select_for_update()
        project_members = project_members.select_for_update()
    workspace_member = workspace_members.first()
    member = project_members.first()
    if not request.user.is_active or not workspace_member or not member:
        raise PermissionDenied({"code": "project_access_denied"})
    role = min(workspace_member.role, member.role)
    if role < 15 and (write or not project.guest_view_all_features):
        raise PermissionDenied({"code": "project_access_denied"})
    if write and project.archived_at:
        raise OverviewConflict("project_archived")
    return project, role >= 15 and not project.archived_at


def details_payload(details):
    return {
        "start_date": details.start_date.isoformat() if details and details.start_date else None,
        "target_date": details.target_date.isoformat() if details and details.target_date else None,
        "links": details.links if details else [],
        "revision": details.revision if details else 0,
    }


def report_payload(report):
    if not report:
        return None
    return {
        "id": str(report.pk),
        "status": report.status,
        "title": report.title,
        "summary": report.summary,
        "author_id": str(report.author_id) if report.author_id else None,
        "author_name": report.author_name,
        "created_at": report.created_at.isoformat(),
        "client_request_id": str(report.client_request_id),
    }


class ProjectOverview(BaseAPIView):
    def get(self, request, slug, project_id):
        project, can_edit = project_access(request, slug, project_id)
        today = timezone.now().astimezone(ZoneInfo(project.timezone)).date()
        counts = Issue.issue_objects.filter(project=project, workspace=project.workspace).aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(state__group="completed")),
            overdue=Count("id", filter=Q(target_date__lt=today) & ~Q(state__group__in=["completed", "cancelled"])),
        )
        members = (
            ProjectMember.objects.filter(
                project=project,
                workspace=project.workspace,
                is_active=True,
                member__is_active=True,
                member__member_workspace__workspace=project.workspace,
                member__member_workspace__is_active=True,
                member__member_workspace__deleted_at__isnull=True,
            )
            .select_related("member")
            .distinct()
            .order_by("member__display_name", "member_id")
        )
        return Response(
            {
                "project": {"id": str(project.pk), "name": project.name, "description": project.description},
                "details": details_payload(ProjectOverviewDetails.objects.filter(project=project).first()),
                "members": [
                    {
                        "user_id": str(row.member_id),
                        "name": row.member.display_name or row.member.first_name or row.member.email,
                        "role": row.role,
                    }
                    for row in members
                ],
                "task_counts": counts,
                "latest_update": report_payload(ProjectStatusUpdate.objects.filter(project=project).first()),
                "can_edit": bool(can_edit),
            }
        )

    @transaction.atomic
    def put(self, request, slug, project_id):
        project, _ = project_access(request, slug, project_id, write=True)
        serializer = OverviewInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        revision = values.pop("revision")
        details = ProjectOverviewDetails.objects.filter(project=project).first()
        if revision != (details.revision if details else 0):
            raise OverviewConflict("overview_conflict")
        if not details:
            details = ProjectOverviewDetails(project=project, workspace=project.workspace)
        for key, value in values.items():
            setattr(details, key, value)
        details.revision += 1
        details.save()
        return Response(details_payload(details))


class ProjectStatusUpdates(BaseAPIView):
    def get(self, request, slug, project_id):
        project, _ = project_access(request, slug, project_id)
        serializer = HistoryQuery(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        page = serializer.validated_data["page"]
        reports = ProjectStatusUpdate.objects.filter(project=project)
        count = reports.count()
        offset = (page - 1) * 20
        return Response(
            {
                "results": [report_payload(row) for row in reports[offset : offset + 20]],
                "count": count,
                "next_page": page + 1 if offset + 20 < count else None,
            }
        )

    @transaction.atomic
    def post(self, request, slug, project_id):
        project, _ = project_access(request, slug, project_id, write=True)
        serializer = StatusUpdateInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        existing = ProjectStatusUpdate.all_objects.filter(
            project=project, client_request_id=values["client_request_id"]
        ).first()
        if existing:
            if (
                existing.deleted_at
                or existing.author_id != request.user.pk
                or any(getattr(existing, key) != values[key] for key in ("status", "title", "summary"))
            ):
                raise OverviewConflict("report_request_conflict")
            return Response(report_payload(existing))
        report = ProjectStatusUpdate.objects.create(
            project=project,
            workspace=project.workspace,
            author=request.user,
            author_name=request.user.display_name or request.user.first_name or request.user.email,
            **values,
        )
        return Response(report_payload(report), status=201)
