import assert from "node:assert/strict";
import test from "node:test";
import { getSubIssueOrder, sortSubIssueIds } from "./sub-issue-order";

const issues = Object.fromEntries(
  ["a", "b", "c"].map((id, i) => [
    id,
    {
      id,
      parent_id: "parent",
      project_id: "project",
      sort_order: (i + 1) * 10000,
    },
  ]),
);
test("reorders at either end or between siblings without changing input", () => {
  const ids = ["a", "b", "c"];
  assert.equal(getSubIssueOrder(ids, issues, "c", "a", "before"), 0);
  assert.equal(getSubIssueOrder(ids, issues, "a", "c", "after"), 40000);
  assert.equal(getSubIssueOrder(ids, issues, "c", "a", "after"), 15000);
  assert.deepEqual(ids, ["a", "b", "c"]);
  assert.deepEqual(sortSubIssueIds(["c", "a", "b"], issues), ids);
});
test("rejects self drops, missing rows, other parents/projects and collided ranks", () => {
  const ids = ["a", "b", "c"];
  assert.equal(getSubIssueOrder(ids, issues, "a", "a", "after"), undefined);
  assert.equal(getSubIssueOrder(ids, issues, "missing", "b", "after"), undefined);
  assert.equal(
    getSubIssueOrder(ids, { ...issues, b: { ...issues.b, parent_id: "other" } }, "a", "b", "after"),
    undefined,
  );
  assert.equal(
    getSubIssueOrder(
      ids,
      { ...issues, b: { ...issues.b, project_id: "other" } },
      "a",
      "b",
      "after",
    ),
    undefined,
  );
  assert.equal(
    getSubIssueOrder(ids, { ...issues, b: { ...issues.b, sort_order: 10000 } }, "c", "a", "after"),
    undefined,
  );
});
