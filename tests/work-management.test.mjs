import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateProjectProgress,
  canAccessProject,
  canUpdateAssignedTask,
  findRemovedAssignedMemberIds,
  flushPendingGlobalAudits,
  getProjectRole,
  getTemplateSections,
  isActiveProjectAssignee,
  isActiveWorkUser,
  isValidDate,
  nextTaskNumber,
  isProjectFavorite,
  normalizeMemberPayload,
  normalizeProjectKey,
  normalizeWorkState,
  PROJECT_HEALTH,
  createProjectStatusUpdate,
  toggleProjectFavorite,
  validateProjectDates,
  validateTaskDates,
  publicWorkUser,
  queuePendingGlobalAudit,
  resolveCurrentActor,
  resolveTaskSection,
  synchronizeTaskState,
  taskCode,
  validateProjectKey,
} from "../src/libs/workManagement.js";

test("project keys are normalized to uppercase ASCII tokens", () => {
  assert.equal(normalizeProjectKey("  web app  "), "WEB-APP");
  assert.equal(normalizeProjectKey("Dự án số 1"), "DU-AN-SO-1");
});

test("project key validation rejects invalid or duplicate keys", () => {
  assert.deepEqual(validateProjectKey("WEB-1", ["OPS"]), {
    valid: true,
    key: "WEB-1",
  });
  assert.equal(validateProjectKey("A", []).valid, false);
  assert.equal(validateProjectKey("WEB_1", []).valid, false);
  assert.equal(validateProjectKey("WEB", ["web"]).reason, "duplicate");
});

test("task numbering and code use the next project sequence", () => {
  const tasks = [
    { projectId: "p1", number: 1 },
    { projectId: "p1", number: 7 },
    { projectId: "p2", number: 20 },
  ];
  assert.equal(nextTaskNumber(tasks, "p1"), 8);
  assert.equal(taskCode({ key: "WEB" }, 8), "WEB-8");
});

test("templates provide practical default sections", () => {
  assert.deepEqual(
    getTemplateSections("basic").map((item) => item.name),
    ["Việc cần làm", "Đang thực hiện", "Hoàn thành"],
  );
  assert.deepEqual(
    getTemplateSections("campaign").map((item) => item.name),
    ["Ý tưởng", "Chuẩn bị", "Đang chạy", "Đã hoàn tất"],
  );
});

test("project visibility and member roles enforce private access", () => {
  const project = { id: "p1", visibility: "private", ownerId: "u1" };
  const members = [{ projectId: "p1", userId: "u2", role: "editor" }];
  assert.equal(
    getProjectRole(project, members, { id: "u1", role: "user" }),
    "owner",
  );
  assert.equal(
    getProjectRole(project, members, { id: "u2", role: "user" }),
    "editor",
  );
  assert.equal(
    getProjectRole(project, members, { id: "admin", role: "admin" }),
    "admin",
  );
  assert.equal(
    canAccessProject(project, members, { id: "u3", role: "user" }),
    false,
  );
  assert.equal(
    canAccessProject({ ...project, visibility: "public" }, members, {
      id: "u3",
      role: "user",
    }),
    true,
  );
});

test("project progress ignores archived tasks and rounds completion percentage", () => {
  const tasks = [
    { projectId: "p1", completed: true },
    { projectId: "p1", status: "done" },
    { projectId: "p1", completed: false },
    { projectId: "p1", archivedAt: "2026-01-01" },
    { projectId: "p2", completed: true },
  ];
  assert.equal(calculateProjectProgress(tasks, "p1"), 67);
  assert.equal(calculateProjectProgress([], "p1"), 0);
});

test("state normalization creates all collections and repairs counters", () => {
  const state = normalizeWorkState({
    projects: [{ id: "p1", key: "WEB" }],
    tasks: [{ id: "t1", projectId: "p1", number: 4 }],
  });
  assert.deepEqual(state.projectMembers, []);
  assert.deepEqual(state.sections, []);
  assert.deepEqual(state.comments, []);
  assert.deepEqual(state.activities, []);
  assert.deepEqual(state.labels, []);
  assert.deepEqual(state.taskLabels, []);
  assert.deepEqual(state.pendingGlobalAudits, []);
  assert.equal(state.counters.p1, 4);
});

test("work audits are queued durably and failed delivery is not acknowledged", async () => {
  const state = normalizeWorkState({});
  const audit = queuePendingGlobalAudit(state, {
    adminId: "u1",
    action: "UPDATE_WORK_TASK",
    targetType: "WORK_TASK",
    targetId: "t1",
    details: "updated",
  });
  assert.equal(state.pendingGlobalAudits.length, 1);
  assert.equal(state.pendingGlobalAudits[0].id, audit.id);

  const acknowledged = [];
  const result = await flushPendingGlobalAudits(state.pendingGlobalAudits, {
    deliver: async () => {
      throw new Error("global audit unavailable");
    },
    acknowledge: async (id) => acknowledged.push(id),
  });
  assert.deepEqual(result, { delivered: [], failed: [audit.id] });
  assert.deepEqual(acknowledged, []);
  // A failed flush must leave the pending entry in the durable outbox so a
  // later flush can retry it.
  assert.equal(state.pendingGlobalAudits.length, 1);
  assert.equal(state.pendingGlobalAudits[0].id, audit.id);
});

test("pending global audits are never silently truncated", () => {
  const state = normalizeWorkState({
    pendingGlobalAudits: Array.from({ length: 3000 }, (_, index) => ({
      id: `old-${index}`,
    })),
  });
  queuePendingGlobalAudit(state, {
    id: "new-audit",
    action: "UPDATE_WORK_TASK",
    targetType: "WORK_TASK",
    targetId: "t1",
  });
  assert.equal(state.pendingGlobalAudits.length, 3001);
  assert.equal(state.pendingGlobalAudits[0].id, "old-0");
  assert.equal(state.pendingGlobalAudits.at(-1).id, "new-audit");
});

test("date validation rejects impossible calendar dates", () => {
  assert.equal(isValidDate("2026-02-28"), true);
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(isValidDate("2026-02-31"), false);
  assert.equal(isValidDate("2026-04-31"), false);
  assert.equal(isValidDate("2025-02-29"), false);
});

test("public work users exclude private account fields", () => {
  const user = publicWorkUser({
    id: "u1",
    name: "User",
    email: "user@example.com",
    code: "NV01",
    avatarUrl: "/a.png",
    role: "admin",
    password: "hash",
    phone: "secret",
    citizenId: "secret",
    address: "secret",
    status: "able",
  });
  assert.deepEqual(user, {
    id: "u1",
    name: "User",
    email: "user@example.com",
    code: "NV01",
    avatarUrl: "/a.png",
  });
});

test("current actor resolution uses the stored active account and current role", () => {
  const users = [
    {
      id: "u1",
      name: "Current",
      email: "new@example.com",
      role: "user",
      status: "able",
    },
    { id: "u2", role: "admin", status: "disabled" },
  ];
  assert.equal(isActiveWorkUser(users[0]), true);
  assert.equal(isActiveWorkUser(users[1]), false);
  assert.deepEqual(
    resolveCurrentActor(
      { id: "u1", name: "Stale", email: "old@example.com", role: "admin" },
      users,
    ),
    {
      id: "u1",
      name: "Current",
      email: "new@example.com",
      role: "user",
    },
  );
  assert.equal(resolveCurrentActor({ id: "u2", role: "admin" }, users), null);
  assert.equal(
    resolveCurrentActor({ id: "missing", role: "admin" }, users),
    null,
  );
});

test("assignees must be active project members", () => {
  const state = {
    projectMembers: [
      { projectId: "p1", userId: "active" },
      { projectId: "p1", userId: "disabled" },
      { projectId: "p2", userId: "other-project" },
    ],
  };
  const users = [
    { id: "active", status: "able" },
    { id: "disabled", status: "disabled" },
    { id: "other-project", status: "able" },
  ];
  assert.equal(isActiveProjectAssignee(state, "p1", "active", users), true);
  assert.equal(isActiveProjectAssignee(state, "p1", "disabled", users), false);
  assert.equal(
    isActiveProjectAssignee(state, "p1", "other-project", users),
    false,
  );
  assert.equal(isActiveProjectAssignee(state, "p1", null, users), true);
});

test("member payload rejects duplicates and conflicting roles", () => {
  const activeIds = new Set(["u1", "u2", "owner"]);
  assert.deepEqual(
    normalizeMemberPayload(
      [
        { userId: "u1", role: "member" },
        { userId: "u2", role: "editor" },
      ],
      activeIds,
      "owner",
    ),
    {
      valid: true,
      members: [
        { userId: "u1", role: "member" },
        { userId: "u2", role: "editor" },
      ],
    },
  );
  assert.equal(
    normalizeMemberPayload(
      [
        { userId: "u1", role: "member" },
        { userId: "u1", role: "member" },
      ],
      activeIds,
      "owner",
    ).reason,
    "duplicate",
  );
  assert.equal(
    normalizeMemberPayload(
      [
        { userId: "u1", role: "member" },
        { userId: "u1", role: "editor" },
      ],
      activeIds,
      "owner",
    ).reason,
    "duplicate",
  );
  assert.equal(
    normalizeMemberPayload(
      [{ userId: "inactive", role: "member" }],
      activeIds,
      "owner",
    ).reason,
    "invalid",
  );
});

test("member replacement identifies removed members assigned to active tasks", () => {
  const removed = findRemovedAssignedMemberIds({
    projectId: "p1",
    currentMembers: [
      { projectId: "p1", userId: "u1" },
      { projectId: "p1", userId: "u2" },
    ],
    nextMembers: [{ userId: "u2", role: "member" }],
    tasks: [
      { projectId: "p1", assigneeId: "u1", archivedAt: null },
      { projectId: "p1", assigneeId: "u2", archivedAt: null },
      { projectId: "p1", assigneeId: "u3", archivedAt: "2026-01-01" },
    ],
  });
  assert.deepEqual(removed, ["u1"]);
});

test("assigned ordinary members may update only task workflow fields", () => {
  const project = { id: "p1", ownerId: "owner", visibility: "private" };
  const members = [{ projectId: "p1", userId: "u1", role: "member" }];
  const task = { projectId: "p1", assigneeId: "u1" };
  const actor = { id: "u1", role: "user" };
  assert.equal(canUpdateAssignedTask(task, project, members, actor), true);
  assert.equal(
    canUpdateAssignedTask(task, project, members, { id: "u2", role: "user" }),
    false,
  );
});

test("task state synchronization keeps section status and completed aligned", () => {
  const sections = [
    { id: "todo", projectId: "p1", status: "todo", order: 0 },
    { id: "doing", projectId: "p1", status: "in_progress", order: 1 },
    { id: "done", projectId: "p1", status: "done", order: 2 },
  ];
  assert.deepEqual(
    synchronizeTaskState(
      {
        projectId: "p1",
        sectionId: "doing",
        status: "in_progress",
        completed: false,
      },
      { sectionId: "done" },
      sections,
    ),
    {
      valid: true,
      sectionId: "done",
      status: "done",
      completed: true,
    },
  );
  assert.deepEqual(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "done", status: "done", completed: true },
      { sectionId: "doing" },
      sections,
    ),
    {
      valid: true,
      sectionId: "doing",
      status: "in_progress",
      completed: false,
    },
  );
  assert.deepEqual(
    synchronizeTaskState(
      {
        projectId: "p1",
        sectionId: "doing",
        status: "in_progress",
        completed: false,
      },
      { status: "done" },
      sections,
    ),
    {
      valid: true,
      sectionId: "done",
      status: "done",
      completed: true,
    },
  );
  assert.deepEqual(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "done", status: "done", completed: true },
      { status: "blocked" },
      sections,
    ),
    {
      valid: true,
      sectionId: "todo",
      status: "blocked",
      completed: false,
    },
  );
  assert.equal(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "todo", status: "todo", completed: false },
      { status: "invalid" },
      sections,
    ).reason,
    "invalid_status",
  );
  assert.equal(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "todo", status: "todo", completed: false },
      { sectionId: "todo", status: "in_progress" },
      sections,
    ).reason,
    "section_status_conflict",
  );
  assert.equal(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "todo", status: "todo", completed: false },
      { sectionId: "done", completed: false },
      sections,
    ).reason,
    "completion_conflict",
  );
});

test("task creation only falls back to the default section when omitted", () => {
  const sections = [
    { id: "todo", projectId: "p1", order: 0, status: "todo" },
    { id: "doing", projectId: "p1", order: 1, status: "in_progress" },
    { id: "done", projectId: "p1", order: 2, status: "done" },
    { id: "other-project", projectId: "p2", order: 0, status: "todo" },
  ];
  assert.equal(resolveTaskSection(sections, "p1", undefined)?.id, "todo");
  assert.equal(resolveTaskSection(sections, "p1", null)?.id, "todo");
  assert.equal(resolveTaskSection(sections, "p1", "doing")?.id, "doing");
  assert.equal(resolveTaskSection(sections, "p1", "does-not-exist"), null);
  assert.equal(resolveTaskSection(sections, "p1", "other-project"), null);
  assert.equal(resolveTaskSection(sections, "p1", ""), null);
  assert.equal(resolveTaskSection([], "p1", undefined), null);
});

test("workflow updates derive the section matching the target status", () => {
  const sections = [
    { id: "todo", projectId: "p1", status: "todo", order: 0 },
    { id: "doing", projectId: "p1", status: "in_progress", order: 1 },
    { id: "done", projectId: "p1", status: "done", order: 2 },
  ];
  assert.deepEqual(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "todo", status: "todo", completed: false },
      { status: "in_progress" },
      sections,
    ),
    {
      valid: true,
      sectionId: "doing",
      status: "in_progress",
      completed: false,
    },
  );
  assert.deepEqual(
    synchronizeTaskState(
      {
        projectId: "p1",
        sectionId: "doing",
        status: "in_progress",
        completed: false,
      },
      { completed: true },
      sections,
    ),
    { valid: true, sectionId: "done", status: "done", completed: true },
  );
  assert.deepEqual(
    synchronizeTaskState(
      { projectId: "p1", sectionId: "done", status: "done", completed: true },
      { completed: false },
      sections,
    ),
    { valid: true, sectionId: "todo", status: "todo", completed: false },
  );
});

test("project settings normalize with safe defaults", () => {
  const state = normalizeWorkState({
    projects: [{ id: "p1", key: "WEB", title: "Web" }],
  });
  const [project] = state.projects;
  assert.equal(project.icon, "tabler-folder");
  assert.equal(project.defaultView, "board");
  assert.deepEqual(project.favoriteBy, []);
  assert.equal(project.health, "no_update");
  assert.deepEqual(state.projectStatusUpdates, []);
  assert.equal(isProjectFavorite({ favoriteBy: ["u1"] }, "u1"), true);
  assert.equal(isProjectFavorite({ favoriteBy: ["u1"] }, "u2"), false);
});

test("project scheduling dates are validated", () => {
  assert.deepEqual(
    validateProjectDates({ startDate: "2026-01-01", dueDate: "2026-02-01" }),
    { valid: true },
  );
  assert.deepEqual(validateProjectDates({}), { valid: true });
  assert.equal(
    validateProjectDates({ startDate: "2026-02-31" }).reason,
    "invalid_start",
  );
  assert.equal(
    validateProjectDates({ dueDate: "not-a-date" }).reason,
    "invalid_due",
  );
  assert.equal(
    validateProjectDates({ startDate: "2026-03-01", dueDate: "2026-02-01" })
      .reason,
    "range",
  );
});

test("task scheduling dates require startDate not after dueDate", () => {
  assert.deepEqual(
    validateTaskDates({ startDate: "2026-10-01", dueDate: "2026-10-05" }),
    { valid: true },
  );
  assert.equal(
    validateTaskDates({ startDate: "2026-10-06", dueDate: "2026-10-05" })
      .reason,
    "range",
  );
  assert.equal(
    validateTaskDates({ startDate: "2026-02-31" }).reason,
    "invalid_start",
  );
});

test("project favorite flag toggles for each user", () => {
  const project = { favoriteBy: [] };
  assert.equal(toggleProjectFavorite(project, "u1"), true);
  assert.deepEqual(project.favoriteBy, ["u1"]);
  assert.equal(toggleProjectFavorite(project, "u1"), false);
  assert.deepEqual(project.favoriteBy, []);
});

test("project status updates validate health and are capped", () => {
  const state = normalizeWorkState({ projects: [{ id: "p1" }] });
  const project = state.projects[0];
  const created = createProjectStatusUpdate(state, project, {
    actor: { id: "u1", name: "A", email: "a@example.com" },
    health: "at_risk",
    note: "Thiếu nhân lực kiểm thử",
    id: "su_1",
    now: "2026-10-05T00:00:00.000Z",
  });
  assert.equal(created.valid, true);
  assert.equal(project.health, "at_risk");
  assert.equal(state.projectStatusUpdates.length, 1);
  assert.equal(state.projectStatusUpdates[0].authorId, "u1");
  assert.equal(state.projectStatusUpdates[0].health, "at_risk");
  assert.equal(state.projectStatusUpdates[0].projectId, "p1");

  const invalid = createProjectStatusUpdate(state, project, {
    actor: { id: "u1" },
    health: "sunny",
    note: "ok",
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.reason, "invalid_health");
  assert.equal(state.projectStatusUpdates.length, 1);

  assert.ok(PROJECT_HEALTH.includes("no_update"));
  assert.equal(
    createProjectStatusUpdate(state, project, {
      actor: { id: "u1" },
      health: "on_track",
      note: "x".repeat(1001),
    }).reason,
    "invalid_note",
  );

  for (let index = 0; index < 505; index += 1) {
    createProjectStatusUpdate(state, project, {
      actor: { id: "u1" },
      health: "on_track",
      note: `cập nhật ${index}`,
      id: `su_${index}`,
      now: "2026-10-05T00:00:00.000Z",
    });
  }
  assert.equal(state.projectStatusUpdates.length, 500);
});
