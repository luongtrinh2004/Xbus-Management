import assert from "node:assert/strict";
import test from "node:test";
import type { TIssueMap } from "@plane/types";
import { getRootListIssueIds } from "../root-issues";

const issues = {
  parent: { id: "parent", created_at: "2026-10-13", parent_id: null },
  child1: { id: "child1", created_at: "2026-10-13", parent_id: "parent" },
  child2: { id: "child2", created_at: "2026-10-13", parent_id: "parent" },
} as unknown as TIssueMap;

test("subtasks appear under their parent, without duplicate root rows", () => {
  assert.deepEqual(getRootListIssueIds(["child1", "child2", "parent"], issues), ["parent"]);
});

test("filters without the parent still show matching subtasks", () => {
  assert.deepEqual(getRootListIssueIds(["child1"], issues), ["child1"]);
  assert.deepEqual(getRootListIssueIds([], issues), []);
});
