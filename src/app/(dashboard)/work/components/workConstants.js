export const PRIORITY_LABELS = {
  low: ["Thấp", "info"],
  medium: ["Trung bình", "primary"],
  high: ["Cao", "warning"],
  urgent: ["Khẩn cấp", "error"],
};

export const VIEW_OPTIONS = [
  { value: "overview", label: "Tổng quan", icon: "tabler-chart-pie" },
  { value: "list", label: "Danh sách", icon: "tabler-list" },
  { value: "board", label: "Bảng", icon: "tabler-layout-kanban" },
  { value: "timeline", label: "Dòng thời gian", icon: "tabler-chart-gantt" },
  { value: "calendar", label: "Lịch", icon: "tabler-calendar" },
];

export const HEALTH_META = {
  no_update: {
    label: "Chưa cập nhật",
    color: "default",
    icon: "tabler-circle-dotted",
  },
  on_track: {
    label: "Đúng tiến độ",
    color: "success",
    icon: "tabler-circle-check",
  },
  at_risk: {
    label: "Có rủi ro",
    color: "warning",
    icon: "tabler-alert-triangle",
  },
  off_track: {
    label: "Chậm tiến độ",
    color: "error",
    icon: "tabler-circle-x",
  },
};

export const PROJECT_COLORS = [
  "#7367F0",
  "#00BAD1",
  "#28C76F",
  "#FF9F43",
  "#EA5455",
  "#FF70AD",
  "#A8AAAE",
  "#26C6DA",
];

export const PROJECT_ICONS = [
  "tabler-folder",
  "tabler-rocket",
  "tabler-bug",
  "tabler-bus",
  "tabler-calendar-event",
  "tabler-code",
  "tabler-book",
  "tabler-bulb",
  "tabler-tool",
  "tabler-ticket",
  "tabler-star",
  "tabler-heart",
  "tabler-camera",
  "tabler-megaphone",
  "tabler-chart-bar",
  "tabler-shield-check",
];

export const isoDate = (value) => (value ? String(value).slice(0, 10) : "");

export const formatDate = (value) =>
  value
    ? new Date(`${isoDate(value)}T00:00:00`).toLocaleDateString("vi-VN")
    : "—";

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calendarDateKeys = (year, monthIndex) => {
  const total = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) =>
    localDateKey(new Date(year, monthIndex, index + 1)),
  );
};

export const todayIso = () => localDateKey();

export const addDaysIso = (iso, days) => {
  const base = iso ? new Date(`${iso}T00:00:00Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(base.getUTCDate()).padStart(2, "0")}`;
};

export const daysBetween = (fromIso, toIso) =>
  Math.round(
    (new Date(`${toIso}T00:00:00Z`).getTime() -
      new Date(`${fromIso}T00:00:00Z`).getTime()) /
      86400000,
  );
