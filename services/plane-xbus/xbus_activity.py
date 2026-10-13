"""Read-only activity bridge for the dedicated XBus workspace."""
import os
import secrets
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from plane.db.models import IssueActivity

FIELD_LABELS = {
    "name": "Tên công việc", "description": "Mô tả", "state": "Trạng thái",
    "priority": "Ưu tiên", "assignees": "Người thực hiện", "labels": "Nhãn",
    "start_date": "Ngày bắt đầu", "target_date": "Hạn hoàn thành", "parent": "Công việc cha",
    "archived_at": "Lưu trữ", "issue_comment": "Bình luận", "comment": "Bình luận",
    "issue": "Công việc", "cycles": "Chu kỳ", "modules": "Nhóm công việc",
    "link": "Liên kết", "attachment": "Tệp đính kèm", "reaction": "Cảm xúc",
    "estimate": "Ước lượng", "estimate_point": "Điểm ước lượng",
}
ACTION_DETAILS = {
    "CREATE_WORK_TASK": "Tạo công việc", "UPDATE_WORK_TASK": "Cập nhật công việc",
    "DELETE_WORK_TASK": "Xóa công việc", "ARCHIVE_WORK_TASK": "Lưu trữ công việc",
    "RESTORE_WORK_TASK": "Khôi phục công việc",
    "COMMENT_WORK_TASK": "Thêm bình luận", "UPDATE_WORK_COMMENT": "Sửa bình luận",
    "DELETE_WORK_COMMENT": "Xóa bình luận",
}
PRIORITY_LABELS = {"urgent": "Khẩn cấp", "high": "Cao", "medium": "Trung bình", "low": "Thấp", "none": "Không ưu tiên"}

def activity_value(field, value):
    if value is None or value == "":
        return "—"
    if field == "priority":
        return PRIORITY_LABELS.get(str(value).lower(), str(value))
    if field == "archived_at":
        return {"archive": "Đã lưu trữ", "manual_archive": "Đã lưu trữ", "restore": "Đã khôi phục"}.get(str(value), str(value))
    return str(value)

def serialize_activity(activity):
    actor = activity.actor
    profile = getattr(actor, "profile", None) if actor else None
    identity = (profile.goals or {}).get("xbus", {}) if profile else {}
    name = actor.display_name or actor.first_name or actor.email if actor else "Không xác định"
    field = activity.field or ""
    is_comment = bool(activity.issue_comment_id) or "comment" in field
    action = "UPDATE_WORK_TASK"
    if is_comment:
        action = {"created": "COMMENT_WORK_TASK", "deleted": "DELETE_WORK_COMMENT"}.get(activity.verb, "UPDATE_WORK_COMMENT")
    elif activity.verb == "created" and not field:
        action = "CREATE_WORK_TASK"
    elif activity.verb == "deleted" and field in ("", "issue"):
        action = "DELETE_WORK_TASK"
    elif field == "archived_at":
        action = "RESTORE_WORK_TASK" if activity.new_value == "restore" else "ARCHIVE_WORK_TASK"
    issue = activity.issue
    title = issue.name if issue else str(activity.issue_id or "")
    project = activity.project
    details = f"{project.name if project else ''} · {title}"
    details += f" · {ACTION_DETAILS[action]}"
    if field:
        label = "Ước lượng" if field.startswith("estimate_") else FIELD_LABELS.get(field, "Thông tin công việc")
        old_value = activity_value(field, activity.old_value)
        new_value = activity_value(field, activity.new_value)
        details += f" · {label}: {old_value} → {new_value}"
    return {
        "id": f"plane-activity-{activity.pk}",
        "adminId": identity.get("id", str(activity.actor_id or "")),
        "adminName": name, "adminEmail": actor.email if actor else "",
        "action": action, "targetType": "WORK_TASK", "targetId": str(activity.issue_id or ""),
        "details": details, "timestamp": activity.created_at.isoformat(), "source": "plane",
    }

@require_GET
def activities(request):
    secret = os.environ.get("XBUS_BRIDGE_SECRET", "")
    if len(secret) < 32 or not secrets.compare_digest(secret, request.headers.get("X-XBus-Secret", "")):
        return JsonResponse({"error": "Unauthorized"}, status=403)
    rows = IssueActivity.objects.filter(workspace__slug="xbus-office").select_related("actor", "actor__profile", "issue", "project").order_by("-created_at")
    response = JsonResponse({"logs": [serialize_activity(row) for row in rows.iterator(chunk_size=500)]})
    response["Cache-Control"] = "no-store"
    return response
