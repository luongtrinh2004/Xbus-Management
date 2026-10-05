import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getUsers,
  getWorkManagement,
  mutateWorkManagement,
} from "@/libs/dataRepository";
import {
  canAccessProject,
  canManageProject,
  canManageTasks,
  flushPendingGlobalAudits,
  getProjectRole,
  isActiveWorkUser,
  normalizeWorkState,
  publicWorkUser,
  queuePendingGlobalAudit,
  resolveCurrentActor,
} from "@/libs/workManagement";

export const WORK_SECRET = process.env.NEXTAUTH_SECRET;
export const nowIso = () => new Date().toISOString();
export const makeId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class WorkApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const failWork = (status, message) => {
  throw new WorkApiError(status, message);
};

// 400 messages for section/status/completion consistency rejections.
export const taskSyncFailMessage = (reason) => {
  if (reason === "invalid_status") return "Trạng thái công việc không hợp lệ";
  if (reason === "section_status_conflict")
    return "Nhóm công việc và trạng thái không khớp nhau";
  if (reason === "completion_conflict")
    return "Trạng thái hoàn thành không khớp với nhóm công việc";
  return "Nhóm công việc không hợp lệ";
};

// Work mutations always return the durable audit metadata: `work_activity`
// (project activity written in the same state transaction) is authoritative,
// while the shared global audit log is secondary and delivered through the
// outbox (see flushWorkAuditOutbox).
export const withAudit = (value, audit) => ({
  ...(value && typeof value === "object" ? value : { value }),
  audit,
});

async function loadActorAndUsers(req) {
  const [token, users] = await Promise.all([
    getToken({ req, secret: WORK_SECRET }),
    getUsers(),
  ]);
  return {
    actor: resolveCurrentActor(token, users),
    users: users.filter(isActiveWorkUser),
  };
}

export async function getWorkActor(req) {
  return (await loadActorAndUsers(req)).actor;
}

export async function loadWork() {
  return normalizeWorkState(await getWorkManagement());
}

export async function loadWorkContext(req) {
  const { actor, users } = await loadActorAndUsers(req);
  if (!actor) return { actor: null, state: null, users: [] };
  return { actor, state: await loadWork(), users };
}

export async function mutateWork(req, mutator) {
  const { actor, users } = await loadActorAndUsers(req);
  if (!actor) return { actor: null, value: null };
  const committed = await mutateWorkManagement(async (input) => {
    const state = normalizeWorkState(input);
    const mutation = await mutator({ actor, state, users });
    const queuedAudit = mutation?.audit
      ? queuePendingGlobalAudit(state, mutation.audit)
      : null;
    return {
      state: normalizeWorkState(state),
      result: { value: mutation?.value, auditId: queuedAudit?.id || null },
    };
  });
  let auditDelivery = { delivered: [], failed: [] };
  try {
    auditDelivery = await flushWorkAuditOutbox();
  } catch (error) {
    console.error("[WorkManagement] Không thể flush global audit outbox:", error);
  }
  return {
    actor,
    value: committed?.value,
    audit: {
      authoritative: "work_activity",
      globalAudit: "secondary",
      queuedId: committed?.auditId || null,
      ...auditDelivery,
    },
  };
}

// Project/task activity is authoritative and commits atomically with the work
// mutation. The shared global audit log is secondary and delivered via outbox.
export async function flushWorkAuditOutbox() {
  const snapshot = normalizeWorkState(await getWorkManagement());
  return flushPendingGlobalAudits(snapshot.pendingGlobalAudits, {
    deliver: appendAuditLog,
    acknowledge: async (id) =>
      mutateWorkManagement(async (input) => {
        const state = normalizeWorkState(input);
        state.pendingGlobalAudits = state.pendingGlobalAudits.filter(
          (entry) => entry.id !== id,
        );
        return { state, result: true };
      }),
  });
}

export const findProject = (state, id) =>
  state.projects.find((item) => item.id === id && !item.archivedAt);
export const projectRole = (state, project, actor) =>
  getProjectRole(project, state.projectMembers, actor);
export const mayReadProject = (state, project, actor) =>
  canAccessProject(project, state.projectMembers, actor);
export const mayManageProject = (state, project, actor) =>
  canManageProject(project, state.projectMembers, actor);
export const mayManageTasks = (state, project, actor) =>
  canManageTasks(project, state.projectMembers, actor);

export function addActivity(
  state,
  { actor, projectId, taskId = null, action, details = "" },
) {
  state.activities.unshift({
    id: makeId("act"),
    projectId,
    taskId,
    actorId: actor.id,
    action,
    details,
    createdAt: nowIso(),
  });
  state.activities = state.activities.slice(0, 3000);
}

export const auditFor = (actor, action, targetType, targetId, details) => ({
  adminId: actor.id,
  adminName: actor.name,
  adminEmail: actor.email,
  action,
  targetType,
  targetId,
  details,
});

export const publicUser = publicWorkUser;
