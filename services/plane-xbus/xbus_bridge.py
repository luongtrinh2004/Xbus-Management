"""XBus identity bridge. Installed only in the dedicated XBus Plane API image."""

import json
import logging
import os
import secrets
import uuid

from django.contrib.auth import login
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import connection, transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from plane.db.models import Profile, User, Workspace, WorkspaceMember
from plane.db.models.session import Session, SessionStore
from plane.license.models import Instance, InstanceAdmin

logger = logging.getLogger(__name__)
WORKSPACE_SLUG = "xbus-office"


def identity_id(source_id):
    return uuid.uuid5(uuid.NAMESPACE_URL, f"xbus-office/personnel/{source_id}")


def validate_roster(rows):
    if not isinstance(rows, list) or not rows or len(rows) > 10000:
        raise ValueError("Danh sách nhân sự không hợp lệ.")
    ids, emails = set(), set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Hồ sơ nhân sự không hợp lệ.")
        source_id = row.get("id")
        email = row.get("email")
        if not isinstance(source_id, str) or not source_id or source_id in ids:
            raise ValueError("Mã định danh nhân sự bị thiếu hoặc trùng.")
        if not isinstance(email, str) or email != email.strip().lower() or email in emails:
            raise ValueError("Email nhân sự bị thiếu hoặc trùng.")
        validate_email(email)
        if not isinstance(row.get("name"), str) or not row["name"].strip():
            raise ValueError("Tên nhân sự bị thiếu.")
        if not isinstance(row.get("active"), bool) or row.get("role") not in ("admin", "member"):
            raise ValueError("Trạng thái hoặc quyền nhân sự không hợp lệ.")
        ids.add(source_id)
        emails.add(email)
    if not any(row["active"] and row["role"] == "admin" for row in rows):
        raise ValueError("Cần ít nhất một quản trị viên XBus đang hoạt động.")
    return rows


def sync_roster(rows, actor_id=None):
    rows = validate_roster(rows)
    if actor_id is not None and not any(row["id"] == actor_id and row["active"] for row in rows):
        raise ValueError("Tài khoản XBus không hoạt động.")
    with transaction.atomic():
        # Serialise concurrent page loads so onboarding and membership updates are atomic.
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [736482190])
        mapped = {}
        for row in rows:
            user_id = identity_id(row["id"])
            existing_email = User.objects.filter(email=row["email"]).exclude(pk=user_id).exists()
            if existing_email:
                raise ValueError("Email đã thuộc tài khoản Plane khác; cần đối chiếu trước khi đồng bộ.")
            user, created = User.objects.get_or_create(
                pk=user_id,
                defaults={"email": row["email"], "username": f"xbus-{user_id.hex}"},
            )
            name = row["name"].strip()
            user.email = row["email"]
            # Plane displays first_name + last_name; preserve XBus's Vietnamese
            # full name verbatim instead of reversing the surname and given name.
            user.first_name = name[:150]
            user.last_name = ""
            user.display_name = name[:255]
            user.avatar = str(row.get("avatar") or "")
            # avatar_url prioritises avatar_asset; XBus is the source of truth.
            user.avatar_asset = None
            user.is_active = row["active"]
            user.user_timezone = "Asia/Ho_Chi_Minh"
            if created:
                user.set_unusable_password()
            user.save()
            mapped[row["id"]] = user
        owner_row = next(row for row in rows if row["active"] and row["role"] == "admin")
        owner = mapped[owner_row["id"]]
        admin_ids = [mapped[row["id"]].pk for row in rows if row["active"] and row["role"] == "admin"]
        workspace, _ = Workspace.objects.get_or_create(
            slug=WORKSPACE_SLUG,
            defaults={"name": "XBus Office", "owner": owner, "timezone": "Asia/Ho_Chi_Minh"},
        )
        if workspace.owner_id not in admin_ids:
            workspace.owner = owner
            workspace.save()
        synced_ids = []
        for row in rows:
            user = mapped[row["id"]]
            synced_ids.append(user.pk)
            WorkspaceMember.objects.update_or_create(
                workspace=workspace,
                member=user,
                defaults={
                    "role": 20 if row["role"] == "admin" else 15,
                    "is_active": row["active"],
                    "company_role": " · ".join(str(row.get(key) or "") for key in ("code", "department", "position") if row.get(key)),
                },
            )
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.is_onboarded = True
            profile.last_workspace_id = workspace.pk
            profile.company_name = "XBus Office"
            profile.role = str(row.get("position") or "")[:300]
            profile.onboarding_step = {key: True for key in profile.onboarding_step}
            profile.goals = {**(profile.goals or {}), "xbus": {key: row.get(key, "") for key in ("id", "code", "department", "category", "position")}}
            profile.save()
        # Deactivate only identities belonging to this bridge, preserving historical work.
        User.objects.filter(username__startswith="xbus-").exclude(pk__in=synced_ids).update(is_active=False)
        WorkspaceMember.objects.filter(workspace=workspace, member__username__startswith="xbus-").exclude(member_id__in=synced_ids).update(is_active=False)
        instance = Instance.objects.first()
        if not instance:
            raise ValueError("Plane chưa khởi tạo instance.")
        # Revoke bridge-managed instance privileges when XBus demotes an admin.
        InstanceAdmin.objects.filter(instance=instance, user__username__startswith="xbus-").exclude(user_id__in=admin_ids).update(deleted_at=timezone.now())
        InstanceAdmin.all_objects.update_or_create(instance=instance, user=owner, defaults={"role": 20, "deleted_at": None})
        if not instance.is_setup_done:
            instance.is_setup_done = True
            instance.save()
        ticket = None
        if actor_id is not None:
            store = SessionStore()
            store["xbus_login_user"] = str(mapped[actor_id].pk)
            store["xbus_login_workspace"] = str(workspace.pk)
            store.set_expiry(60)
            store.create()
            ticket = store.session_key
        return {"members": sum(row["active"] for row in rows), "workspace": WORKSPACE_SLUG, "ticket": ticket}


@csrf_exempt
@require_POST
def bootstrap(request):
    secret = os.environ.get("XBUS_BRIDGE_SECRET", "")
    supplied = request.headers.get("X-XBus-Secret", "")
    if len(secret) < 32 or not secrets.compare_digest(secret, supplied):
        return JsonResponse({"error": "Unauthorized"}, status=403)
    try:
        payload = json.loads(request.body)
        if not isinstance(payload, dict):
            raise ValueError("Yêu cầu không hợp lệ.")
        result = sync_roster(payload.get("users"), payload.get("actorId"))
        response = JsonResponse(result)
        response["Cache-Control"] = "no-store"
        return response
    except (ValueError, ValidationError, json.JSONDecodeError):
        return JsonResponse({"error": "Danh sách nhân sự không hợp lệ hoặc xung đột tài khoản Plane."}, status=400)
    except Exception:
        logger.exception("XBus personnel bootstrap failed")
        return JsonResponse({"error": "Không thể đồng bộ nhân sự vào Plane."}, status=500)


@csrf_exempt
@require_POST
def sign_in(request):
    # One-time tickets travel in a form body, never in URLs or access logs.
    ticket = request.POST.get("ticket", "")
    if len(ticket) != 128:
        return JsonResponse({"error": "Phiên đăng nhập không hợp lệ. Hãy mở lại Plane từ XBus."}, status=401)
    with transaction.atomic():
        session = Session.objects.select_for_update().filter(session_key=ticket, expire_date__gt=timezone.now()).first()
        payload = session.get_decoded() if session else {}
        if not payload.get("xbus_login_user"):
            return JsonResponse({"error": "Phiên đăng nhập đã hết hạn hoặc đã dùng. Hãy mở lại Plane từ XBus."}, status=401)
        session.delete()
        user = User.objects.filter(pk=payload["xbus_login_user"], is_active=True).first()
        if not user or not WorkspaceMember.objects.filter(workspace_id=payload["xbus_login_workspace"], member=user, is_active=True).exists():
            return JsonResponse({"error": "Tài khoản không còn quyền truy cập."}, status=403)
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    response = HttpResponseRedirect(f"/{WORKSPACE_SLUG}/projects/")
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response
