import assert from "node:assert/strict";
import test from "node:test";
import { getListColumns } from "../columns";

test("list columns respect display preferences and project capabilities", () => {
  const properties = {
    key: true,
    assignee: true,
    due_date: true,
    priority: true,
    modules: true,
    cycle: true,
    estimate: true,
    sub_issue_count: true,
  };
  const capabilities = { modules: false, cycle: true, estimate: false, isEpic: false };
  assert.deepEqual(
    getListColumns(properties, capabilities).map(({ key }) => key),
    ["assignee", "due_date", "priority", "cycle", "sub_issue_count"],
  );
  assert.deepEqual(
    getListColumns(properties, { ...capabilities, isEpic: true }).map(({ key }) => key),
    ["assignee", "due_date", "priority"],
  );
  assert.deepEqual(getListColumns(undefined, capabilities), []);
  assert.equal(properties.modules, true);
});
