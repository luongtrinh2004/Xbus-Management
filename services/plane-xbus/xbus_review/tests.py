from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from plane.db.models import User, Workspace, WorkspaceMember, Project, ProjectMember, Issue, IssueAssignee, State
from .models import Review, Workflow


class ReviewTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create(email="review-admin@example.com", username="review-admin")
        self.worker = User.objects.create(email="review-worker@example.com", username="review-worker")
        self.reviewer = User.objects.create(email="review-reviewer@example.com", username="review-reviewer")
        self.other = User.objects.create(email="review-other@example.com", username="review-other")
        self.workspace = Workspace.objects.create(name="Review", slug="review-tests", owner=self.admin)
        self.project = Project.objects.create(workspace=self.workspace, name="Review", identifier="REV")
        for user in (self.admin, self.worker, self.reviewer, self.other):
            WorkspaceMember.objects.create(workspace=self.workspace, member=user, role=20 if user == self.admin else 15)
            ProjectMember.objects.create(project=self.project, member=user, role=20 if user == self.admin else 15)
        self.started = State.objects.create(project=self.project, name="Doing", color="#123456", group="started")
        self.completed = State.objects.create(project=self.project, name="Done", color="#123456", group="completed")
        self.issue = Issue.objects.create(project=self.project, name="Task", state=self.started)
        IssueAssignee.objects.create(project=self.project, issue=self.issue, assignee=self.worker)
        self.client = APIClient()
        self.url = f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/issues/{self.issue.pk}/xbus-review/"

    def act(self, user, action, **extra):
        self.client.force_authenticate(user=user)
        return self.client.post(self.url, {"action": action, "note": "Kết quả kiểm tra", **extra}, format="json")

    def configure(self):
        response = self.act(self.admin, "configure", reviewer_id=str(self.reviewer.pk))
        self.assertEqual(response.status_code, 200, response.data)

    def test_only_admin_can_configure(self):
        self.assertEqual(self.act(self.worker, "configure", reviewer_id=str(self.reviewer.pk)).status_code, 403)

    def test_only_assignee_or_admin_can_submit(self):
        self.configure()
        self.assertEqual(self.act(self.other, "submit").status_code, 403)
        self.assertEqual(self.act(self.worker, "submit").status_code, 200)

    def test_only_reviewer_or_admin_can_decide(self):
        self.configure()
        self.act(self.worker, "submit")
        self.assertEqual(self.act(self.worker, "approve").status_code, 403)
        response = self.act(self.reviewer, "approve")
        self.assertEqual(response.status_code, 200, response.data)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.state_id, self.completed.pk)
        self.assertEqual(Review.objects.get(issue=self.issue).events.count(), 3)

    def test_reject_requires_reason_and_allows_resubmit(self):
        self.configure()
        self.act(self.worker, "submit")
        self.assertEqual(self.act(self.reviewer, "reject", note="").status_code, 400)
        self.assertEqual(self.act(self.reviewer, "reject").status_code, 200)
        self.assertEqual(self.act(self.worker, "submit").status_code, 200)

    def test_admin_can_approve(self):
        self.configure()
        self.act(self.worker, "submit")
        self.assertEqual(self.act(self.admin, "approve").status_code, 200)

    def test_bulk_update_cannot_bypass_review(self):
        self.configure()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Issue.objects.filter(pk=self.issue.pk).update(state=self.completed)

    def test_edit_invalidates_pending_submission(self):
        self.configure()
        self.act(self.worker, "submit")
        Issue.objects.filter(pk=self.issue.pk).update(name="New scope")
        self.assertEqual(Review.objects.get(issue=self.issue).status, "draft")
        self.assertEqual(self.act(self.reviewer, "approve").status_code, 403)

    def test_reopen_requires_new_review(self):
        self.configure()
        self.act(self.worker, "submit")
        self.act(self.reviewer, "approve")
        Issue.objects.filter(pk=self.issue.pk).update(state=self.started)
        self.assertEqual(Review.objects.get(issue=self.issue).status, "draft")

    def test_unconfigured_issue_keeps_existing_flow(self):
        Issue.objects.filter(pk=self.issue.pk).update(state=self.completed)
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.state_id, self.completed.pk)

    def test_workspace_removal_revokes_review_access(self):
        self.configure()
        self.act(self.worker, "submit")
        WorkspaceMember.objects.filter(member=self.reviewer).update(is_active=False)
        self.assertEqual(self.act(self.reviewer, "approve").status_code, 403)

    def test_outsider_cannot_read_review(self):
        ProjectMember.objects.filter(member=self.other).delete()
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_regular_serializer_cannot_complete_reviewed_issue(self):
        from plane.app.serializers.issue import IssueCreateSerializer

        self.configure()
        serializer = IssueCreateSerializer(self.issue, data={"state": str(self.completed.pk)}, partial=True,
                                           context={"project_id": self.project.pk})
        self.assertFalse(serializer.is_valid())
        self.assertIn("state", serializer.errors)

    def test_repeat_approval_is_rejected(self):
        self.configure()
        self.act(self.worker, "submit")
        self.assertEqual(self.act(self.reviewer, "approve").status_code, 200)
        self.assertEqual(self.act(self.reviewer, "approve").status_code, 403)

    def test_configure_requires_current_project_member(self):
        ProjectMember.objects.filter(member=self.other).delete()
        self.assertEqual(self.act(self.admin, "configure", reviewer_id=str(self.other.pk)).status_code, 400)

    def workflow(self, roles):
        Workflow.objects.create(project=self.project, config={"enabled": True, "require_review": True,
            "allowed_new": [str(self.started.pk)], "rules": {f"{self.started.pk}:{self.completed.pk}": roles}})

    def test_workflow_only_admin_can_configure(self):
        url = f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/xbus-workflow/"
        self.client.force_authenticate(self.worker)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["can_edit"])
        self.assertEqual(self.client.post(url, {"config": response.data["config"]}, format="json").status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(url, {"config": response.data["config"]}, format="json").status_code, 200)

    def test_workflow_prevents_creation_in_disallowed_state(self):
        self.workflow(["admin", "reviewer"])
        with self.assertRaises(IntegrityError), transaction.atomic():
            Issue.objects.create(project=self.project, name="Bypass", state=self.completed)

    def test_workflow_prevents_background_transition_without_actor(self):
        self.workflow(["admin", "member"])
        with self.assertRaises(IntegrityError), transaction.atomic():
            Issue.objects.filter(pk=self.issue.pk).update(state=self.completed)

    def test_workflow_reviewer_can_approve_allowed_edge(self):
        self.workflow(["admin", "reviewer"])
        self.configure()
        self.act(self.worker, "submit")
        response = self.act(self.reviewer, "approve")
        self.assertEqual(response.status_code, 200, response.data)

    def test_workflow_disallowed_edge_blocks_reviewer(self):
        self.workflow(["admin"])
        self.configure()
        self.act(self.worker, "submit")
        response = self.act(self.reviewer, "approve")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Review.objects.get(issue=self.issue).status, "pending")

    def test_workflow_member_can_transition_with_session(self):
        from unittest.mock import patch
        cancelled = State.objects.create(project=self.project, name="Cancelled", group="cancelled", color="#123456")
        self.workflow(["admin", "reviewer"])
        workflow = Workflow.objects.get(project=self.project)
        workflow.config["rules"][f"{self.started.pk}:{cancelled.pk}"] = ["member"]
        workflow.save()
        self.client.force_login(self.worker)
        with patch("celery.app.task.Task.delay"):
            response = self.client.patch(f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/issues/{self.issue.pk}/",
                                         {"state": str(cancelled.pk)}, format="json")
        self.assertEqual(response.status_code, 204, response.data)

    def test_workflow_admin_cannot_skip_required_review(self):
        self.workflow(["admin"])
        self.client.force_login(self.admin)
        response = self.client.patch(f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/issues/{self.issue.pk}/",
                                     {"state": str(self.completed.pk)}, format="json")
        self.assertEqual(response.status_code, 409)

    def test_workflow_payload_removes_deleted_state_rules(self):
        self.workflow(["admin"])
        spare = State.objects.create(project=self.project, name="Old state", group="cancelled", color="#123456")
        workflow = Workflow.objects.get(project=self.project)
        workflow.config["allowed_new"].append(str(spare.pk))
        edge = f"{self.started.pk}:{spare.pk}"
        workflow.config["rules"][edge] = ["admin"]
        workflow.save()
        spare.delete()
        self.client.force_authenticate(self.admin)
        response = self.client.get(f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/xbus-workflow/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(str(spare.pk), response.data["config"]["allowed_new"])
        self.assertNotIn(edge, response.data["config"]["rules"])

    def test_initialize_states_preserves_rules_and_is_idempotent(self):
        self.workflow(["admin"])
        self.client.force_authenticate(self.admin)
        url = f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/xbus-workflow/"
        first = self.client.post(url, {"action": "initialize_states"}, format="json")
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual({s["group"] for s in first.data["states"]}, {"backlog", "unstarted", "started", "completed", "cancelled"})
        self.assertEqual(first.data["config"]["rules"][f"{self.started.pk}:{self.completed.pk}"], ["admin"])
        second = self.client.post(url, {"action": "initialize_states"}, format="json")
        self.assertEqual(first.data, second.data)
        self.client.force_authenticate(self.worker)
        self.assertEqual(self.client.post(url, {"action": "initialize_states"}, format="json").status_code, 403)

    def test_specific_member_transition_permission(self):
        from unittest.mock import patch
        cancelled = State.objects.create(project=self.project, name="Cancelled", group="cancelled", color="#123456")
        self.workflow(["admin"])
        workflow = Workflow.objects.get(project=self.project)
        workflow.config["rules"][f"{self.started.pk}:{cancelled.pk}"] = [f"user:{self.worker.pk}"]
        workflow.save()
        url = f"/api/workspaces/{self.workspace.slug}/projects/{self.project.pk}/issues/{self.issue.pk}/"
        self.client.force_login(self.other)
        self.assertEqual(self.client.patch(url, {"state": str(cancelled.pk)}, format="json").status_code, 409)
        self.client.force_login(self.worker)
        with patch("celery.app.task.Task.delay"):
            response = self.client.patch(url, {"state": str(cancelled.pk)}, format="json")
        self.assertEqual(response.status_code, 204, response.data)
