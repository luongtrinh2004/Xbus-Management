import * as json from "./jsonRepository.js";
import crypto from "node:crypto";
import { applyFundBalances } from "./fundRules.js";
import { getMysqlPool, isMysqlEnabled } from "./mysql.js";

const mysqlEnabled = () => isMysqlEnabled();
const toIso = (value) => (value ? new Date(value).toISOString() : null);
const toDateOnly = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const toMysqlDateTime = (value, fallback = null) => {
  if (!value) return fallback;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? fallback : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};
const defaultSettings = {
  companyEmailDomains: ["phenikaa-x.com"],
  defaultRole: "user",
  defaultUserStatus: "disabled",
  fundMinimumAmounts: {
    category_official: 150000,
    category_probation: 150000,
    category_intern: 100000,
    category_collaborator: 100000,
  },
};
const asJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const query = (sql, values = []) => getMysqlPool().query(sql, values);

async function getDocument(key, fallback) {
  const [rows] = await query(
    "SELECT document_value FROM app_documents WHERE document_key=?",
    [key],
  );
  return rows.length ? asJson(rows[0].document_value, fallback) : fallback;
}
async function saveDocument(key, value) {
  await query(
    "INSERT INTO app_documents (document_key,document_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE document_value=VALUES(document_value),updated_at=VALUES(updated_at)",
    [key, JSON.stringify(value), new Date()],
  );
  return true;
}

export async function getUsers() {
  if (!mysqlEnabled()) return json.getUsers();
  const [rows] = await query(
    "SELECT * FROM users ORDER BY created_at DESC, id DESC",
  );
  return rows.map((row) => ({
    id: row.id,
    googleId: row.google_id || "",
    name: row.name,
    email: row.email,
    code: row.code || "",
    avatarUrl: row.avatar_url || "",
    gender: row.gender || "unspecified",
    phone: row.phone || "",
    role: row.role,
    typeId: row.department_id || "",
    categoryId: row.category_id || "",
    status: row.status,
    password: row.password_hash || "",
    birthday: toDateOnly(row.birthday),
    citizenId: row.citizen_id || "",
    citizenIssuedDate: toDateOnly(row.citizen_issued_date),
    address: row.address || "",
    position: row.position || "",
    jiraAccount: row.jira_account || "",
    joinedDate: toDateOnly(row.joined_date),
    schedulingPoints: Number(row.scheduling_points || 0),
    waterTripCount: Number(row.water_trip_count || 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    activatedAt: toIso(row.activated_at),
    activatedBy: row.activated_by || null,
  }));
}

export async function saveUsers(users) {
  if (!mysqlEnabled()) return json.saveUsers(users);
  const db = getMysqlPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.query("SELECT id FROM users");
    const keptIds = new Set(users.map((item) => item.id));
    for (const { id } of existingRows.filter((item) => !keptIds.has(item.id))) {
      await connection.execute(
        "DELETE FROM fund_reminder_logs WHERE user_id=?",
        [id],
      );
      await connection.execute(
        "DELETE FROM fund_member_payments WHERE user_id=?",
        [id],
      );
      await connection.execute(
        "DELETE FROM water_schedule_participants WHERE user_id=?",
        [id],
      );
      await connection.execute("DELETE FROM water_exemptions WHERE user_id=?", [
        id,
      ]);
      await connection.execute("DELETE FROM users WHERE id=?", [id]);
    }
    for (const item of users) {
      await connection.execute(
        `INSERT INTO users (id,google_id,name,email,code,avatar_url,gender,phone,role,department_id,category_id,status,password_hash,birthday,citizen_id,citizen_issued_date,address,position,jira_account,joined_date,scheduling_points,water_trip_count,created_at,updated_at,activated_at,activated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE google_id=VALUES(google_id),name=VALUES(name),email=VALUES(email),code=VALUES(code),avatar_url=VALUES(avatar_url),gender=VALUES(gender),phone=VALUES(phone),role=VALUES(role),department_id=VALUES(department_id),category_id=VALUES(category_id),status=VALUES(status),password_hash=VALUES(password_hash),birthday=VALUES(birthday),citizen_id=VALUES(citizen_id),citizen_issued_date=VALUES(citizen_issued_date),address=VALUES(address),position=VALUES(position),jira_account=VALUES(jira_account),joined_date=VALUES(joined_date),scheduling_points=VALUES(scheduling_points),water_trip_count=VALUES(water_trip_count),updated_at=VALUES(updated_at),activated_at=VALUES(activated_at),activated_by=VALUES(activated_by)`,
        [
          item.id,
          item.googleId || null,
          item.name || "",
          item.email || "",
          item.code || null,
          item.avatarUrl || null,
          item.gender || null,
          item.phone || null,
          item.role || "user",
          item.typeId || null,
          item.categoryId || null,
          item.status || "disabled",
          item.password || null,
          item.birthday || null,
          item.citizenId || null,
          item.citizenIssuedDate || null,
          item.address || null,
          item.position || null,
          item.jiraAccount || null,
          item.joinedDate || null,
          Number(item.schedulingPoints || 0),
          Number(item.waterTripCount || 0),
          item.createdAt ? new Date(item.createdAt) : new Date(),
          item.updatedAt ? new Date(item.updatedAt) : new Date(),
          item.activatedAt ? new Date(item.activatedAt) : null,
          item.activatedBy || null,
        ],
      );
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function incrementWaterStats(userIds) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return true;
  if (!mysqlEnabled()) {
    const users = json.getUsers().map((user) =>
      ids.includes(user.id)
        ? {
            ...user,
            schedulingPoints: Number(user.schedulingPoints || 0) + 1,
            waterTripCount: Number(user.waterTripCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          }
        : user,
    );
    return json.saveUsers(users);
  }
  const placeholders = ids.map(() => "?").join(",");
  await query(
    `UPDATE users
     SET scheduling_points = scheduling_points + 1,
         water_trip_count = water_trip_count + 1,
         updated_at = ?
     WHERE id IN (${placeholders})`,
    [new Date(), ...ids],
  );
  return true;
}

export async function getTypes() {
  if (!mysqlEnabled()) return json.getTypes();
  const [rows] = await query("SELECT * FROM departments ORDER BY name");
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    active: Boolean(row.active),
    createdAt: toIso(row.created_at),
  }));
}
export async function saveTypes(types) {
  if (!mysqlEnabled()) return json.saveTypes(types);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    for (const item of types)
      await connection.execute(
        "INSERT INTO departments (id,name,description,active,created_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),active=VALUES(active)",
        [
          item.id,
          item.name,
          item.description || null,
          Boolean(item.active),
          item.createdAt ? new Date(item.createdAt) : new Date(),
        ],
      );
    const [existing] = await connection.query("SELECT id FROM departments");
    for (const { id } of existing.filter(
      (item) => !types.some((type) => type.id === item.id),
    ))
      await connection.execute("DELETE FROM departments WHERE id=?", [id]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
export async function getCategories() {
  if (!mysqlEnabled()) return json.getCategories();
  const [rows] = await query(
    "SELECT * FROM employment_categories ORDER BY name",
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
  }));
}
export async function saveCategories(categories) {
  if (!mysqlEnabled()) return json.saveCategories(categories);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    for (const item of categories)
      await connection.execute(
        "INSERT INTO employment_categories (id,name,active) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),active=VALUES(active)",
        [item.id, item.name, Boolean(item.active)],
      );
    const [existing] = await connection.query(
      "SELECT id FROM employment_categories",
    );
    for (const { id } of existing.filter(
      (item) => !categories.some((category) => category.id === item.id),
    ))
      await connection.execute("DELETE FROM employment_categories WHERE id=?", [
        id,
      ]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSettings() {
  if (!mysqlEnabled()) return json.getSettings();
  const [rows] = await query(
    "SELECT setting_value FROM app_settings WHERE setting_key='global'",
  );
  return rows.length
    ? asJson(rows[0].setting_value, defaultSettings)
    : defaultSettings;
}
export async function saveSettings(settings) {
  if (!mysqlEnabled()) return json.saveSettings(settings);
  await query(
    "INSERT INTO app_settings (setting_key,setting_value,updated_at) VALUES ('global',?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_at=VALUES(updated_at)",
    [JSON.stringify(settings), new Date()],
  );
  return true;
}

export async function getFunds() {
  if (!mysqlEnabled()) return applyFundBalances(json.getFunds());
  const [[periods], [payments], [transactions], [users], [metadataRows]] =
    await Promise.all([
      query("SELECT * FROM fund_periods ORDER BY year DESC, month DESC"),
      query("SELECT * FROM fund_member_payments"),
      query("SELECT * FROM fund_transactions ORDER BY occurred_at DESC"),
      query("SELECT id,name FROM users"),
      query(
        "SELECT document_key,document_value FROM app_documents WHERE document_key LIKE 'fund-meta:%'",
      ),
    ]);
  const metadata = new Map(
    metadataRows.map((row) => [
      row.document_key.slice(10),
      asJson(row.document_value, {}),
    ]),
  );
  const names = new Map(users.map((item) => [item.id, item.name]));
  return applyFundBalances(
    periods.map((fund) => ({
      id: fund.id,
      contributionSnapshot: metadata.get(fund.id)?.contributionSnapshot,
      year: Number(fund.year),
      month: Number(fund.month),
      openingBalance: Number(fund.opening_balance || 0),
      paymentDeadline: toDateOnly(fund.payment_deadline) || null,
      reminderDaysBefore: asJson(fund.reminder_days_before, []),
      emailReminderEnabled: Boolean(fund.email_reminder_enabled),
      updatedAt: toIso(fund.updated_at),
      members: payments
        .filter((item) => item.fund_period_id === fund.id)
        .map((item) => ({
          userId: item.user_id,
          ...(metadata.get(fund.id)?.members?.[item.user_id] || {}),
          paid: Boolean(item.paid),
          amount: Number(item.amount || 0),
          paidAt: toIso(item.paid_at),
          paymentStatus: item.payment_status || undefined,
          orderCode: item.order_code ? Number(item.order_code) : undefined,
          paymentLinkId: item.payment_link_id || undefined,
          checkoutUrl: item.checkout_url || undefined,
          paymentReference: item.payment_reference || undefined,
          approvedBy: item.approved_by || undefined,
          paymentChannelId: metadata.get(fund.id)?.members?.[item.user_id]
            ?.paymentChannelId,
          updatedAt: toIso(item.updated_at),
        })),
      incomes: transactions
        .filter(
          (item) => item.fund_period_id === fund.id && item.kind === "income",
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          amount: Number(item.amount),
          note: item.note || "",
          userId: item.user_id || "",
          userName: names.get(item.user_id) || "",
          receivedAt: toIso(item.occurred_at),
          createdBy: item.created_by || "",
          createdAt: toIso(item.created_at),
          updatedAt: toIso(item.updated_at),
        })),
      expenses: transactions
        .filter(
          (item) => item.fund_period_id === fund.id && item.kind === "expense",
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          amount: Number(item.amount),
          note: item.note || "",
          userId: item.user_id || "",
          userName: names.get(item.user_id) || "",
          spentAt: toIso(item.occurred_at),
          createdBy: item.created_by || "",
          createdAt: toIso(item.created_at),
          updatedAt: toIso(item.updated_at),
        })),
    })),
  );
}
export async function saveFunds(funds) {
  applyFundBalances(funds);
  if (!mysqlEnabled()) return json.saveFunds(funds);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    for (const fund of funds) {
      const memberMetadata = Object.fromEntries(
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
            paymentChannelId: item.paymentChannelId,
          },
        ]),
      );
      await connection.execute(
        "INSERT INTO app_documents (document_key,document_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE document_value=VALUES(document_value),updated_at=VALUES(updated_at)",
        [
          `fund-meta:${fund.id}`,
          JSON.stringify({
            contributionSnapshot: fund.contributionSnapshot,
            members: memberMetadata,
          }),
          new Date(),
        ],
      );
      await connection.execute(
        "INSERT INTO fund_periods (id,year,month,opening_balance,payment_deadline,reminder_days_before,email_reminder_enabled,updated_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE opening_balance=VALUES(opening_balance),payment_deadline=VALUES(payment_deadline),reminder_days_before=VALUES(reminder_days_before),email_reminder_enabled=VALUES(email_reminder_enabled),updated_at=VALUES(updated_at)",
        [
          fund.id,
          fund.year,
          fund.month,
          Number(fund.openingBalance || 0),
          fund.paymentDeadline || null,
          JSON.stringify(fund.reminderDaysBefore || []),
          Boolean(fund.emailReminderEnabled),
          fund.updatedAt ? new Date(fund.updatedAt) : new Date(),
        ],
      );
      await connection.execute(
        "DELETE FROM fund_member_payments WHERE fund_period_id=?",
        [fund.id],
      );
      await connection.execute(
        "DELETE FROM fund_transactions WHERE fund_period_id=?",
        [fund.id],
      );
      for (const item of fund.members || [])
        await connection.execute(
          "INSERT INTO fund_member_payments (fund_period_id,user_id,paid,amount,paid_at,payment_status,order_code,payment_link_id,checkout_url,payment_reference,approved_by,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            fund.id,
            item.userId,
            Boolean(item.paid),
            Number(item.amount || 0),
            item.paidAt ? new Date(item.paidAt) : null,
            item.paymentStatus || null,
            item.orderCode || null,
            item.paymentLinkId || null,
            item.checkoutUrl || null,
            item.paymentReference || null,
            item.approvedBy || null,
            item.updatedAt ? new Date(item.updatedAt) : new Date(),
          ],
        );
      for (const [kind, records] of [
        ["income", fund.incomes || []],
        ["expense", fund.expenses || []],
      ])
        for (const item of records)
          await connection.execute(
            "INSERT INTO fund_transactions (id,fund_period_id,kind,title,category,amount,note,user_id,occurred_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [
              item.id,
              fund.id,
              kind,
              item.title || "Giao dịch quỹ",
              item.category || "other",
              Number(item.amount || 0),
              item.note || null,
              item.userId || null,
              toMysqlDateTime(
                item.receivedAt || item.spentAt || item.createdAt,
                new Date(),
              ),
              item.createdBy || null,
              item.createdAt ? new Date(item.createdAt) : new Date(),
              item.updatedAt ? new Date(item.updatedAt) : null,
            ],
          );
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAssets() {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const categoryIdFor = (name) =>
      `asset_category_${crypto
        .createHash("sha256")
        .update(String(name).trim().toLocaleLowerCase("vi"))
        .digest("hex")
        .slice(0, 20)}`;
    const categoriesByName = new Map();
    for (const item of data.categories || []) {
      const name = String(item.name || "").trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase("vi");
      if (!categoriesByName.has(key))
        categoriesByName.set(key, {
          ...item,
          id: categoryIdFor(name),
          name,
        });
    }
    const categories = [...categoriesByName.values()];
    const products = (data.products || []).map((item) => ({
      ...item,
      categoryId: item.categoryId || "",
    }));
    const unitNames = new Set(
      [...(data.units || []).map((item) => item.name), "Cái", "Chiếc"]
        .map((name) => String(name || "").trim())
        .filter(Boolean),
    );
    products.forEach((item) => {
      const name = String(item.unit || "").trim();
      if (name) unitNames.add(name);
    });
    const existingUnits = new Map(
      (data.units || []).map((item) => [String(item.name).toLocaleLowerCase("vi"), item]),
    );
    const units = [...unitNames].map((name) =>
      existingUnits.get(name.toLocaleLowerCase("vi")) || {
        id: `asset_unit_${crypto.createHash("sha256").update(name.toLocaleLowerCase("vi")).digest("hex").slice(0, 20)}`,
        name,
        createdAt: new Date().toISOString(),
      },
    );
    const productsByCode = new Map(products.map((item) => [item.code, item]));
    const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
    const normalizeTransaction = (item) => {
      const product = productsByCode.get(item.code);
      if (!product) return { ...item, unit: item.unit || "" };
      return {
        ...item,
        category: categoryNames.get(product.categoryId) || "",
        unit: product.unit || item.unit || "",
      };
    };
    const imports = (data.imports || []).map(normalizeTransaction);
    const exports = (data.exports || []).map(normalizeTransaction);
    const normalized = {
      ...data,
      imports,
      exports,
      categories,
      products,
      units,
    };
    if (
      JSON.stringify(data.categories || []) !== JSON.stringify(categories) ||
      JSON.stringify(data.products || []) !== JSON.stringify(products) ||
      JSON.stringify(data.units || []) !== JSON.stringify(units) ||
      JSON.stringify(data.imports || []) !== JSON.stringify(imports) ||
      JSON.stringify(data.exports || []) !== JSON.stringify(exports)
    )
      await json.saveAssets(normalized);
    return normalized;
  }
  await query(`
    INSERT IGNORE INTO asset_product_categories (id, name, created_at)
    SELECT CONCAT('asset_category_', LEFT(MD5(category_name), 16)),
           category_name, NOW(3)
    FROM (
      SELECT TRIM(category_name_snapshot) AS category_name
      FROM asset_transactions
      WHERE category_name_snapshot IS NOT NULL AND TRIM(category_name_snapshot) <> ''
      GROUP BY TRIM(category_name_snapshot)
    ) legacy_categories
  `);
  await query(`
    UPDATE asset_products product
    JOIN (
      SELECT product_code_snapshot, MAX(TRIM(category_name_snapshot)) AS category_name
      FROM asset_transactions
      WHERE category_name_snapshot IS NOT NULL AND TRIM(category_name_snapshot) <> ''
      GROUP BY product_code_snapshot
    ) legacy ON legacy.product_code_snapshot = product.code
    JOIN asset_product_categories category ON category.name = legacy.category_name
    SET product.category_id = category.id
    WHERE product.category_id IS NULL OR product.category_id = ''
  `);
  const [[rows], [productRows], [categoryRows], [unitRows]] = await Promise.all([
    query("SELECT * FROM asset_transactions ORDER BY created_at DESC, id DESC"),
    query("SELECT * FROM asset_products ORDER BY name"),
    query("SELECT * FROM asset_product_categories ORDER BY name"),
    query("SELECT * FROM asset_product_units ORDER BY name"),
  ]);
  const map = (row) => ({
    id: row.id,
    code: row.product_code_snapshot,
    name: row.product_name_snapshot,
    category: row.category_name_snapshot || "",
    unit: row.unit_name_snapshot || "",
    description: row.product_description_snapshot || "",
    date: toDateOnly(row.transaction_date),
    quantity: row.quantity === null ? null : Number(row.quantity),
    location: row.location_snapshot || "",
    person: row.document_person_name || "",
    issuedTo: row.recipient_name || "",
    note: row.note || "",
    documentCode: row.document_code || "",
    performedBy: row.performed_by_user_id || "",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });
  return {
    imports: rows.filter((row) => row.transaction_type === "import").map(map),
    exports: rows.filter((row) => row.transaction_type === "export").map(map),
    products: productRows.map((row) => ({
      id: row.id,
      code: row.code || "",
      name: row.name,
      categoryId: row.category_id || "",
      unit: row.unit,
      description: row.description || "",
      location: row.location || "",
      active: Boolean(row.active),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    })),
    categories: categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    })),
    units: unitRows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    })),
  };
}

export async function saveAssetProduct(product) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const products = Array.isArray(data.products) ? data.products : [];
    const index = products.findIndex((item) => item.id === product.id);
    if (index >= 0) products[index] = product;
    else products.push(product);
    return json.saveAssets({ ...data, products });
  }
  await query(
    "INSERT INTO asset_products (id,code,name,category_id,unit,description,location,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE code=VALUES(code),name=VALUES(name),category_id=VALUES(category_id),unit=VALUES(unit),description=VALUES(description),location=VALUES(location),active=VALUES(active),updated_at=VALUES(updated_at)",
    [
      product.id,
      product.code || null,
      product.name,
      product.categoryId || null,
      product.unit,
      product.description || null,
      product.location || null,
      Boolean(product.active),
      product.createdAt ? new Date(product.createdAt) : new Date(),
      new Date(),
    ],
  );
  return true;
}

export async function saveAssetCategory(category) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const index = categories.findIndex((item) => item.id === category.id);
    if (index >= 0) categories[index] = category;
    else categories.push(category);
    return json.saveAssets({ ...data, categories });
  }
  await query(
    "INSERT INTO asset_product_categories (id,name,created_at,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),updated_at=VALUES(updated_at)",
    [
      category.id,
      category.name,
      category.createdAt ? new Date(category.createdAt) : new Date(),
      new Date(),
    ],
  );
  return true;
}

export async function deleteAssetCategory(id) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    return json.saveAssets({
      ...data,
      categories: (data.categories || []).filter((item) => item.id !== id),
    });
  }
  await query("DELETE FROM asset_product_categories WHERE id=?", [id]);
  return true;
}

export async function saveAssetUnit(unit, previousName = "") {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const units = Array.isArray(data.units) ? data.units : [];
    const index = units.findIndex((item) => item.id === unit.id);
    if (index >= 0) units[index] = unit;
    else units.push(unit);
    const products = (data.products || []).map((product) =>
      previousName && product.unit === previousName
        ? { ...product, unit: unit.name }
        : product,
    );
    return json.saveAssets({ ...data, units, products });
  }
  const db = getMysqlPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (previousName && previousName !== unit.name)
      await connection.execute("UPDATE asset_products SET unit=? WHERE unit=?", [
        unit.name,
        previousName,
      ]);
    await connection.execute(
      "INSERT INTO asset_product_units (id,name,created_at,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),updated_at=VALUES(updated_at)",
      [unit.id, unit.name, unit.createdAt ? new Date(unit.createdAt) : new Date(), new Date()],
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteAssetUnit(id) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    return json.saveAssets({
      ...data,
      units: (data.units || []).filter((item) => item.id !== id),
    });
  }
  await query("DELETE FROM asset_product_units WHERE id=?", [id]);
  return true;
}

const assetTransactionValues = (item, type) => [
  item.id,
  item.documentCode || null,
  type,
  item.code,
  item.name,
  item.category || null,
  item.description || null,
  item.date,
  item.quantity === null || item.quantity === "" ? null : Number(item.quantity),
  item.unit || null,
  item.location || null,
  item.person || null,
  item.issuedTo || null,
  item.performedBy || null,
  item.note || null,
  item.createdAt ? new Date(item.createdAt) : new Date(),
  item.updatedAt ? new Date(item.updatedAt) : null,
];

export async function createAssetTransaction(type, item) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const key = type === "export" ? "exports" : "imports";
    await json.saveAssets({ ...data, [key]: [item, ...(data[key] || [])] });
    return true;
  }
  await query(
    "INSERT INTO asset_transactions (id,document_code,transaction_type,product_code_snapshot,product_name_snapshot,category_name_snapshot,product_description_snapshot,transaction_date,quantity,unit_name_snapshot,location_snapshot,document_person_name,recipient_name,performed_by_user_id,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    assetTransactionValues(item, type),
  );
  return true;
}

export async function updateAssetTransaction(type, item) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const key = type === "export" ? "exports" : "imports";
    await json.saveAssets({
      ...data,
      [key]: (data[key] || []).map((row) => (row.id === item.id ? item : row)),
    });
    return true;
  }
  await query(
    "UPDATE asset_transactions SET document_code=?,product_code_snapshot=?,product_name_snapshot=?,category_name_snapshot=?,product_description_snapshot=?,transaction_date=?,quantity=?,unit_name_snapshot=?,location_snapshot=?,document_person_name=?,recipient_name=?,performed_by_user_id=?,note=?,updated_at=? WHERE id=? AND transaction_type=?",
    [
      item.documentCode || null,
      item.code,
      item.name,
      item.category || null,
      item.description || null,
      item.date,
      item.quantity === null || item.quantity === ""
        ? null
        : Number(item.quantity),
      item.unit || null,
      item.location || null,
      item.person || null,
      item.issuedTo || null,
      item.performedBy || null,
      item.note || null,
      new Date(),
      item.id,
      type,
    ],
  );
  return true;
}

export async function deleteAssetTransaction(type, id) {
  if (!mysqlEnabled()) {
    const data = await json.getAssets();
    const key = type === "export" ? "exports" : "imports";
    await json.saveAssets({
      ...data,
      [key]: (data[key] || []).filter((row) => row.id !== id),
    });
    return true;
  }
  await query("DELETE FROM asset_transactions WHERE id=? AND transaction_type=?", [
    id,
    type,
  ]);
  return true;
}
export async function saveAssets(data) {
  if (!mysqlEnabled()) return json.saveAssets(data);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM asset_transactions");
    for (const [type, records] of [
      ["import", data.imports || []],
      ["export", data.exports || []],
    ])
      for (const item of records)
        await connection.execute(
          "INSERT INTO asset_transactions (id,document_code,transaction_type,product_code_snapshot,product_name_snapshot,category_name_snapshot,product_description_snapshot,transaction_date,quantity,unit_name_snapshot,location_snapshot,document_person_name,recipient_name,performed_by_user_id,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            item.id,
            item.documentCode || null,
            type,
            item.code,
            item.name,
            item.category || null,
            item.description || null,
            item.date,
            item.quantity === null || item.quantity === ""
              ? null
              : Number(item.quantity),
            item.unit || null,
            item.location || null,
            item.person || null,
            item.issuedTo || null,
            item.performedBy || null,
            item.note || null,
            item.createdAt ? new Date(item.createdAt) : new Date(),
            item.updatedAt ? new Date(item.updatedAt) : null,
          ],
        );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getWaterSchedules() {
  if (!mysqlEnabled()) return json.getWaterSchedules();
  const [[schedules], [participants], [users]] = await Promise.all([
    query(
      "SELECT * FROM water_schedules ORDER BY year DESC,month DESC,week_index",
    ),
    query("SELECT * FROM water_schedule_participants"),
    query("SELECT id,name,code FROM users"),
  ]);
  const people = new Map(users.map((item) => [item.id, item]));
  return schedules.map((item) => ({
    ...asJson(item.metadata, {}),
    id: item.id,
    year: Number(item.year),
    month: Number(item.month),
    weekIndex: Number(item.week_index),
    date: toDateOnly(item.schedule_date).split("-").reverse().join("/"),
    time: item.schedule_time || "",
    requiredPeople: Number(item.required_people),
    status: item.status || "",
    note: item.note || "",
    createdAt: toIso(item.created_at),
    updatedAt: toIso(item.updated_at),
    participants: participants
      .filter((row) => row.schedule_id === item.id)
      .map((row) => ({
        userId: row.user_id,
        name: people.get(row.user_id)?.name || "",
        code: people.get(row.user_id)?.code || "",
        completed: Boolean(row.completed),
      })),
  }));
}
export async function saveWaterSchedules(schedules) {
  if (!mysqlEnabled()) return json.saveWaterSchedules(schedules);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM water_schedule_participants");
    await connection.execute("DELETE FROM water_schedules");
    for (const item of schedules) {
      const metadata = { ...item };
      delete metadata.participants;
      [
        "id",
        "year",
        "month",
        "weekIndex",
        "date",
        "time",
        "requiredPeople",
        "status",
        "note",
        "createdAt",
        "updatedAt",
      ].forEach((key) => delete metadata[key]);
      await connection.execute(
        "INSERT INTO water_schedules (id,year,month,week_index,schedule_date,schedule_time,required_people,status,note,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          item.id,
          item.year,
          item.month,
          item.weekIndex || 0,
          item.date ? item.date.split("/").reverse().join("-") : null,
          item.time || null,
          Number(item.requiredPeople || 0),
          item.status || "pending",
          item.note || null,
          JSON.stringify(metadata),
          item.createdAt ? new Date(item.createdAt) : new Date(),
          item.updatedAt ? new Date(item.updatedAt) : null,
        ],
      );
      for (const person of item.participants || [])
        if (person.userId)
          await connection.execute(
            "INSERT INTO water_schedule_participants (schedule_id,user_id,completed) VALUES (?,?,?)",
            [item.id, person.userId, Boolean(person.completed)],
          );
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
export async function getWaterExemptions() {
  if (!mysqlEnabled()) return json.getWaterExemptions();
  const [rows] = await query("SELECT user_id FROM water_exemptions");
  return rows.map((row) => row.user_id);
}
export async function saveWaterExemptions(ids) {
  if (!mysqlEnabled()) return json.saveWaterExemptions(ids);
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM water_exemptions");
    for (const id of ids)
      await connection.execute(
        "INSERT INTO water_exemptions (user_id) VALUES (?)",
        [id],
      );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAfternoonTea() {
  return mysqlEnabled()
    ? getDocument("afternoon-tea", { menuImageUrl: "", invitations: [] })
    : json.getAfternoonTea();
}
export async function saveAfternoonTea(data) {
  return mysqlEnabled()
    ? saveDocument("afternoon-tea", data)
    : json.saveAfternoonTea(data);
}

export async function getAuditLogs() {
  if (!mysqlEnabled()) return json.getAuditLogs();
  const [rows] = await query(
    "SELECT * FROM audit_logs WHERE timestamp >= DATE_SUB(DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 HOUR), INTERVAL 30 DAY) ORDER BY timestamp DESC",
  );
  return rows.map((item) => ({
    id: item.id,
    adminId: item.admin_id || "",
    action: item.action,
    targetType: item.target_type || "",
    targetId: item.target_id || "",
    details: item.details || "",
    ip: item.ip || "",
    timestamp: toIso(item.timestamp),
  }));
}
export async function appendAuditLog({
  adminId,
  adminName,
  adminEmail,
  action,
  targetType,
  targetId,
  details,
  ip = "127.0.0.1",
}) {
  if (!mysqlEnabled())
    return json.appendAuditLog({
      adminId,
      adminName,
      adminEmail,
      action,
      targetType,
      targetId,
      details,
      ip,
    });
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
  await query(
    "INSERT INTO audit_logs (id,admin_id,action,target_type,target_id,details,ip,timestamp) VALUES (?,?,?,?,?,?,?,?)",
    [
      log.id,
      adminId || null,
      action,
      targetType || null,
      targetId || null,
      details || null,
      ip,
      new Date(log.timestamp),
    ],
  );
  return log;
}
