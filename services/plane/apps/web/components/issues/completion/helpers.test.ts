import assert from "node:assert/strict";
import test from "node:test";
import type { IState, TIssueSubIssues, TStateGroups } from "@plane/types";
import { countUnfinishedDescendants, getCompletionTarget } from "./helpers";

function state(id: string, group: TStateGroups, order: number, isDefault = false): IState {
  return { id, group, order, sequence: order, default: isDefault } as IState;
}

test("completion uses the project's completed states and deterministically chooses the first", () => {
  const states = [
    state("open", "unstarted", 0, true),
    state("done-later", "completed", 3),
    state("done", "completed", 1),
  ];
  assert.equal(getCompletionTarget(states, "open")?.id, "done");
  assert.equal(
    getCompletionTarget([...states, state("default-done", "completed", 9, true)], "open")?.id,
    "default-done"
  );
  assert.equal(getCompletionTarget([state("open", "unstarted", 0)], "open"), undefined);
  assert.equal(getCompletionTarget([], "missing"), undefined);
});

test("reopening prefers the default open state and never picks cancelled or completed", () => {
  const states = [
    state("cancel", "cancelled", 0, true),
    state("doing", "started", 1),
    state("todo", "unstarted", 3),
    state("done", "completed", 2),
  ];
  assert.equal(getCompletionTarget(states, "done")?.id, "todo");
  assert.equal(getCompletionTarget([...states, state("default", "backlog", 9, true)], "done")?.id, "default");
  assert.equal(
    getCompletionTarget([state("done", "completed", 1), state("cancel", "cancelled", 2)], "done"),
    undefined
  );
});

test("completion reads collapsed descendants across projects and does not count resolved or duplicate items", async () => {
  const responses: Record<string, TIssueSubIssues> = {
    parent: {
      sub_issues: [
        { id: "resolved-parent", project_id: "other-project", state_id: "done", sub_issues_count: 1 },
        { id: "cancelled", state_id: "cancelled", sub_issues_count: 0 },
        { id: "todo", state_id: "todo", sub_issues_count: 0 },
      ],
      state_distribution: { completed: ["resolved-parent"], cancelled: ["cancelled"], unstarted: ["todo"] },
    },
    "resolved-parent": {
      // Grouped responses are also supported; deduplicate a task shown in several groups.
      sub_issues: {
        one: [{ id: "grandchild", state_id: "todo", sub_issues_count: 1 }],
        two: [{ id: "grandchild", state_id: "todo", sub_issues_count: 1 }],
      },
      state_distribution: { started: ["grandchild"] },
    },
    grandchild: {
      // Guard against malformed cyclic data without counting the original parent.
      sub_issues: [{ id: "parent", state_id: "todo", sub_issues_count: 1 }],
      state_distribution: { unstarted: ["parent"] },
    },
  } as unknown as Record<string, TIssueSubIssues>;
  const requests: string[] = [];
  const count = await countUnfinishedDescendants(
    "project",
    "parent",
    async (projectId, issueId) => {
      requests.push(`${projectId}/${issueId}`);
      return responses[issueId];
    },
    () => undefined
  );
  assert.equal(count, 2);
  assert.deepEqual(requests, ["project/parent", "other-project/resolved-parent", "other-project/grandchild"]);
});

test("an unreadable tree rejects instead of silently allowing parent completion", async () => {
  await assert.rejects(
    countUnfinishedDescendants(
      "project",
      "parent",
      async () => {
        throw new Error("Forbidden");
      },
      () => undefined
    ),
    /Forbidden/
  );
});

test("missing distribution falls back to loaded state data and treats an unknown child as unfinished", async () => {
  const response = {
    sub_issues: [
      { id: "done", state_id: "completed" },
      { id: "unknown", state_id: "missing" },
    ],
    state_distribution: {},
  } as unknown as TIssueSubIssues;
  assert.equal(
    await countUnfinishedDescendants(
      "project",
      "parent",
      async () => response,
      (id) => (id === "completed" ? "completed" : undefined)
    ),
    1
  );
});
