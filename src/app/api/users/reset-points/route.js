import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers, appendAuditLog } from "@/libs/dataRepository";

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "admin")
    return NextResponse.json(
      { error: "Chỉ quản trị viên có quyền reset điểm" },
      { status: 403 },
    );
  try {
    const users = await getUsers();
    const affected = users.filter(
      (user) => Number(user.schedulingPoints || 0) !== 0,
    );
    const updatedAt = new Date().toISOString();
    if (affected.length) {
      await saveUsers(
        users.map((user) =>
          Number(user.schedulingPoints || 0) !== 0
            ? { ...user, schedulingPoints: 0, updatedAt }
            : user,
        ),
      );
      await appendAuditLog({
        adminId: token.id,
        adminName: token.name || "Admin",
        adminEmail: token.email || "",
        action: "RESET_SCHEDULING_POINTS",
        targetType: "USER",
        targetId: "all",
        details: `Đặt lại điểm rèn luyện về 0 cho ${affected.length} nhân sự. Chi tiết: ${affected.map((user) => `${user.name || user.id}${user.code ? ` (${user.code})` : ""}: ${Number(user.schedulingPoints)} → 0 điểm`).join("; ")}.`,
      });
    }
    return NextResponse.json({ success: true, count: affected.length });
  } catch (error) {
    console.error("[Reset points]", error);
    return NextResponse.json(
      { error: "Không thể reset điểm rèn luyện" },
      { status: 500 },
    );
  }
}
