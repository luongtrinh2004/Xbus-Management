import assert from "node:assert/strict";
import test from "node:test";
import { overviewErrorKey, safeProjectLink } from "./helpers";

test("project links accept HTTP(S), rejecting executable or malformed URLs", () => {
  for (const url of ["https://example.org/document", "http://localhost:3000/brief"])
    assert.equal(safeProjectLink(url), true);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "ftp://example.org", "/relative", "broken"])
    assert.equal(safeProjectLink(url), false);
});

const error = (status: number, code?: string) => ({ response: { status, data: { code } } });

test("overview errors distinguish lost access, stale updates and retry ambiguity", () => {
  assert.equal(overviewErrorKey(error(409, "overview_conflict")), "project_overview.conflict");
  assert.equal(overviewErrorKey(error(409, "report_request_conflict")), "project_overview.request_conflict");
  assert.equal(overviewErrorKey(error(409, "project_archived")), "project_overview.archived");
  assert.equal(overviewErrorKey(error(403)), "project_overview.access_denied");
  assert.equal(overviewErrorKey(error(404)), "project_overview.access_denied");
  assert.equal(overviewErrorKey(error(400)), "project_overview.invalid_input");
  assert.equal(overviewErrorKey(new Error("offline")), "project_overview.save_failed");
});
