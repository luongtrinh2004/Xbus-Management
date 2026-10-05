import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fork } from "node:child_process";

const worker = path.resolve("tests/fixtures/work-mutation-worker.mjs");

test("JSON work mutations are serialized across processes without lost updates", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "work-management-"));
  const statePath = path.join(dir, "work-management.json");
  await writeFile(
    statePath,
    JSON.stringify({ version: 1, tasks: [], pendingGlobalAudits: [] }),
  );
  try {
    const children = Array.from({ length: 8 }, (_, index) =>
      new Promise((resolve, reject) => {
        const child = fork(worker, [String(index)], {
          env: { ...process.env, WORK_MANAGEMENT_JSON_PATH: statePath },
          stdio: "inherit",
        });
        child.once("error", reject);
        child.once("exit", (code) =>
          code === 0 ? resolve() : reject(new Error(`worker exited ${code}`)),
        );
      }),
    );
    await Promise.all(children);
    const state = JSON.parse(await readFile(statePath, "utf8"));
    assert.equal(state.tasks.length, 8);
    assert.deepEqual(
      state.tasks.map((task) => task.id).sort(),
      Array.from({ length: 8 }, (_, index) => `task-${index}`),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
