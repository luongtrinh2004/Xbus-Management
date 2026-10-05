const collections = [
  "projects",
  "projectMembers",
  "sections",
  "tasks",
  "comments",
  "activities",
  "labels",
  "taskLabels",
  "pendingGlobalAudits",
  "projectStatusUpdates",
  "workTemplates",
];

export const WORK_TEMPLATES = {
  basic: ["Việc cần làm", "Đang thực hiện", "Hoàn thành"],
  campaign: ["Ý tưởng", "Chuẩn bị", "Đang chạy", "Đã hoàn tất"],
  sprint: ["Backlog", "Sẵn sàng", "Đang thực hiện", "Kiểm thử", "Hoàn thành"],
};

export function normalizeProjectKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, (match) => (match === "Đ" ? "D" : "d"))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);
}

export function validateProjectKey(value, existingKeys = []) {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  const key = normalizeProjectKey(value);
  if (raw !== key || !/^[A-Z][A-Z0-9-]{1,11}$/.test(key))
    return { valid: false, key, reason: "invalid" };
  if (existingKeys.some((item) => normalizeProjectKey(item) === key))
    return { valid: false, key, reason: "duplicate" };
  return { valid: true, key };
}

export function nextTaskNumber(tasks = [], projectId, counter = 0) {
  return (
    Math.max(
      Number(counter) || 0,
      ...tasks
        .filter((item) => item.projectId === projectId)
        .map((item) => Number(item.number) || 0),
    ) + 1
  );
}

export function taskCode(project, number) {
  return `${normalizeProjectKey(project?.key)}-${Number(number)}`;
}

export function getTemplateSections(template = "basic") {
  const names = WORK_TEMPLATES[template] || WORK_TEMPLATES.basic;
  return names.map((name, index) => ({
    name,
    order: index,
    status:
      index === names.length - 1
        ? "done"
        : index === 0
          ? "todo"
          : "in_progress",
  }));
}

export function getProjectRole(project, members = [], actor) {
  if (!actor?.id) return null;
  if (actor.role === "admin") return "admin";
  if (project?.ownerId === actor.id) return "owner";
  return (
    members.find(
      (item) => item.projectId === project?.id && item.userId === actor.id,
    )?.role || null
  );
}

export function canAccessProject(project, members, actor) {
  return Boolean(
    actor?.id &&
      (project?.visibility === "public" ||
        getProjectRole(project, members, actor)),
  );
}

export function canManageProject(project, members, actor) {
  return ["admin", "owner"].includes(getProjectRole(project, members, actor));
}

export function canManageTasks(project, members, actor) {
  return ["admin", "owner", "editor"].includes(
    getProjectRole(project, members, actor),
  );
}

export function canUpdateAssignedTask(task, project, members, actor) {
  return Boolean(
    task?.assigneeId === actor?.id &&
      getProjectRole(project, members, actor) === "member",
  );
}

export function canUpdateTask(task, project, members, actor, patch = {}) {
  if (canManageTasks(project, members, actor)) return true;
  const onlyStatus = Object.keys(patch).every((key) =>
    ["status", "completed", "sectionId"].includes(key),
  );
  return onlyStatus && canUpdateAssignedTask(task, project, members, actor);
}

export function calculateProjectProgress(tasks = [], projectId) {
  const active = tasks.filter(
    (item) => item.projectId === projectId && !item.archivedAt,
  );
  if (!active.length) return 0;
  const completed = active.filter(
    (item) => item.completed || item.status === "done",
  ).length;
  return Math.round((completed / active.length) * 100);
}

export const PROJECT_VIEWS = [
  "overview",
  "list",
  "board",
  "timeline",
  "dashboard",
  "calendar",
];
export const PROJECT_HEALTH = ["no_update", "on_track", "at_risk", "off_track"];
export const DEFAULT_PROJECT_ICON = "tabler-folder";

// Applies defaults for settings introduced by the new project workspace so
// legacy state keeps working without a migration.
export function normalizeProjectSettings(project) {
  if (!project || typeof project !== "object") return project;
  project.icon =
    typeof project.icon === "string" && project.icon.trim()
      ? project.icon.trim().slice(0, 40)
      : DEFAULT_PROJECT_ICON;
  project.defaultView = PROJECT_VIEWS.includes(project.defaultView)
    ? project.defaultView
    : "list";
  project.favoriteBy = Array.isArray(project.favoriteBy)
    ? project.favoriteBy.filter((userId) => typeof userId === "string")
    : [];
  project.health = PROJECT_HEALTH.includes(project.health)
    ? project.health
    : "no_update";
  project.startDate = isValidDate(project.startDate) ? project.startDate : null;
  project.dueDate = isValidDate(project.dueDate) ? project.dueDate : null;
  project.templateId =
    typeof project.templateId === "string" && project.templateId
      ? project.templateId.slice(0, 60)
      : "basic";
  return project;
}

export function validateProjectDates({ startDate, dueDate } = {}) {
  if (startDate !== undefined && startDate !== null && startDate !== "") {
    if (!isValidDate(startDate))
      return { valid: false, reason: "invalid_start" };
  }
  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    if (!isValidDate(dueDate)) return { valid: false, reason: "invalid_due" };
  }
  if (startDate && dueDate && startDate > dueDate)
    return { valid: false, reason: "range" };
  return { valid: true };
}

export function validateTaskDates({ startDate, dueDate } = {}) {
  if (startDate !== undefined && startDate !== null && startDate !== "") {
    if (!isValidDate(startDate))
      return { valid: false, reason: "invalid_start" };
  }
  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    if (!isValidDate(dueDate)) return { valid: false, reason: "invalid_due" };
  }
  if (startDate && dueDate && startDate > dueDate)
    return { valid: false, reason: "range" };
  return { valid: true };
}

export function isProjectFavorite(project, userId) {
  return Boolean(
    userId &&
      Array.isArray(project?.favoriteBy) &&
      project.favoriteBy.includes(userId),
  );
}

export function toggleProjectFavorite(project, userId) {
  if (!userId) return false;
  const favoriteBy = Array.isArray(project.favoriteBy)
    ? project.favoriteBy
    : [];
  if (favoriteBy.includes(userId)) {
    project.favoriteBy = favoriteBy.filter((id) => id !== userId);
    return false;
  }
  project.favoriteBy = [...favoriteBy, userId];
  return true;
}

export function createProjectStatusUpdate(
  state,
  project,
  { actor, health, note = "", id, now } = {},
) {
  if (!PROJECT_HEALTH.includes(health))
    return { valid: false, reason: "invalid_health" };
  const cleanNote = String(note || "")
    .trim()
    .slice(0, 1001);
  if (cleanNote.length > 1000) return { valid: false, reason: "invalid_note" };
  const update = {
    id: id || `su_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: project?.id,
    authorId: actor?.id || "",
    authorName: actor?.name || "",
    health,
    note: cleanNote,
    createdAt: now || new Date().toISOString(),
  };
  const current = Array.isArray(state.projectStatusUpdates)
    ? state.projectStatusUpdates
    : [];
  state.projectStatusUpdates = [update, ...current].slice(0, 500);
  if (project) {
    project.health = health;
    project.statusUpdatedAt = update.createdAt;
  }
  return { valid: true, update };
}

export function normalizeWorkState(input = {}) {
  const state = { ...input };
  for (const name of collections)
    state[name] = Array.isArray(input[name]) ? input[name] : [];
  for (const project of state.projects) normalizeProjectSettings(project);
  const counters = { ...(input.counters || {}) };
  for (const task of state.tasks)
    counters[task.projectId] = Math.max(
      Number(counters[task.projectId]) || 0,
      Number(task.number) || 0,
    );
  state.counters = counters;
  state.version = 1;
  return state;
}

export function isValidId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{2,100}$/.test(value);
}

export function isValidDate(value) {
  if (value === null || value === undefined || value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"];

export function normalizeTaskStatus(value) {
  return TASK_STATUSES.includes(value) ? value : "todo";
}

export function isActiveWorkUser(user) {
  return Boolean(user?.id && user.status === "able");
}

export function resolveCurrentActor(token, users = []) {
  if (!token?.id) return null;
  const user = users.find((item) => item.id === token.id);
  if (!isActiveWorkUser(user)) return null;
  return {
    id: user.id,
    name: user.name || "Người dùng",
    email: user.email || "",
    role: user.role || "user",
  };
}

export function publicWorkUser(user) {
  if (!user?.id) return null;
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    code: user.code || "",
    // Work screens only receive this safe public object, so always provide a
    // usable image without exposing the rest of the account record.
    avatarUrl:
      user.avatarUrl ||
      (user.role === "assistant"
        ? "/images/avatars/assistant.png"
        : user.role === "admin" && user.gender === "female"
          ? "/images/avatars/female-admin.png"
          : user.role === "admin"
            ? "/images/avatars/male-admin.png"
            : user.gender === "female"
              ? "/images/avatars/female-user.png"
              : "/images/avatars/male-user.png"),
  };
}

export function normalizeMemberPayload(members, activeUserIds, ownerId) {
  if (!Array.isArray(members))
    return { valid: false, reason: "invalid", members: [] };
  const seen = new Set();
  const normalized = [];
  for (const item of members) {
    if (
      !item ||
      !activeUserIds.has(item.userId) ||
      item.userId === ownerId ||
      !["editor", "member"].includes(item.role)
    ) {
      return { valid: false, reason: "invalid", members: [] };
    }
    if (seen.has(item.userId))
      return { valid: false, reason: "duplicate", members: [] };
    seen.add(item.userId);
    normalized.push({ userId: item.userId, role: item.role });
  }
  return { valid: true, members: normalized };
}

export function findRemovedAssignedMemberIds({
  projectId,
  currentMembers = [],
  nextMembers = [],
  tasks = [],
}) {
  const nextIds = new Set(nextMembers.map((item) => item.userId));
  const removedIds = new Set(
    currentMembers
      .filter(
        (item) => item.projectId === projectId && !nextIds.has(item.userId),
      )
      .map((item) => item.userId),
  );
  return [
    ...new Set(
      tasks
        .filter(
          (task) =>
            task.projectId === projectId &&
            !task.archivedAt &&
            removedIds.has(task.assigneeId),
        )
        .map((task) => task.assigneeId),
    ),
  ];
}

export function queuePendingGlobalAudit(state, audit) {
  const entry = {
    ...audit,
    id:
      audit.id ||
      `work_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: audit.timestamp || new Date().toISOString(),
  };
  state.pendingGlobalAudits = [
    ...(Array.isArray(state.pendingGlobalAudits)
      ? state.pendingGlobalAudits
      : []),
    entry,
  ];
  return entry;
}

export async function flushPendingGlobalAudits(
  entries,
  { deliver, acknowledge },
) {
  const delivered = [];
  const failed = [];
  for (const entry of entries) {
    try {
      await deliver(entry);
      await acknowledge(entry.id);
      delivered.push(entry.id);
    } catch {
      failed.push(entry.id);
    }
  }
  return { delivered, failed };
}

export function isActiveProjectAssignee(state, projectId, userId, users = []) {
  if (!userId) return true;
  return (
    users.some((user) => user.id === userId && isActiveWorkUser(user)) &&
    state.projectMembers.some(
      (member) => member.projectId === projectId && member.userId === userId,
    )
  );
}

// Creation resolves the target section explicitly: an omitted sectionId falls
// back to the project's first section, while an explicit id must belong to the
// project or the request is rejected.
export function resolveTaskSection(sections = [], projectId, sectionId) {
  const projectSections = sections
    .filter((section) => section.projectId === projectId)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  if (sectionId === undefined || sectionId === null)
    return projectSections[0] || null;
  return projectSections.find((section) => section.id === sectionId) || null;
}

export function synchronizeTaskState(task, patch = {}, sections = []) {
  const projectSections = sections.filter(
    (section) => section.projectId === task.projectId,
  );
  const currentSection = projectSections.find(
    (section) => section.id === task.sectionId,
  );
  let section = currentSection;

  if (patch.sectionId !== undefined) {
    section = projectSections.find((item) => item.id === patch.sectionId);
    if (!section) return { valid: false, reason: "invalid_section" };
  }
  if (patch.status !== undefined && !TASK_STATUSES.includes(patch.status))
    return { valid: false, reason: "invalid_status" };
  if (
    patch.sectionId !== undefined &&
    patch.status !== undefined &&
    section.status !== patch.status
  )
    return { valid: false, reason: "section_status_conflict" };
  const explicitStatus =
    patch.status !== undefined
      ? patch.status
      : patch.sectionId !== undefined
        ? section.status
        : undefined;
  if (
    patch.completed !== undefined &&
    explicitStatus !== undefined &&
    patch.completed !== (explicitStatus === "done")
  )
    return { valid: false, reason: "completion_conflict" };

  let status = task.status || currentSection?.status || "todo";
  if (patch.sectionId !== undefined)
    status =
      section.status === "done"
        ? "done"
        : TASK_STATUSES.includes(section.status)
          ? section.status
          : "todo";
  if (patch.status !== undefined) status = patch.status;
  if (patch.completed !== undefined && patch.status === undefined)
    status = patch.completed ? "done" : status === "done" ? "todo" : status;

  const completed = status === "done";
  // Derive the section deterministically: an explicit sectionId wins, and a
  // status/completed change moves the task to the section carrying that
  // status (falling back to the current section, then the first active one).
  const preferred = section && section.status === status ? section : null;
  const desiredSection =
    status === "done"
      ? preferred || projectSections.find((item) => item.status === "done")
      : preferred ||
        projectSections.find(
          (item) => item.status === status && item.status !== "done",
        ) ||
        projectSections.find((item) => item.status !== "done") ||
        section;

  return {
    valid: true,
    sectionId: desiredSection?.id || section?.id || task.sectionId,
    status,
    completed,
  };
}
