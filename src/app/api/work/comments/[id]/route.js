import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  findProject,
  mayReadProject,
  mutateWork,
  nowIso,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";
import { getProjectRole } from "@/libs/workManagement";

function findCommentContext(state, id) {
  const comment = state.comments.find((item) => item.id === id);
  const task =
    comment &&
    state.tasks.find((item) => item.id === comment.taskId && !item.archivedAt);
  const project = task && findProject(state, task.projectId);
  return { comment, task, project };
}

function mayModifyComment(state, comment, project, actor) {
  const role = getProjectRole(project, state.projectMembers, actor);
  return comment.authorId === actor.id || role === "owner" || role === "admin";
}

export async function PATCH(req, context) {
  const { id } = await context.params;
  const { content } = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(req, ({ actor, state }) => {
      const { comment, project } = findCommentContext(state, id);
      if (!comment || !project) failWork(404, "Không tìm thấy bình luận");
      if (!mayReadProject(state, project, actor))
        failWork(403, "Không có quyền truy cập dự án");
      if (!mayModifyComment(state, comment, project, actor))
        failWork(
          403,
          "Chỉ tác giả, chủ dự án hoặc quản trị viên được sửa bình luận",
        );
      const text = String(content || "").trim();
      if (!text || text.length > 3000) failWork(400, "Bình luận không hợp lệ");
      comment.content = text;
      comment.updatedAt = nowIso();
      addActivity(state, {
        actor,
        projectId: project.id,
        taskId: comment.taskId,
        action: "update_comment",
        details: text.slice(0, 100),
      });
      return {
        value: comment,
        audit: auditFor(
          actor,
          "UPDATE_WORK_COMMENT",
          "WORK_COMMENT",
          id,
          "Cập nhật bình luận công việc",
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

export async function DELETE(req, context) {
  const { id } = await context.params;
  try {
    const { actor, value, audit } = await mutateWork(req, ({ actor, state }) => {
      const { comment, project } = findCommentContext(state, id);
      if (!comment || !project) failWork(404, "Không tìm thấy bình luận");
      if (!mayReadProject(state, project, actor))
        failWork(403, "Không có quyền truy cập dự án");
      if (!mayModifyComment(state, comment, project, actor))
        failWork(
          403,
          "Chỉ tác giả, chủ dự án hoặc quản trị viên được xóa bình luận",
        );
      const removed = state.comments.find((item) => item.id === id);
      state.comments = state.comments.filter((item) => item.id !== id);
      addActivity(state, {
        actor,
        projectId: project.id,
        taskId: removed.taskId,
        action: "delete_comment",
        details: (removed.content || "").slice(0, 100),
      });
      return {
        value: { success: true },
        audit: auditFor(
          actor,
          "DELETE_WORK_COMMENT",
          "WORK_COMMENT",
          id,
          "Xóa bình luận công việc",
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
