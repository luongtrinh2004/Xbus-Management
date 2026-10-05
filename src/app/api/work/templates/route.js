import { NextResponse } from "next/server";
import {
  addActivity,
  auditFor,
  failWork,
  loadWorkContext,
  makeId,
  mutateWork,
  nowIso,
  withAudit,
  WorkApiError,
} from "@/libs/workApi";
import {
  TEMPLATE_CATEGORIES,
  listTemplates,
} from "@/libs/workTemplates";
import { TASK_STATUSES } from "@/libs/workManagement";

const MAX_SECTIONS = 30;
const MAX_TASKS = 100;
const MAX_CUSTOM_TEMPLATES = 100;
const CATEGORIES = TEMPLATE_CATEGORIES.filter((item) => item.id !== "all").map(
  (item) => item.id,
);

function normalizeSections(input) {
  if (!Array.isArray(input) || !input.length)
    failWork(400, "Mẫu dự án phải có ít nhất một nhóm công việc");
  if (input.length > MAX_SECTIONS)
    failWork(400, `Mẫu dự án tối đa ${MAX_SECTIONS} nhóm công việc`);
  const seen = new Set();
  return input.map((item, index) => {
    const name = String(item?.name || "").trim().slice(0, 80);
    if (!name) failWork(400, `Nhóm công việc thứ ${index + 1} không hợp lệ`);
    const key = name.toLocaleLowerCase("vi");
    if (seen.has(key)) failWork(400, `Nhóm công việc bị trùng: ${name}`);
    seen.add(key);
    const status =
      typeof item?.status === "string" && TASK_STATUSES.includes(item.status)
        ? item.status
        : index === input.length - 1
          ? "done"
          : index === 0
            ? "todo"
            : "in_progress";
    return { name, status };
  });
}

function normalizeTemplateTasks(input, sections) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) failWork(400, "Danh sách việc mẫu không hợp lệ");
  if (input.length > MAX_TASKS)
    failWork(400, `Mẫu dự án tối đa ${MAX_TASKS} việc mẫu`);
  const names = new Set(sections.map((item) => item.name));
  return input.map((item, index) => {
    const title = String(item?.title || "").trim().slice(0, 200);
    if (!title) failWork(400, `Việc mẫu thứ ${index + 1} không có tiêu đề`);
    const section = String(item?.section || sections[0].name);
    if (!names.has(section))
      failWork(400, `Việc mẫu "${title}" trỏ tới nhóm không tồn tại`);
    return {
      title,
      section,
      priority: ["low", "medium", "high", "urgent"].includes(item?.priority)
        ? item.priority
        : "medium",
      description: String(item?.description || "").trim().slice(0, 2000),
    };
  });
}

export async function GET(req) {
  const { actor, state } = await loadWorkContext(req);
  if (!actor)
    return NextResponse.json(
      { error: "Vui lòng đăng nhập bằng tài khoản đang hoạt động" },
      { status: 401 },
    );
  const custom = Array.isArray(state.workTemplates) ? state.workTemplates : [];
  return NextResponse.json({
    categories: TEMPLATE_CATEGORIES,
    templates: listTemplates({ custom }),
    customCount: custom.length,
  });
}

export async function POST(req) {
  const body = await req.json();
  try {
    const { actor, value, audit } = await mutateWork(req, ({ actor, state }) => {
      const name = String(body.name || "").trim().slice(0, 80);
      if (!name) failWork(400, "Tên mẫu dự án không hợp lệ");
      const category = CATEGORIES.includes(body.category)
        ? body.category
        : "agile";
      const sections = normalizeSections(body.sections);
      const tasks = normalizeTemplateTasks(body.tasks, sections);
      const existing = Array.isArray(state.workTemplates)
        ? state.workTemplates
        : [];
      if (existing.length >= MAX_CUSTOM_TEMPLATES)
        failWork(400, "Đã đạt giới hạn mẫu dự án tùy chỉnh");
      const now = nowIso();
      const template = {
        id: makeId("wtp"),
        name,
        category,
        description: String(body.description || "").trim().slice(0, 300),
        icon: String(body.icon || "tabler-bookmark").trim().slice(0, 40),
        featured: false,
        sections,
        tasks,
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
      };
      state.workTemplates = [...existing, template];
      addActivity(state, {
        actor,
        projectId: null,
        action: "save_work_template",
        details: name,
      });
      return {
        value: template,
        audit: auditFor(
          actor,
          "SAVE_WORK_TEMPLATE",
          "WORK_TEMPLATE",
          template.id,
          `Lưu mẫu dự án ${name}`,
        ),
      };
    });
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
