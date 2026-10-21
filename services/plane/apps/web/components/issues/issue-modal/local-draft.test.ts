import assert from "node:assert/strict";
import test from "node:test";
import { localIssueDraftKey, readLocalIssueDraft, removeLocalIssueDraft, saveLocalIssueDraft } from "./local-draft";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

test("an offline draft preserves the selected project, parent, people and dates for explicit resubmission", () => {
  const storage = createStorage();
  const key = localIssueDraftKey("user", "workspace", "project", "parent");
  const data = {
    name: "Kiểm tra phương tiện",
    description_html: "<p>Giữ nguyên nội dung</p>",
    project_id: "project",
    parent_id: "parent",
    assignee_ids: ["member"],
    start_date: "2026-10-20",
    target_date: "2026-10-21",
    priority: "none" as const,
    custom_field_values: { cost: 0, reviewers: ["member"], result: "Passed", empty: null },
  };
  assert.equal(saveLocalIssueDraft(storage, key, data), true);
  assert.deepEqual(readLocalIssueDraft(storage, key)?.data, data);
  removeLocalIssueDraft(storage, key);
  assert.equal(readLocalIssueDraft(storage, key), null);
});

test("local drafts are isolated by signed-in user, workspace, project and parent", () => {
  const original = localIssueDraftKey("a", "b", "c", "d");
  for (const parts of [
    ["other", "b", "c", "d"],
    ["a", "other", "c", "d"],
    ["a", "b", "other", "d"],
    ["a", "b", "c", "other"],
  ])
    assert.notEqual(localIssueDraftKey(parts[0], parts[1], parts[2], parts[3]), original);
  assert.notEqual(localIssueDraftKey("a:b", "c", "d"), localIssueDraftKey("a", "b:c", "d"));
});

test("malformed/unsupported drafts and storage failures leave the form usable", () => {
  const storage = createStorage();
  for (const value of [
    "bad json",
    "null",
    '{"version":2}',
    '{"version":1,"data":{"project_id":"p","assignee_ids":"invalid"},"savedAt":"now"}',
  ]) {
    storage.setItem("draft", value);
    assert.equal(readLocalIssueDraft(storage, "draft"), null);
  }
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(saveLocalIssueDraft(blocked, "draft", { project_id: "p" }), false);
  assert.equal(readLocalIssueDraft(blocked, "draft"), null);
  assert.doesNotThrow(() => removeLocalIssueDraft(blocked, "draft"));
});

test("restoring a draft excludes persisted server identity and unrelated properties", () => {
  const storage = createStorage();
  storage.setItem(
    "draft",
    JSON.stringify({
      version: 1,
      savedAt: "now",
      data: { id: "old-issue", project_id: "p", name: "draft", completed_at: "now" },
    })
  );
  assert.deepEqual(readLocalIssueDraft(storage, "draft")?.data, { project_id: "p", name: "draft" });
});
