from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils.html import strip_tags
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from plane.app.views.base import BaseAPIView
from plane.app.views.project_overview import StrictInput, project_access
from plane.db.models import Issue, IssueComment
from plane.utils.gemini import GeminiError, generate_assistance


class AssistanceInput(StrictInput):
    action = serializers.ChoiceField(choices=["summary", "description", "subtasks"])
    language = serializers.ChoiceField(choices=["en", "vi-VN"])
    issue_id = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(max_length=16000, required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("issue_id") and not attrs.get("name"):
            raise serializers.ValidationError({"code": "ai_name_required"})
        return attrs


class IssueAssistance(BaseAPIView):
    def post(self, request, slug, project_id):
        project, can_edit = project_access(request, slug, project_id)
        if not can_edit:
            raise PermissionDenied({"code": "ai_access_denied"})
        serializer = AssistanceInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        issue = None
        if data.get("issue_id"):
            issue = get_object_or_404(
                Issue.issue_objects, pk=data["issue_id"], project=project, workspace=project.workspace
            )
            context = {
                "name": issue.name,
                "description": strip_tags(issue.description_html or "")[:16000],
                "comments": [
                    strip_tags(row.comment_html or "")[:2000]
                    for row in IssueComment.objects.filter(issue=issue).order_by("-created_at")[:20]
                ],
                "existing_subtasks": list(
                    Issue.issue_objects.filter(parent=issue, project=project).values_list("name", flat=True)[:50]
                ),
            }
        else:
            context = {"name": data["name"], "description": strip_tags(data.get("description", ""))}
        # One generation per user at a time; bounded lifetime also recovers from worker termination.
        lock = f"issue-ai:{request.user.pk}"
        if not cache.add(lock, True, timeout=120):
            return Response({"code": "ai_busy"}, status=429)
        try:
            result = generate_assistance(data["action"], data["language"], context)
            # Recheck access after the external call before returning task-derived content.
            _, still_editable = project_access(request, slug, project_id)
            if not still_editable:
                raise PermissionDenied({"code": "ai_access_denied"})
            if issue:
                get_object_or_404(Issue.issue_objects, pk=issue.pk, project=project)
            return Response({"action": data["action"], "result": result})
        except GeminiError as exc:
            return Response({"code": exc.code}, status=exc.status)
        finally:
            cache.delete(lock)


class SubtaskInput(StrictInput):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=2000, allow_blank=True)


class ApplyInput(StrictInput):
    request_id = serializers.UUIDField()
    issue_id = serializers.UUIDField()
    subtasks = SubtaskInput(many=True, min_length=1, max_length=8)


class ApplyAISubtasks(BaseAPIView):
    def post(self, request, slug, project_id):
        import json
        from django.db import transaction
        from django.utils.html import escape
        from django.utils import timezone
        from plane.app.serializers.issue import IssueCreateSerializer
        from plane.db.models import IssueAIApplication
        from plane.bgtasks.issue_activities_task import issue_activity

        serializer = ApplyInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        payload = {"issue_id": str(values["issue_id"]), "subtasks": values["subtasks"]}
        with transaction.atomic():
            project, _ = project_access(request, slug, project_id, write=True)
            parent = get_object_or_404(Issue.issue_objects, pk=values["issue_id"], project=project)
            existing = IssueAIApplication.objects.filter(project=project, request_id=values["request_id"]).first()
            if existing:
                if existing.actor_id != request.user.pk or existing.payload != payload:
                    return Response({"code": "ai_apply_conflict"}, status=409)
                return Response(existing.result)
            ids = []
            for task in values["subtasks"]:
                body = {
                    "name": task["name"],
                    "description_html": "<p>" + escape(task["description"]).replace("\n", "<br>") + "</p>",
                    "parent_id": str(parent.pk),
                }
                creator = IssueCreateSerializer(
                    data=body,
                    context={
                        "project_id": project.pk,
                        "workspace_id": project.workspace_id,
                        "default_assignee_id": project.default_assignee_id,
                        "request": request,
                    },
                )
                creator.is_valid(raise_exception=True)
                child = creator.save()
                ids.append(str(child.pk))
                event = dict(
                    type="issue.activity.created",
                    requested_data=json.dumps(body),
                    actor_id=str(request.user.pk),
                    issue_id=str(child.pk),
                    project_id=str(project.pk),
                    current_instance=None,
                    epoch=int(timezone.now().timestamp()),
                    notification=True,
                )
                transaction.on_commit(lambda event=event: issue_activity.delay(**event), robust=True)
            result = {"issue_ids": ids}
            IssueAIApplication.objects.create(
                project=project,
                workspace=project.workspace,
                request_id=values["request_id"],
                actor=request.user,
                payload=payload,
                result=result,
            )
            return Response(result, status=201)
