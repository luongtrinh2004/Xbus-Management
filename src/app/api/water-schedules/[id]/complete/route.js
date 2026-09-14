import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getWaterSchedules,
  saveWaterSchedules,
  getUsers,
  saveUsers,
  appendAuditLog,
} from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (token?.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền xác nhận hoàn thành lịch" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { completedUserIds = [] } = body;

    const allSchedules = getWaterSchedules();
    const scheduleIndex = allSchedules.findIndex((s) => s.id === id);

    if (scheduleIndex === -1) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch bê nước" },
        { status: 404 },
      );
    }

    const schedule = allSchedules[scheduleIndex];

    if (!schedule.savedAt) {
      return NextResponse.json(
        { error: "Cần lưu lịch tuần trước khi xác nhận hoàn thành" },
        { status: 400 },
      );
    }

    if (schedule.status === "completed") {
      return NextResponse.json(
        { error: "Lịch này đã được xác nhận hoàn thành trước đó" },
        { status: 400 },
      );
    }

    // Đánh dấu completed cho các thành viên
    const updatedParticipants = (schedule.participants || []).map((p) => {
      const uid = p.userId || p;
      const isDone = completedUserIds.includes(uid);
      if (typeof p === "string") {
        return { userId: uid, name: p, completed: isDone };
      }
      return { ...p, completed: isDone };
    });

    schedule.status = "completed";
    schedule.participants = updatedParticipants;
    schedule.completedAt = new Date().toISOString();
    schedule.completedBy = token.id || "usr_admin_001";
    schedule.updatedAt = new Date().toISOString();

    allSchedules[scheduleIndex] = schedule;
    saveWaterSchedules(allSchedules);

    // Cộng điểm (+1) và lượt (+1) cho từng người thực sự tham gia trong users.json
    const allUsers = getUsers();
    const rewardedUserNames = [];

    allUsers.forEach((u) => {
      if (completedUserIds.includes(u.id)) {
        u.schedulingPoints = (u.schedulingPoints || 0) + 1;
        u.waterTripCount = (u.waterTripCount || 0) + 1;
        u.updatedAt = new Date().toISOString();
        rewardedUserNames.push(u.name || u.code);
      }
    });

    saveUsers(allUsers);

    // Ghi nhật ký hoạt động
    appendAuditLog({
      adminId: token.id || "usr_admin_001",
      adminName: token.name || "Quản trị viên",
      adminEmail: token.email || "admin@phenikaa-x.com",
      action: "COMPLETE_SCHEDULE",
      targetType: "water_schedules",
      targetId: id,
      details: `Xác nhận hoàn thành lịch tuần ${schedule.weekIndex} (${schedule.date}), cộng 1 điểm cho ${rewardedUserNames.length} người: ${rewardedUserNames.join(", ")}`,
    });

    return NextResponse.json({
      success: true,
      message: `Đã hoàn thành lịch tuần ${schedule.weekIndex} và cộng 1 điểm cho ${rewardedUserNames.length} nhân sự`,
      schedule,
    });
  } catch (error) {
    console.error("[API WaterSchedule Complete] POST:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xác nhận lịch" },
      { status: 500 },
    );
  }
}
