import assert from "node:assert/strict";
import test from "node:test";
import type { TIssue } from "@plane/types";
import type { TPlanningPage } from "@/services/my-task-planning.service";
import { MyTaskPlanningService } from "@/services/my-task-planning.service";
import type { IIssueRootStore } from "../root.store";
import { MyTaskPlanningStore } from "./planning.store";

function setup() {
  const map: Record<string, TIssue> = {};
  const root = {
    issues: {
      getIssueById: (id: string) => map[id],
      addIssue: (issues: TIssue[]) =>
        issues.forEach((issue) => {
          map[issue.id] = { ...map[issue.id], ...issue };
        }),
    },
  } as IIssueRootStore;
  return { store: new MyTaskPlanningStore(root, "office", "me"), map };
}
function row(id: string, bucket: "today" | "later" = "today", order = 100) {
  return {
    issue: { id, name: id, assignee_ids: ["me"], updated_at: "2026-10-20T10:00:00Z" } as TIssue,
    bucket,
    sort_order: order,
  };
}

test("planning moves use private metadata and do not change task dates or state", async (context) => {
  context.mock.method(MyTaskPlanningService.prototype, "list", async () => ({
    results: [row("a")],
    next_cursor: null,
  }));
  const calls: unknown[][] = [];
  context.mock.method(MyTaskPlanningService.prototype, "move", async (...args: [string, string, "later", number]) => {
    calls.push(args);
    return { issue_id: args[1], bucket: args[2], sort_order: args[3] };
  });
  const { store, map } = setup();
  await store.load();
  const original = { ...map.a };
  await store.move("a", "later");
  assert.deepEqual(store.groups.later, ["a"]);
  assert.deepEqual(map.a, original);
  assert.equal(calls.length, 1);
});

test("failed move keeps previous plan and clears pending state", async (context) => {
  context.mock.method(MyTaskPlanningService.prototype, "list", async () => ({
    results: [row("a")],
    next_cursor: null,
  }));
  context.mock.method(MyTaskPlanningService.prototype, "move", async () => {
    throw new Error("offline");
  });
  const { store } = setup();
  await store.load();
  await assert.rejects(store.move("a", "later"), /offline/);
  assert.deepEqual(store.groups.today, ["a"]);
  assert.equal(store.savingIds.a, false);
});

test("reorder inserts between siblings in the same planning group", async (context) => {
  context.mock.method(MyTaskPlanningService.prototype, "list", async () => ({
    results: [row("a", "today", 100), row("b", "today", 200), row("c", "today", 300)],
    next_cursor: null,
  }));
  context.mock.method(
    MyTaskPlanningService.prototype,
    "move",
    async (_slug: string, id: string, bucket: "today", order: number) => ({ issue_id: id, bucket, sort_order: order })
  );
  const { store } = setup();
  await store.load();
  await store.move("c", "today", "b");
  assert.deepEqual(store.groups.today, ["a", "c", "b"]);
  assert.equal(store.placements.c.sort_order, 150);
});

test("delayed refresh cannot replace a newer move", async (context) => {
  let finish!: (page: TPlanningPage) => void;
  const { store, map } = setup();
  map.a = row("a").issue;
  store.placements.a = { issue_id: "a", bucket: "today", sort_order: 100 };
  context.mock.method(
    MyTaskPlanningService.prototype,
    "list",
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  context.mock.method(MyTaskPlanningService.prototype, "move", async () => ({
    issue_id: "a",
    bucket: "later",
    sort_order: 100,
  }));
  const loading = store.load();
  await store.move("a", "later");
  finish({ results: [row("a")], next_cursor: null });
  await loading;
  assert.deepEqual(store.groups.later, ["a"]);
});

test("completion and unassignment in the shared issue store immediately remove tasks from the active plan", async (context) => {
  context.mock.method(MyTaskPlanningService.prototype, "list", async () => ({
    results: [row("a"), row("b")],
    next_cursor: null,
  }));
  const { store, map } = setup();
  await store.load();
  map.a.completed_at = "2026-10-20T12:00:00Z";
  map.b.assignee_ids = [];
  assert.deepEqual(store.groups.today, []);
});
