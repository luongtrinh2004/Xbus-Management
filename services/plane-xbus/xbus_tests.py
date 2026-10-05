import json
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from plane.db.models import Profile, User, Workspace, WorkspaceMember
from plane.license.models import Instance, InstanceAdmin
from plane.xbus_bridge import identity_id, sync_roster


def roster():
    return [
        {"id": "admin-1", "name": "Nguyễn Văn An", "email": "admin@example.com", "code": "NV001", "role": "admin", "active": True, "department": "Vận hành", "position": "Quản lý"},
        {"id": "staff-1", "name": "Trần Thị Bình", "email": "staff@example.com", "code": "NV002", "role": "member", "active": True, "department": "Kỹ thuật", "category": "Chính thức"},
    ]


class XBusBridgeTests(TestCase):
    def setUp(self):
        Instance.objects.create(instance_name="Test", instance_id="xbus-test", current_version="1.4.2", last_checked_at=timezone.now())

    def test_sync_is_idempotent_and_preserves_real_identity(self):
        sync_roster(roster())
        sync_roster(roster())
        self.assertEqual(User.objects.count(), 2)
        self.assertEqual(Workspace.objects.count(), 1)
        staff = User.objects.get(pk=identity_id("staff-1"))
        self.assertEqual(staff.display_name, "Trần Thị Bình")
        self.assertEqual(staff.full_name, "Trần Thị Bình")
        self.assertFalse(staff.has_usable_password())
        self.assertFalse(staff.is_superuser)
        self.assertEqual(WorkspaceMember.objects.get(member=staff).role, 15)
        self.assertEqual(Profile.objects.get(user=staff).goals["xbus"]["code"], "NV002")

    def test_disabled_and_removed_users_lose_access_without_deletion(self):
        sync_roster(roster())
        rows = roster()
        rows[1]["active"] = False
        sync_roster(rows)
        self.assertFalse(User.objects.get(pk=identity_id("staff-1")).is_active)
        self.assertFalse(WorkspaceMember.objects.get(member_id=identity_id("staff-1")).is_active)
        sync_roster(roster())
        sync_roster(roster()[:1])
        self.assertFalse(User.objects.get(pk=identity_id("staff-1")).is_active)
        self.assertEqual(User.objects.count(), 2)

    def test_untrusted_bootstrap_is_rejected(self):
        with patch.dict("os.environ", {"XBUS_BRIDGE_SECRET": "a" * 64}):
            response = self.client.post("/api/xbus/bootstrap/", json.dumps({"users": roster()}), content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(User.objects.count(), 0)

    def test_ticket_creates_correct_session_and_cannot_be_replayed(self):
        ticket = sync_roster(roster(), "staff-1")["ticket"]
        response = self.client.post("/auth/xbus/", {"ticket": ticket})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/xbus-office/projects/")
        self.assertEqual(self.client.session["_auth_user_id"], str(identity_id("staff-1")))
        self.assertEqual(self.client.post("/auth/xbus/", {"ticket": ticket}).status_code, 401)

    def test_disabled_user_cannot_use_an_issued_ticket(self):
        ticket = sync_roster(roster(), "staff-1")["ticket"]
        rows = roster()
        rows[1]["active"] = False
        sync_roster(rows)
        self.assertEqual(self.client.post("/auth/xbus/", {"ticket": ticket}).status_code, 403)

    def test_invalid_roster_rolls_back(self):
        rows = roster()
        rows[1]["email"] = rows[0]["email"]
        with self.assertRaises(ValueError):
            sync_roster(rows)
        self.assertEqual(User.objects.count(), 0)

    def test_admin_demotion_revokes_privileges_and_transfers_ownership(self):
        sync_roster(roster())
        rows = roster()
        rows[0]["role"] = "member"
        rows[1]["role"] = "admin"
        sync_roster(rows)
        self.assertEqual(Workspace.objects.get(slug="xbus-office").owner_id, identity_id("staff-1"))
        self.assertFalse(InstanceAdmin.objects.filter(user_id=identity_id("admin-1")).exists())
        self.assertEqual(WorkspaceMember.objects.get(member_id=identity_id("admin-1")).role, 15)
        sync_roster(roster())
        self.assertTrue(InstanceAdmin.objects.filter(user_id=identity_id("admin-1")).exists())

    def test_avatar_tracks_the_same_user_and_updated_source_version(self):
        rows = roster()
        rows[0]["avatar"] = "http://localhost:3000/images/avatars/male-admin.png"
        rows[1]["avatar"] = "http://localhost:3000/api/media/avatars/NV002/NV002.png?storage=minio&v=1"
        sync_roster(rows)
        staff = User.objects.get(pk=identity_id("staff-1"))
        self.assertEqual(staff.avatar_url, rows[1]["avatar"])
        self.assertEqual(User.objects.get(pk=identity_id("admin-1")).avatar_url, rows[0]["avatar"])
        rows[1]["avatar"] = rows[1]["avatar"].replace("v=1", "v=2")
        sync_roster(rows)
        staff.refresh_from_db()
        self.assertEqual(staff.avatar_url, rows[1]["avatar"])
        rows[1]["avatar"] = "http://localhost:3000/images/avatars/female-user.png"
        sync_roster(rows)
        staff.refresh_from_db()
        self.assertEqual(staff.avatar_url, rows[1]["avatar"])
