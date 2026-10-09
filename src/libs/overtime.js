import { randomUUID } from "node:crypto";

export const OT_STATUSES = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  WAITING_CONFIRMATION: "Chờ xác nhận",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
export const OT_TYPES = {
  WEEKDAY: "Ngày thường",
  WEEKEND: "Cuối tuần",
  HOLIDAY: "Ngày lễ",
};
export const DEFAULT_OT_CONFIG = {
  allowPast: false,
  maxDailyMinutes: 0,
  maxMonthlyMinutes: 0,
  breakMinutes: 0,
  weekendDays: [0, 6],
  holidays: [],
};
export const emptyOvertimeState = () => ({
  requests: [],
  history: [],
  config: { ...DEFAULT_OT_CONFIG, weekendDays: [0, 6], holidays: [] },
});
export class OvertimeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status) => {
  throw new OvertimeError(message, status);
};
export const isOtManager = (actor) =>
  ["admin", "assistant"].includes(actor?.role);
export const localDate = (value) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
const integer = (value, label, max = 1000000) => {
  if (
    value === "" ||
    value === null ||
    typeof value === "boolean" ||
    !Number.isInteger(Number(value)) ||
    Number(value) < 0 ||
    Number(value) > max
  )
    fail(`${label} phải là số phút nguyên không âm (tối đa ${max})`);
  return Number(value);
};
const text = (value, label, required = false) => {
  if (value != null && typeof value !== "string") fail(`${label} không hợp lệ`);
  const result = (value || "").trim();
  if ((required && !result) || result.length > 10000)
    fail(`${label} bắt buộc và không quá 10.000 ký tự`);
  return result;
};
export function normalizeOtConfig(input) {
  if (typeof input.allowPast !== "boolean")
    fail("Cấu hình đăng ký quá khứ không hợp lệ");
  if (
    !Array.isArray(input.weekendDays) ||
    input.weekendDays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  )
    fail("Ngày nghỉ trong tuần không hợp lệ");
  if (
    !Array.isArray(input.holidays) ||
    input.holidays.some((day) => !validDate(day)) ||
    input.holidays.length > 1000
  )
    fail("Danh sách ngày lễ không hợp lệ");
  return {
    allowPast: input.allowPast,
    maxDailyMinutes: integer(input.maxDailyMinutes, "Giới hạn ngày", 1440),
    maxMonthlyMinutes: integer(
      input.maxMonthlyMinutes,
      "Giới hạn tháng",
      44640,
    ),
    breakMinutes: integer(input.breakMinutes, "Thời gian nghỉ", 1439),
    weekendDays: [...new Set(input.weekendDays)],
    holidays: [...new Set(input.holidays)].sort(),
  };
}
export function otType(date, config) {
  if (config.holidays.includes(date)) return "HOLIDAY";
  return config.weekendDays.includes(
    new Date(`${date}T12:00:00+07:00`).getUTCDay(),
  )
    ? "WEEKEND"
    : "WEEKDAY";
}
// Allocate integer minutes proportionally to elapsed time; cumulative rounding
// preserves totals even when a request crosses midnight or a month boundary.
export function allocateOtDays(record) {
  const start = Date.parse(record.startTime),
    end = Date.parse(record.endTime);
  const days = [];
  let cursor = start,
    elapsed = 0;
  while (cursor < end) {
    const date = localDate(cursor);
    const midnight = Date.parse(`${date}T00:00:00+07:00`) + 86400000;
    const duration = Math.min(end, midnight) - cursor;
    const share = (total) =>
      Math.floor(((elapsed + duration) * total) / (end - start)) -
      Math.floor((elapsed * total) / (end - start));
    days.push({
      date,
      registeredMinutes: share(record.registeredMinutes),
      actualMinutes: share(record.actualMinutes || 0),
      confirmedMinutes: share(record.confirmedMinutes || 0),
    });
    cursor += duration;
    elapsed += duration;
  }
  return days;
}
export function normalizeOtRequest(input, config, now = new Date()) {
  if (
    !validDate(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.start || "") ||
    !/^\d{2}:\d{2}$/.test(input.end || "")
  )
    fail("Ngày và giờ làm thêm không hợp lệ");
  for (const value of [input.start, input.end])
    if (Number(value.slice(0, 2)) > 23 || Number(value.slice(3)) > 59)
      fail("Giờ làm thêm không hợp lệ");
  if (input.start === input.end) fail("Giờ bắt đầu và kết thúc phải khác nhau");
  const start = Date.parse(`${input.date}T${input.start}:00+07:00`);
  let end = Date.parse(`${input.date}T${input.end}:00+07:00`);
  if (end < start) end += 86400000;
  if (!config.allowPast && input.date < localDate(now))
    fail("Không cho phép đăng ký OT trong quá khứ");
  const duration = (end - start) / 60000;
  if (config.breakMinutes >= duration)
    fail("Thời gian nghỉ phải nhỏ hơn khoảng thời gian đăng ký");
  return {
    startTime: new Date(start).toISOString(),
    endTime: new Date(end).toISOString(),
    otType: otType(input.date, config),
    breakMinutes: config.breakMinutes,
    registeredMinutes: duration - config.breakMinutes,
    reason: text(input.reason, "Lý do làm thêm", true),
  };
}
const effective = (record) =>
  !["REJECTED", "CANCELLED"].includes(record.status);
export function validateOtSchedule(candidate, requests, config) {
  const others = requests.filter(
    (item) =>
      item.id !== candidate.id &&
      item.userId === candidate.userId &&
      effective(item),
  );
  if (
    others.some(
      (item) =>
        Date.parse(candidate.startTime) < Date.parse(item.endTime) &&
        Date.parse(candidate.endTime) > Date.parse(item.startTime),
    )
  )
    fail("Khoảng thời gian trùng với đơn OT đang hiệu lực", 409);
  const daily = new Map(),
    monthly = new Map();
  for (const item of [...others, candidate])
    for (const day of allocateOtDays(item)) {
      daily.set(day.date, (daily.get(day.date) || 0) + day.registeredMinutes);
      const month = day.date.slice(0, 7);
      monthly.set(month, (monthly.get(month) || 0) + day.registeredMinutes);
    }
  for (const day of allocateOtDays(candidate)) {
    if (config.maxDailyMinutes && daily.get(day.date) > config.maxDailyMinutes)
      fail(`Vượt giới hạn OT ngày ${day.date}`);
    if (
      config.maxMonthlyMinutes &&
      monthly.get(day.date.slice(0, 7)) > config.maxMonthlyMinutes
    )
      fail(`Vượt giới hạn OT tháng ${day.date.slice(0, 7)}`);
  }
}
export function mutateOvertime(state, actor, input, users, now = new Date()) {
  if (!actor?.id) fail("Vui lòng đăng nhập", 401);
  const stamp = now.toISOString(),
    admin = isOtManager(actor);
  const audit = (action, before, after, note = "") =>
    state.history.push({
      id: randomUUID(),
      overtimeId: after?.id || null,
      action,
      oldStatus: before?.status || null,
      newStatus: after?.status || null,
      changedBy: actor.id,
      changedAt: stamp,
      note,
      before: before || null,
      after: after || null,
    });
  if (input.action === "settings") {
    if (actor.role !== "admin") fail("Chỉ Admin được cấu hình OT", 403);
    const before = state.config;
    state.config = normalizeOtConfig(input.config);
    audit(
      "settings",
      null,
      null,
      JSON.stringify({ before, after: state.config }),
    );
    return state.config;
  }
  if (input.action === "create") {
    const userId = admin ? input.userId || actor.id : actor.id;
    if (!users.some((user) => user.id === userId && user.status === "able"))
      fail("Nhân viên không hoạt động hoặc không tồn tại");
    const record = {
      ...normalizeOtRequest(input, state.config, now),
      id: randomUUID(),
      userId,
      actualMinutes: null,
      confirmedMinutes: null,
      workReport: "",
      reportNote: "",
      rejectionReason: "",
      status:
        admin && input.approveImmediately === true ? "APPROVED" : "PENDING",
      createdBy: actor.id,
      createdAt: stamp,
      updatedAt: stamp,
      approvedBy: null,
      approvedAt: null,
      confirmedBy: null,
      confirmedAt: null,
      version: 1,
    };
    if (record.status === "APPROVED") {
      record.approvedBy = actor.id;
      record.approvedAt = stamp;
    }
    validateOtSchedule(record, state.requests, state.config);
    state.requests.push(record);
    audit("create", null, { ...record });
    return record;
  }
  const record = state.requests.find((item) => item.id === input.id);
  if (!record || (!admin && record.userId !== actor.id))
    fail("Không tìm thấy đơn OT", 404);
  if (input.version !== record.version)
    fail("Đơn đã thay đổi. Vui lòng tải lại trước khi thao tác", 409);
  const before = { ...record };
  const allowed = (statuses) => {
    if (!statuses.includes(record.status))
      fail("Trạng thái đơn không cho phép thao tác này", 409);
  };
  const requireManager = () => {
    if (!admin) fail("Chỉ Admin hoặc trợ lý được thực hiện thao tác này", 403);
  };
  let note = "";
  switch (input.action) {
    case "edit":
      allowed(admin ? ["PENDING", "APPROVED"] : ["PENDING"]);
      if (record.status === "APPROVED")
        note = text(input.note, "Lý do điều chỉnh", true);
      Object.assign(
        record,
        normalizeOtRequest(
          input,
          {
            ...state.config,
            allowPast:
              state.config.allowPast ||
              admin ||
              input.date === localDate(record.startTime),
          },
          now,
        ),
      );
      validateOtSchedule(record, state.requests, state.config);
      break;
    case "cancel":
      allowed(
        admin ? ["PENDING", "APPROVED", "WAITING_CONFIRMATION"] : ["PENDING"],
      );
      if (record.status !== "PENDING")
        note = text(input.note, "Lý do hủy", true);
      record.status = "CANCELLED";
      break;
    case "approve":
      requireManager();
      allowed(["PENDING"]);
      record.status = "APPROVED";
      record.approvedBy = actor.id;
      record.approvedAt = stamp;
      break;
    case "reject":
      requireManager();
      allowed(["PENDING"]);
      note = text(input.note, "Lý do từ chối", true);
      record.status = "REJECTED";
      record.rejectionReason = note;
      record.rejectedBy = actor.id;
      record.rejectedAt = stamp;
      break;
    case "report":
      allowed(["APPROVED"]);
      if (
        localDate(now) < localDate(record.startTime) ||
        Date.parse(record.endTime) > now.getTime()
      )
        fail("Chỉ gửi báo cáo sau khi kết thúc thời gian OT");
      record.actualMinutes = integer(input.actualMinutes, "Giờ thực tế", 1440);
      if (!record.actualMinutes) fail("Giờ thực tế phải lớn hơn 0");
      record.workReport = text(input.workReport, "Báo cáo công việc", true);
      record.reportNote = text(input.note, "Ghi chú");
      record.returnReason = "";
      record.status = "WAITING_CONFIRMATION";
      break;
    case "return":
      requireManager();
      allowed(["WAITING_CONFIRMATION"]);
      note = text(input.note, "Yêu cầu chỉnh sửa", true);
      record.status = "APPROVED";
      record.returnReason = note;
      break;
    case "confirm":
      requireManager();
      allowed(["WAITING_CONFIRMATION"]);
      record.confirmedMinutes = integer(
        input.confirmedMinutes ?? record.actualMinutes,
        "Giờ xác nhận",
        1440,
      );
      if (!record.confirmedMinutes) fail("Giờ xác nhận phải lớn hơn 0");
      note = text(
        input.note,
        "Ghi chú xác nhận",
        record.confirmedMinutes !== record.actualMinutes,
      );
      record.status = "COMPLETED";
      record.confirmedBy = actor.id;
      record.confirmedAt = stamp;
      break;
    default:
      fail("Thao tác không hợp lệ");
  }
  record.updatedAt = stamp;
  record.version += 1;
  audit(input.action, before, { ...record }, note);
  return record;
}
export function parseOtFilters(params, now = new Date()) {
  const year = params.get("year") || localDate(now).slice(0, 4);
  const month = params.has("month")
    ? params.get("month")
    : localDate(now).slice(5, 7);
  if (
    !/^\d{4}$/.test(year) ||
    Number(year) < 1900 ||
    Number(year) > 9999 ||
    (month &&
      (!/^\d{1,2}$/.test(month) || Number(month) < 1 || Number(month) > 12))
  )
    fail("Tháng hoặc năm không hợp lệ");
  const from = params.get("from") || "",
    to = params.get("to") || "";
  if (
    (from && !validDate(from)) ||
    (to && !validDate(to)) ||
    (from && to && from > to)
  )
    fail("Khoảng ngày không hợp lệ");
  const scope = params.get("scope") || "all";
  if (!["mine", "all"].includes(scope)) fail("Phạm vi xem đơn không hợp lệ");
  const status = params.get("status") || "",
    type = params.get("type") || "";
  if ((status && !OT_STATUSES[status]) || (type && !OT_TYPES[type]))
    fail("Bộ lọc không hợp lệ");
  return {
    year,
    month: month ? month.padStart(2, "0") : "",
    from,
    to,
    status,
    type,
    userId: params.get("userId") || "",
    scope,
    search: (params.get("search") || "").trim().toLowerCase(),
  };
}
export function otDayMatches(date, filters) {
  return (
    date.startsWith(
      filters.year + (filters.month ? `-${filters.month}` : ""),
    ) &&
    (!filters.from || date >= filters.from) &&
    (!filters.to || date <= filters.to)
  );
}
export function overtimeView(state, actor, users, filters) {
  const names = new Map(
    users.map((user) => [user.id, user.name || user.email]),
  );
  const visible = state.requests.filter(
    (item) => isOtManager(actor) || item.userId === actor.id,
  );
  const entries = visible
    .filter(
      (item) =>
        (filters.scope !== "mine" || item.userId === actor.id) &&
        (!filters.userId || item.userId === filters.userId) &&
        (!filters.status || item.status === filters.status) &&
        (!filters.type || item.otType === filters.type) &&
        (!filters.search ||
          `${names.get(item.userId) || ""} ${item.reason} ${item.workReport}`
            .toLowerCase()
            .includes(filters.search)),
    )
    .map((item) => {
      const days = allocateOtDays(item).filter((day) =>
        otDayMatches(day.date, filters),
      );
      return {
        ...item,
        userName: names.get(item.userId) || "Nhân sự đã nghỉ",
        approvedByName: names.get(item.approvedBy) || "",
        rejectedByName: names.get(item.rejectedBy) || "",
        confirmedByName: names.get(item.confirmedBy) || "",
        createdByName: names.get(item.createdBy) || "",
        days,
        periodRegisteredMinutes: days.reduce(
          (sum, day) => sum + day.registeredMinutes,
          0,
        ),
        periodConfirmedMinutes:
          item.status === "COMPLETED"
            ? days.reduce((sum, day) => sum + day.confirmedMinutes, 0)
            : 0,
      };
    })
    .filter((item) => item.days.length)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
  const summary = {
    registeredMinutes: 0,
    confirmedMinutes: 0,
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    WAITING_CONFIRMATION: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  const employees = new Map(),
    months = new Map(),
    types = Object.fromEntries(Object.keys(OT_TYPES).map((type) => [type, 0]));
  for (const item of entries) {
    summary[item.status]++;
    if (!effective(item)) continue;
    summary.registeredMinutes += item.periodRegisteredMinutes;
    summary.confirmedMinutes += item.periodConfirmedMinutes;
    const employee = employees.get(item.userId) || {
      userId: item.userId,
      name: item.userName,
      registeredMinutes: 0,
      confirmedMinutes: 0,
      completed: 0,
    };
    employee.registeredMinutes += item.periodRegisteredMinutes;
    employee.confirmedMinutes += item.periodConfirmedMinutes;
    employee.completed += Number(item.status === "COMPLETED");
    employees.set(item.userId, employee);
    types[item.otType] += item.periodRegisteredMinutes;
    for (const day of item.days) {
      const key = day.date.slice(0, 7);
      const monthly = months.get(key) || {
        month: key,
        registeredMinutes: 0,
        confirmedMinutes: 0,
      };
      monthly.registeredMinutes += day.registeredMinutes;
      monthly.confirmedMinutes +=
        item.status === "COMPLETED" ? day.confirmedMinutes : 0;
      months.set(key, monthly);
    }
  }
  return {
    entries,
    summary,
    employees: [...employees.values()].sort(
      (a, b) => b.confirmedMinutes - a.confirmedMinutes,
    ),
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    types,
  };
}
