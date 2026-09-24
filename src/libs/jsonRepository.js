import {
  trashStateToRecords,
  trashRecordsToState,
  trashStateMetadata,
} from "./trashScheduleStorage.js";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "src", "data", "json");

// Đảm bảo thư mục dữ liệu tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Đọc file JSON an toàn
 */
export function readJsonFile(fileName, defaultValue = {}) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    if (!fs.existsSync(filePath)) {
      writeJsonFile(fileName, defaultValue);
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content || !content.trim()) {
      writeJsonFile(fileName, defaultValue);
      return defaultValue;
    }
    return JSON.parse(content);
  } catch (error) {
    console.error(`[JsonRepository] Lỗi đọc file ${fileName}:`, error);
    return defaultValue;
  }
}

/**
 * Ghi file JSON theo cơ chế Atomic (ghi file tạm rồi đổi tên)
 * Tránh hỏng file khi có sự cố ngắt giữa chừng
 */
export function writeJsonFile(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  const tempPath = path.join(DATA_DIR, `${fileName}.${Date.now()}.tmp`);

  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonString, "utf-8");
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    console.error(`[JsonRepository] Lỗi ghi file ${fileName}:`, error);
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {
        // ignore
      }
    }
    throw error;
  }
}

// === CÁC HÀM GET / SAVE CHUYÊN BIỆT ===

export function getUsers() {
  const data = readJsonFile("users.json", { users: [] });
  return data.users || [];
}

export function saveUsers(users) {
  return writeJsonFile("users.json", { users });
}

export function getTypes() {
  const data = readJsonFile("types.json", { types: [] });
  return data.types || [];
}

export function saveTypes(types) {
  return writeJsonFile("types.json", { types });
}

export function getCategories() {
  const data = readJsonFile("categories.json", { categories: [] });
  return data.categories || [];
}

export function saveCategories(categories) {
  return writeJsonFile("categories.json", { categories });
}

export function getSettings() {
  return readJsonFile("settings.json", {
    companyEmailDomains: ["phenikaa-x.com"],
    defaultRole: "user",
    defaultUserStatus: "disabled",
    fundMinimumAmounts: {
      category_official: 150000,
      category_probation: 150000,
      category_intern: 100000,
      category_collaborator: 100000,
    },
  });
}

export function saveSettings(settings) {
  return writeJsonFile("settings.json", settings);
}

export function getWaterSchedules() {
  const data = readJsonFile("water-schedules.json", { schedules: [] });
  return data.schedules || [];
}

export function saveWaterSchedules(schedules) {
  return writeJsonFile("water-schedules.json", { schedules });
}

export function getWaterExemptions() {
  return readJsonFile("water-exemptions.json", { userIds: [] }).userIds || [];
}

export function saveWaterExemptions(userIds) {
  return writeJsonFile("water-exemptions.json", { userIds });
}

export function getFunds() {
  const data = readJsonFile("funds.json", { funds: [] });
  return data.funds || [];
}

export function saveFunds(funds) {
  return writeJsonFile("funds.json", { funds });
}

export function getAssets() {
  return readJsonFile("assets.json", {
    imports: [],
    exports: [],
    products: [],
    categories: [],
    units: [],
  });
}

export function saveAssets(data) {
  return writeJsonFile("assets.json", data);
}

export function getAfternoonTea() {
  return readJsonFile("afternoon-tea.json", {
    menuImageUrl: "",
    invitations: [],
  });
}

export function saveAfternoonTea(data) {
  return writeJsonFile("afternoon-tea.json", data);
}

export function getAuditLogs() {
  const data = readJsonFile("audit-logs.json", { auditLogs: [] });
  const logs = data.auditLogs || [];
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeLogs = logs.filter((log) => {
    const timestamp = new Date(log.timestamp || log.createdAt).getTime();
    return !Number.isFinite(timestamp) || timestamp >= cutoff;
  });

  if (activeLogs.length !== logs.length) {
    writeJsonFile("audit-logs.json", { auditLogs: activeLogs });
  }

  return activeLogs;
}

/**
 * Ghi nhật ký hoạt động của Admin (chỉ ghi thêm, không sửa/xóa)
 */
export function appendAuditLog({
  adminId,
  adminName,
  adminEmail,
  action,
  targetType,
  targetId,
  details,
  ip = "127.0.0.1",
}) {
  const logs = getAuditLogs();
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    adminId,
    adminName,
    adminEmail,
    action,
    targetType,
    targetId,
    details,
    ip,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog); // đưa log mới nhất lên đầu
  writeJsonFile("audit-logs.json", { auditLogs: logs });
  return newLog;
}

export function getTrashScheduleState() {
  const file = path.join(DATA_DIR, "trash-schedules.json");
  if (!fs.existsSync(file)) {
    // Upgrade older local installations only after the new file is saved successfully.
    const settings = getSettings();
    saveTrashScheduleState(settings);
    for (const key of [
      "trashScheduleOverrides",
      "trashScheduleCompletions",
      "trashScheduleRevision",
      "trashScheduleGenerationMeta",
    ])
      delete settings[key];
    saveSettings(settings);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return trashRecordsToState(data.schedules || [], data);
}
export function saveTrashScheduleState(state) {
  return writeJsonFile("trash-schedules.json", {
    schedules: trashStateToRecords(state),
    ...trashStateMetadata(state),
  });
}
