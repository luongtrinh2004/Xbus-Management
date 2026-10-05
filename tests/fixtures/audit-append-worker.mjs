import { appendAuditLogJson } from "../../src/libs/auditJsonStorage.js";

const [id] = process.argv.slice(2);
await appendAuditLogJson({
  id: `audit-${id}`,
  adminId: "worker",
  action: "TEST",
  targetType: "WORK_TASK",
  targetId: id,
  details: id,
});
