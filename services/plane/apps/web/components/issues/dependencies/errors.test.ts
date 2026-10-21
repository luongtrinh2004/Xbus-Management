import assert from "node:assert/strict";
import test from "node:test";
import { getDependencyError } from "./errors";

test("dependency rejections use translated codes while server workflow messages remain visible", () => {
  assert.equal(
    getDependencyError({ code: "dependency_cycle", error: "server text" }, (key) => key),
    "issue_dependencies.cycle",
  );
  assert.equal(
    getDependencyError({ code: "self_dependency" }, (key) => key),
    "issue_dependencies.self",
  );
  assert.equal(
    getDependencyError({ code: "relation_conflict" }, (key) => key),
    "issue_dependencies.conflict",
  );
  assert.equal(
    getDependencyError({ code: "invalid_related_issue" }, (key) => key),
    "issue_dependencies.unavailable",
  );
  assert.equal(
    getDependencyError({ error: "Transition denied" }, (key) => key),
    "Transition denied",
  );
  assert.equal(
    getDependencyError(undefined, (key) => key),
    "issue_dependencies.save_failed",
  );
});
