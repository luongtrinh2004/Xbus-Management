import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  findProject,
  loadWorkContext,
  makeId,
  mayManageProject,
  mutateWork,
  nowIso,
  publicUser,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";
import {
  PROJECT_VIEWS,
  calculateProjectProgress,
  canAccessProject,
  canManageProject,
  canManageTasks,
  createProjectStatusUpdate,
  findRemovedAssignedMemberIds,
  getProjectRole,
  isActiveWorkUser,
  isValidDate,
  isValidId,
  isProjectFavorite,
  normalizeMemberPayload,
  toggleProjectFavorite,
  validateProjectDates,
  validateProjectKey,
} from "@/libs/workManagement";

export async function GET(req, context) {
  const { id } = await context.params;
  const { actor, state, users } = await loadWorkContext(req);
  if (!actor)
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!isValidId(id))
    return NextResponse.json(
      { error: "Mã dự án không hợp lệ" },
      { status: 400 },
    );
  const project = findProject(state, id);
  if (!project)
    return NextResponse.json(
      { error: "Không tìm thấy dự án" },
      { status: 404 },
    );
  if (!canAccessProject(project, state.projectMembers, actor))
    return NextResponse.json(
      { error: "Không có quyền truy cập dự án" },
      { status: 403 },
    );
  const userMap = new Map(users.map((user) => [user.id, publicUser(user)]));
  const members = state.projectMembers
    .filter((item) => item.projectId === id && userMap.has(item.userId))
    .map((item) => ({ ...item, user: userMap.get(item.userId) }));
  const tasks = state.tasks
    .filter((item) => item.projectId === id && !item.archivedAt)
    .map((task) => ({
      ...task,
      assignee: userMap.get(task.assigneeId) || null,
      labels: state.taskLabels
        .filter((link) => link.taskId === task.id)
        .map((link) => state.labels.find((label) => label.id === link.labelId))
        .filter(Boolean),
    }));
  const projectTaskIds = new Set(tasks.map((task) => task.id));
  const comments = state.comments
    .filter((item) => projectTaskIds.has(item.taskId))
    .map((item) => ({ ...item, author: userMap.get(item.authorId) || null }));
  const relatedIds = new Set(
    [
      ...members.map((member) => member.userId),
      ...tasks.map((task) => task.assigneeId),
      ...comments.map((comment) => comment.authorId),
    ].filter(Boolean),
  );
  const mayViewCandidates = canManageTasks(
    project,
    state.projectMembers,
    actor,
  );
  return NextResponse.json({
    project: {
      ...project,
      role: getProjectRole(project, state.projectMembers, actor) || "viewer",
      favorite: isProjectFavorite(project, actor.id),
      progress: calculateProjectProgress(state.tasks, id),
      viewerId: actor.id,
      canManage: canManageProject(project, state.projectMembers, actor),
    },
    members,
    sections: state.sections
      .filter((item) => item.projectId === id)
      .sort((a, b) => a.order - b.order),
    tasks,
    comments,
    statusUpdates: (state.projectStatusUpdates || []).filter(
      (item) => item.projectId === id,
    ),
    activities: state.activities
      .filter((item) => item.projectId === id)
      .slice(0, 100),
    labels: state.labels.filter((item) => item.projectId === id),
    users: users.filter((user) => relatedIds.has(user.id)).map(publicUser),
    ...(mayViewCandidates ? { candidateUsers: users.map(publicUser) } : {}),
  });
}

export async function PATCH(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(
      req,
      ({ actor, state, users }) => {
        const project = findProject(state, id);
        if (!project) failWork(404, "Không tìm thấy dự án");
        if (!canAccessProject(project, state.projectMembers, actor))
          failWork(403, "Không có quyền truy cập dự án");
        const canManage = mayManageProject(state, project, actor);
        const favoriteOnly =
          body.favorite !== undefined &&
          Object.keys(body).every((key) => key === "favorite");
        if (!favoriteOnly && !canManage)
          failWork(
            403,
            "Chỉ chủ dự án hoặc quản trị viên được cập nhật dự án",
          );

        if (body.favorite !== undefined)
          toggleProjectFavorite(project, actor.id);

        if (body.title !== undefined) {
          const title = String(body.title).trim();
          if (!title || title.length > 120)
            failWork(400, "Tên dự án không hợp lệ");
          project.title = title;
        }
        if (body.key !== undefined && body.key !== project.key) {
          const validation = validateProjectKey(
            body.key,
            state.projects
              .filter((item) => item.id !== id)
              .map((item) => item.key),
          );
          if (!validation.valid)
            failWork(400, "Mã dự án không hợp lệ hoặc đã tồn tại");
          project.key = validation.key;
        }
        if (body.description !== undefined)
          project.description = String(body.description || "")
            .trim()
            .slice(0, 1000);
        if (body.visibility !== undefined) {
          if (!["public", "private"].includes(body.visibility))
            failWork(400, "Phạm vi không hợp lệ");
          project.visibility = body.visibility;
        }
        if (body.color !== undefined) {
          if (!/^#[0-9a-f]{6}$/i.test(body.color))
            failWork(400, "Màu dự án không hợp lệ");
          project.color = body.color;
        }
        if (body.icon !== undefined) {
          const icon = String(body.icon || "").trim();
          if (!icon || icon.length > 40)
            failWork(400, "Biểu tượng không hợp lệ");
          project.icon = icon;
        }
        if (body.defaultView !== undefined) {
          if (!PROJECT_VIEWS.includes(body.defaultView))
            failWork(400, "Giao diện mặc định không hợp lệ");
          project.defaultView = body.defaultView;
        }
        if (body.startDate !== undefined || body.dueDate !== undefined) {
          const dates = validateProjectDates({
            startDate:
              body.startDate !== undefined
                ? body.startDate
                : project.startDate,
            dueDate:
              body.dueDate !== undefined ? body.dueDate : project.dueDate,
          });
          if (!dates.valid)
            failWork(400, "Khoảng thời gian dự án không hợp lệ");
          if (body.startDate !== undefined)
            project.startDate = body.startDate || null;
          if (body.dueDate !== undefined)
            project.dueDate = body.dueDate || null;
        }
        if (body.statusUpdate !== undefined) {
          const result = createProjectStatusUpdate(state, project, {
            actor,
            health: body.statusUpdate?.health,
            note: body.statusUpdate?.note,
          });
          if (!result.valid)
            failWork(
              400,
              result.reason === "invalid_note"
                ? "Nội dung cập nhật quá dài (tối đa 1000 ký tự)"
                : "Tình trạng dự án không hợp lệ",
            );
        }
        if (body.members !== undefined) {
          const normalized = normalizeMemberPayload(
            body.members,
            new Set(users.filter(isActiveWorkUser).map((user) => user.id)),
            project.ownerId,
          );
          if (!normalized.valid)
            failWork(
              400,
              normalized.reason === "duplicate"
                ? "Danh sách thành viên bị trùng"
                : "Danh sách thành viên không hợp lệ hoặc có tài khoản đã ngừng hoạt động",
            );
          const blockedAssignees = findRemovedAssignedMemberIds({
            projectId: id,
            currentMembers: state.projectMembers.filter(
              (item) =>
                item.projectId === id && item.userId !== project.ownerId,
            ),
            nextMembers: normalized.members,
            tasks: state.tasks,
          });
          if (blockedAssignees.length) {
            const names = blockedAssignees
              .map(
                (userId) =>
                  users.find((user) => user.id === userId)?.name || userId,
              )
              .join(", ");
            failWork(
              400,
              `Không thể bỏ thành viên đang phụ trách công việc chưa lưu trữ: ${names}. Hãy chuyển hoặc lưu trữ công việc trước.`,
            );
          }
          state.projectMembers = state.projectMembers.filter(
            (item) => item.projectId !== id || item.userId === project.ownerId,
          );
          for (const item of normalized.members)
            state.projectMembers.push({
              id: makeId("pm"),
              projectId: id,
              userId: item.userId,
              role: item.role,
              createdAt: nowIso(),
            });
        }
        project.updatedAt = nowIso();
        addActivity(state, {
          actor,
          projectId: id,
          action: "update_project",
          details: project.title,
        });
        return {
          value: {
            ...project,
            favorite: isProjectFavorite(project, actor.id),
            role: getProjectRole(project, state.projectMembers, actor),
          },
          audit: auditFor(
            actor,
            "UPDATE_WORK_PROJECT",
            "WORK_PROJECT",
            id,
            `Cập nhật dự án ${project.key}`,
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
      const project = findProject(state, id);
      if (!project) failWork(404, "Không tìm thấy dự án");
      if (!mayManageProject(state, project, actor))
        failWork(403, "Không có quyền lưu trữ dự án");
      project.archivedAt = nowIso();
      project.updatedAt = project.archivedAt;
      addActivity(state, {
        actor,
        projectId: id,
        action: "archive_project",
        details: project.title,
      });
      return {
        value: { success: true },
        audit: auditFor(
          actor,
          "ARCHIVE_WORK_PROJECT",
          "WORK_PROJECT",
          id,
          `Lưu trữ dự án ${project.key}`,
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
