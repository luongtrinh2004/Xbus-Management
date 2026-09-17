import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { appendAuditLog, getUsers, saveUsers } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const codeOf = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

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
    const users = await getUsers();
    const byCode = new Map(users.map((user) => [codeOf(user.code), user]));
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
        "status",
      ];
      fields.forEach((field) => {
        if (Object.hasOwn(row, field)) user[field] = row[field];
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
