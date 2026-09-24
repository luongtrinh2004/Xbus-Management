import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getStoredNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
} from "@/libs/notificationStorage";
import {
  getFunds,
  getUsers,
  getWaterSchedules,
  getTrashScheduleState,
} from "@/libs/dataRepository";
import { getTrashSchedulesForMonth } from "@/libs/waterScheduler";

const secret = process.env.NEXTAUTH_SECRET;

const toVietnamDateParts = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
};

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const userId = token.id;
    const userRole = token.role || "user";
    const isAdminOrAssistant = ["admin", "assistant"].includes(userRole);
    const now = toVietnamDateParts();

    const [storedNotifications, funds, users, waterSchedules, trashState] =
      await Promise.all([
        getStoredNotifications(),
        getFunds().catch(() => []),
        getUsers().catch(() => []),
        getWaterSchedules().catch(() => []),
        getTrashScheduleState().catch(() => ({})),
      ]);

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Lọc thông báo được lưu trữ cho user
    const relevantStored = storedNotifications.filter((noti) => {
      if (noti.userId === userId) return true;
      if (noti.targetRole === "all") return true;
      if (noti.targetRole === "admin" && isAdminOrAssistant) return true;
      if (noti.targetRole === "assistant" && userRole === "assistant")
        return true;
      return false;
    });

    const dynamicNotifications = [];

    // 1. Tự động kiểm tra LỊCH LẤY NƯỚC sắp đến của chính user
    (waterSchedules || []).forEach((schedule) => {
      if (schedule.status === "completed") return;
      const isParticipant = (schedule.participants || []).some((p) => {
        const pId = p.userId || p.id || (typeof p === "string" ? p : null);
        return pId === userId;
      });
      if (isParticipant) {
        dynamicNotifications.push({
          id: `dyn_water_${schedule.id || schedule.weekNumber}_${userId}`,
          type: "duty_water",
          title: "Lịch lấy nước sắp đến",
          message: `Bạn có ca lấy nước trong ${schedule.weekRange || `tuần ${schedule.weekNumber}`}. Đừng quên hoàn thành nhé!`,
          link: "/water-schedule",
          createdAt: schedule.createdAt || new Date().toISOString(),
          isDynamic: true,
        });
      }
    });

    // 2. Tự động kiểm tra LỊCH ĐỔ RÁC sắp đến của chính user
    try {
      const monthTrash = getTrashSchedulesForMonth(
        users,
        [],
        now.year,
        now.month,
        trashState.trashScheduleOverrides || {},
        false,
      );
      (monthTrash || []).forEach((item) => {
        if (item.dateKey >= now.dateKey && item.userIds?.includes(userId)) {
          const isDone = Boolean(
            trashState.trashScheduleCompletions?.[item.dateKey],
          );
          if (!isDone) {
            const [y, m, d] = item.dateKey.split("-");
            const isToday = item.dateKey === now.dateKey;
            dynamicNotifications.push({
              id: `dyn_trash_${item.dateKey}_${userId}`,
              type: "duty_trash",
              title: isToday
                ? "Hôm nay là ca đổ rác của bạn"
                : "Lịch trực đổ rác sắp đến",
              message: isToday
                ? `Hôm nay (${d}/${m}) là ca trực đổ rác của bạn. Hãy hoàn thành đúng giờ nhé!`
                : `Bạn có ca trực đổ rác vào ngày ${d}/${m}/${y}. Hãy chuẩn bị nhé!`,
              link: "/water-schedule",
              createdAt: `${item.dateKey}T07:00:00.000Z`,
              isDynamic: true,
            });
          }
        }
      });
    } catch (e) {
      // ignore
    }

    // 3. Với ADMIN / TRỢ LÝ: Kiểm tra các yêu cầu nộp quỹ thủ công đang chờ xác nhận
    if (isAdminOrAssistant) {
      (funds || []).forEach((fund) => {
        (fund.members || []).forEach((member) => {
          if (member.pendingApproval && !member.paid) {
            const memberUser = userMap.get(member.userId);
            const memberName =
              member.memberName || memberUser?.name || "Nhân viên";
            dynamicNotifications.push({
              id: `dyn_fund_pending_${fund.id}_${member.userId}`,
              type: "fund_manual_payment",
              title: "Yêu cầu duyệt đóng quỹ thủ công",
              message: `${memberName} đã nộp quỹ thủ công số tiền ${Number(member.amount || 0).toLocaleString("vi-VN")}đ cho tháng ${String(fund.month).padStart(2, "0")}/${fund.year}. Đang chờ bạn xác nhận.`,
              link: "/fund?section=members",
              action: {
                type: "confirm_fund",
                month: fund.month,
                year: fund.year,
                userId: member.userId,
                amount: member.amount,
                memberName,
              },
              createdAt: member.paidAt || new Date().toISOString(),
              isDynamic: true,
            });
          }
        });
      });
    }

    // Gộp và loại trừ trùng lặp ID
    const all = [...dynamicNotifications, ...relevantStored];
    const seen = new Set();
    const unique = [];
    for (const item of all) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        const isRead = Boolean(
          item.read || (item.readBy || []).includes(userId),
        );
        unique.push({
          ...item,
          read: isRead,
        });
      }
    }

    // Sắp xếp: Chưa đọc lên trước hoặc theo thời gian mới nhất
    unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unreadCount = unique.filter((item) => !item.read).length;

    return NextResponse.json({
      notifications: unique,
      unreadCount,
    });
  } catch (error) {
    console.error("[API Notifications] GET Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, readAll } = body;

    if (readAll) {
      markAllAsRead(token.id, token.role || "user");
      return NextResponse.json({ success: true, readAll: true });
    }

    if (id) {
      markAsRead(id, token.id);
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  } catch (error) {
    console.error("[API Notifications] PATCH Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const notification = createNotification({
      ...body,
      userId: body.userId || null,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("[API Notifications] POST Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
