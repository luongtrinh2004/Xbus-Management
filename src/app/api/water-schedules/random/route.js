import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getUsers,
  getWaterSchedules,
  getWaterExemptions,
} from "@/libs/jsonRepository";
import {
  getEligibleWaterUsers,
  selectFairParticipants,
  getWeeksOfMonth,
} from "@/libs/waterScheduler";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (token?.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền xếp lịch random" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      month,
      year,
      mode = "all_weeks",
      weekIndex,
      requiredPeople = 5,
      currentDraft = [],
    } = body;

    const allUsers = getUsers();
    const exemptUserIds = getWaterExemptions();
    const eligibleUsers = getEligibleWaterUsers(allUsers).filter(
      (user) => !exemptUserIds.includes(user.id),
    );

    if (eligibleUsers.length === 0) {
      return NextResponse.json(
        { error: "Không có nhân sự nam nào đủ điều kiện để xếp lịch" },
        { status: 400 },
      );
    }

    const allSchedules = getWaterSchedules();
    const weeksMeta = getWeeksOfMonth(year, month);

    if (mode === "single_week") {
      // Random cho duy nhất 1 tuần
      const participants = selectFairParticipants({
        eligibleUsers,
        existingSchedules: allSchedules,
        requiredPeople,
        tentativeCounts: {},
        excludeUserIds: [],
      });

      return NextResponse.json({
        success: true,
        weekIndex,
        participants,
      });
    }

    // Mode 'all_weeks': Random tuần tự từ tuần 1 đến tuần cuối
    // Mục 2.9: "Sau khi xếp một tuần, điểm xét lịch được cập nhật trước khi xếp tuần tiếp theo."
    const tentativeCounts = {};
    const generatedSchedules = [];

    for (const week of weeksMeta) {
      // Tìm cấu hình ngày và số người nếu admin đã chỉnh sửa ở draft hiện tại
      const existingInDraft = currentDraft.find(
        (d) => d.weekIndex === week.weekIndex,
      );
      const selectedDate = existingInDraft?.date || week.defaultDate;
      const numPeople = existingInDraft?.requiredPeople || requiredPeople;
      const selectedTime = existingInDraft?.time || "09:00";
      const note = existingInDraft?.note || "";

      // Nếu tuần đã hoàn thành (completed) trong database thì giữ nguyên
      const existingInDb = allSchedules.find(
        (s) =>
          s.year === year &&
          s.month === month &&
          s.weekIndex === week.weekIndex,
      );
      if (existingInDb && existingInDb.status === "completed") {
        generatedSchedules.push(existingInDb);
        continue;
      }

      // Phân công tự động theo thuật toán công bằng
      const participants = selectFairParticipants({
        eligibleUsers,
        existingSchedules: allSchedules,
        requiredPeople: numPeople,
        tentativeCounts,
        excludeUserIds: [],
      });

      // Cập nhật điểm dự kiến cho các tuần tiếp theo trong tháng
      participants.forEach((p) => {
        tentativeCounts[p.userId] = (tentativeCounts[p.userId] || 0) + 1;
      });

      generatedSchedules.push({
        id: `water_${year}${String(month).padStart(2, "0")}_week_${week.weekIndex}`,
        year,
        month,
        weekIndex: week.weekIndex,
        range: week.range,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        date: selectedDate,
        time: selectedTime,
        requiredPeople: numPeople,
        status: "upcoming",
        note,
        participants,
        selectionMode: "automatic",
        createdBy: token.id || "usr_admin_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã random công bằng cho ${generatedSchedules.length} tuần`,
      schedules: generatedSchedules,
    });
  } catch (error) {
    console.error("[API WaterSchedules Random] POST:", error);
    return NextResponse.json(
      { error: "Lỗi khi random lịch bê nước" },
      { status: 500 },
    );
  }
}
