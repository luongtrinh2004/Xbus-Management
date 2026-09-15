import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers, appendAuditLog } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token)
      return NextResponse.json({ error: "Chua xac thuc" }, { status: 401 });
    const users = await getUsers();
    const user = users.find((u) => u.id === token.id);
    if (!user)
      return NextResponse.json(
        { error: "Khong tim thay tai khoan" },
        { status: 404 },
      );
    const { password, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("[API Profile] GET:", error);
    return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token)
      return NextResponse.json({ error: "Chua xac thuc" }, { status: 401 });
    const body = await req.json();
    const users = await getUsers();
    const index = users.findIndex((u) => u.id === token.id);
    if (index === -1)
      return NextResponse.json(
        { error: "Khong tim thay tai khoan" },
        { status: 404 },
      );
    const oldUser = users[index];
    const allowedFields = ["name", "phone", "gender", "birthday"];
    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field))
        updates[field] = body[field];
    }
    const updatedUser = {
      ...oldUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    users[index] = updatedUser;
    await saveUsers(users);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || oldUser.name,
      adminEmail: token.email || oldUser.email,
      action: "UPDATE_PROFILE",
      targetType: "USER",
      targetId: token.id,
      details: `${updatedUser.name} cap nhat thong tin ca nhan: ${Object.keys(
        updates,
      )
        .filter((k) => k !== "password")
        .join(", ")}`,
    });
    const { password, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("[API Profile] PATCH:", error);
    return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
  }
}
