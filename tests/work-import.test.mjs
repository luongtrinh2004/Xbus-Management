import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_IMPORT_BYTES,
  SAMPLE_IMPORT_CSV,
  assertSafeCsvFile,
  mapImportRows,
  parseSpreadsheetBuffer,
} from "../src/libs/workImport.js";

test("import maps practical CSV headers into sections and tasks", () => {
  const result = mapImportRows([
    {
      "Nhóm công việc": "Backlog",
      "Tiêu đề": "Thiết kế màn hình đăng nhập",
      "Mô tả": "Bản thảo UI",
      "Độ ưu tiên": "cao",
      "Hạn hoàn thành": "2026-11-05",
      "Người phụ trách": "nguyen.van.a",
    },
    {
      "Nhóm công việc": "Backlog",
      "Tiêu đề": "Viết API đăng nhập",
      "Độ ưu tiên": "khẩn cấp",
    },
    {
      "Nhóm công việc": "Hoàn thành",
      "Tiêu đề": "Thiết lập repository",
      "Trạng thái": "done",
    },
  ]);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(
    result.sections.map((section) => section.name),
    ["Backlog", "Hoàn thành"],
  );
  assert.equal(result.tasks.length, 3);
  const [first] = result.tasks;
  assert.equal(first.title, "Thiết kế màn hình đăng nhập");
  assert.equal(first.section, "Backlog");
  assert.equal(first.priority, "high");
  assert.equal(first.dueDate, "2026-11-05");
  assert.equal(first.description, "Bản thảo UI");
  assert.equal(first.assignee, "nguyen.van.a");
  assert.equal(
    result.tasks.find((task) => task.title === "Viết API đăng nhập").priority,
    "urgent",
  );
  assert.equal(
    result.tasks.find((task) => task.title === "Thiết lập repository").section,
    "Hoàn thành",
  );
});

test("import rejects unusable rows instead of silently dropping them", () => {
  const result = mapImportRows([
    { title: "" },
    { title: "   " },
    { title: "Có việc", section: "Làm" },
    { nope: "x" },
  ]);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.errors.length, 3);
  assert.ok(result.errors.every((error) => error.row && error.message));
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].name, "Làm");
});

test("status column maps tasks into the matching section", () => {
  const result = mapImportRows([
    { title: "Đang làm dở", status: "in_progress" },
    { title: "Đã xong", status: "Hoàn thành" },
    { title: "Bị chặn", status: "blocked" },
    { title: "Mới tinh", status: "todo" },
  ]);
  assert.equal(result.errors.length, 0);
  const sectionNames = result.sections.map((section) => section.name);
  const taskSection = (title) =>
    result.tasks.find((task) => task.title === title).section;
  assert.equal(sectionNames.includes(taskSection("Đang làm dở")), true);
  assert.equal(taskSection("Đã xong"), "Hoàn thành");
  assert.notEqual(taskSection("Bị chặn"), taskSection("Đang làm dở"));
  assert.equal(
    result.sections.find((section) => section.name === taskSection("Bị chặn"))
      .status,
    "blocked",
  );
  assert.equal(result.tasks.every((task) => sectionNames.includes(task.section)), true);
});

test("sample CSV parses through the spreadsheet reader", async () => {
  const rows = await parseSpreadsheetBuffer(SAMPLE_IMPORT_CSV, {
    type: "string",
    filename: "sample.csv",
  });
  assert.ok(rows.length >= 3);
  const result = mapImportRows(rows);
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
  assert.ok(result.tasks.length >= 3);
  assert.ok(result.sections.length >= 2);
});

test("CSV import rejects XLSX, oversized files, excessive cells and long fields", async () => {
  assert.throws(
    () => assertSafeCsvFile({ name: "tasks.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 10 }),
    /CSV/i,
  );
  assert.throws(
    () => assertSafeCsvFile({ name: "tasks.csv", type: "text/csv", size: MAX_IMPORT_BYTES + 1 }),
    /2 MB/i,
  );
  assert.doesNotThrow(() =>
    assertSafeCsvFile({ name: "tasks.csv", type: "text/csv", size: 100 }),
  );
  await assert.rejects(
    () => parseSpreadsheetBuffer(`title,${Array.from({ length: 40 }, (_, index) => `c${index}`).join(",")}\nTask,x`, { type: "string", filename: "tasks.csv" }),
    /cột/i,
  );
  await assert.rejects(
    () => parseSpreadsheetBuffer(`title,description\nTask,${"x".repeat(5001)}`, { type: "string", filename: "tasks.csv" }),
    /ký tự/i,
  );
  await assert.rejects(
    () =>
      parseSpreadsheetBuffer(
        `title\n${Array.from({ length: 501 }, (_, index) => `Task ${index}`).join("\n")}`,
        { type: "string", filename: "tasks.csv" },
      ),
    /500 dòng/i,
  );
});

test("CSV import preserves status and rejects conflicting section status", () => {
  const result = mapImportRows([
    { title: "Doing", section: "Đang làm", status: "in_progress" },
    { title: "Done", section: "Hoàn thành", status: "done" },
  ]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.tasks[0].status, "in_progress");
  assert.equal(result.tasks[1].status, "done");
  assert.equal(result.sections.find((item) => item.name === "Đang làm").status, "in_progress");
  assert.equal(result.sections.find((item) => item.name === "Hoàn thành").status, "done");

  const conflict = mapImportRows([
    { title: "First", section: "Same", status: "todo" },
    { title: "Second", section: "Same", status: "done" },
  ]);
  assert.equal(conflict.tasks.length, 1);
  assert.match(conflict.errors[0].message, /trạng thái.*nhóm/i);
});
