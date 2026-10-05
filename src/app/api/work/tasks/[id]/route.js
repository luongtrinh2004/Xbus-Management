import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  findProject,
  loadWorkContext,
  mayReadProject,
  mutateWork,
  nowIso,
  publicUser,
  taskSyncFailMessage,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";
import {
  canUpdateTask,
  isActiveProjectAssignee,
  isValidDate,
  synchronizeTaskState,
  validateTaskDates,
} from "@/libs/workManagement";

export async function GET(req, context) {
  const { id } = await context.params;
  const { actor, state, users } = await loadWorkContext(req);
  if (!actor)
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const task = state.tasks.find((item) => item.id === id && !item.archivedAt);
  const project = task && findProject(state, task.projectId);
  if (!task || !project)
    return NextResponse.json(
      { error: "Không tìm thấy công việc" },
      { status: 404 },
    );
  if (!mayReadProject(state, project, actor))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  const usersById = new Map(users.map((user) => [user.id, publicUser(user)]));
  return NextResponse.json({
    task,
    project,
    assignee: usersById.get(task.assigneeId) || null,
    comments: state.comments
      .filter((item) => item.taskId === id)
      .map((item) => ({
        ...item,
        author: usersById.get(item.authorId) || null,
      })),
    activities: state.activities
      .filter((item) => item.taskId === id)
      .slice(0, 100),
  });
}

export async function PATCH(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(
      req,
      ({ actor, state, users }) => {
        const task = state.tasks.find(
          (item) => item.id === id && !item.archivedAt,
        );
        const project = task && findProject(state, task.projectId);
        if (!task || !project) failWork(404, "Không tìm thấy công việc");
        if (!canUpdateTask(task, project, state.projectMembers, actor, body))
          failWork(403, "Không có quyền cập nhật công việc");
        if (body.title !== undefined) {
          const title = String(body.title).trim();
          if (!title || title.length > 200)
            failWork(400, "Tiêu đề không hợp lệ");
          task.title = title;
        }
        if (body.description !== undefined)
          task.description = String(body.description || "")
            .trim()
            .slice(0, 5000);
        if (body.priority !== undefined) {
          if (!["low", "medium", "high", "urgent"].includes(body.priority))
            failWork(400, "Độ ưu tiên không hợp lệ");
          task.priority = body.priority;
        }
        if (body.startDate !== undefined || body.dueDate !== undefined) {
          const nextStart =
            body.startDate !== undefined ? body.startDate : task.startDate;
          const nextDue = body.dueDate !== undefined ? body.dueDate : task.dueDate;
          const dates = validateTaskDates({
            startDate: nextStart,
            dueDate: nextDue,
          });
          if (!dates.valid)
            failWork(
              400,
              dates.reason === "range"
                ? "Ngày bắt đầu phải trước hoặc bằng hạn hoàn thành"
                : "Thời gian công việc không hợp lệ",
            );
          if (body.startDate !== undefined) task.startDate = body.startDate || null;
          if (body.dueDate !== undefined) task.dueDate = body.dueDate || null;
        }
        if (body.assigneeId !== undefined) {
          if (
            !isActiveProjectAssignee(state, project.id, body.assigneeId, users)
          )
            failWork(
              400,
              "Người phụ trách phải là thành viên đang hoạt động của dự án",
            );
          task.assigneeId = body.assigneeId || null;
        }
        if (
          body.sectionId !== undefined ||
          body.status !== undefined ||
          body.completed !== undefined
        ) {
          const synchronized = synchronizeTaskState(task, body, state.sections);
          if (!synchronized.valid)
            failWork(400, taskSyncFailMessage(synchronized.reason));
          task.sectionId = synchronized.sectionId;
          task.status = synchronized.status;
          task.completed = synchronized.completed;
        }
        if (body.subtasks !== undefined) {
          if (!Array.isArray(body.subtasks))
            failWork(400, "Danh sách công việc con không hợp lệ");
          task.subtasks = body.subtasks
            .slice(0, 50)
            .map((item) => ({
              id:
                item.id ||
                `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: String(item.title || "").trim(),
              completed: Boolean(item.completed),
            }))
            .filter((item) => item.title);
        }
        task.updatedAt = nowIso();
        addActivity(state, {
          actor,
          projectId: project.id,
          taskId: id,
          action: "update_task",
          details: `${task.code} - ${task.title}`,
        });
        return {
          value: task,
          audit: auditFor(
            actor,
            "UPDATE_WORK_TASK",
            "WORK_TASK",
            id,
            `Cập nhật công việc ${task.code}`,
          ),
        };
      },
    );
    if (!actor)
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    return NextResponse.json(withAudit(value, audit));
  } catch (error) {
    if (error instanceof WorkApiError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
}

export async function DELETE(req, context) {
  const { id } = await context.params;
  try {
    const { actor, value, audit } = await mutateWork(req, ({ actor, state }) => {
      const task = state.tasks.find(
        (item) => item.id === id && !item.archivedAt,
      );
      const project = task && findProject(state, task.projectId);
      if (!task || !project) failWork(404, "Không tìm thấy công việc");
      if (
        !canUpdateTask(task, project, state.projectMembers, actor, {
          title: task.title,
        })
      )
        failWork(403, "Không có quyền xóa công việc");
      task.archivedAt = nowIso();
      task.updatedAt = task.archivedAt;
      addActivity(state, {
        actor,
        projectId: project.id,
        taskId: id,
        action: "archive_task",
        details: task.code,
      });
      return {
        value: { success: true },
        audit: auditFor(
          actor,
          "ARCHIVE_WORK_TASK",
          "WORK_TASK",
          id,
          `Lưu trữ công việc ${task.code}`,
        ),
      };
    });
    if (!actor)
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    return NextResponse.json(withAudit(value, audit));
  } catch (error) {
    if (error instanceof WorkApiError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
}
