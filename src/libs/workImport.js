// Safe CSV import mapping for the project wizard.

import { isValidDate, normalizeTaskStatus } from "./workManagement.js";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_COLUMNS = 32;
export const MAX_IMPORT_FIELD_LENGTH = 5000;
export const SAMPLE_IMPORT_CSV = `Nhóm công việc,Tiêu đề,Mô tả,Độ ưu tiên,Trạng thái,Hạn hoàn thành
Backlog,Thiết kế màn hình đăng nhập,Bản thảo UI cho trang đăng nhập,cao,todo,2026-11-05
Backlog,Viết API đăng nhập,Xác thực JWT,khẩn cấp,todo,2026-11-12
Đang thực hiện,Tích hợp SSO,Kết nối SSO nội bộ,trung bình,in_progress,2026-11-20
Hoàn thành,Thiết lập repository,Khởi tạo repo và CI,thấp,done,
`;

const MAX_SECTIONS = 30;
const MAX_TASKS = 500;
const DEFAULT_SECTION = "Cần xử lý";
const CSV_MIME_TYPES = new Set([
  "",
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
]);

const STATUS_SECTIONS = {
  todo: "Cần làm",
  in_progress: "Đang xử lý",
  blocked: "Bị chặn",
  done: "Hoàn thành",
};

const STATUS_ALIASES = {
  todo: "todo",
  moi: "todo",
  "can lam": "todo",
  "chua lam": "todo",
  "to do": "todo",
  "todo list": "todo",
  in_progress: "in_progress",
  "dang lam": "in_progress",
  "dang thuc hien": "in_progress",
  doing: "in_progress",
  "in progress": "in_progress",
  open: "todo",
  blocked: "blocked",
  "bi chan": "blocked",
  treo: "blocked",
  pending: "blocked",
  done: "done",
  "hoan thanh": "done",
  "da hoan thanh": "done",
  xong: "done",
  closed: "done",
  "da dong": "done",
};

const PRIORITY_ALIASES = {
  low: "low",
  thap: "low",
  normal: "medium",
  "trung binh": "medium",
  medium: "medium",
  high: "high",
  cao: "high",
  urgent: "urgent",
  "khan cap": "urgent",
  asap: "urgent",
  critical: "urgent",
};

const HEADER_ALIASES = {
  section: ["nhom", "nhom cong viec", "section", "group", "column", "cot", "list", "hang muc"],
  title: ["tieu de", "title", "task", "cong viec", "ten cong viec", "ten", "summary", "issue"],
  description: ["mo ta", "description", "note", "ghi chu", "chi tiet"],
  status: ["trang thai", "status", "state"],
  priority: ["do uu tien", "muc do uu tien", "priority", "priority level", "muc do"],
  assignee: ["nguoi phu trach", "assignee", "owner", "responsible", "phan cong", "phu trach"],
  dueDate: ["han hoan thanh", "due date", "duedate", "deadline", "han", "ngay het han"],
  startDate: ["bat dau", "start date", "startdate", "start", "ngay bat dau"],
};

export function assertSafeCsvFile(file) {
  const name = String(file?.name || "");
  const type = String(file?.type || "").toLowerCase();
  if (!/\.csv$/i.test(name) || !CSV_MIME_TYPES.has(type))
    throw new Error("Chỉ hỗ trợ tệp CSV (.csv)");
  if (!Number.isFinite(file?.size) || file.size < 0 || file.size > MAX_IMPORT_BYTES)
    throw new Error("Tệp CSV phải có kích thước không quá 2 MB");
  return true;
}

export function normalizeImportKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ");
}

function matchHeader(normalizedKey) {
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalizedKey)) return field;
  }
  return null;
}

function toIsoDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isValidDate(raw) ? raw : null;
  const vi = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vi) {
    const iso = `${vi[3]}-${vi[2].padStart(2, "0")}-${vi[1].padStart(2, "0")}`;
    return isValidDate(iso) ? iso : null;
  }
  return null;
}

function normalizedStatus(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const key = normalizeImportKey(value);
  return STATUS_ALIASES[key] || (normalizeTaskStatus(key) === key ? key : null);
}

function mapStatusToSection(statusValue) {
  return STATUS_SECTIONS[normalizedStatus(statusValue)] || DEFAULT_SECTION;
}

export function mapImportRows(rows = [], options = {}) {
  const limitSections = options.maxSections || MAX_SECTIONS;
  const limitTasks = options.maxTasks || MAX_TASKS;
  const sections = [];
  const sectionKeys = new Map();
  const tasks = [];
  const errors = [];

  const ensureSection = (name, status) => {
    const clean = String(name || "").trim().slice(0, 80) || DEFAULT_SECTION;
    const key = normalizeImportKey(clean);
    const existing = sectionKeys.get(key);
    if (existing) {
      if (status && existing.status && existing.status !== status) return { conflict: true };
      if (status && !existing.status) existing.status = status;
      return existing;
    }
    if (sections.length >= limitSections) return null;
    const record = { name: clean, order: sections.length, status: status || null };
    sections.push(record);
    sectionKeys.set(key, record);
    return record;
  };

  rows.slice(0, limitTasks + 1).forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const entries = Object.entries(row);
    if (entries.length > MAX_IMPORT_COLUMNS) {
      errors.push({ row: index + 1, message: "Vượt quá số cột tối đa" });
      return;
    }
    const mapped = {};
    for (const [header, value] of entries) {
      if (String(value ?? "").length > MAX_IMPORT_FIELD_LENGTH) {
        errors.push({ row: index + 1, message: "Ô dữ liệu vượt quá độ dài tối đa" });
        return;
      }
      const field = matchHeader(normalizeImportKey(header));
      if (field && mapped[field] === undefined) mapped[field] = value;
    }
    const title = String(mapped.title ?? "").trim().slice(0, 200);
    if (!title) {
      errors.push({ row: index + 1, message: "Thiếu tiêu đề công việc" });
      return;
    }
    if (tasks.length >= limitTasks) {
      errors.push({ row: index + 1, message: "Vượt quá số công việc tối đa" });
      return;
    }
    const status = normalizedStatus(mapped.status);
    if (mapped.status !== undefined && String(mapped.status).trim() && !status) {
      errors.push({ row: index + 1, message: "Trạng thái công việc không hợp lệ" });
      return;
    }
    const sectionRecord = ensureSection(
      mapped.section !== undefined && String(mapped.section).trim()
        ? mapped.section
        : status
          ? mapStatusToSection(status)
          : DEFAULT_SECTION,
      status,
    );
    if (sectionRecord?.conflict) {
      errors.push({ row: index + 1, message: "Trạng thái không khớp với nhóm công việc" });
      return;
    }
    if (!sectionRecord) {
      errors.push({ row: index + 1, message: "Vượt quá số nhóm tối đa" });
      return;
    }
    const startDate = toIsoDate(mapped.startDate);
    const dueDate = toIsoDate(mapped.dueDate);
    if (mapped.startDate && !startDate) {
      errors.push({ row: index + 1, message: "Ngày bắt đầu không hợp lệ" });
      return;
    }
    if (mapped.dueDate && !dueDate) {
      errors.push({ row: index + 1, message: "Hạn hoàn thành không hợp lệ" });
      return;
    }
    if (startDate && dueDate && startDate > dueDate) {
      errors.push({ row: index + 1, message: "Ngày bắt đầu phải trước hoặc bằng hạn hoàn thành" });
      return;
    }
    tasks.push({
      title,
      description: String(mapped.description ?? "").trim().slice(0, 5000),
      section: sectionRecord.name,
      priority: PRIORITY_ALIASES[normalizeImportKey(mapped.priority)] || "medium",
      assignee: String(mapped.assignee ?? "").trim().slice(0, 120) || null,
      startDate,
      dueDate,
      status: status || null,
    });
  });

  for (const [index, section] of sections.entries()) {
    if (!section.status)
      section.status =
        index === sections.length - 1 && /hoàn thành|hoan thanh|done|xong/i.test(section.name)
          ? "done"
          : index === 0
            ? "todo"
            : "in_progress";
  }
  return { sections, tasks, errors };
}

function parseCsv(text) {
  if (typeof text !== "string") throw new Error("Dữ liệu CSV không hợp lệ");
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES)
    throw new Error("Tệp CSV phải có kích thước không quá 2 MB");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error(`CSV tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu`);
    } else field += char;
    if (field.length > MAX_IMPORT_FIELD_LENGTH)
      throw new Error(`Mỗi ô CSV tối đa ${MAX_IMPORT_FIELD_LENGTH} ký tự`);
  }
  if (quoted) throw new Error("Tệp CSV có dấu ngoặc kép chưa đóng");
  row.push(field);
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (rows.length > MAX_IMPORT_ROWS + 1)
    throw new Error(`CSV tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu`);
  if (!rows.length) return [];
  const headers = rows.shift().map((cell) => cell.replace(/^\uFEFF/, "").trim());
  if (headers.length > MAX_IMPORT_COLUMNS) throw new Error(`CSV tối đa ${MAX_IMPORT_COLUMNS} cột`);
  return rows.map((cells) => {
    if (cells.length > MAX_IMPORT_COLUMNS) throw new Error(`CSV tối đa ${MAX_IMPORT_COLUMNS} cột`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

export async function parseSpreadsheetBuffer(data, { type, filename = "" } = {}) {
  if (!/\.csv$/i.test(filename) || type !== "string")
    throw new Error("Chỉ hỗ trợ import tệp CSV (.csv)");
  return parseCsv(String(data));
}
