# Dependency dates and cycle checks

Existing task-date writes remain compatible. Optional preview:

- `PATCH /api/workspaces/{slug}/projects/{project_id}/issues/{id}/?preview_dependency_dates=1` with the proposed `start_date` and/or `target_date`.
- `POST /api/workspaces/{slug}/projects/{project_id}/issue-dates/?preview_dependency_dates=1` with `{"updates":[{"id":"uuid","target_date":"2026-10-27"}]}`.

Dates use ISO `YYYY-MM-DD` or null. Preview validates the same date ranges and permissions as a write, returns `{"conflicts":[]}`, and does not save dates or queue activity. A nonempty result includes blocker/dependent identifiers and names, proposed date values, and suggested dependent dates preserving duration. Only relations where the viewer can see **both** tasks are returned. Completed/cancelled dependent tasks are excluded. The check compares all proposed dates in a batch together.

The shared date dialog allows cancellation or keeping the proposed dates and shows a suggested dependent shift. Accepting the dialog does not automatically edit another task. Preview and save are separate requests, so a concurrent edit can change the schedule between them; validation on the actual save remains authoritative.

Bulk date input rejects malformed rows, invalid date ranges, duplicate IDs, unavailable tasks and more than 500 rows before applying anything. Explicit null clears a date. Activity is queued after the successful transaction commits.

Relation creation also checks self-links, unavailable targets, conflicting existing relation types, and cycles across blocked-by/start-before/finish-before edges. A workspace row lock serializes graph validation and insertion. Existing valid/idempotent calls retain their response contract; invalid relation batches return atomic 400 responses with a translated `code`.

Verification: `test_issue_dependencies.py`, `test_issue_dependency_dates.py`, and the dependency graph/unit tests.
