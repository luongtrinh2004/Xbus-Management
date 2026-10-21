import assert from "node:assert/strict";
import test from "node:test";
import { createIssueSubmissionGuard } from "./issue-submission";

test("repeated Enter during one request performs a single write; the next task can submit", async () => {
  const guard = createIssueSubmissionGuard();
  let finish!: (value: string) => void;
  let writes = 0;
  const first = guard.run(() => {
    writes++;
    return new Promise<string>((resolve) => {
      finish = resolve;
    });
  });
  assert.equal(guard.pending, true);
  assert.equal(
    await guard.run(async () => {
      writes++;
      return "duplicate";
    }),
    undefined
  );
  assert.equal(writes, 1);
  finish("first-task");
  assert.equal(await first, "first-task");
  assert.equal(guard.pending, false);
  assert.equal(
    await guard.run(async () => {
      writes++;
      return "next-task";
    }),
    "next-task"
  );
  assert.equal(writes, 2);
});

test("a rejected save releases the guard for an explicit retry", async () => {
  const guard = createIssueSubmissionGuard();
  await assert.rejects(
    guard.run(async () => {
      throw new Error("offline");
    }),
    /offline/
  );
  assert.equal(guard.pending, false);
  assert.equal(await guard.run(async () => "retried"), "retried");
});
