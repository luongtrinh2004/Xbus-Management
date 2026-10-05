import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/work-route-loader.mjs", import.meta.url);

const repo = await import("./helpers/stubs/dataRepository.mjs");
const { GET: listProjects, POST: createProject } = await import(
  "../src/app/api/work/projects/route.js"
);
const {
  GET: getProject,
  PATCH: patchProject,
} = await import("../src/app/api/work/projects/[id]/route.js");
const { POST: createTask } = await import(
  "../src/app/api/work/projects/[id]/tasks/route.js"
);
const { GET: listProjectCandidates } = await import(
  "../src/app/api/work/project-candidates/route.js"
);
const { PATCH: patchTask } = await import(
  "../src/app/api/work/tasks/[id]/route.js"
);
const {
  GET: listTemplates,
  POST: createTemplate,
} = await import("../src/app/api/work/templates/route.js");

const USERS = [
  {
    id: "u_owner",
    name: "Chủ dự án",
    email: "owner@x.vn",
    code: "NV01",
    role: "user",
    status: "able",
  },
  {
    id: "u_editor",
    name: "Biên tập viên",
    email: "editor@x.vn",
    code: "NV02",
    role: "user",
    status: "able",
  },
  {
    id: "u_member",
    name: "Thành viên",
    email: "member@x.vn",
    code: "NV03",
    role: "user",
    status: "able",
  },
  {
    id: "u_admin",
    name: "Quản trị viên",
    email: "admin@x.vn",
    code: "NV04",
    role: "admin",
    status: "able",
  },
  {
    id: "u_viewer",
    name: "Người xem",
    email: "viewer@x.vn",
    code: "NV06",
    role: "user",
    status: "able",
  },
  {
    id: "u_off",
    name: "Đã nghỉ việc",
    email: "off@x.vn",
    code: "NV05",
    role: "user",
    status: "disabled",
  },
];

const BASE_STATE = {
  version: 1,
  projects: [
    {
      id: "prj_1",
      title: "Dự án mẫu",
      key: "MAU",
      description: "",
      color: "#7367F0",
      visibility: "private",
      ownerId: "u_owner",
      template: "basic",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null,
    },
    {
      id: "prj_other",
      title: "Dự án khác",
      key: "KHAC",
      description: "",
      color: "#00BAD1",
      visibility: "private",
      ownerId: "u_owner",
      template: "basic",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null,
    },
  ],
  projectMembers: [
    { id: "pm_1", projectId: "prj_1", userId: "u_owner", role: "owner" },
    { id: "pm_2", projectId: "prj_1", userId: "u_editor", role: "editor" },
    { id: "pm_3", projectId: "prj_1", userId: "u_member", role: "member" },
  ],
  sections: [
    { id: "sec_todo", projectId: "prj_1", name: "Cần làm", status: "todo", order: 0 },
    {
      id: "sec_doing",
      projectId: "prj_1",
      name: "Đang làm",
      status: "in_progress",
      order: 1,
    },
    { id: "sec_done", projectId: "prj_1", name: "Xong", status: "done", order: 2 },
    {
      id: "sec_other",
      projectId: "prj_other",
      name: "Cần làm",
      status: "todo",
      order: 0,
    },
  ],
  tasks: [
    {
      id: "tsk_1",
      projectId: "prj_1",
      sectionId: "sec_todo",
      number: 1,
      code: "MAU-1",
      title: "Việc của thành viên",
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: "u_member",
      dueDate: null,
      completed: false,
      subtasks: [],
      createdBy: "u_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null,
    },
  ],
  comments: [],
  activities: [],
  labels: [],
  taskLabels: [],
  pendingGlobalAudits: [],
  projectStatusUpdates: [],
  workTemplates: [],
  counters: { prj_1: 1 },
};

const jsonRequest = (method, body) =>
  new Request("http://localhost/api/work/test", {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const params = (id) => ({ params: Promise.resolve({ id }) });
const actAs = (userId) => {
  const user = USERS.find((item) => item.id === userId);
  globalThis.__WORK_TEST_TOKEN = user
    ? { id: user.id, name: user.name, email: user.email, role: user.role }
    : null;
};

function reset(state = BASE_STATE) {
  repo.__resetDataRepository({ state, users: USERS });
  globalThis.__WORK_TEST_TOKEN = null;
}

test("project routes reject anonymous requests", async () => {
  reset();
  assert.equal((await listProjects(jsonRequest("GET"))).status, 401);
  assert.equal(
    (await createProject(jsonRequest("POST", { title: "X", key: "XX" }))).status,
    401,
  );
  assert.equal((await listTemplates(jsonRequest("GET"))).status, 401);
  assert.equal((await getProject(jsonRequest("GET"), params("prj_1"))).status, 401);
  assert.equal((await listProjectCandidates(jsonRequest("GET"))).status, 401);
});

test("project list/detail use least-privilege user rosters", async () => {
  const publicState = {
    ...BASE_STATE,
    projects: BASE_STATE.projects.map((project) =>
      project.id === "prj_1" ? { ...project, visibility: "public" } : project,
    ),
  };
  reset(publicState);

  for (const userId of ["u_owner", "u_editor", "u_member", "u_viewer", "u_admin"]) {
    actAs(userId);
    const listResponse = await listProjects(jsonRequest("GET"));
    assert.equal(listResponse.status, 200, userId);
    const listBody = await listResponse.json();
    assert.equal(Object.hasOwn(listBody, "allUsers"), false);
    assert.deepEqual(
      listBody.users.map((user) => user.id).sort(),
      ["u_editor", "u_member", "u_owner"],
    );

    const detailResponse = await getProject(jsonRequest("GET"), params("prj_1"));
    assert.equal(detailResponse.status, 200, userId);
    const detail = await detailResponse.json();
    assert.equal(
      detail.project.canManage,
      ["u_owner", "u_admin"].includes(userId),
    );
    assert.equal(Object.hasOwn(detail, "allUsers"), false);
    if (["u_owner", "u_editor", "u_admin"].includes(userId)) {
      assert.deepEqual(
        detail.candidateUsers.map((user) => user.id).sort(),
        ["u_admin", "u_editor", "u_member", "u_owner", "u_viewer"],
      );
    } else {
      assert.equal(Object.hasOwn(detail, "candidateUsers"), false);
      assert.deepEqual(
        detail.users.map((user) => user.id).sort(),
        ["u_editor", "u_member", "u_owner"],
      );
    }
  }

  actAs("u_viewer");
  const candidates = await listProjectCandidates(jsonRequest("GET"));
  assert.equal(candidates.status, 200);
  assert.equal((await candidates.json()).canCreate, true);
});

test("project creation persists wizard fields, structure and tasks", async () => {
  reset();
  actAs("u_owner");
  const res = await createProject(
    jsonRequest("POST", {
      title: "Dự án Import",
      key: "IMP-1",
      description: "Tạo từ wizard",
      templateId: "bug-tracker",
      icon: "tabler-rocket",
      defaultView: "timeline",
      startDate: "2026-10-01",
      dueDate: "2026-12-31",
      visibility: "public",
      color: "#28C76F",
      members: [
        { userId: "u_editor", role: "editor" },
        { userId: "u_member", role: "member" },
      ],
      sections: [
        { name: "Lỗi mới" },
        { name: "Đã đóng", status: "done" },
      ],
      tasks: [
        {
          title: "Sửa lỗi đăng nhập",
          description: "Lỗi 500 khi đăng nhập",
          section: "Lỗi mới",
          priority: "high",
          assignee: "member@x.vn",
          dueDate: "2026-10-20",
        },
      ],
    }),
  );
  assert.equal(res.status, 201, await res.clone().text());
  const created = await res.json();
  assert.equal(created.templateId, "bug-tracker");
  assert.equal(created.icon, "tabler-rocket");
  assert.equal(created.defaultView, "timeline");
  assert.equal(created.health, "no_update");
  assert.deepEqual(created.favoriteBy, []);
  assert.equal(created.startDate, "2026-10-01");
  assert.equal(created.dueDate, "2026-12-31");

  const state = repo.__getState();
  const project = state.projects.find((item) => item.id === created.id);
  assert.equal(project.visibility, "public");
  assert.equal(
    state.sections.filter((item) => item.projectId === created.id).length,
    2,
  );
  const [task] = state.tasks.filter((item) => item.projectId === created.id);
  assert.equal(task.title, "Sửa lỗi đăng nhập");
  assert.equal(task.assigneeId, "u_member", "assignee resolved by email");
  assert.equal(task.sectionId, state.sections.find(
    (item) => item.projectId === created.id && item.name === "Lỗi mới",
  ).id);
  assert.equal(task.code.startsWith(project.key), true);
  assert.ok(state.projectMembers.some(
    (item) => item.projectId === created.id && item.userId === "u_editor" && item.role === "editor",
  ));
  assert.ok(state.activities.some((item) => item.action === "create_project"));
});

test("project creation validates key, dates, view and owner assignment", async () => {
  reset();
  actAs("u_owner");
  const badKey = await createProject(
    jsonRequest("POST", { title: "Dự án", key: "sai key" }),
  );
  assert.equal(badKey.status, 400);

  const badDates = await createProject(
    jsonRequest("POST", {
      title: "Dự án",
      key: "DATE-1",
      startDate: "2026-05-01",
      dueDate: "2026-04-01",
    }),
  );
  assert.equal(badDates.status, 400);
  assert.match((await badDates.json()).error, /thời gian|khoảng|không hợp lệ/i);

  const badView = await createProject(
    jsonRequest("POST", { title: "Dự án", key: "VIEW-1", defaultView: "gantt" }),
  );
  assert.equal(badView.status, 400);

  const inactiveOwner = await createProject(
    jsonRequest("POST", { title: "Dự án", key: "OWN-1", ownerId: "u_off" }),
  );
  assert.equal(inactiveOwner.status, 400);

  const otherOwner = await createProject(
    jsonRequest("POST", { title: "Dự án", key: "OWN-2", ownerId: "u_editor" }),
  );
  assert.equal(otherOwner.status, 403, "only admins may set another owner");
  assert.match((await otherOwner.json()).error, /quản trị viên/i);

  actAs("u_admin");
  const adminOwner = await createProject(
    jsonRequest("POST", { title: "Dự án", key: "OWN-3", ownerId: "u_editor" }),
  );
  assert.equal(adminOwner.status, 201);
  assert.equal((await adminOwner.json()).ownerId, "u_editor");
});

test("favorite is allowed for readers while project edits stay restricted", async () => {
  reset();
  actAs("u_member");
  const favorite = await patchProject(
    jsonRequest("PATCH", { favorite: true }),
    params("prj_1"),
  );
  assert.equal(favorite.status, 200);
  assert.equal((await favorite.json()).favorite, true);
  assert.deepEqual(
    repo.__getState().projects[0].favoriteBy,
    ["u_member"],
  );

  const title = await patchProject(
    jsonRequest("PATCH", { title: "Đổi tên" }),
    params("prj_1"),
  );
  assert.equal(title.status, 403);

  const statusUpdate = await patchProject(
    jsonRequest("PATCH", { statusUpdate: { health: "at_risk", note: "Thiếu người" } }),
    params("prj_1"),
  );
  assert.equal(statusUpdate.status, 403, "members cannot post status updates");

  actAs("u_owner");
  const ownerUpdate = await patchProject(
    jsonRequest("PATCH", { statusUpdate: { health: "on_track", note: "Ổn định" } }),
    params("prj_1"),
  );
  assert.equal(ownerUpdate.status, 200);
  const state = repo.__getState();
  assert.equal(state.projects[0].health, "on_track");
  assert.equal(state.projectStatusUpdates.length, 1);
  assert.equal(state.projectStatusUpdates[0].authorId, "u_owner");

  const badHealth = await patchProject(
    jsonRequest("PATCH", { statusUpdate: { health: "sunny", note: "x" } }),
    params("prj_1"),
  );
  assert.equal(badHealth.status, 400);
});

test("member replacement rejects members assigned to active tasks", async () => {
  reset();
  actAs("u_owner");
  const res = await patchProject(
    jsonRequest("PATCH", {
      members: [
        { userId: "u_editor", role: "editor" },
        { userId: "u_admin", role: "member" },
      ],
    }),
    params("prj_1"),
  );
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /thành viên/i);

  const allowed = await patchProject(
    jsonRequest("PATCH", {
      members: [
        { userId: "u_editor", role: "editor" },
        { userId: "u_member", role: "member" },
        { userId: "u_admin", role: "member" },
      ],
    }),
    params("prj_1"),
  );
  assert.equal(allowed.status, 200);
});

test("task creation validates section and section/status consistency", async () => {
  reset();
  actAs("u_owner");

  const explicitInvalid = await createTask(
    jsonRequest("POST", { title: "Việc mới", sectionId: "khong-ton-tai" }),
    params("prj_1"),
  );
  assert.equal(explicitInvalid.status, 400);
  assert.match((await explicitInvalid.json()).error, /Nhóm công việc/);

  const crossProject = await createTask(
    jsonRequest("POST", { title: "Việc mới", sectionId: "sec_other" }),
    params("prj_1"),
  );
  assert.equal(crossProject.status, 400);

  const conflict = await createTask(
    jsonRequest("POST", { title: "Việc mới", sectionId: "sec_todo", status: "in_progress" }),
    params("prj_1"),
  );
  assert.equal(conflict.status, 400);
  assert.match((await conflict.json()).error, /khớp nhau/);

  const omitted = await createTask(
    jsonRequest("POST", { title: "Việc mặc định" }),
    params("prj_1"),
  );
  assert.equal(omitted.status, 201);
  const created = await omitted.json();
  assert.equal(created.sectionId, "sec_todo", "defaults to first section");
  assert.equal(created.status, "todo");
  assert.equal(created.completed, false);

  const invalidRange = await createTask(
    jsonRequest("POST", {
      title: "Ngày sai",
      startDate: "2026-10-10",
      dueDate: "2026-10-09",
    }),
    params("prj_1"),
  );
  assert.equal(invalidRange.status, 400);
  assert.match((await invalidRange.json()).error, /bắt đầu.*hạn|thời gian/i);
});

test("task updates enforce workflow permissions and consistency", async () => {
  reset();
  actAs("u_member");
  const workflow = await patchTask(
    jsonRequest("PATCH", { sectionId: "sec_doing" }),
    params("tsk_1"),
  );
  assert.equal(workflow.status, 200);
  const moved = await workflow.json();
  assert.equal(moved.status, "in_progress");
  assert.equal(moved.completed, false);

  const title = await patchTask(jsonRequest("PATCH", { title: "Đổi" }), params("tsk_1"));
  assert.equal(title.status, 403);

  const conflict = await patchTask(
    jsonRequest("PATCH", { sectionId: "sec_todo", status: "in_progress" }),
    params("tsk_1"),
  );
  assert.equal(conflict.status, 400);
  assert.match((await conflict.json()).error, /khớp nhau/);

  const doneMove = await patchTask(
    jsonRequest("PATCH", { sectionId: "sec_done" }),
    params("tsk_1"),
  );
  assert.equal(doneMove.status, 200);
  const doneTask = await doneMove.json();
  assert.equal(doneTask.status, "done");
  assert.equal(doneTask.completed, true);

  actAs("u_owner");
  const invalidRange = await patchTask(
    jsonRequest("PATCH", {
      startDate: "2026-10-10",
      dueDate: "2026-10-09",
    }),
    params("tsk_1"),
  );
  assert.equal(invalidRange.status, 400);
});

test("project creation preserves imported status and validates seed task dates", async () => {
  reset();
  actAs("u_owner");
  const created = await createProject(
    jsonRequest("POST", {
      title: "Import Status",
      key: "IMP-ST",
      sections: [
        { name: "Doing", status: "in_progress" },
        { name: "Done", status: "done" },
      ],
      tasks: [{ title: "Imported", sectionIndex: 1, status: "done" }],
    }),
  );
  assert.equal(created.status, 201, await created.clone().text());
  const project = await created.json();
  const task = repo
    .__getState()
    .tasks.find((item) => item.projectId === project.id);
  assert.equal(task.status, "done");
  assert.equal(task.completed, true);

  const invalid = await createProject(
    jsonRequest("POST", {
      title: "Import Bad Dates",
      key: "IMP-DATE",
      sections: [{ name: "Todo", status: "todo" }],
      tasks: [
        {
          title: "Bad",
          startDate: "2026-10-10",
          dueDate: "2026-10-09",
        },
      ],
    }),
  );
  assert.equal(invalid.status, 400);
});

test("failed global audit flush keeps the pending outbox entry", async () => {
  reset();
  actAs("u_owner");
  repo.__setAppendFailure(true);
  const res = await patchTask(
    jsonRequest("PATCH", { priority: "high" }),
    params("tsk_1"),
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  const state = repo.__getState();
  assert.equal(state.pendingGlobalAudits.length, 1, "audit retained for retry");
  assert.equal(repo.__getAuditLog().length, 0, "nothing delivered yet");
  assert.equal(body.audit.globalAudit, "secondary");
  assert.equal(body.audit.authoritative, "work_activity");
  assert.ok(state.activities.some((item) => item.taskId === "tsk_1"));

  repo.__setAppendFailure(false);
  const { flushWorkAuditOutbox } = await import("../src/libs/workApi.js");
  const flushed = await flushWorkAuditOutbox();
  assert.equal(flushed.delivered.length, 1);
  assert.equal(repo.__getState().pendingGlobalAudits.length, 0);
  assert.equal(repo.__getAuditLog().length, 1);
});

test("template gallery lists the catalog and persists custom templates", async () => {
  reset();
  const anonymous = await listTemplates(jsonRequest("GET"));
  assert.equal(anonymous.status, 401);

  actAs("u_owner");
  const catalog = await listTemplates(jsonRequest("GET"));
  assert.equal(catalog.status, 200);
  const body = await catalog.json();
  assert.ok(body.templates.length >= 12);
  assert.ok(body.categories.length >= 5);
  assert.ok(body.templates.some((item) => item.id === "sprint-backlog"));

  const invalid = await createTemplate(
    jsonRequest("POST", { name: "", sections: [] }),
  );
  assert.equal(invalid.status, 400);

  const saved = await createTemplate(
    jsonRequest("POST", {
      name: "Mẫu nội bộ XBus",
      category: "xbus",
      description: "Mẫu do đội vận hành lưu",
      icon: "tabler-bus",
      sections: [
        { name: "Cần xử lý", status: "todo" },
        { name: "Hoàn thành", status: "done" },
      ],
      tasks: [{ title: "Kiểm tra ca trực", section: "Cần xử lý", priority: "high" }],
    }),
  );
  assert.equal(saved.status, 201);
  const template = await saved.json();
  assert.equal(template.id.startsWith("wtp_"), true);
  assert.equal(repo.__getState().workTemplates.length, 1);
  assert.ok(
    repo.__getState().activities.length >= 1,
    "template save writes a durable activity",
  );
  const reloaded = await (await listTemplates(jsonRequest("GET"))).json();
  assert.ok(reloaded.templates.some((item) => item.id === template.id));
});
