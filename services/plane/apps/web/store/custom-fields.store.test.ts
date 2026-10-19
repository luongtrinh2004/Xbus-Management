import assert from "node:assert/strict";
import test from "node:test";
import { CustomFieldsService } from "@/services/custom-fields.service";
import { CustomFieldsStore } from "./custom-fields.store";

test("loads work item values in bounded batches and deduplicates ids", async (context) => {
  const calls: string[][] = [];
  context.mock.method(
    CustomFieldsService.prototype,
    "values",
    async (_slug: string, _project: string, ids: string[]) => {
      calls.push(ids);
      return Object.fromEntries(ids.map((id) => [id, { test: id }]));
    }
  );
  const store = new CustomFieldsStore();
  const ids = Array.from({ length: 205 }, (_, i) => String(i));
  await store.loadValues("office", "project", [...ids, ids[0]]);
  assert.deepEqual(
    calls.map((batch) => batch.length),
    [100, 100, 5]
  );
  assert.equal(store.valuesByIssue["204"].test, "204");
  await store.loadValues("office", "project", ids);
  assert.equal(calls.length, 3);
});
test("failed requests do not erase already loaded values or mark new ids as loaded", async (context) => {
  context.mock.method(CustomFieldsService.prototype, "values", async () => {
    throw new Error("offline");
  });
  const store = new CustomFieldsStore();
  store.valuesByIssue.old = { field: "keep" };
  await assert.rejects(store.loadValues("office", "project", ["new"]), /offline/);
  assert.equal(store.valuesByIssue.old.field, "keep");
  assert.equal(store.loadedIssues.new, undefined);
});
test("save uses the server response so list and detail share saved values", async (context) => {
  context.mock.method(CustomFieldsService.prototype, "saveValues", async () => ({ field: "saved", other: 0 }));
  const store = new CustomFieldsStore();
  await store.saveValue("office", "project", "issue", "field", "new");
  assert.equal(store.valuesByIssue.issue.field, "saved");
  assert.equal(store.valuesByIssue.issue.other, 0);
});

test("a delayed refresh cannot overwrite a newer saved value", async (context) => {
  let finish!: (values: Record<string, Record<string, string>>) => void;
  context.mock.method(
    CustomFieldsService.prototype,
    "values",
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  context.mock.method(CustomFieldsService.prototype, "saveValues", async () => ({ field: "new" }));
  const store = new CustomFieldsStore();
  const refresh = store.loadValues("office", "project", ["issue"], true);
  await store.saveValue("office", "project", "issue", "field", "new");
  finish({ issue: { field: "old" } });
  await refresh;
  assert.equal(store.valuesByIssue.issue.field, "new");
});
test("edits from two cells are serialized and both saved values remain", async (context) => {
  let firstDone!: () => void;
  const gate = new Promise<void>((resolve) => {
    firstDone = resolve;
  });
  const stored: Record<string, string | number | string[] | null> = {};
  let calls = 0;
  context.mock.method(
    CustomFieldsService.prototype,
    "saveValues",
    async (_slug: string, _project: string, _issue: string, values: typeof stored) => {
      if (++calls === 1) await gate;
      Object.assign(stored, values);
      return { ...stored };
    }
  );
  const store = new CustomFieldsStore();
  const first = store.saveValue("office", "project", "issue", "first", "one");
  const second = store.saveValue("office", "project", "issue", "second", "two");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  firstDone();
  await Promise.all([first, second]);
  assert.equal(store.valuesByIssue.issue.first, "one");
  assert.equal(store.valuesByIssue.issue.second, "two");
});
