export function serializeEditableMembers(members = [], ownerId) {
  return members
    .filter(
      (member) =>
        member?.userId &&
        member.userId !== ownerId &&
        member.role !== "owner" &&
        ["editor", "member"].includes(member.role),
    )
    .map((member) => ({ userId: member.userId, role: member.role }));
}

export function instantiateProjectTemplate(template) {
  if (!template?.id || !Array.isArray(template.sections)) return null;
  const sections = template.sections.map((section, index) => ({
    name: String(section.name || "").trim(),
    status:
      section.status ||
      (index === template.sections.length - 1
        ? "done"
        : index === 0
          ? "todo"
          : "in_progress"),
  }));
  const tasks = (template.tasks || []).map((task) => {
    const section = Math.max(
      0,
      sections.findIndex((item) => item.name === task.section),
    );
    return {
      title: task.title || "",
      description: task.description || "",
      section,
      status: sections[section]?.status || "todo",
      priority: task.priority || "medium",
      assigneeId: "",
      dueDate: "",
      startDate: "",
      include: true,
    };
  });
  return { templateId: template.id, sections, tasks };
}

export function dashboardProgress(tasks = []) {
  if (!tasks.length) return 0;
  const done = tasks.filter(
    (task) => task.completed || task.status === "done",
  ).length;
  return Math.round((done / tasks.length) * 100);
}

export function splitFavoriteProjects(projects = []) {
  return {
    favorites: projects.filter((project) => project.favorite),
    nonFavorites: projects.filter((project) => !project.favorite),
  };
}
