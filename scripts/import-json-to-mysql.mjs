import {
  trashStateToRecords,
  trashStateMetadata,
} from "../src/libs/trashScheduleStorage.js";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();
const json = (name) =>
  JSON.parse(
    fs.readFileSync(path.join(root, "src", "data", "json", name), "utf8"),
  );
const url =
  process.env.DATABASE_URL || "mysql://xbus:123456@127.0.0.1:3306/xbus";
const db = await mysql.createConnection({ uri: url, timezone: "+07:00" });
const iso = (value) => (value ? new Date(value) : null);
const mysqlDate = (value) => {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === text
    ? text
    : null;
};
const upsert = async (sql, values) =>
  db.execute(
    sql,
    values.map((value) => (value === undefined ? null : value)),
  );

try {
  await db.beginTransaction();
  const types = json("types.json").types || [];
  const categories = json("categories.json").categories || [];
  const users = json("users.json").users || [];
  for (const item of types)
    await upsert(
      "INSERT INTO departments (id,name,description,active,created_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),active=VALUES(active)",
      [
        item.id,
        item.name,
        item.description || null,
        Boolean(item.active),
        iso(item.createdAt),
      ],
    );
  for (const item of categories)
    await upsert(
      "INSERT INTO employment_categories (id,name,active) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),active=VALUES(active)",
      [item.id, item.name, Boolean(item.active)],
    );
  for (const item of users)
    await upsert(
      "INSERT INTO users (id,google_id,name,email,code,avatar_url,gender,phone,role,department_id,category_id,status,password_hash,birthday,scheduling_points,water_trip_count,created_at,updated_at,activated_at,activated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),email=VALUES(email),code=VALUES(code),avatar_url=VALUES(avatar_url),updated_at=VALUES(updated_at)",
      [
        item.id,
        item.googleId || null,
        item.name,
        item.email,
        item.code || null,
        item.avatarUrl || null,
        item.gender || null,
        item.phone || null,
        item.role,
        item.typeId || null,
        item.categoryId || null,
        item.status,
        item.password || null,
        item.birthday || null,
        Number(item.schedulingPoints || 0),
        Number(item.waterTripCount || 0),
        iso(item.createdAt),
        iso(item.updatedAt),
        iso(item.activatedAt),
        item.activatedBy || null,
      ],
    );
  const funds = json("funds.json").funds || [];
  for (const fund of funds) {
    await upsert(
      "INSERT INTO app_documents (document_key,document_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE document_value=VALUES(document_value),updated_at=VALUES(updated_at)",
      [
        `fund-meta:${fund.id}`,
        JSON.stringify({
          contributionSnapshot: fund.contributionSnapshot,
          members: Object.fromEntries(
            (fund.members || []).map((item) => [
              item.userId,
              {
                requiredAmount: item.requiredAmount,
                baseAmount: item.baseAmount,
                rosterHidden: item.rosterHidden,
                voluntarySurplus: item.voluntarySurplus,
                categoryId: item.categoryId,
                memberName: item.memberName,
                obligationCancelled: item.obligationCancelled || false,
                cancellationReason: item.cancellationReason || "",
                cancelledAt: item.cancelledAt,
                cancelledBy: item.cancelledBy,
              },
            ]),
          ),
        }),
        new Date(),
      ],
    );
    await upsert(
      "INSERT INTO fund_periods (id,year,month,opening_balance,payment_deadline,reminder_days_before,email_reminder_enabled,updated_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE opening_balance=VALUES(opening_balance),updated_at=VALUES(updated_at)",
      [
        fund.id,
        fund.year,
        fund.month,
        Number(fund.openingBalance || 0),
        fund.paymentDeadline || null,
        JSON.stringify(fund.reminderDaysBefore || []),
        Boolean(fund.emailReminderEnabled),
        iso(fund.updatedAt),
      ],
    );
    for (const item of fund.members || [])
      await upsert(
        "INSERT INTO fund_member_payments (fund_period_id,user_id,paid,amount,paid_at,payment_status,order_code,payment_link_id,payment_reference,approved_by,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE paid=VALUES(paid),amount=VALUES(amount),paid_at=VALUES(paid_at),updated_at=VALUES(updated_at)",
        [
          fund.id,
          item.userId,
          Boolean(item.paid),
          Number(item.amount || 0),
          iso(item.paidAt),
          item.paymentStatus || null,
          item.orderCode || null,
          item.paymentLinkId || null,
          item.paymentReference || null,
          item.approvedBy || null,
          iso(item.updatedAt),
        ],
      );
    for (const item of [
      ...(fund.incomes || []).map((x) => ({
        ...x,
        kind: "income",
        at: x.receivedAt,
      })),
      ...(fund.expenses || []).map((x) => ({
        ...x,
        kind: "expense",
        at: x.spentAt,
      })),
    ])
      await upsert(
        "INSERT INTO fund_transactions (id,fund_period_id,kind,title,category,amount,note,user_id,occurred_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount),note=VALUES(note),updated_at=VALUES(updated_at)",
        [
          item.id,
          fund.id,
          item.kind,
          item.title || "Giao dịch quỹ",
          item.category || "other",
          Number(item.amount || 0),
          item.note || null,
          item.userId || null,
          iso(item.at || item.createdAt),
          item.createdBy || null,
          iso(item.createdAt),
          iso(item.updatedAt),
        ],
      );
  }
  const assets = json("assets.json");
  for (const type of ["imports", "exports"])
    for (const item of assets[type] || [])
      await upsert(
        "INSERT INTO asset_transactions (id,type,asset_code,name,asset_type,description,transaction_date,quantity,location,person,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),asset_type=VALUES(asset_type),description=VALUES(description),transaction_date=VALUES(transaction_date),quantity=VALUES(quantity),location=VALUES(location),person=VALUES(person),note=VALUES(note),updated_at=VALUES(updated_at)",
        [
          item.id,
          type === "imports" ? "import" : "export",
          item.code,
          item.name,
          item.category || null,
          item.description || null,
          mysqlDate(item.date),
          Number(item.quantity || 0),
          item.location || null,
          item.person || null,
          item.note || null,
          iso(item.createdAt),
          iso(item.updatedAt),
        ],
      );
  const schedules = json("water-schedules.json").schedules || [];
  for (const item of schedules) {
    await upsert(
      "INSERT INTO water_schedules (id,year,month,week_index,schedule_date,schedule_time,required_people,status,note,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE schedule_date=VALUES(schedule_date),schedule_time=VALUES(schedule_time),status=VALUES(status),note=VALUES(note),metadata=VALUES(metadata),updated_at=VALUES(updated_at)",
      [
        item.id,
        item.year || 0,
        item.month || 0,
        item.weekIndex ?? 0,
        item.date ? item.date.split("/").reverse().join("-") : null,
        item.time || null,
        item.requiredPeople || 0,
        item.status || "pending",
        item.note || null,
        JSON.stringify(
          Object.fromEntries(
            Object.entries(item).filter(
              ([key]) =>
                ![
                  "id",
                  "year",
                  "month",
                  "weekIndex",
                  "date",
                  "time",
                  "requiredPeople",
                  "status",
                  "note",
                  "participants",
                  "createdAt",
                  "updatedAt",
                ].includes(key),
            ),
          ),
        ),
        iso(item.createdAt),
        iso(item.updatedAt),
      ],
    );
    for (const person of item.participants || [])
      if (users.some((u) => u.id === person.userId))
        await upsert(
          "INSERT INTO water_schedule_participants (schedule_id,user_id,completed) VALUES (?,?,?) ON DUPLICATE KEY UPDATE completed=VALUES(completed)",
          [item.id, person.userId, Boolean(person.completed)],
        );
  }
  for (const id of json("water-exemptions.json").userIds || [])
    if (users.some((u) => u.id === id))
      await upsert(
        "INSERT INTO water_exemptions (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id=user_id",
        [id],
      );
  for (const item of json("audit-logs.json").auditLogs || [])
    await upsert(
      "INSERT INTO audit_logs (id,admin_id,action,target_type,target_id,details,ip,timestamp) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE details=VALUES(details)",
      [
        item.id,
        item.adminId || null,
        item.action,
        item.targetType || null,
        item.targetId || null,
        item.details || null,
        item.ip || null,
        iso(item.timestamp || item.createdAt),
      ],
    );
  const settings = json("settings.json");
  const trashFile = path.join(
    root,
    "src",
    "data",
    "json",
    "trash-schedules.json",
  );
  const trash = fs.existsSync(trashFile)
    ? json("trash-schedules.json")
    : {
        schedules: trashStateToRecords(settings),
        ...trashStateMetadata(settings),
      };
  for (const row of trash.schedules || []) {
    await upsert(
      "INSERT INTO trash_schedules (schedule_date,user_id,completed,completed_by,completed_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),completed=VALUES(completed),completed_by=VALUES(completed_by),completed_at=VALUES(completed_at)",
      [
        row.dateKey,
        row.userId,
        Boolean(row.completed),
        row.completedBy,
        iso(row.completedAt),
      ],
    );
  }
  await upsert(
    "INSERT INTO app_documents (document_key,document_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE document_value=VALUES(document_value),updated_at=VALUES(updated_at)",
    [
      "trash-schedule-meta",
      JSON.stringify({
        revision: trash.revision || 0,
        generationMeta: trash.generationMeta || {},
      }),
      new Date(),
    ],
  );
  for (const key of [
    "trashScheduleOverrides",
    "trashScheduleCompletions",
    "trashScheduleRevision",
    "trashScheduleGenerationMeta",
  ])
    delete settings[key];
  await upsert(
    "INSERT INTO app_settings (setting_key,setting_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_at=VALUES(updated_at)",
    ["global", JSON.stringify(settings), new Date()],
  );
  await upsert(
    "INSERT INTO app_documents (document_key,document_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE document_value=VALUES(document_value),updated_at=VALUES(updated_at)",
    ["afternoon-tea", JSON.stringify(json("afternoon-tea.json")), new Date()],
  );
  await db.commit();
  for (const table of [
    "users",
    "fund_periods",
    "fund_member_payments",
    "fund_transactions",
    "asset_transactions",
    "water_schedules",
    "audit_logs",
  ]) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM ${table}`);
    console.log(`${table}: ${row.count}`);
  }
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
