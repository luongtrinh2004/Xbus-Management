// oxlint-disable-next-line import/no-unassigned-import -- Initialize context before the circular store imports.
import "@/lib/store-context";
import assert from "node:assert/strict";
import test from "node:test";
import type { TIssue } from "@plane/types";
import { IssueCreatedWithFollowUpError } from "@/helpers/issue-submission";
import { BaseIssuesStore } from "./base-issues.store";

const temporary = { id: "temporary", project_id: "project", name: "Task" } as TIssue;
const created = { ...temporary, id: "created" };

function setup(create: () => Promise<TIssue> = async () => created) {
  const items = new Map<string, TIssue>();
  const listed = new Set<string>();
  const associations: string[] = [];
  const store = {
    addIssue: (issue: TIssue) => {
      items.set(issue.id, issue);
      listed.add(issue.id);
    },
    removeIssueFromList: (id: string) => {
      listed.delete(id);
    },
    rootIssueStore: {
      issues: {
        removeIssue: (id: string) => {
          items.delete(id);
        },
      },
    },
    createIssue: async () => {
      const issue = await create();
      store.addIssue(issue);
      return issue;
    },
    addCycleToIssue: async (_workspace: string, _project: string, cycle: string) => {
      associations.push(`cycle:${cycle}`);
    },
    changeModulesInIssue: async (_workspace: string, _project: string, _issue: string, modules: string[]) => {
      associations.push(`module:${modules.join(",")}`);
    },
  };
  const submit = (data: TIssue = temporary) =>
    BaseIssuesStore.prototype.issueQuickAdd.call(store as unknown as BaseIssuesStore, "office", "project", data);
  return { store, items, listed, associations, submit };
}

test("a failed create removes optimistic rows and propagates the failure for input retention", async () => {
  const { submit, items, listed } = setup(async () => {
    throw new Error("offline");
  });
  await assert.rejects(submit(), /offline/);
  assert.equal(items.size, 0);
  assert.equal(listed.size, 0);
});

test("a failed follow-up exposes the created ID and removes only the temporary row", async () => {
  let writes = 0;
  const { submit, store, items, listed } = setup(async () => {
    writes++;
    return created;
  });
  store.addCycleToIssue = async () => {
    throw new Error("cycle unavailable");
  };
  await assert.rejects(submit({ ...temporary, cycle_id: "cycle" }), (error: unknown) => {
    assert.ok(error instanceof IssueCreatedWithFollowUpError);
    assert.equal(error.createdIssue.id, "created");
    assert.equal((error.cause as Error).message, "cycle unavailable");
    return true;
  });
  assert.equal(writes, 1);
  assert.deepEqual([...items.keys()], ["created"]);
  assert.deepEqual([...listed], ["created"]);
});

test("quick add ignores empty relation sentinels and preserves selected relations", async () => {
  const { submit, associations } = setup();
  assert.equal((await submit({ ...temporary, cycle_id: "None", module_ids: ["None"] })).id, "created");
  assert.deepEqual(associations, []);
  await submit({ ...temporary, cycle_id: "cycle", module_ids: ["None", "module"] });
  assert.deepEqual(associations, ["cycle:cycle", "module:module"]);
});

test("a statistics failure after successful creation returns the created issue without a second POST", async (context) => {
  const logged = context.mock.method(console, "error", () => {});
  let writes = 0;
  const added: string[] = [];
  const store = {
    issueService: {
      createIssue: async () => {
        writes++;
        return created;
      },
    },
    addIssue: (issue: TIssue) => {
      added.push(issue.id);
    },
    fetchParentStats: async () => {
      throw new Error("stats unavailable");
    },
  };
  const result = await BaseIssuesStore.prototype.createIssue.call(
    store as unknown as BaseIssuesStore,
    "office",
    "project",
    temporary
  );
  assert.equal(result.id, "created");
  assert.equal(writes, 1);
  assert.deepEqual(added, ["created"]);
  assert.equal(logged.mock.calls.length, 1);
});
