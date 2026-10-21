# Project overview and status reports (F0302, F0305, F0306)

App API, session authentication; prefix `/api/workspaces/{slug}/projects/{project_id}`.
Existing Plane roles apply. An active workspace member and active project member are
required. Admin/Member can read and write. Guest can read only when the project's
`guest_view_all_features` is enabled; Guest cannot publish reports or edit overview.
Private projects are never exposed to workspace members without project membership.
Archived projects remain readable but reject writes with HTTP 409.

## GET `/overview/`

Returns `project` (id, name, description), `details` (start_date, target_date,
links, revision), `members` (user_id, name, role), `task_counts` (total,
completed, overdue), `latest_update` (report or null), `can_edit`.
Counts exclude draft/deleted/archived/triage work items and deleted/archived projects;
overdue excludes completed and cancelled work items, using the project timezone.
Project health is an explicit report status, never inferred from completion count.

## PUT `/overview/`

Body: `{ "revision": 0, "start_date": "2026-10-01", "target_date": "2026-10-31",
"links": [{"title":"Project brief","url":"https://example.org/brief"}] }`.
All fields required; dates nullable; start must not exceed target. Maximum 20 links,
HTTP(S) only; titles 255 chars, URLs 2048 chars. A stale revision returns 409 with
`code=overview_conflict`, preserving the caller's unsaved values. A successful write
increments revision. This does not change any work item dates.

## GET `/status-updates/?page=1`

20 reports per page, newest first, stable `created_at,id` ordering. Returns
`results`, `count`, `next_page` (number or null). Invalid page returns 400.
Reports are immutable history. Author display names and content are user data.

## POST `/status-updates/`

Body: `{ "client_request_id":"UUID", "status":"on_track", "title":"Weekly report",
"summary":"Results, risks, and next steps" }`.
Statuses: `on_track`, `at_risk`, `off_track`, `on_hold`, `complete`.
Title required/nonblank, max 255; summary required/nonblank, max 10,000.
Returns the saved report with HTTP 201; identical retry by the same author and
request UUID returns the original report with HTTP 200. Reusing that UUID with a
different body or author returns 409 (`report_request_conflict`). The project row
is locked while appending, preventing duplicate concurrent retries.
Publishing `complete` changes the project's reported health only; it does not
complete work items or bypass acceptance workflows. No email/push is sent.
Unknown input fields are rejected. Server-owned author/project/timestamps cannot
be overridden. All errors use stable codes; frontend translates interface labels
and errors, while preserving project names, names of people, link titles, and report content.
