import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  loadWorkContext,
  makeId,
  mutateWork,
  nowIso,
  publicUser,
  taskSyncFailMessage,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";
import {
  PROJECT_VIEWS,
  TASK_STATUSES,
  calculateProjectProgress,
  getProjectRole,
  getTemplateSections,
  isActiveWorkUser,
  isValidDate,
  isProjectFavorite,
  normalizeMemberPayload,
  normalizeProjectKey,
  synchronizeTaskState,
  validateProjectDates,
  validateProjectKey,
  validateTaskDates,
} from "@/libs/workManagement";
import { getTemplate, templateSections } from "@/libs/workTemplates";

const MAX_SECTIONS = 30;
const MAX_SEED_TASKS = 300;

export async function GET(req) {
  const { actor, state, users } = await loadWorkContext(req);
  if (!actor)
    return NextResponse.json(
      { error: "Vui lòng đăng nhập bằng tài khoản đang hoạt động" },
      { status: 401 },
    );
  const userMap = new Map(users.map((user) => [user.id, publicUser(user)]));
  const projects = state.projects
    .filter(
      (project) =>
        !project.archivedAt &&
        (project.visibility === "public" ||
          getProjectRole(project, state.projectMembers, actor)),
    )
    .map((project) => ({
      ...project,
      role: getProjectRole(project, state.projectMembers, actor) || "viewer",
      owner: userMap.get(project.ownerId) || null,
      favorite: isProjectFavorite(project, actor.id),
      members: state.projectMembers
        .filter(
          (item) => item.projectId === project.id && userMap.has(item.userId),
        )
        .map((item) => ({ ...item, user: userMap.get(item.userId) })),
      taskCount: state.tasks.filter(
        (item) => item.projectId === project.id && !item.archivedAt,
      ).length,
      progress: calculateProjectProgress(state.tasks, project.id),
      lastStatusUpdate: (state.projectStatusUpdates || []).find(
        (item) => item.projectId === project.id,
      ) || null,
    }))
    .sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );
  const relatedIds = new Set(
    projects.flatMap((project) => [
      project.ownerId,
      ...project.members.map((member) => member.userId),
    ]),
  );
  return NextResponse.json({
    projects,
    users: users.filter((user) => relatedIds.has(user.id)).map(publicUser),
  });
}

function normalizeRequestedSections(input) {
  if (!Array.isArray(input) || !input.length)
    failWork(400, "Danh sách nhóm công việc không hợp lệ");
  if (input.length > MAX_SECTIONS)
    failWork(400, `Dự án tối đa ${MAX_SECTIONS} nhóm công việc`);
  const seen = new Set();
  return input.map((item, index) => {
    const name = String(item?.name || "").trim().slice(0, 80);
    if (!name) failWork(400, `Nhóm công việc thứ ${index + 1} không hợp lệ`);
    const key = name.toLocaleLowerCase("vi");
    if (seen.has(key)) failWork(400, `Nhóm công việc bị trùng: ${name}`);
    seen.add(key);
    const status = TASK_STATUSES.includes(item?.status)
      ? item.status
      : index === input.length - 1
        ? "done"
        : index === 0
          ? "todo"
          : "in_progress";
    return { name, status };
  });
}

// Resolves an assignee from an id or a name/email/code. Returns null when no
// assignee was requested and undefined when the value cannot be used.
function resolveAssigneeId(value, users, allowedIds) {
  if (value === undefined || value === null || value === "") return null;
  const needle = String(value).trim().toLowerCase();
  const match = users.find(
    (user) =>
      user.id === needle ||
      String(user.email || "").toLowerCase() === needle ||
      String(user.code || "").toLowerCase() === needle ||
      String(user.name || "").toLowerCase() === needle,
  );
  if (!match) return undefined;
  if (allowedIds && !allowedIds.has(match.id)) return undefined;
  return match.id;
}

function projectTaskNumber(state, projectId) {
  const numbers = state.tasks
    .filter((task) => task.projectId === projectId)
    .map((task) => Number(task.number) || 0);
  const next =
    Math.max(0, ...numbers, Number(state.counters[projectId]) || 0) + 1;
  state.counters[projectId] = next;
  return next;
}

export async function POST(req) {
  const body = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(
      req,
      ({ actor, state, users }) => {
        const title = String(body.title || "").trim();
        const validation = validateProjectKey(
          body.key,
          state.projects.map((item) => item.key),
        );
        if (!title || title.length > 120)
          failWork(400, "Tên dự án phải có từ 1 đến 120 ký tự");
        if (!validation.valid)
          failWork(
            400,
            validation.reason === "duplicate"
              ? "Mã dự án đã tồn tại"
              : "Mã dự án gồm 2-12 ký tự in hoa, số hoặc dấu gạch ngang",
          );
        if (!["public", "private"].includes(body.visibility || "private"))
          failWork(400, "Phạm vi dự án không hợp lệ");

        const dates = validateProjectDates({
          startDate: body.startDate,
          dueDate: body.dueDate,
        });
        if (!dates.valid) failWork(400, "Khoảng thời gian dự án không hợp lệ");
        if (
          body.defaultView !== undefined &&
          !PROJECT_VIEWS.includes(body.defaultView)
        )
          failWork(400, "Giao diện mặc định không hợp lệ");

        const activeUsers = users.filter(isActiveWorkUser);
        const activeIds = new Set(activeUsers.map((user) => user.id));

        let ownerId = actor.id;
        if (
          body.ownerId !== undefined &&
          body.ownerId !== null &&
          body.ownerId !== ""
        ) {
          if (String(body.ownerId) !== actor.id) {
            if (!activeIds.has(body.ownerId))
              failWork(400, "Chủ dự án không hợp lệ hoặc đã ngừng hoạt động");
            if (actor.role !== "admin")
              failWork(403, "Chỉ quản trị viên được chỉ định chủ dự án khác");
          }
          ownerId = body.ownerId;
        }

        const templateId =
          typeof body.templateId === "string" && body.templateId
            ? body.templateId
            : null;
        const template = templateId
          ? getTemplate(templateId, state.workTemplates || [])
          : null;
        if (templateId && !template) failWork(400, "Mẫu dự án không hợp lệ");

        let memberList = null;
        if (Array.isArray(body.members)) {
          const normalized = normalizeMemberPayload(
            body.members,
            activeIds,
            ownerId,
          );
          if (!normalized.valid)
            failWork(
              400,
              normalized.reason === "duplicate"
                ? "Danh sách thành viên bị trùng"
                : "Danh sách thành viên không hợp lệ hoặc có tài khoản đã ngừng hoạt động",
            );
          memberList = normalized.members.filter(
            (item) => item.userId !== ownerId,
          );
        }
        const memberIds = memberList
          ? memberList.map((item) => item.userId)
          : Array.isArray(body.memberIds)
            ? body.memberIds
            : [];
        if (new Set(memberIds).size !== memberIds.length)
          failWork(400, "Danh sách thành viên bị trùng");
        if (
          memberIds.some(
            (userId) => userId !== ownerId && !activeIds.has(userId),
          )
        )
          failWork(
            400,
            "Thành viên dự án không hợp lệ hoặc đã ngừng hoạt động",
          );

        const sectionsSource = Array.isArray(body.sections)
          ? normalizeRequestedSections(body.sections)
          : template
            ? templateSections(template)
            : getTemplateSections(body.template || "basic");

        const requestedTasks = Array.isArray(body.tasks) ? body.tasks : [];
        if (requestedTasks.length > MAX_SEED_TASKS)
          failWork(400, `Dự án tối đa ${MAX_SEED_TASKS} công việc khởi tạo`);

        const now = nowIso();
        const project = {
          id: makeId("prj"),
          title,
          key: normalizeProjectKey(body.key),
          description: String(body.description || "")
            .trim()
            .slice(0, 1000),
          color: /^#[0-9a-f]{6}$/i.test(body.color || "")
            ? body.color
            : "#7367F0",
          icon:
            typeof body.icon === "string" && body.icon.trim()
              ? body.icon.trim().slice(0, 40)
              : "tabler-folder",
          visibility: body.visibility || "private",
          ownerId,
          template: templateId || body.template || "basic",
          templateId: templateId || body.template || "basic",
          defaultView: PROJECT_VIEWS.includes(body.defaultView)
            ? body.defaultView
            : "board",
          startDate:
            body.startDate && isValidDate(body.startDate)
              ? body.startDate
              : null,
          dueDate:
            body.dueDate && isValidDate(body.dueDate) ? body.dueDate : null,
          favoriteBy: [],
          health: "no_update",
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };
        state.projects.unshift(project);
        state.projectMembers.push({
          id: makeId("pm"),
          projectId: project.id,
          userId: ownerId,
          role: "owner",
          createdAt: now,
        });
        const createdSections = sectionsSource.map((section) => {
          const record = {
            id: makeId("sec"),
            projectId: project.id,
            name: section.name,
            status: section.status,
            order: section.order ?? 0,
            createdAt: now,
          };
          state.sections.push(record);
          return record;
        });
        const assignableIds = new Set([
          ownerId,
          ...memberIds.filter((userId) => userId !== ownerId),
        ]);
        for (const userId of memberIds) {
          if (userId !== ownerId)
            state.projectMembers.push({
              id: makeId("pm"),
              projectId: project.id,
              userId,
              role:
                memberList?.find((item) => item.userId === userId)?.role ||
                "member",
              createdAt: now,
            });
        }

        requestedTasks.forEach((item, index) => {
          const taskTitle = String(item?.title || "").trim().slice(0, 200);
          if (!taskTitle)
            failWork(400, `Công việc thứ ${index + 1} không có tiêu đề`);
          const wantedSection =
            item.sectionIndex !== undefined && item.sectionIndex !== null
              ? createdSections[Number(item.sectionIndex)]
              : createdSections.find(
                  (section) =>
                    section.name ===
                    String(item.section || item.sectionName || "").trim(),
                );
          const section = wantedSection || createdSections[0];
          if (!section)
            failWork(400, `Công việc "${taskTitle}" không có nhóm công việc`);
          const taskDates = validateTaskDates({
            startDate: item.startDate,
            dueDate: item.dueDate,
          });
          if (!taskDates.valid)
            failWork(
              400,
              taskDates.reason === "range"
                ? `Công việc "${taskTitle}": ngày bắt đầu phải trước hoặc bằng hạn hoàn thành`
                : `Công việc "${taskTitle}" có thời gian không hợp lệ`,
            );
          const assigneeId = resolveAssigneeId(
            item.assigneeId || item.assignee,
            activeUsers,
            assignableIds,
          );
          if (assigneeId === undefined)
            failWork(
              400,
              `Người phụ trách của "${taskTitle}" không phải thành viên dự án`,
            );
          const number = projectTaskNumber(state, project.id);
          const task = {
            id: makeId("tsk"),
            projectId: project.id,
            sectionId: section.id,
            number,
            code: `${project.key}-${number}`,
            title: taskTitle,
            description: String(item.description || "")
              .trim()
              .slice(0, 5000),
            status: section.status,
            priority: ["low", "medium", "high", "urgent"].includes(
              item.priority,
            )
              ? item.priority
              : "medium",
            assigneeId,
            startDate:
              item.startDate && isValidDate(item.startDate)
                ? item.startDate
                : null,
            dueDate:
              item.dueDate && isValidDate(item.dueDate) ? item.dueDate : null,
            completed: section.status === "done",
            subtasks: Array.isArray(item.subtasks)
              ? item.subtasks
                  .slice(0, 50)
                  .map((sub, subIndex) => ({
                    id: `sub_${Date.now()}_${subIndex}`,
                    title: String(sub?.title || sub || "").trim(),
                    completed: Boolean(sub?.completed),
                  }))
                  .filter((sub) => sub.title)
              : [],
            createdBy: actor.id,
            createdAt: now,
            updatedAt: now,
            archivedAt: null,
          };
          const synchronized = synchronizeTaskState(
            task,
            {
              sectionId: section.id,
              ...(item.status !== undefined ? { status: item.status } : {}),
              ...(item.completed !== undefined
                ? { completed: Boolean(item.completed) }
                : {}),
            },
            state.sections,
          );
          if (!synchronized.valid)
            failWork(
              400,
              `Công việc "${taskTitle}": ${taskSyncFailMessage(synchronized.reason)}`,
            );
          task.sectionId = synchronized.sectionId;
          task.status = synchronized.status;
          task.completed = synchronized.completed;
          state.tasks.push(task);
        });

        addActivity(state, {
          actor,
          projectId: project.id,
          action: "create_project",
          details: title,
        });
        return {
          value: project,
          audit: auditFor(
            actor,
            "CREATE_WORK_PROJECT",
            "WORK_PROJECT",
            project.id,
            `Tạo dự án ${project.key} - ${title}`,
          ),
        };
      },
    );
    if (!actor)
      return NextResponse.json(
        { error: "Vui lòng đăng nhập bằng tài khoản đang hoạt động" },
        { status: 401 },
      );
    return NextResponse.json(withAudit(value, audit), { status: 201 });
  } catch (error) {
    if (error instanceof WorkApiError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
}
