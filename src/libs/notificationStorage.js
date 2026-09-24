import { readJsonFile, writeJsonFile } from "./jsonRepository.js";

const FILE_NAME = "notifications.json";

export function getStoredNotifications() {
  const data = readJsonFile(FILE_NAME, { notifications: [] });
  return data.notifications || [];
}

export function saveStoredNotifications(notifications) {
  return writeJsonFile(FILE_NAME, { notifications });
}

export function createNotification({
  userId = null,
  targetRole = null, // "admin" | "assistant" | "all" | null
  type = "system", // "duty_water" | "duty_trash" | "duty_confirmed" | "fund_manual_payment" | "fund_confirmed" | "system"
  title,
  message,
  link = null,
  action = null,
  metadata = null,
}) {
  const notifications = getStoredNotifications();
  const id = `noti_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newNoti = {
    id,
    userId,
    targetRole,
    type,
    title,
    message,
    link,
    action,
    metadata,
    read: false,
    readBy: [],
    createdAt: new Date().toISOString(),
  };

  // Giữ tối đa 300 thông báo gần nhất
  const updated = [newNoti, ...notifications].slice(0, 300);
  saveStoredNotifications(updated);
  return newNoti;
}

export function markAsRead(id, userId) {
  const notifications = getStoredNotifications();
  let changed = false;
  for (const noti of notifications) {
    if (noti.id === id) {
      if (noti.userId === userId) {
        noti.read = true;
      }
      noti.readBy = Array.from(new Set([...(noti.readBy || []), userId]));
      changed = true;
      break;
    }
  }
  if (changed) saveStoredNotifications(notifications);
  return changed;
}

export function markAllAsRead(userId, userRole) {
  const notifications = getStoredNotifications();
  let changed = false;
  for (const noti of notifications) {
    const isTarget =
      noti.userId === userId ||
      noti.targetRole === "all" ||
      (noti.targetRole === "admin" &&
        ["admin", "assistant"].includes(userRole)) ||
      (noti.targetRole === "assistant" && userRole === "assistant");

    if (isTarget) {
      if (noti.userId === userId) {
        noti.read = true;
      }
      noti.readBy = Array.from(new Set([...(noti.readBy || []), userId]));
      changed = true;
    }
  }
  if (changed) saveStoredNotifications(notifications);
  return changed;
}
