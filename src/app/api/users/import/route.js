import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getCategories,
  getTypes,
  getUsers,
  saveUsers,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const codeOf = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();
const textOf = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("vi");
const enumValue = (value, labels) => labels[textOf(value)] ?? value;
const normalizeProfileDate = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const vietnamese = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vietnamese)
    return `${vietnamese[3]}-${vietnamese[2].padStart(2, "0")}-${vietnamese[1].padStart(2, "0")}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : text;
};

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (token?.role !== "admin")
    return NextResponse.json(
      { error: "Chỉ quản trị viên có quyền import nhân sự" },
      { status: 403 },
    );
  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows))
      return NextResponse.json(
        { error: "Dữ liệu import không hợp lệ" },
        { status: 400 },
      );
    const [users, types, categories] = await Promise.all([
      getUsers(),
      getTypes(),
      getCategories(),
    ]);
    const byCode = new Map(users.map((user) => [codeOf(user.code), user]));
    const typeIds = new Map(
      types.flatMap((item) => [
        [textOf(item.id), item.id],
        [textOf(item.name), item.id],
      ]),
    );
    const categoryIds = new Map(
      categories.flatMap((item) => [
        [textOf(item.id), item.id],
        [textOf(item.name), item.id],
      ]),
    );
    let updated = 0;
    for (const row of rows) {
      const code = codeOf(row.code);
      const user = byCode.get(code);
      if (!code || !user) continue;
      const fields = [
        "name",
        "email",
        "phone",
        "gender",
        "birthday",
        "citizenId",
        "citizenIssuedDate",
        "address",
        "position",
        "jiraAccount",
        "joinedDate",
        "typeId",
        "categoryId",
        "role",
        "status",
        "schedulingPoints",
        "waterTripCount",
      ];
      fields.forEach((field) => {
        if (!Object.hasOwn(row, field)) return;
        let value = row[field];
        if (field === "gender")
          value = enumValue(value, {
            nam: "male",
            nữ: "female",
            khác: "other",
            "chưa xác định": "unspecified",
          });
        if (field === "role")
          value = enumValue(value, {
            "quản trị viên": "admin",
            "trợ lý": "assistant",
            "nhân viên": "user",
          });
        if (field === "status")
          value = enumValue(value, {
            "đang hoạt động": "able",
            "chờ kích hoạt / vô hiệu hóa": "disabled",
            "ngừng hoạt động": "disabled",
          });
        if (field === "typeId") value = typeIds.get(textOf(value)) ?? value;
        if (field === "categoryId")
          value = categoryIds.get(textOf(value)) ?? value;
        if (["schedulingPoints", "waterTripCount"].includes(field))
          value = Number(value || 0);
        if (["birthday", "citizenIssuedDate", "joinedDate"].includes(field))
          value = normalizeProfileDate(value);
        user[field] = value;
      });
      user.updatedAt = new Date().toISOString();
      updated += 1;
    }
    await saveUsers(users);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Admin",
      adminEmail: token.email || "",
      action: "IMPORT_USERS",
      targetType: "USER",
      details: `Import nhân sự: cập nhật ${updated}/${rows.length} dòng khớp mã nhân sự`,
    });
    return NextResponse.json({ updated, skipped: rows.length - updated });
  } catch (error) {
    console.error("[API User Import]", error);
    return NextResponse.json(
      { error: "Không thể import nhân sự" },
      { status: 500 },
    );
  }
}
