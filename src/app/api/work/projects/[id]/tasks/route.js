import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  findProject,
  makeId,
  mayManageTasks,
  mutateWork,
  nowIso,
  taskSyncFailMessage,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";
import {
  isActiveProjectAssignee,
  isValidDate,
  nextTaskNumber,
  resolveTaskSection,
  synchronizeTaskState,
  taskCode,
  validateTaskDates,
} from "@/libs/workManagement";

export async function POST(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(
      req,
      ({ actor, state, users }) => {
        const project = findProject(state, id);
        if (!project) failWork(404, "Không tìm thấy dự án");
        if (!mayManageTasks(state, project, actor))
          failWork(403, "Không có quyền tạo công việc");
        const title = String(body.title || "").trim();
        if (!title || title.length > 200)
          failWork(400, "Tiêu đề công việc phải có từ 1 đến 200 ký tự");
        const hasExplicitSection =
          body.sectionId !== undefined && body.sectionId !== null;
        const section = resolveTaskSection(
          state.sections,
          id,
          body.sectionId,
        );
        if (!section)
          failWork(
            400,
            hasExplicitSection
              ? "Nhóm công việc không hợp lệ"
              : "Dự án chưa có nhóm công việc",
          );
        const dates = validateTaskDates({
          startDate: body.startDate,
          dueDate: body.dueDate,
        });
        if (!dates.valid)
          failWork(
            400,
            dates.reason === "range"
              ? "Ngày bắt đầu phải trước hoặc bằng hạn hoàn thành"
              : "Thời gian công việc không hợp lệ",
          );
        if (!isActiveProjectAssignee(state, id, body.assigneeId, users))
          failWork(
            400,
            "Người phụ trách phải là thành viên đang hoạt động của dự án",
          );

        const number = nextTaskNumber(state.tasks, id, state.counters[id]);
        state.counters[id] = number;
        const now = nowIso();
        const task = {
          id: makeId("tsk"),
          projectId: id,
          sectionId: section.id,
          number,
          code: taskCode(project, number),
          title,
          description: String(body.description || "")
            .trim()
            .slice(0, 5000),
          status: section.status,
          priority: ["low", "medium", "high", "urgent"].includes(body.priority)
            ? body.priority
            : "medium",
          assigneeId: body.assigneeId || null,
          startDate: body.startDate || null,
          dueDate: body.dueDate || null,
          completed: section.status === "done",
          subtasks: Array.isArray(body.subtasks)
            ? body.subtasks
                .slice(0, 50)
                .map((item) => ({
                  id: makeId("sub"),
                  title: String(item.title || item).trim(),
                  completed: Boolean(item.completed),
                }))
                .filter((item) => item.title)
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
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.completed !== undefined
              ? { completed: Boolean(body.completed) }
              : {}),
          },
          state.sections,
        );
        if (!synchronized.valid)
          failWork(400, taskSyncFailMessage(synchronized.reason));
        Object.assign(task, synchronized);
        delete task.valid;
        state.tasks.push(task);
        addActivity(state, {
          actor,
          projectId: id,
          taskId: task.id,
          action: "create_task",
          details: `${task.code} - ${task.title}`,
        });
        return {
          value: task,
          audit: auditFor(
            actor,
            "CREATE_WORK_TASK",
            "WORK_TASK",
            task.id,
            `Tạo công việc ${task.code}: ${task.title}`,
          ),
        };
      },
    );
    if (!actor)
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
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
