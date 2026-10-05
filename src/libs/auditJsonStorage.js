import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const LOCK_RETRIES = 200;
const LOCK_RETRY_MS = 20;
const STALE_LOCK_MS = 30_000;
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function getAuditLogJsonPath() {
  return (
    process.env.AUDIT_LOG_JSON_PATH ||
    path.join(process.cwd(), "src", "data", "json", "audit-logs.json")
  );
}

async function acquireLock(lockPath) {
  const token = `${process.pid}:${randomUUID()}`;
  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(JSON.stringify({ token, createdAt: Date.now() }));
      return { handle, token };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const details = await stat(lockPath);
        if (Date.now() - details.mtimeMs > STALE_LOCK_MS) await unlink(lockPath);
      } catch (lockError) {
        if (lockError.code !== "ENOENT") throw lockError;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error(`Timed out acquiring audit-log lock: ${lockPath}`);
}

async function releaseLock(lockPath, lock) {
  await lock.handle.close();
  try {
    const contents = JSON.parse(await readFile(lockPath, "utf8"));
    if (contents.token === lock.token) await unlink(lockPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function readAuditFile(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return { auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [] };
  } catch (error) {
    if (error.code === "ENOENT") return { auditLogs: [] };
    throw error;
  }
}

async function writeAtomically(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    try {
      await unlink(tempPath);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") throw cleanupError;
    }
    throw error;
  }
}

export async function appendAuditLogJson(entry) {
  const filePath = getAuditLogJsonPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const lockPath = `${filePath}.lock`;
  const lock = await acquireLock(lockPath);
  try {
    const data = await readAuditFile(filePath);
    if (!data.auditLogs.some((item) => item.id === entry.id))
      data.auditLogs.unshift(entry);
    await writeAtomically(filePath, data);
    return entry;
  } finally {
    await releaseLock(lockPath, lock);
  }
}
