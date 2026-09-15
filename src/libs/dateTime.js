export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const toVietnamDateKey = (value = new Date()) => {
  const text = typeof value === "string" ? value : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const formatVietnamDate = (value) => {
  if (!value) return "—";
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    dateStyle: "short",
  }).format(new Date(value));
};

export const formatVietnamDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: VIETNAM_TIME_ZONE,
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(value))
    : "—";

// Giá trị cho input type="datetime-local". Không dùng toISOString() vì nó luôn
// đổi sang UTC, khiến giờ mời trà chiều bị lùi 7 tiếng trên giao diện Việt Nam.
export const toVietnamDateTimeLocal = (value) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};

export const dateOnlyToLocalDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : null;
};
