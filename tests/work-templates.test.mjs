import test from "node:test";
import assert from "node:assert/strict";

import {
  TEMPLATE_CATEGORIES,
  WORK_TEMPLATE_CATALOG,
  getTemplate,
  getTemplateSections,
  listTemplates,
  templateSampleTasks,
  templateSections,
} from "../src/libs/workTemplates.js";

const REQUIRED_TEMPLATE_IDS = [
  "sprint-backlog",
  "bug-tracker",
  "feature-requests",
  "code-review",
  "technical-debt",
  "deployment-schedule",
  "incident-response",
  "documentation-backlog",
  "kanban",
  "ticketing",
  "xbus-operations",
  "xbus-events",
];

test("catalog ships the required XBus templates", () => {
  const ids = WORK_TEMPLATE_CATALOG.map((item) => item.id);
  for (const id of REQUIRED_TEMPLATE_IDS) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length, "template ids must be unique");
});

test("every template exposes consistent sections and sample tasks", () => {
  const statuses = ["todo", "in_progress", "blocked", "done"];
  for (const template of WORK_TEMPLATE_CATALOG) {
    assert.ok(template.sections.length >= 2, template.id);
    assert.ok(template.name && template.description, template.id);
    assert.ok(
      TEMPLATE_CATEGORIES.some((item) => item.id === template.category),
      `${template.id} category`,
    );
    for (const section of template.sections) {
      assert.ok(section.name, template.id);
      assert.ok(statuses.includes(section.status), `${template.id}:${section.name}`);
    }
    const sectionNames = template.sections.map((section) => section.name);
    for (const task of template.tasks) {
      assert.ok(task.title, template.id);
      assert.ok(
        sectionNames.includes(task.section),
        `${template.id} -> ${task.section}`,
      );
      assert.ok(
        ["low", "medium", "high", "urgent"].includes(task.priority),
        `${task.title} priority`,
      );
    }
  }
});

test("template sections derive stable order and status", () => {
  const sections = templateSections(getTemplate("sprint-backlog"));
  assert.deepEqual(
    sections.map((section) => section.order),
    sections.map((_, index) => index),
  );
  assert.equal(sections.at(-1).status, "done");
  assert.equal(sections[0].status, "todo");
  // legacy ids keep working for existing projects
  assert.deepEqual(
    getTemplateSections("basic").map((section) => section.name),
    ["Việc cần làm", "Đang thực hiện", "Hoàn thành"],
  );
  assert.deepEqual(
    getTemplateSections("unknown-template").map((section) => section.name),
    ["Việc cần làm", "Đang thực hiện", "Hoàn thành"],
  );
  assert.equal(getTemplate("unknown-template"), null);
});

test("templates are searchable by category and featured flag", () => {
  const featured = listTemplates({ featured: true });
  assert.ok(featured.length >= 3);
  assert.ok(featured.every((item) => item.featured));

  const xbus = listTemplates({ category: "xbus" });
  assert.ok(xbus.length >= 2);
  assert.ok(xbus.every((item) => item.category === "xbus"));

  const custom = listTemplates({
    custom: [
      {
        id: "custom-1",
        name: "Mẫu nội bộ",
        category: "agile",
        description: "mẫu do người dùng lưu",
        icon: "tabler-star",
        featured: false,
        sections: [
          { name: "Cần làm", status: "todo" },
          { name: "Xong", status: "done" },
        ],
        tasks: [{ title: "Việc 1", section: "Cần làm", priority: "medium" }],
      },
    ],
  });
  assert.ok(custom.some((item) => item.id === "custom-1"));
  assert.equal(getTemplate("custom-1", [{ id: "custom-1" }])?.id, "custom-1");
});

test("sample tasks resolve to a section with safe defaults", () => {
  const template = getTemplate("bug-tracker");
  const tasks = templateSampleTasks(template);
  assert.ok(tasks.length >= 3);
  for (const task of tasks) {
    assert.ok(template.sections.some((section) => section.name === task.section));
    assert.ok(["low", "medium", "high", "urgent"].includes(task.priority));
  }
  assert.deepEqual(templateSampleTasks(null), []);
});
