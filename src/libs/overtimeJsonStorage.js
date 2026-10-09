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

const DEFAULT_STATE = {
  requests: [],
  history: [],
  config: {
    allowPast: false,
    maxDailyMinutes: 0,
    maxMonthlyMinutes: 0,
    breakMinutes: 0,
    weekendDays: [0, 6],
    holidays: [],
  },
};
const LOCK_RETRIES = 120;
const LOCK_RETRY_MS = 25;
const STALE_LOCK_MS = 30_000;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function getOvertimeJsonPath() {
  return (
    process.env.OVERTIME_JSON_PATH ||
    path.join(process.cwd(), "src", "data", "json", "overtime.json")
  );
}

async function readState(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return structuredClone(DEFAULT_STATE);
    throw error;
  }
}

async function removeStaleLock(lockPath) {
  try {
    const details = await stat(lockPath);
    if (Date.now() - details.mtimeMs <= STALE_LOCK_MS) return false;
    await unlink(lockPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
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
      await removeStaleLock(lockPath);
      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error(`Timed out acquiring overtime lock: ${lockPath}`);
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

async function writeStateAtomically(filePath, state) {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
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

export async function mutateOvertimeJson(mutator) {
  const filePath = getOvertimeJsonPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const lockPath = `${filePath}.lock`;
  const lock = await acquireLock(lockPath);
  try {
    const current = await readState(filePath);
    const mutation = await mutator(current);
    if (!mutation?.state)
      throw new Error("Overtime mutation must return state");
    await writeStateAtomically(filePath, mutation.state);
    return mutation.result;
  } finally {
    await releaseLock(lockPath, lock);
  }
}

export async function readOvertimeJson() {
  return readState(getOvertimeJsonPath());
}
