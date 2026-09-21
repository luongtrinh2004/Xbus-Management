import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getMysqlPool, isMysqlEnabled } from "@/libs/mysql";
import { appendAuditLog } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const identifierPattern = /^[A-Za-z0-9_]+$/;
const quoteIdentifier = (value) => `\`${value}\``;
const isAdmin = (token) => token?.role === "admin";
const tableDescriptions = {
  app_documents: "Dữ liệu tài liệu và cấu hình dạng JSON của ứng dụng",
  app_settings: "Các thiết lập hệ thống dùng chung",
  asset_product_categories: "Danh mục loại sản phẩm tài sản",
  asset_product_units: "Danh mục đơn vị tính của sản phẩm",
  asset_products: "Danh sách sản phẩm và thông tin master data",
  asset_transactions: "Lịch sử nhập kho, xuất kho và biến động tồn",
  audit_logs: "Nhật ký thao tác và thay đổi trong hệ thống",
  departments: "Danh mục bộ phận/phòng ban",
  employment_categories: "Danh mục hình thức và loại nhân sự",
  fund_member_payments: "Tình trạng và giao dịch đóng quỹ của từng thành viên",
  fund_periods: "Các kỳ đóng quỹ theo tháng",
  fund_reminder_logs: "Lịch sử gửi thông báo nhắc đóng quỹ",
  fund_transactions: "Các khoản thu và chi của quỹ phòng",
  schema_migrations: "Danh sách migration database đã được áp dụng",
  users: "Tài khoản, hồ sơ, quyền và trạng thái nhân sự",
  water_exemptions: "Danh sách nhân sự được miễn bê nước",
  water_schedule_participants: "Danh sách người tham gia từng lịch bê nước",
  water_schedules: "Lịch bê nước theo ngày, tuần và tháng",
};

const serializeValue = (value) => {
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") return JSON.stringify(value);
  return value;
};

const getSchema = async () => {
  const pool = getMysqlPool();
  const [[row]] = await pool.query("SELECT DATABASE() AS databaseName");
  return row?.databaseName;
};

const getTableMetadata = async (table) => {
  if (!identifierPattern.test(table)) throw new Error("Tên bảng không hợp lệ");
  const pool = getMysqlPool();
  const schema = await getSchema();
  const [tableRows] = await pool.query(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND TABLE_TYPE='BASE TABLE'`,
    [schema, table],
  );
  if (!tableRows.length) throw new Error("Bảng không tồn tại trong database ứng dụng");
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, COLUMN_TYPE AS columnType,
            IS_NULLABLE AS isNullable, COLUMN_DEFAULT AS defaultValue,
            COLUMN_KEY AS columnKey, EXTRA AS extra
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
     ORDER BY ORDINAL_POSITION`,
    [schema, table],
  );
  return columns;
};

const normalizeWriteValue = (value, column) => {
  if (value === null || value === undefined) return null;
  if (value === "" && column.isNullable === "YES") return null;
  if (column.dataType === "bigint") {
    if (value === "") return column.defaultValue ?? 0;
    if (!/^-?\d+$/.test(String(value))) throw new Error(`${column.name} phải là số nguyên`);
    return String(value);
  }
  if (["tinyint", "smallint", "mediumint", "int", "decimal", "float", "double"].includes(column.dataType)) {
    if (value === "") return column.defaultValue ?? 0;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`${column.name} phải là số`);
    return numeric;
  }
  if (column.dataType === "json" && typeof value !== "string")
    return JSON.stringify(value);
  return value;
};

const adminToken = async (req) => {
  const token = await getToken({ req, secret });
  if (!isAdmin(token)) return null;
  if (!isMysqlEnabled()) throw new Error("Database Editor chỉ hỗ trợ DATA_SOURCE=mysql");
  return token;
};

export async function GET(req) {
  try {
    const token = await adminToken(req);
    if (!token)
      return NextResponse.json({ error: "Chỉ admin được truy cập" }, { status: 403 });
    const pool = getMysqlPool();
    const schema = await getSchema();
    const table = req.nextUrl.searchParams.get("table");
    if (!table) {
      const [tables] = await pool.query(
        `SELECT TABLE_NAME AS name
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'
         ORDER BY TABLE_NAME`,
        [schema],
      );
      const result = await Promise.all(
        tables.map(async ({ name }) => {
          const [[countRow]] = await pool.query(
            `SELECT COUNT(*) AS total FROM ${quoteIdentifier(name)}`,
          );
          return {
            name,
            total: Number(countRow.total || 0),
            description:
              tableDescriptions[name] || "Bảng dữ liệu nghiệp vụ của hệ thống",
          };
        }),
      );
      return NextResponse.json({ database: schema, tables: result });
    }
    const columns = await getTableMetadata(table);
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get("limit")) || 25));
    const search = String(req.nextUrl.searchParams.get("search") || "").trim();
    const searchableColumns = columns.filter(
      (column) => !["blob", "binary", "varbinary"].includes(column.dataType),
    );
    const where = search && searchableColumns.length
      ? ` WHERE CONCAT_WS(' ', ${searchableColumns.map((column) => `CAST(${quoteIdentifier(column.name)} AS CHAR)`).join(", ")}) LIKE ?`
      : "";
    const params = where ? [`%${search}%`] : [];
    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}${where}`,
      params,
    );
    const primaryKeys = columns.filter((column) => column.columnKey === "PRI");
    const order = primaryKeys.length
      ? ` ORDER BY ${primaryKeys.map((column) => `${quoteIdentifier(column.name)} DESC`).join(", ")}`
      : "";
    const [rows] = await pool.query(
      `SELECT * FROM ${quoteIdentifier(table)}${where}${order} LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit],
    );
    return NextResponse.json({
      database: schema,
      table,
      columns,
      rows: rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [key, serializeValue(value)])),
      ),
      pagination: { page, limit, total: Number(countRow.total || 0) },
      editable: primaryKeys.length > 0,
    });
  } catch (error) {
    console.error("[Database Editor GET]", error);
    return NextResponse.json({ error: error.message || "Không thể đọc database" }, { status: 400 });
  }
}

export async function POST(req) {
  try {
    const token = await adminToken(req);
    if (!token)
      return NextResponse.json({ error: "Chỉ admin được truy cập" }, { status: 403 });
    const { table, values = {} } = await req.json();
    const columns = await getTableMetadata(table);
    const writable = columns.filter(
      (column) => column.extra !== "auto_increment" && Object.hasOwn(values, column.name),
    );
    if (!writable.length) throw new Error("Không có dữ liệu hợp lệ để thêm");
    const params = writable.map((column) => normalizeWriteValue(values[column.name], column));
    await getMysqlPool().query(
      `INSERT INTO ${quoteIdentifier(table)} (${writable.map((column) => quoteIdentifier(column.name)).join(", ")}) VALUES (${writable.map(() => "?").join(", ")})`,
      params,
    );
    if (table !== "audit_logs")
      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Admin",
        adminEmail: token.email || "",
        action: "DATABASE_INSERT",
        targetType: table,
        details: `Thêm dòng trực tiếp vào bảng ${table}`,
      });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Database Editor POST]", error);
    return NextResponse.json({ error: error.message || "Không thể thêm dữ liệu" }, { status: 400 });
  }
}

export async function PATCH(req) {
  try {
    const token = await adminToken(req);
    if (!token)
      return NextResponse.json({ error: "Chỉ admin được truy cập" }, { status: 403 });
    const { table, key = {}, values = {} } = await req.json();
    const columns = await getTableMetadata(table);
    const primaryKeys = columns.filter((column) => column.columnKey === "PRI");
    if (!primaryKeys.length || primaryKeys.some((column) => !Object.hasOwn(key, column.name)))
      throw new Error("Bảng hoặc dòng không có khóa chính hợp lệ");
    const writable = columns.filter(
      (column) => column.columnKey !== "PRI" && Object.hasOwn(values, column.name),
    );
    if (!writable.length) throw new Error("Không có trường nào để cập nhật");
    const setValues = writable.map((column) => normalizeWriteValue(values[column.name], column));
    const keyValues = primaryKeys.map((column) => key[column.name]);
    const [result] = await getMysqlPool().query(
      `UPDATE ${quoteIdentifier(table)} SET ${writable.map((column) => `${quoteIdentifier(column.name)}=?`).join(", ")} WHERE ${primaryKeys.map((column) => `${quoteIdentifier(column.name)}=?`).join(" AND ")} LIMIT 1`,
      [...setValues, ...keyValues],
    );
    if (!result.affectedRows) throw new Error("Không tìm thấy dòng cần cập nhật");
    if (table !== "audit_logs")
      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Admin",
        adminEmail: token.email || "",
        action: "DATABASE_UPDATE",
        targetType: table,
        details: `Sửa trực tiếp dòng ${JSON.stringify(key)} trong bảng ${table}`,
      });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Database Editor PATCH]", error);
    return NextResponse.json({ error: error.message || "Không thể cập nhật dữ liệu" }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    const token = await adminToken(req);
    if (!token)
      return NextResponse.json({ error: "Chỉ admin được truy cập" }, { status: 403 });
    const { table, key = {}, clearAll = false } = await req.json();
    const columns = await getTableMetadata(table);
    if (clearAll) {
      const [result] = await getMysqlPool().query(
        `DELETE FROM ${quoteIdentifier(table)}`,
      );
      if (table !== "audit_logs")
        await appendAuditLog({
          adminId: token.id,
          adminName: token.name || "Admin",
          adminEmail: token.email || "",
          action: "DATABASE_CLEAR_TABLE",
          targetType: table,
          details: `Xóa toàn bộ ${Number(result.affectedRows || 0)} dòng khỏi bảng ${table}`,
        });
      return NextResponse.json({
        success: true,
        deleted: Number(result.affectedRows || 0),
      });
    }
    const primaryKeys = columns.filter((column) => column.columnKey === "PRI");
    if (!primaryKeys.length || primaryKeys.some((column) => !Object.hasOwn(key, column.name)))
      throw new Error("Bảng hoặc dòng không có khóa chính hợp lệ");
    const [result] = await getMysqlPool().query(
      `DELETE FROM ${quoteIdentifier(table)} WHERE ${primaryKeys.map((column) => `${quoteIdentifier(column.name)}=?`).join(" AND ")} LIMIT 1`,
      primaryKeys.map((column) => key[column.name]),
    );
    if (!result.affectedRows) throw new Error("Không tìm thấy dòng cần xóa");
    if (table !== "audit_logs")
      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Admin",
        adminEmail: token.email || "",
        action: "DATABASE_DELETE",
        targetType: table,
        details: `Xóa trực tiếp dòng ${JSON.stringify(key)} khỏi bảng ${table}`,
      });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Database Editor DELETE]", error);
    return NextResponse.json({ error: error.message || "Không thể xóa dữ liệu" }, { status: 400 });
  }
}
