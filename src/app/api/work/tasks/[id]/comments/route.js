import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  findProject,
  makeId,
  mayReadProject,
  mutateWork,
  nowIso,
  publicUser,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";

export async function POST(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(req, ({ actor, state }) => {
      const task = state.tasks.find(
        (item) => item.id === id && !item.archivedAt,
      );
      const project = task && findProject(state, task.projectId);
      if (!task || !project) failWork(404, "Không tìm thấy công việc");
      if (!mayReadProject(state, project, actor))
        failWork(403, "Không có quyền bình luận");
      const content = String(body.content || "").trim();
      if (!content || content.length > 3000)
        failWork(400, "Bình luận phải có từ 1 đến 3000 ký tự");
      const now = nowIso();
      const comment = {
        id: makeId("cmt"),
        taskId: id,
        authorId: actor.id,
        content,
        createdAt: now,
        updatedAt: now,
      };
      state.comments.push(comment);
      addActivity(state, {
        actor,
        projectId: project.id,
        taskId: id,
        action: "comment_task",
        details: content.slice(0, 100),
      });
      return {
        value: { ...comment, author: publicUser(actor) },
        audit: auditFor(
          actor,
          "COMMENT_WORK_TASK",
          "WORK_TASK",
          id,
          `Bình luận công việc ${task.code}`,
        ),
      };
    });
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
