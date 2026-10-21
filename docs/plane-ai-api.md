# Gemini task assistance — F0516

Provider: Gemini `generateContent`, configured server-side through `GEMINI_API_KEY`,
`GEMINI_MODEL`, and `GEMINI_THINKING_LEVEL`. Local deployment imports these from
ignored `plane.env`; frontend/build arguments never receive the key.
Provider reference: https://ai.google.dev/gemini-api/docs/generate-content/thinking

POST `/api/workspaces/{slug}/projects/{id}/ai-assistance/`

Input: `action` (summary/description/subtasks), `language` (en/vi-VN), and either
`issue_id`, or draft `name` and optional `description`. Only active workspace and
project Admin/Member can call. Archived/deleted/draft issue IDs are excluded.
A project draft form supplies its unsaved text. Existing tasks supply server-side
title, stripped description (16,000 chars), latest 20 comments (2,000 chars each),
and 50 direct child names. No attachments or link contents are fetched.
Permission is checked again after the provider call. One concurrent request per
account, bounded provider timeout, JSON response validation, and sanitized errors.
The provider call returns a preview and never writes task data.

Response: `{action, result:{text}}`, or `{action:"subtasks", result:{subtasks:[{name,description}]}}`.
At most 8 subtask suggestions. UI renders output as text; description application
escapes HTML before using the existing editor/save flow. User explicitly applies
and can edit before applying; no automatic state/assignee/date changes.

POST `.../ai-assistance/apply-subtasks/`

Input: `request_id` UUID, `issue_id`, `subtasks` (1–8 edited selections, each title
1–255 chars and description up to 2,000 chars). One atomic transaction creates
children using existing IssueCreateSerializer and workflow database guards.
IssueAIApplication stores the request and result; identical retries return original
IDs without duplicates, mismatched reuses return 409 `ai_apply_conflict`.
Activity/notifications are queued after commit; failed queue delivery does not
turn a committed batch into an apparent creation failure.

The request format follows `src/libs/geminiMenu.js`: direct Google key query
parameter, JSON MIME type and response schema, thinking level low, and a 95-second
overall deadline. 429/503 receive at most two retries within that deadline. The
current implementation keeps the configured model; no automatic model switch.

Provider errors: ai_timeout (504), ai_rate_limited/ai_busy (429),
ai_not_configured (503), ai_configuration_error/ai_unavailable/ai_invalid_response
(502). No provider error bodies, API key, or prompts are returned/logged by the
transport. UI translates stable error codes.

Local HTTP simulation: `postman/simulations/gemini.sim.yaml`, based on the included
Gemini dependency contract. Synthetic task names RATE_LIMIT, UNAVAILABLE, MALFORMED
exercise 429, 503, and invalid JSON envelopes. Use a test key, never a real key,
with `GEMINI_API_BASE_URL=http://localhost:4917/gemini/v1beta`.

Verification so far: 74 backend tests across AI/overview/task creation/hierarchy
passed; the real transport ran through Postman simulation for success, 429, 503,
and malformed response. Google models.get accepted the configured model/key.
Live checks: a minimal structured response succeeded in 79.7 seconds; the real
transport generated 7 subtask suggestions successfully. The summary and description
checks still hit the 95-second deadline. Do not claim those two provider paths are
fully verified. Simulated browser tests separately proved preview editing, applying
selected subtasks via the real API, and saving escaped description content.
