import assert from "node:assert/strict";
import test from "node:test";
import { EIssueServiceType } from "@plane/types";
import { IssueService } from "@/services/issue/issue.service";
import type { IIssueDetail } from "./root.store";
import { IssueSubscriptionStore } from "./subscription.store";

function createStore() {
  return new IssueSubscriptionStore(
    { rootIssueStore: { currentUserId: "me" } } as IIssueDetail,
    EIssueServiceType.ISSUES
  );
}

test("collaborator edits use server values and update the shared self-subscription button", async (context) => {
  context.mock.method(IssueService.prototype, "updateIssueSubscribers", async () => [{ id: "1", subscriber: "me" }]);
  const store = createStore();
  await store.saveCollaborators("office", "project", "issue", ["me"]);
  assert.deepEqual([...store.collaboratorMap.issue], ["me"]);
  assert.equal(store.getSubscriptionByIssueId("issue"), true);
  assert.equal(store.savingCollaborators.issue, false);
});

test("failed save keeps the saved collaborators and clears loading", async (context) => {
  context.mock.method(IssueService.prototype, "updateIssueSubscribers", async () => {
    throw new Error("offline");
  });
  const store = createStore();
  store.collaboratorMap.issue = ["saved"];
  await assert.rejects(store.saveCollaborators("office", "project", "issue", ["new"]), /offline/);
  assert.deepEqual([...store.collaboratorMap.issue], ["saved"]);
  assert.equal(store.savingCollaborators.issue, false);
});

test("late refresh cannot overwrite a newer collaborator save", async (context) => {
  let finish!: (rows: { id: string; subscriber: string }[]) => void;
  context.mock.method(
    IssueService.prototype,
    "getIssueSubscribers",
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  context.mock.method(IssueService.prototype, "updateIssueSubscribers", async () => [{ id: "2", subscriber: "new" }]);
  const store = createStore();
  const pending = store.fetchCollaborators("office", "project", "issue");
  await store.saveCollaborators("office", "project", "issue", ["new"]);
  finish([{ id: "1", subscriber: "old" }]);
  await pending;
  assert.deepEqual([...store.collaboratorMap.issue], ["new"]);
});

test("self subscribe and leave update the same collaborator list", async (context) => {
  context.mock.method(IssueService.prototype, "subscribeToIssueNotifications", async () => ({}));
  context.mock.method(IssueService.prototype, "unsubscribeFromIssueNotifications", async () => ({}));
  const store = createStore();
  store.collaboratorMap.issue = ["other"];
  await store.createSubscription("office", "project", "issue");
  assert.deepEqual([...store.collaboratorMap.issue], ["other", "me"]);
  await store.removeSubscription("office", "project", "issue");
  assert.deepEqual([...store.collaboratorMap.issue], ["other"]);
});
