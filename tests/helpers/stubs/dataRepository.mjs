// In-memory stand-in for @/libs/dataRepository used by route tests.
// Mirrors the real contract: mutateWorkManagement runs the mutator against an
// isolated snapshot and only commits when it resolves.

const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

let state = { version: 1, projects: [], workTemplates: [] };
let users = [];
let auditLog = [];
let appendFails = false;

export function __resetDataRepository({ state: nextState = {}, users: nextUsers = [] } = {}) {
  state = clone(nextState);
  users = clone(nextUsers);
  auditLog = [];
  appendFails = false;
}

export function __getState() {
  return clone(state);
}

export function __getAuditLog() {
  return clone(auditLog);
}

export function __setAppendFailure(shouldFail) {
  appendFails = Boolean(shouldFail);
}

export async function getWorkManagement() {
  return clone(state);
}

export async function saveWorkManagement(next) {
  state = clone(next);
  return true;
}

export async function mutateWorkManagement(mutator) {
  const input = clone(state);
  const mutation = await mutator(input);
  if (!mutation?.state) throw new Error("Work mutation must return state");
  state = clone(mutation.state);
  return mutation.result;
}

export async function getUsers() {
  return clone(users);
}

export async function appendAuditLog(entry) {
  if (appendFails) throw new Error("audit storage unavailable");
  auditLog.push(clone(entry));
  return entry;
}
