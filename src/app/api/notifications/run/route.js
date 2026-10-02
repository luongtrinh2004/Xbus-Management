import { toVietnamDateKey } from "@/libs/dateTime";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getFunds,
  getAfternoonTea,
  getSettings,
  getTrashScheduleState,
  getUsers,
  getWaterExemptions,
  getWaterSchedules,
  saveSettings,
} from "@/libs/dataRepository";
import {
  createNotificationContent,
  sendNotificationEmail,
} from "@/libs/emailNotifications";
import { getTrashSchedulesForMonth } from "@/libs/waterScheduler";

const secret = process.env.NEXTAUTH_SECRET;
const vietnamClock = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
};
const addDays = (dateKey, amount) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
};
const displayDate = (dateKey) => dateKey.split("-").reverse().join("/");
const dateKeyFromDisplay = (display) => {
  const [day, month, year] = String(display || "").split("/");
  return year && month && day ? `${year}-${month}-${day}` : "";
};
const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000,
  );
const hasCronAccess = (req) => {
  const expected = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization") || "";
  return Boolean(expected && authorization === `Bearer ${expected}`);
};

export async function POST(req) {
  const token = await getToken({ req, secret });
  let body = {};
  try {
    body = await req.json();
  } catch {}
  const immediateFund = body.action === "sendFundNow";
  const immediateSchedule = body.action === "sendScheduleNow";
  const immediateTea = body.action === "sendTeaNow";
  const immediate = immediateFund || immediateSchedule || immediateTea;
  if (
    immediate
      ? !["admin", "assistant"].includes(token?.role)
      : !hasCronAccess(req)
  )
    return NextResponse.json(
      { error: "Không có quyền gửi thông báo" },
      { status: 403 },
    );

  try {
    const [settings, funds, users, waterSchedules, exemptUserIds] =
      await Promise.all([
        getSettings(),
        getFunds(),
        getUsers(),
        getWaterSchedules(),
        getWaterExemptions(),
      ]);
    let teaRecipientIds;
    if (immediateTea) {
      if (!Array.isArray(body.recipientIds) || !body.recipientIds.length || body.recipientIds.some(id => typeof id !== "string")) {
        return NextResponse.json({error:"Hãy chọn ít nhất một người nhận"},{status:400});
      }
      teaRecipientIds = new Set(body.recipientIds);
      const eligible = new Set(users.filter(user => user.status === "able" && user.email).map(user => user.id));
      if ([...teaRecipientIds].some(id => !eligible.has(id))) return NextResponse.json({error:"Có người nhận không còn hoạt động hoặc chưa có email. Vui lòng tải lại danh sách."},{status:400});
    }
    const clock = vietnamClock();
    const today = clock.date;
    const logs = { ...(settings.notificationEmailLogs || {}) };
    const results = { sent: 0, skipped: 0, failed: 0, retryAfterSeconds: 0 };
    const usersById = new Map(users.map((user) => [user.id, user]));
    const deliver = async (key, message, cooldownMs = null) => {
      if (logs[key]) {
        const elapsed = Date.now() - new Date(logs[key]).getTime();
        if (cooldownMs === null || elapsed < cooldownMs) {
          results.skipped += 1;
          if (cooldownMs !== null)
            results.retryAfterSeconds = Math.max(
              results.retryAfterSeconds,
              Math.ceil((cooldownMs - elapsed) / 1000),
            );
          return;
        }
      }
      try {
        await sendNotificationEmail(message);
        logs[key] = new Date().toISOString();
        results.sent += 1;
      } catch (error) {
        console.error(`[Email notification] ${key}:`, error);
        results.failed += 1;
      }
    };

    const fundConfig = settings.fundReminderSettings || {};
    const shouldRunFund =
      immediateFund ||
      (!immediate && fundConfig.enabled && clock.time === (fundConfig.sendTime || "14:00"));
    if (shouldRunFund) {
      for (const fund of funds) {
        if (
          immediateFund &&
          `${fund.year}-${String(fund.month).padStart(2, "0")}` !==
            today.slice(0, 7)
        )
          continue;
        // Gửi thủ công phải hoạt động cả với các kỳ quỹ cũ chưa được gán hạn
        // đóng. Hạn đóng chỉ bắt buộc khi cron cần tính mốc nhắc tự động.
        if (!immediateFund && !fund.paymentDeadline) continue;
        const distance = fund.paymentDeadline
          ? daysBetween(today, fund.paymentDeadline)
          : null;
        if (
          !immediateFund &&
          !(fund.reminderDaysBefore || fundConfig.daysBefore || []).includes(
            distance,
          )
        )
          continue;
        for (const member of fund.members || []) {
          if (member.paid || member.obligationCancelled || member.rosterHidden)
            continue;
          const user = usersById.get(member.userId);
          if (!user?.email || user.status !== "able") continue;
          const trigger = immediateFund ? "manual" : `${distance}-days`;
          const deadlineText = fund.paymentDeadline
            ? displayDate(fund.paymentDeadline)
            : "chưa thiết lập";
          await deliver(
            `fund:${fund.id}:${member.userId}:${trigger}`,
            {
              to: user.email,
              subject: `Nhắc đóng quỹ tháng ${fund.month}/${fund.year}`,
              ...createNotificationContent({
                name: user.name,
                title: `Nhắc đóng quỹ tháng ${fund.month}/${fund.year}`,
                message: `Bạn chưa đóng quỹ tháng ${fund.month}/${fund.year}. Hạn đóng: ${deadlineText}.\nVui lòng truy cập Xbus Office để kiểm tra và hoàn tất thanh toán.`,
              }),
            },
            immediateFund ? 60_000 : null,
          );
        }
      }
    }

    const scheduleConfig = settings.scheduleReminderSettings || {};
    if (
      immediateSchedule ||
      (!immediate && scheduleConfig.enabled &&
        clock.time === (scheduleConfig.sendTime || "14:00"))
    ) {
      const automaticTargetDate = addDays(
        today,
        Number(scheduleConfig.daysBefore ?? 1),
      );
      const nearestWaterDate = waterSchedules
        .filter(
          (schedule) =>
            schedule.status !== "completed" &&
            dateKeyFromDisplay(schedule.date) >= today,
        )
        .map((schedule) => dateKeyFromDisplay(schedule.date))
        .sort()[0];
      const waterTargetDate = immediateSchedule
        ? nearestWaterDate
        : automaticTargetDate;
      const displayWaterTarget = waterTargetDate
        ? displayDate(waterTargetDate)
        : "";
      const water = waterSchedules.filter(
        (schedule) => schedule.date === displayWaterTarget,
      );
      for (const schedule of water)
        for (const participant of schedule.participants || []) {
          const userId = participant.userId || participant;
          const user = usersById.get(userId);
          if (!user?.email || schedule.status === "completed") continue;
          await deliver(
            `water:${waterTargetDate}:${userId}${immediateSchedule ? ":manual" : ""}`,
            {
              to: user.email,
              subject: `Nhắc lịch bê nước ngày ${displayWaterTarget}`,
              ...createNotificationContent({
                name: user.name,
                title: "Nhắc lịch bê nước",
                message: `Bạn được phân công bê nước vào ngày ${displayWaterTarget}.\nVui lòng truy cập Xbus Office để kiểm tra lịch và chủ động sắp xếp công việc.`,
              }),
            },
            immediateSchedule ? 60_000 : null,
          );
        }

      const trashState = await getTrashScheduleState();
      const [currentYear, currentMonth] = today.split("-").map(Number);
      const trashMonths = Array.from({ length: 3 }, (_, offset) => {
        const date = new Date(
          Date.UTC(currentYear, currentMonth - 1 + offset, 1),
        );
        return [date.getUTCFullYear(), date.getUTCMonth() + 1];
      });
      const upcomingTrash = trashMonths
        .flatMap(([year, month]) =>
          getTrashSchedulesForMonth(
            users,
            exemptUserIds,
            year,
            month,
            trashState.trashScheduleOverrides || {},
            true,
          ),
        )
        .filter(
          (item) =>
            item.dateKey >= today &&
            !trashState.trashScheduleCompletions?.[item.dateKey],
        )
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      const trashTargetDate = immediateSchedule
        ? upcomingTrash[0]?.dateKey
        : automaticTargetDate;
      const trash = immediateSchedule
        ? upcomingTrash[0]
        : upcomingTrash.find((item) => item.dateKey === trashTargetDate);
      const displayTrashTarget = trashTargetDate
        ? displayDate(trashTargetDate)
        : "";
      for (const assignedId of trash?.userIds ||
        (trash?.userId ? [trash.userId] : [])) {
        const trashUser = usersById.get(assignedId);
        if (
          trashUser?.email &&
          !trashState.trashScheduleCompletions?.[trashTargetDate]
        )
          await deliver(
            `trash:${trashTargetDate}:${trashUser.id}${immediateSchedule ? ":manual" : ""}`,
            {
              to: trashUser.email,
              subject: `Nhắc lịch đổ rác ngày ${displayTrashTarget}`,
              ...createNotificationContent({
                name: trashUser.name,
                title: "Nhắc lịch đổ rác",
                message: `Bạn được phân công đổ rác vào ngày ${displayTrashTarget}.\nVui lòng truy cập Xbus Office để kiểm tra lịch và chủ động sắp xếp công việc.`,
              }),
            },
            immediateSchedule ? 60_000 : null,
          );
      }
    }

    const teaConfig = settings.teaReminderSettings || {};
    if (immediateTea || (!immediate && teaConfig.enabled && clock.time >= (teaConfig.sendTime || "10:00"))) {
      const tea = await getAfternoonTea();
      const invitations = (tea.invitations || []).filter(item => {
        try { return item.scheduledAt && toVietnamDateKey(item.scheduledAt) === today; } catch { return false; }
      });
      if (immediateTea && !invitations.length) return NextResponse.json({error:"Hôm nay chưa có lời mời Happy Hour hoặc trà chiều"},{status:400});
      for (const invitation of invitations) {
        const title = invitation.type === "happy-hour" ? "Hôm nay có Happy Hour!" : "Hôm nay có trà chiều!";
        const excludedTeaRecipients = new Set(teaConfig.excludedUserIds || []);
        const recipients = users.filter(user => user.status === "able" && user.email && !excludedTeaRecipients.has(user.id) && (!immediateTea || teaRecipientIds.has(user.id)));
        const sentEmails = new Set();
        for (const user of recipients) {
          const email = user.email.trim().toLowerCase();
          if (sentEmails.has(email)) continue;
          sentEmails.add(email);
          await deliver(`tea:${today}:${invitation.id}:${user.id}`, {
            to: user.email, subject: title,
            ...createNotificationContent({name:user.name,title,
              message:[invitation.title,invitation.note,"Mời mọi người vào đặt món nhé!"].filter(Boolean).join("\n"),
              actionUrl:"https://xbus-office.xmobility.vn/afternoon-tea", actionLabel:"Đặt ngay",
              images:(invitation.menus || []).map(menu => ({url:menu.imageUrl,label:menu.shop})),
            }),
          }, immediateTea ? 60_000 : null);
        }
      }
    }

    const cutoff = Date.now() - 90 * 86400000;
    const recentLogs = Object.fromEntries(
      Object.entries(logs).filter(
        ([, sentAt]) => new Date(sentAt).getTime() >= cutoff,
      ),
    );
    await saveSettings({ ...settings, notificationEmailLogs: recentLogs });
    return NextResponse.json(results);
  } catch (error) {
    console.error("[Notification runner]", error);
    return NextResponse.json(
      { error: error.message || "Không thể gửi thông báo" },
      { status: 500 },
    );
  }
}
