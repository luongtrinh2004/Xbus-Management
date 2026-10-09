import { getMysqlPool, isMysqlEnabled } from "./mysql.js";
import { mutateOvertimeJson, readOvertimeJson } from "./overtimeJsonStorage.js";
import { emptyOvertimeState } from "./overtime.js";
const decode = (value) =>
  typeof value === "string" ? JSON.parse(value) : value;
async function readSql(connection) {
  const [settings] = await connection.query(
    "SELECT config FROM overtime_settings WHERE id=1",
  );
  const [requests] = await connection.query(
    "SELECT record_json FROM overtime_requests",
  );
  const [history] = await connection.query(
    "SELECT record_json FROM overtime_history ORDER BY changed_at, id",
  );
  return {
    config: settings.length
      ? decode(settings[0].config)
      : emptyOvertimeState().config,
    requests: requests.map((row) => decode(row.record_json)),
    history: history.map((row) => decode(row.record_json)),
  };
}
export async function readOvertime() {
  if (!isMysqlEnabled()) return readOvertimeJson();
  // A consistent snapshot ensures that requests and their histories agree.
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const state = await readSql(connection);
    await connection.commit();
    return state;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
const requestColumns = {
  id: "id",
  userId: "user_id",
  startTime: "start_time",
  endTime: "end_time",
  otType: "ot_type",
  registeredMinutes: "registered_minutes",
  actualMinutes: "actual_minutes",
  confirmedMinutes: "confirmed_minutes",
  reason: "reason",
  workReport: "work_report",
  status: "status",
  approvedBy: "approved_by",
  approvedAt: "approved_at",
  confirmedBy: "confirmed_by",
  confirmedAt: "confirmed_at",
  rejectionReason: "rejection_reason",
  createdBy: "created_by",
  createdAt: "created_at",
  updatedAt: "updated_at",
};
const dates = new Set([
  "startTime",
  "endTime",
  "approvedAt",
  "confirmedAt",
  "createdAt",
  "updatedAt",
  "changedAt",
]);
const values = (item, fields) =>
  fields.map((field) =>
    dates.has(field) && item[field]
      ? new Date(item[field])
      : (item[field] ?? null),
  );
export async function mutateOvertimeStorage(mutator) {
  if (!isMysqlEnabled()) return mutateOvertimeJson(mutator);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    // Serialize validation and writes across processes, including overlap checks.
    const [locked] = await connection.execute(
      "SELECT id FROM overtime_settings WHERE id=1 FOR UPDATE",
    );
    if (!locked.length)
      throw new Error("OT configuration is missing; run database migrations");
    const state = await readSql(connection);
    const previous = new Map(
      state.requests.map((item) => [item.id, item.version]),
    );
    const historyIds = new Set(state.history.map((item) => item.id));
    const result = await mutator(state);
    await connection.execute(
      "UPDATE overtime_settings SET config=? WHERE id=1",
      [JSON.stringify(result.state.config)],
    );
    for (const item of result.state.requests) {
      if (previous.get(item.id) === item.version) continue;
      const columns = [...Object.values(requestColumns), "record_json"];
      await connection.execute(
        `INSERT INTO overtime_requests (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON DUPLICATE KEY UPDATE ${columns
          .filter((column) => column !== "id")
          .map((column) => `${column}=VALUES(${column})`)
          .join(",")}`,
        [...values(item, Object.keys(requestColumns)), JSON.stringify(item)],
      );
    }
    for (const item of result.state.history) {
      if (historyIds.has(item.id)) continue;
      await connection.execute(
        "INSERT INTO overtime_history (id,overtime_id,action,old_status,new_status,changed_by,note,changed_at,record_json) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          item.id,
          item.overtimeId,
          item.action,
          item.oldStatus,
          item.newStatus,
          item.changedBy,
          item.note,
          new Date(item.changedAt),
          JSON.stringify(item),
        ],
      );
    }
    await connection.commit();
    return result.result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
