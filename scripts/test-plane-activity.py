"""Isolated bridge checks, without production database or network access."""
import importlib.util
import os
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

class PlaneActivityTests(unittest.TestCase):
    def setUp(self):
        self.manager = Mock()
        modules = {name: types.ModuleType(name) for name in ["django", "django.http", "django.views", "django.views.decorators", "django.views.decorators.http", "plane", "plane.db", "plane.db.models"]}
        modules["django.http"].JsonResponse = lambda data, status=200: {"data": data, "status": status}
        modules["django.views.decorators.http"].require_GET = lambda fn: fn
        modules["plane.db.models"].IssueActivity = types.SimpleNamespace(objects=self.manager)
        spec = importlib.util.spec_from_file_location("bridge", Path(__file__).resolve().parents[1] / "services/plane-xbus/xbus_activity.py")
        self.bridge = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            spec.loader.exec_module(self.bridge)

    def row(self, **changes):
        values = dict(pk="activity-1", actor=types.SimpleNamespace(display_name="Nguyen A",first_name="A",email="a@example.test",profile=types.SimpleNamespace(goals={"xbus":{"id":"staff-1"}})),actor_id="plane-actor", issue=types.SimpleNamespace(name="Task A"), issue_id="task-1",project=types.SimpleNamespace(name="Project A"),issue_comment_id=None,field="state",verb="updated",old_value="Todo",new_value="Done",comment="",created_at=datetime(2026,10,13,tzinfo=timezone.utc))
        values.update(changes)
        return types.SimpleNamespace(**values)

    def test_identity_and_change(self):
        result = self.bridge.serialize_activity(self.row())
        self.assertEqual(result["adminId"],"staff-1")
        self.assertEqual(result["adminName"],"Nguyen A")
        self.assertIn("Trạng thái: Todo → Done",result["details"])
        self.assertEqual(result["id"],"plane-activity-activity-1")

    def test_actions_and_removed_actor(self):
        for verb, field, expected in [("created","","CREATE_WORK_TASK"),("deleted","","DELETE_WORK_TASK"),("created","comment","COMMENT_WORK_TASK"),("deleted","comment","DELETE_WORK_COMMENT")]:
            self.assertEqual(self.bridge.serialize_activity(self.row(verb=verb,field=field,actor=None))["action"],expected)

    def test_secret_and_workspace_scope(self):
        request=types.SimpleNamespace(headers={"X-XBus-Secret":"wrong"})
        with patch.dict(os.environ,{"XBUS_BRIDGE_SECRET":"s"*32}):
            self.assertEqual(self.bridge.activities(request)["status"],403)
            self.manager.filter.assert_not_called()
            request.headers["X-XBus-Secret"]="s"*32
            self.manager.filter.return_value.select_related.return_value.order_by.return_value.iterator.return_value=[self.row()]
            result=self.bridge.activities(request)
            self.assertEqual(len(result["data"]["logs"]),1)
            self.manager.filter.assert_called_once_with(workspace__slug="xbus-office")

    def test_vietnamese_system_details(self):
        result = self.bridge.serialize_activity(self.row(field="archived_at", old_value="archive", new_value="restore"))
        self.assertEqual(result["action"], "RESTORE_WORK_TASK")
        self.assertIn("Đã lưu trữ → Đã khôi phục", result["details"])
        result = self.bridge.serialize_activity(self.row(field="", verb="created", comment="created the issue"))
        self.assertIn("Tạo công việc", result["details"])
        self.assertNotIn("created the issue", result["details"])
        result = self.bridge.serialize_activity(self.row(field="priority", old_value="low", new_value="urgent"))
        self.assertIn("Ưu tiên: Thấp → Khẩn cấp", result["details"])
        result = self.bridge.serialize_activity(self.row(field="estimate_points", old_value="1", new_value="2"))
        self.assertIn("Ước lượng: 1 → 2", result["details"])
        result = self.bridge.serialize_activity(self.row(field="attachment", verb="deleted"))
        self.assertEqual(result["action"], "UPDATE_WORK_TASK")
        self.assertIn("Tệp đính kèm", result["details"])

if __name__ == "__main__":
    unittest.main()
