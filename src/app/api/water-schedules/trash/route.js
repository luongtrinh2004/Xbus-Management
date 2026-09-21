import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getSettings,
  getWaterSchedules,
  getUsers,
  saveUsers,
  getWaterExemptions,
  saveSettings,
} from "@/libs/dataRepository";
import {
  getTrashSchedules,
  getTrashSchedulesForMonth,
} from "@/libs/waterScheduler";
import { toVietnamDateKey } from "@/libs/dateTime";

const secret = process.env.NEXTAUTH_SECRET;
const normalizeOffset = (value) =>
  Math.max(-52, Math.min(52, Number(value) || 0));

const loadWeek = async (weekOffset) => {
  const [users, exemptUserIds, settings, waterSchedules] = await Promise.all([
    getUsers(),
    getWaterExemptions(),
    getSettings(),
    getWaterSchedules(),
  ]);
  const overrides = settings.trashScheduleOverrides || {};
  return {
    users,
    exemptUserIds,
    settings,
    schedules: getTrashSchedules(
      users,
      exemptUserIds,
      toVietnamDateKey(),
      weekOffset,
      overrides,
      waterSchedules,
    ),
  };
};

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!token?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const weekOffset = normalizeOffset(
    req.nextUrl.searchParams.get("weekOffset"),
  );
  const { schedules } = await loadWeek(weekOffset);
  return NextResponse.json({ schedules, weekOffset });
}

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  if (!["admin", "assistant"].includes(token?.role))
    return NextResponse.json(
      { error: "Không có quyền đổi lịch đổ rác" },
      { status: 403 },
    );

  const body = await req.json();
  if (body.action === "fill_empty") {
    const [users, exemptUserIds, settings] = await Promise.all([
      getUsers(),
      getWaterExemptions(),
      getSettings(),
    ]);
    const todayKey = toVietnamDateKey();
    const [todayYear, todayMonth] = todayKey.split("-").map(Number);
    const year = Number(body.year) || todayYear;
    const month = Number(body.month) || todayMonth;
    const startKey = year === todayYear && month === todayMonth
      ? todayKey
      : `${year}-${String(month).padStart(2, "0")}-01`;
    const overrides = { ...(settings.trashScheduleOverrides || {}) };
    const defaults = getTrashSchedulesForMonth(
      users,
      exemptUserIds,
      year,
      month,
      {},
      true,
    );
    let assigned = 0;
    for (const item of defaults) {
      if (
        item.dateKey >= startKey &&
        !overrides[item.dateKey] &&
        item.userId
      ) {
        overrides[item.dateKey] = item.userId;
        assigned += 1;
      }
    }
    await saveSettings({
      ...settings,
      trashScheduleOverrides: overrides,
      trashScheduleRevision: Number(settings.trashScheduleRevision || 0) + 1,
    });
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: "FILL_EMPTY_TRASH_SCHEDULE",
      targetType: "trash_schedule",
      targetId: `${year}-${String(month).padStart(2, "0")}`,
      details: `Random ${assigned} ô lịch đổ rác còn trống từ ${startKey}`,
    });
    return NextResponse.json({ success: true, assigned });
  }
  if (body.action === "complete") {
    const current = await loadWeek(normalizeOffset(body.weekOffset));
    const schedule = current.schedules.find(
      (item) => item.dateKey === body.dateKey,
    );
    const targetUserId = schedule?.userId || body.userId;
    if (!targetUserId)
      return NextResponse.json(
        { error: "Không tìm thấy lịch đổ rác" },
        { status: 404 },
      );
    const completions = {
      ...(current.settings.trashScheduleCompletions || {}),
    };
    if (!completions[body.dateKey]) {
      const userIndex = current.users.findIndex(
        (user) => user.id === targetUserId,
      );
      if (userIndex >= 0) {
        current.users[userIndex].schedulingPoints =
          (current.users[userIndex].schedulingPoints || 0) + 1;
        current.users[userIndex].updatedAt = new Date().toISOString();
        await saveUsers(current.users);
      }
      completions[body.dateKey] = {
        userId: targetUserId,
        completedAt: new Date().toISOString(),
      };
      await saveSettings({
        ...current.settings,
        trashScheduleCompletions: completions,
      });
    }
    return NextResponse.json({ success: true, completed: true });
  }
  if (body.action === "assign") {
    const current = await loadWeek(normalizeOffset(body.weekOffset));
    const overrides = {
      ...(current.settings.trashScheduleOverrides || {}),
      [body.dateKey]: body.userId || null,
    };
    const [currentYear, currentMonth] = toVietnamDateKey()
      .split("-")
      .map(Number);
    const nextMonthStart = `${currentMonth === 12 ? currentYear + 1 : currentYear}-${String(currentMonth === 12 ? 1 : currentMonth + 1).padStart(2, "0")}-01`;
    const affectsFuturePlan = String(body.dateKey || "") < nextMonthStart;
    await saveSettings({
      ...current.settings,
      trashScheduleOverrides: overrides,
      trashScheduleRevision:
        Number(current.settings.trashScheduleRevision || 0) +
        Number(affectsFuturePlan),
    });
    return NextResponse.json({ success: true });
  }
  const weekOffset = normalizeOffset(body.weekOffset);
  const current = await loadWeek(weekOffset);
  const index = current.schedules.findIndex(
    (item) => item.dateKey === body.dateKey,
  );
  if (index < 0)
    return NextResponse.json(
      { error: "Ngày cần đổi không thuộc tuần đang xem" },
      { status: 400 },
    );

  const nextWeek = getTrashSchedules(
    current.users,
    current.exemptUserIds,
    toVietnamDateKey(),
    weekOffset + 1,
    current.settings.trashScheduleOverrides || {},
  );
  if (!nextWeek.length)
    return NextResponse.json(
      { error: "Không có nhân sự để đôn lịch" },
      { status: 400 },
    );

  const queue = [...current.schedules, nextWeek[0]];
  const overrides = { ...(current.settings.trashScheduleOverrides || {}) };
  for (let position = index; position < current.schedules.length; position += 1)
    overrides[current.schedules[position].dateKey] = queue[position + 1].userId;

  await saveSettings({
    ...current.settings,
    trashScheduleOverrides: overrides,
  });
  await appendAuditLog({
    adminId: token.id,
    adminName: token.name || "Người dùng",
    adminEmail: token.email || "",
    action: "SHIFT_TRASH_SCHEDULE",
    targetType: "trash_schedule",
    targetId: body.dateKey,
    details: `Đôn lịch đổ rác từ ngày ${body.dateKey}`,
  });
  const schedules = getTrashSchedules(
    current.users,
    current.exemptUserIds,
    toVietnamDateKey(),
    weekOffset,
    overrides,
  );
  return NextResponse.json({ schedules, weekOffset });
}
