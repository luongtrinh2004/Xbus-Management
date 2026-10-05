import { NextResponse } from "next/server";
import { loadWorkContext, mayReadProject, publicUser } from "@/libs/workApi";

export async function GET(req) {
  const { actor, state, users } = await loadWorkContext(req);
  if (!actor)
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const projectMap = new Map(
    state.projects
      .filter(
        (item) =>
          !item.archivedAt && mayReadProject(state, item, actor),
      )
      .map((item) => [item.id, item]),
  );
  const userMap = new Map(users.map((user) => [user.id, publicUser(user)]));
  const tasks = state.tasks
    .filter(
      (task) =>
        !task.archivedAt &&
        task.assigneeId === actor.id &&
        projectMap.has(task.projectId),
    )
    .map((task) => ({
      ...task,
      project: projectMap.get(task.projectId),
      assignee: userMap.get(task.assigneeId) || null,
    }))
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")),
    );
  return NextResponse.json({ tasks });
}
