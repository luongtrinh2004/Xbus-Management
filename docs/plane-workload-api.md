# Weekly workload

Local contract for `F0708`. Uses existing Plane tasks and memberships.

- `GET /api/workspaces/{slug}/workload/?start=2026-10-19&weeks=4`
- `PUT /api/workspaces/{slug}/workload/capacities/{user_id}/` with `{"weekly_limit":20}`.

Session authentication is required. Active workspace Members/Admins may read. Only workspace Admins may change an active member's weekly limit. Both methods reject inactive accounts/memberships. Counts include only tasks visible through the viewer's active project memberships. A Project Guest can contribute only tasks allowed by the existing guest visibility policy. No task names are returned.

GET returns `weeks` (Monday ISO dates), `members` (`user_id`, `name`, `weekly_limit`, `counts`, `unscheduled`) and `can_edit_capacity`. `weeks` is 1–12, default 4; `start` defaults to today's date in the workspace timezone and is normalized to Monday. Invalid parameters return 400. Unauthorized requests return 401/403/404 under existing Plane permissions.

Each incomplete, nonarchived, nondraft task counts once for each assignee in each week overlapping its inclusive start–due range. A single date counts in its own week. Tasks with neither date contribute to `unscheduled`, not a weekly count. Completed/cancelled tasks and deleted/archived projects are excluded. Multiple assignees each receive one count; assigned subtasks count as tasks. Counts are scoped to what the viewer can see and are not an organization-wide capacity guarantee.

The default limit is 20 tasks/week. Limits from 1–1000 are persisted in the target WorkspaceMember's existing `view_props.workload_weekly_limit`, preserving other preferences under a row lock. PUT is idempotent; an unavailable target returns 404. Overload means count **greater than** limit. Updating a limit never changes dates, assignments, task status, or scheduling.

UI: Analytics → Overview, shared Plane buttons, error/retry, four-week navigation, per-person capacity editing, visible overload labels and horizontal scrolling on small screens. Data refreshes every 30 seconds and on window focus.

Verification: `plane/tests/contract/app/test_workload.py` and `components/analytics/workload/helpers.test.ts`; browser evidence is tracked in the implementation inventory.
