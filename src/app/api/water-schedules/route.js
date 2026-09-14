import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getWaterSchedules,
  saveWaterSchedules,
  getUsers,
  getWaterExemptions,
  appendAuditLog,
} from "@/libs/jsonRepository";
import { getWeeksOfMonth, getEligibleWaterUsers } from "@/libs/waterScheduler";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month"), 10)
      : 9;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year"), 10)
      : 2026;
    const status = searchParams.get("status") || "";
    const myScheduleOnly = searchParams.get("mySchedule") === "true";

    const allSchedules = getWaterSchedules();
    const allUsers = getUsers();
    const eligibleUsers = getEligibleWaterUsers(allUsers);
    const exemptUserIds = getWaterExemptions();

    // Lọc theo tháng và năm
    let result = allSchedules.filter(
      (s) => s.year === year && s.month === month,
    );

    if (status) {
      result = result.filter((s) => s.status === status);
    }

    // Nếu là user hoặc có param myScheduleOnly, chỉ lọc các lịch mà user có tên/ID
    const currentUser = allUsers.find(
      (user) =>
        user.id === token?.id ||
        user.email?.toLowerCase() === token?.email?.toLowerCase(),
    );
    const currentUserId = currentUser?.id || token?.id || token?.sub;
    const userEmail = token?.email;

    if (myScheduleOnly || token?.role === "user") {
      result = result.filter((s) =>
        (s.participants || []).some((p) => {
          if (typeof p === "string") {
            return (
              p.includes(userEmail) || (token?.name && p.includes(token.name))
            );
          }
          return (
            p.userId === currentUserId ||
            (p.code && token?.name?.includes(p.code))
          );
        }),
      );
    }

    // Lấy thông tin cấu trúc các tuần chuẩn của tháng đó
    const weeksMeta = getWeeksOfMonth(year, month);

    return NextResponse.json({
      month,
      year,
      schedules: result,
      weeksMeta,
      eligibleUsers: ["admin", "assistant"].includes(token?.role) ? eligibleUsers : [],
      exemptUserIds: ["admin", "assistant"].includes(token?.role) ? exemptUserIds : [],
      currentUser: currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            schedulingPoints: currentUser.schedulingPoints || 0,
            waterTripCount: currentUser.waterTripCount || 0,
          }
        : null,
      total: result.length,
    });
  } catch (error) {
    console.error("[API WaterSchedules] GET:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!["admin", "assistant"].includes(token?.role)) {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền lưu lịch" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      schedules: updatedSchedules,
      schedule: updatedSchedule,
      month,
      year,
    } = body;

    if (updatedSchedule) {
      const currentSchedules = getWaterSchedules();
      const index = currentSchedules.findIndex(
        (item) => item.id === updatedSchedule.id,
      );
      const savedSchedule = {
        ...updatedSchedule,
        month,
        year,
        status: updatedSchedule.status || "upcoming",
        savedAt: currentSchedules[index]?.savedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (index >= 0) currentSchedules[index] = savedSchedule;
      else currentSchedules.push(savedSchedule);
      saveWaterSchedules(currentSchedules);
      return NextResponse.json({ success: true, schedules: [savedSchedule] });
    }

    if (!Array.isArray(updatedSchedules)) {
      return NextResponse.json(
        { error: "Dữ liệu lịch không hợp lệ" },
        { status: 400 },
      );
    }

    const currentSchedules = getWaterSchedules();

    // Cập nhật hoặc thêm mới các lịch cho tháng này
    // Giữ nguyên các lịch của các tháng khác
    const savedSchedules = updatedSchedules.map((schedule) => ({
      ...schedule,
      savedAt: schedule.savedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const otherSchedules = currentSchedules.filter(
      (s) => !(s.month === month && s.year === year),
    );
    const mergedSchedules = [...otherSchedules, ...savedSchedules];

    saveWaterSchedules(mergedSchedules);

    // Ghi nhật ký audit
    appendAuditLog({
      adminId: token.id || "usr_admin_001",
      adminName: token.name || "Quản trị viên",
      adminEmail: token.email || "admin@phenikaa-x.com",
      action: "UPDATE_SCHEDULE",
      targetType: "water_schedules",
      targetId: `month_${year}_${month}`,
      details: `Cập nhật lịch bê nước tháng ${String(month).padStart(2, "0")}/${year} (${updatedSchedules.length} tuần)`,
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu lịch bê nước thành công",
      schedules: savedSchedules,
    });
  } catch (error) {
    console.error("[API WaterSchedules] POST:", error);
    return NextResponse.json({ error: "Lỗi khi lưu lịch" }, { status: 500 });
  }
}
