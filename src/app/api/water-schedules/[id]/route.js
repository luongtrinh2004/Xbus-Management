import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getWaterSchedules,
  saveWaterSchedules,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!["admin", "assistant"].includes(token?.role)) {
      return NextResponse.json(
        { error: "Không có quyền xóa lịch" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const schedules = await getWaterSchedules();
    const schedule = schedules.find((item) => item.id === id);
    if (!schedule) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch" },
        { status: 404 },
      );
    }
    if (schedule.status === "completed") {
      return NextResponse.json(
        { error: "Không thể xóa lịch đã hoàn thành" },
        { status: 409 },
      );
    }

    await saveWaterSchedules(schedules.filter((item) => item.id !== id));
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: "DELETE_SCHEDULE",
      targetType: "water_schedules",
      targetId: id,
      details: `Xóa lịch bê nước ngày ${schedule.date}`,
    });

    return NextResponse.json({ message: `Đã xóa lịch ngày ${schedule.date}` });
  } catch (error) {
    console.error("[API WaterSchedule] DELETE:", error);
    return NextResponse.json({ error: "Không thể xóa lịch" }, { status: 500 });
  }
}
