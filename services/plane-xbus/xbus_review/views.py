from django.db import connection, transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from plane.db.models import Issue, Project, ProjectMember, WorkspaceMember, State
from .models import Review, ReviewEvent, Workflow
from plane.db.models.state import DEFAULT_STATES


def access(user, issue):
    project_id = issue.pk if isinstance(issue, Project) else issue.project_id
    workspace_role = WorkspaceMember.objects.filter(
        workspace_id=issue.workspace_id, member=user, is_active=True
    ).values_list("role", flat=True).first()
    project_role = ProjectMember.objects.filter(
        project_id=project_id, member=user, is_active=True
    ).values_list("role", flat=True).first()
    if not user.is_active or not workspace_role or (workspace_role != 20 and not project_role):
        raise PermissionDenied("Bạn không có quyền truy cập dự án.")
    return workspace_role == 20 or project_role == 20, bool(project_role and project_role >= 15)


class ReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def issue(self, slug, project_id, issue_id, lock=False):
        queryset = Issue.objects.select_for_update() if lock else Issue.objects
        issue = queryset.filter(pk=issue_id, project_id=project_id, workspace__slug=slug).first()
        if not issue:
            raise NotFound("Không tìm thấy công việc.")
        return issue

    def payload(self, user, issue):
        admin, member = access(user, issue)
        review = Review.objects.filter(issue=issue).first()
        candidates = ProjectMember.objects.filter(
            project_id=issue.project_id, is_active=True, role__gte=15,
            member__is_active=True, member__member_workspace__workspace_id=issue.workspace_id,
            member__member_workspace__is_active=True,
        ).select_related("member").distinct()
        reviewer_active = review and candidates.filter(member_id=review.reviewer_id).exists()
        assignee = member and issue.assignees.filter(pk=user.pk, is_active=True).exists()
        editable = issue.archived_at is None
        open_issue = issue.state is None or issue.state.group not in ("completed", "cancelled")
        return {
            "status": review.status if review else "disabled",
            "reviewer_id": str(review.reviewer_id) if review else "",
            "can_configure": admin and editable,
            "can_submit": editable and open_issue and bool(review) and (admin or assignee) and bool(reviewer_active)
                and review.status in ("draft", "rejected"),
            "can_decide": editable and open_issue and bool(review) and review.status == "pending"
                and (admin or (member and reviewer_active and review.reviewer_id == user.pk)),
            "candidates": [{"id": str(row.member_id), "name": row.member.display_name or row.member.email} for row in candidates],
            "events": [{"id": event.pk, "action": event.action, "note": event.note,
                        "actor": event.actor.display_name or event.actor.email,
                        "created_at": event.created_at.isoformat()}
                       for event in review.events.select_related("actor").order_by("-created_at", "-id")[:30]] if review else [],
        }

    def get(self, request, slug, project_id, issue_id):
        return Response(self.payload(request.user, self.issue(slug, project_id, issue_id)))

    @transaction.atomic
    def post(self, request, slug, project_id, issue_id):
        issue = self.issue(slug, project_id, issue_id, lock=True)
        permissions = self.payload(request.user, issue)
        if issue.archived_at:
            raise ValidationError("Hãy khôi phục công việc trước khi nghiệm thu.")
        action = request.data.get("action")
        note = request.data.get("note", "")
        if not isinstance(note, str) or len(note) > 10000:
            raise ValidationError("Nội dung tối đa 10.000 ký tự.")
        note = note.strip()
        review = Review.objects.filter(issue=issue).first()
        if action == "configure":
            if not permissions["can_configure"]:
                raise PermissionDenied("Chỉ Admin được chọn người nghiệm thu.")
            if issue.state and issue.state.group in ("completed", "cancelled"):
                raise ValidationError("Hãy mở lại công việc trước khi cấu hình nghiệm thu.")
            reviewer_id = request.data.get("reviewer_id")
            if reviewer_id not in [row["id"] for row in permissions["candidates"]]:
                raise ValidationError("Người nghiệm thu phải là thành viên đang hoạt động của dự án.")
            review, _ = Review.objects.update_or_create(issue=issue, defaults={"reviewer_id": reviewer_id, "status": "draft"})
            note = f"Người nghiệm thu: {next(row['name'] for row in permissions['candidates'] if row['id'] == reviewer_id)}"
        elif action == "submit":
            if not permissions["can_submit"]:
                raise PermissionDenied("Chỉ người thực hiện hoặc Admin được gửi kiểm tra; cần người nghiệm thu đang hoạt động.")
            if not note:
                raise ValidationError("Ghi kết quả và cách kiểm tra trước khi gửi.")
            if issue.state and issue.state.group in ("completed", "cancelled"):
                raise ValidationError("Hãy mở lại công việc trước khi gửi kiểm tra.")
            review.status = "pending"
            review.save(update_fields=["status"])
        elif action in ("approve", "reject"):
            if not permissions["can_decide"]:
                raise PermissionDenied("Chỉ người nghiệm thu hoặc Admin được duyệt/trả lại công việc đang chờ kiểm tra.")
            if not note:
                raise ValidationError("Ghi lý do duyệt hoặc nội dung cần bổ sung.")
            group = "completed" if action == "approve" else "started"
            state = State.objects.filter(project_id=project_id, group=group).order_by("sequence", "id").first()
            if not state:
                raise ValidationError("Dự án cần có trạng thái Hoàn thành và Đang thực hiện.")
            review.status = "approved" if action == "approve" else "rejected"
            review.save(update_fields=["status"])
            with connection.cursor() as cursor:
                cursor.execute("SELECT set_config('xbus.review_decision', %s, true)", [str(issue.pk)])
                cursor.execute("SELECT set_config('xbus.workflow_actor', %s, true)", [str(request.user.pk)])
            issue.state = state
            issue.updated_by = request.user
            issue.save()
        else:
            raise ValidationError("Hành động không hợp lệ.")
        ReviewEvent.objects.create(review=review, actor=request.user, action=action, note=note)
        return Response(self.payload(request.user, issue))

    def handle_exception(self, exc):
        if isinstance(exc, (DjangoValidationError, ValueError)):
            exc = ValidationError("Dữ liệu không hợp lệ.")
        return super().handle_exception(exc)


class WorkflowView(APIView):
    permission_classes = [IsAuthenticated]

    def project(self, request, slug, project_id):
        project = Project.objects.filter(pk=project_id, workspace__slug=slug).first()
        if not project:
            raise NotFound("Không tìm thấy dự án.")
        admin, _ = access(request.user, project)
        return project, admin

    def payload(self, project, admin):
        group_order = {"backlog": 0, "unstarted": 1, "started": 2, "completed": 3, "cancelled": 4}
        states = sorted(State.objects.filter(project=project), key=lambda state: (group_order.get(state.group, 5), state.sequence, str(state.pk)))
        workflow = Workflow.objects.filter(project=project).first()
        default = {"enabled": False, "require_review": True,
                   "allowed_new": [str(state.pk) for state in states if state.group not in ("completed", "cancelled")],
                   "rules": {f"{source.pk}:{target.pk}": ["admin", "reviewer"] if target.group == "completed" else ["admin", "member"]
                             for source in states for target in states if source.pk != target.pk}}
        config = workflow.config.copy() if workflow else default
        ids = {str(state.pk) for state in states}
        config["allowed_new"] = [value for value in config["allowed_new"] if value in ids]
        config["rules"] = {edge: roles for edge, roles in config["rules"].items()
                           if all(value in ids for value in edge.split(":"))}
        members = ProjectMember.objects.filter(project=project, is_active=True, role__gte=15,
                    member__is_active=True, member__member_workspace__workspace_id=project.workspace_id,
                    member__member_workspace__is_active=True).select_related("member").distinct()
        return {"can_edit": admin, "config": config,
                "members": [{"id": str(row.member_id), "name": row.member.display_name or row.member.email} for row in members],
                "states": [{"id": str(state.pk), "name": state.name, "group": state.group, "color": state.color} for state in states]}

    def get(self, request, slug, project_id):
        project, admin = self.project(request, slug, project_id)
        return Response(self.payload(project, admin))

    @transaction.atomic
    def post(self, request, slug, project_id):
        project, admin = self.project(request, slug, project_id)
        if not admin:
            raise PermissionDenied("Chỉ Admin được sửa workflow.")
        if request.data.get("action") == "initialize_states":
            previous_payload = self.payload(project, admin)
            previous = previous_payload["config"]
            previous_ids = {row["id"] for row in previous_payload["states"]}
            for definition in DEFAULT_STATES:
                if definition["group"] != "triage" and not State.objects.filter(project=project, group=definition["group"]).exists():
                    State.objects.create(project=project, **definition)
            states = list(State.objects.filter(project=project))
            for source in states:
                if source.group not in ("completed", "cancelled") and str(source.pk) not in previous["allowed_new"]:
                    # Only newly added states receive creation permissions; existing choices are preserved.
                    if str(source.pk) not in previous_ids:
                        previous["allowed_new"].append(str(source.pk))
                for target in states:
                    if source.pk != target.pk and (str(source.pk) not in previous_ids or str(target.pk) not in previous_ids):
                        previous["rules"].setdefault(f"{source.pk}:{target.pk}", ["admin", "reviewer"] if target.group == "completed" else ["admin", "member"])
            Workflow.objects.update_or_create(project=project, defaults={"config": previous})
            return Response(self.payload(project, admin))
        config = request.data.get("config")
        ids = {str(value) for value in State.objects.filter(project=project).values_list("id", flat=True)}
        if not isinstance(config, dict) or set(config) != {"enabled", "require_review", "allowed_new", "rules"}:
            raise ValidationError("Cấu hình workflow không hợp lệ.")
        if type(config["enabled"]) is not bool or type(config["require_review"]) is not bool:
            raise ValidationError("Cấu hình bật/tắt không hợp lệ.")
        allowed = config["allowed_new"]
        if not isinstance(allowed, list) or any(not isinstance(value, str) or value not in ids for value in allowed):
            raise ValidationError("Trạng thái tạo mới phải thuộc dự án.")
        if config["enabled"] and not allowed:
            raise ValidationError("Cần ít nhất một trạng thái được tạo công việc mới.")
        if config["require_review"] and State.objects.filter(project=project, pk__in=allowed, group="completed").exists():
            raise ValidationError("Không thể tạo thẳng công việc Hoàn thành khi bắt buộc nghiệm thu.")
        rules = config["rules"]
        if not isinstance(rules, dict) or len(rules) > len(ids) ** 2:
            raise ValidationError("Quy tắc chuyển bước không hợp lệ.")
        members = {f"user:{row['id']}" for row in self.payload(project, admin)["members"]}
        for edge, roles in rules.items():
            parts = edge.split(":")
            if len(parts) != 2 or parts[0] == parts[1] or any(value not in ids for value in parts):
                raise ValidationError("Trạng thái chuyển bước phải thuộc dự án.")
            if not isinstance(roles, list) or any(not isinstance(role, str) or role not in {"admin", "member", "assignee", "reviewer"} | members for role in roles):
                raise ValidationError("Vai trò chuyển bước không hợp lệ.")
        Workflow.objects.update_or_create(project=project, defaults={"config": config})
        return Response(self.payload(project, admin))
