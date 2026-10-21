import { store as initializedStore } from "@/lib/store-context";
void initializedStore;
import assert from "node:assert/strict";
import test from "node:test";
import { EIssueServiceType, type TIssue } from "@plane/types";
import type { IIssueDetail } from "./root.store";
import { IssueSubIssuesStore } from "./sub_issues.store";

function setup(update?: (id: string, data: Partial<TIssue>) => Promise<void>) {
  const issuesMap = Object.fromEntries(
    ["a", "b", "c"].map((id, i) => [
      id,
      {
        id,
        project_id: "project",
        parent_id: "parent",
        sort_order: (i + 1) * 10000,
      },
    ]),
  ) as unknown as Record<string, TIssue>;
  const calls: { id: string; data: Partial<TIssue> }[] = [];
  const root = {
    rootIssueStore: {
      issues: { issuesMap },
      projectIssues: {
        updateIssue: async (_slug: string, _project: string, id: string, data: Partial<TIssue>) => {
          calls.push({ id, data });
          await update?.(id, data);
          Object.assign(issuesMap[id], data);
        },
      },
    },
  } as unknown as IIssueDetail;
  const store = new IssueSubIssuesStore(root, EIssueServiceType.ISSUES);
  store.subIssues.parent = ["a", "b", "c"];
  return { store, calls, issuesMap };
}

test("reordering persists one rank and the shared list/detail order changes", async () => {
  const { store, calls } = setup();
  await store.reorderSubIssue("office", "project", "parent", "c", "a", "before");
  assert.deepEqual(calls, [{ id: "c", data: { sort_order: 0 } }]);
  assert.deepEqual(store.subIssuesByIssueId("parent"), ["c", "a", "b"]);
});

test("failed reorder keeps current order and releases the pending request lock", async () => {
  let fail = true;
  const { store, calls } = setup(async () => {
    if (fail) throw new Error("offline");
  });
  await assert.rejects(
    store.reorderSubIssue("office", "project", "parent", "c", "a", "before"),
    /offline/,
  );
  assert.deepEqual(store.subIssuesByIssueId("parent"), ["a", "b", "c"]);
  fail = false;
  await store.reorderSubIssue("office", "project", "parent", "c", "a", "before");
  assert.equal(calls.length, 2);
  assert.deepEqual(store.subIssuesByIssueId("parent"), ["c", "a", "b"]);
});

test("drops from another parent/project do not write anything", async () => {
  const { store, calls } = setup();
  await store.reorderSubIssue("office", "other-project", "parent", "c", "a", "before");
  await store.reorderSubIssue("office", "project", "other-parent", "c", "a", "before");
  assert.equal(calls.length, 0);
});

test("concurrent drops for one parent cannot race rank writes", async () => {
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const { store, calls } = setup(async () => gate);
  const first = store.reorderSubIssue("office", "project", "parent", "c", "a", "before");
  await store.reorderSubIssue("office", "project", "parent", "b", "a", "before");
  assert.equal(calls.length, 1);
  finish();
  await first;
});
