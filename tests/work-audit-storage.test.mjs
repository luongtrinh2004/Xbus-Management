import test from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const worker = path.resolve("tests/fixtures/audit-append-worker.mjs");

test("global audit JSON appends are serialized across processes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "audit-json-"));
  const auditPath = path.join(dir, "audit-logs.json");
  await writeFile(auditPath, JSON.stringify({ auditLogs: [] }));
  try {
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        new Promise((resolve, reject) => {
          const child = fork(worker, [String(index)], {
            env: { ...process.env, AUDIT_LOG_JSON_PATH: auditPath },
            stdio: "inherit",
          });
          child.once("error", reject);
          child.once("exit", (code) =>
            code === 0 ? resolve() : reject(new Error(`worker exited ${code}`)),
          );
        }),
      ),
    );
    const data = JSON.parse(await readFile(auditPath, "utf8"));
    assert.equal(data.auditLogs.length, 12);
    assert.deepEqual(
      data.auditLogs.map((entry) => entry.id).sort(),
      Array.from({ length: 12 }, (_, index) => `audit-${index}`).sort(),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
