import assert from "node:assert/strict";
import test from "node:test";
import { toJS, runInAction } from "mobx";
import type { TIssueRelationMap } from "@plane/types";
import type { IIssueDetail } from "./root.store";
import { IssueRelationStore } from "./relation.store";

function createStore() {
  return new IssueRelationStore({
    rootIssueStore: { workspaceSlug: "office" },
    issue: { getIssueById: () => ({ project_id: "project" }) },
    activity: { fetchActivities: async () => undefined },
  } as unknown as IIssueDetail);
}

test("a rejected dependency clears both optimistic links even when no prior lists existed", async (context) => {
  const store = createStore();
  let rejectRequest!: (error: unknown) => void;
  context.mock.method(store.issueRelationService, "createIssueRelations", () => new Promise((_, reject) => { rejectRequest = reject; }));
  const request = store.createCurrentRelation("a", "blocking", "b");
  assert.deepEqual(toJS(store.relationMap.a.blocking), ["b"]);
  assert.deepEqual(toJS(store.relationMap.b.blocked_by), ["a"]);
  rejectRequest(new Error("cycle"));
  await assert.rejects(request, /cycle/);
  assert.deepEqual(toJS(store.relationMap.a.blocking), []);
  assert.deepEqual(toJS(store.relationMap.b.blocked_by), []);
});

test("dependency rollback preserves previously saved links", async (context) => {
  const store = createStore();
  runInAction(() => { store.relationMap = { a: { blocking: ["saved"] }, b: { blocked_by: ["saved-parent"] } } as unknown as TIssueRelationMap; });
  context.mock.method(store.issueRelationService, "createIssueRelations", async () => { throw new Error("cycle"); });
  await assert.rejects(store.createCurrentRelation("a", "blocking", "b"), /cycle/);
  assert.deepEqual(toJS(store.relationMap.a.blocking), ["saved"]);
  assert.deepEqual(toJS(store.relationMap.b.blocked_by), ["saved-parent"]);
});

test("removing a dependency immediately removes the reverse relation from the other task", async (context) => {
  const store = createStore();
  runInAction(() => { store.relationMap = { a: { blocking: ["b"] }, b: { blocked_by: ["a", "another"] } } as unknown as TIssueRelationMap; });
  context.mock.method(store.issueRelationService, "deleteIssueRelation", async () => undefined);
  await store.removeRelation("office", "project", "a", "blocking", "b");
  assert.deepEqual(toJS(store.relationMap.a.blocking), []);
  assert.deepEqual(toJS(store.relationMap.b.blocked_by), ["another"]);
});
