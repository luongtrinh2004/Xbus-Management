import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTabOrder, moveTab } from "./tab-order";
test("tab order ignores removed features and duplicates, appending newly enabled tabs", () => {
  assert.deepEqual(normalizeTabOrder(["pages", "pages", "disabled"], ["overview", "work_items", "pages"]), [
    "pages",
    "overview",
    "work_items",
  ]);
});
test("moving tabs keeps boundaries and does not mutate saved preferences", () => {
  const saved = ["overview", "work_items", "pages"];
  assert.deepEqual(moveTab(saved, saved, "pages", -1), ["overview", "pages", "work_items"]);
  assert.deepEqual(moveTab(saved, saved, "overview", -1), saved);
  assert.deepEqual(moveTab(saved, saved, "unknown", 1), saved);
  assert.deepEqual(saved, ["overview", "work_items", "pages"]);
});
