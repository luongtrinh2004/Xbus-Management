import { trashUserIds } from "@/libs/trashScheduleStorage";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getTrashScheduleState,
  getWaterSchedules,
  getUsers,
  saveUsers,
  getWaterExemptions,
  saveTrashScheduleState,
} from "@/libs/dataRepository";
import {
  getTrashSchedules,
  getEligibleTrashUsers,
  getTrashSchedulesForMonth,
} from "@/libs/waterScheduler";
import { toVietnamDateKey } from "@/libs/dateTime";
import { createNotification } from "@/libs/notificationStorage";

const secret = process.env.NEXTAUTH_SECRET;
const normalizeOffset = (value) =>
  Math.max(-52, Math.min(52, Number(value) || 0));

const loadWeek = async (weekOffset) => {
  const [users, exemptUserIds, trashState, waterSchedules] = await Promise.all([
    getUsers(),
    getWaterExemptions(),
    getTrashScheduleState(),
    getWaterSchedules(),
  ]);
  const overrides = trashState.trashScheduleOverrides || {};
  return {
    users,
    exemptUserIds,
    trashState,
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
  if (
    ["assign", "complete"].includes(body.action) &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(body.dateKey || "") ||
      Number.isNaN(Date.parse(body.dateKey)))
  )
    return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
  if (body.action === "fill_empty") {
    const [users, exemptUserIds, trashState] = await Promise.all([
      getUsers(),
      getWaterExemptions(),
      getTrashScheduleState(),
    ]);
    const todayKey = toVietnamDateKey();
    const [todayYear, todayMonth] = todayKey.split("-").map(Number);
    const year = Number(body.year) || todayYear;
    const month = Number(body.month) || todayMonth;
    const startKey =
      year === todayYear && month === todayMonth
        ? todayKey
        : `${year}-${String(month).padStart(2, "0")}-01`;
    const overrides = { ...(trashState.trashScheduleOverrides || {}) };
    const defaults = getTrashSchedulesForMonth(
      users,
      exemptUserIds,
      year,
      month,
      Object.fromEntries(
        Object.entries(overrides).filter(([, userId]) => userId),
      ),
      true,
      {
        randomize: true,
        startDateKey: startKey,
        completions: trashState.trashScheduleCompletions || {},
      },
    );
    let assigned = 0;
    for (const item of defaults) {
      if (item.dateKey >= startKey && !overrides[item.dateKey] && item.userId) {
        overrides[item.dateKey] = item.userId;
        assigned += 1;
      }
    }
    await saveTrashScheduleState({
      ...trashState,
      trashScheduleOverrides: overrides,
      trashScheduleRevision: Number(trashState.trashScheduleRevision || 0) + 1,
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
    const targetUserIds = trashUserIds(
      current.trashState.trashScheduleOverrides?.[body.dateKey],
    );
    if (!targetUserIds.length)
      return NextResponse.json(
        { error: "Không tìm thấy lịch đổ rác đã lưu" },
        { status: 404 },
      );
    const completions = {
      ...(current.trashState.trashScheduleCompletions || {}),
    };
    if (!completions[body.dateKey]) {
      for (const user of current.users) {
        if (targetUserIds.includes(user.id)) {
          user.schedulingPoints = Number(user.schedulingPoints || 0) + 1;
          user.updatedAt = new Date().toISOString();
        }
      }
      await saveUsers(current.users);
      completions[body.dateKey] = {
        userId: targetUserIds[0],
        userIds: targetUserIds,
        completedAt: new Date().toISOString(),
      };
      await saveTrashScheduleState({
        ...current.trashState,
        trashScheduleCompletions: completions,
      });

      // Gửi thông báo cho nhân sự được xác nhận đổ rác
      const [y, m, d] = String(body.dateKey).split("-");
      for (const targetUserId of targetUserIds)
        await createNotification({
          userId: targetUserId,
          type: "duty_confirmed",
          title: "Xác nhận đổ rác thành công",
          message: `${token.name || "Quản trị viên"} đã xác nhận bạn hoàn thành ca đổ rác ngày ${d}/${m}/${y} (+1 điểm).`,
          link: "/water-schedule",
        });
    }
    return NextResponse.json({ success: true, completed: true });
  }
  if (body.action === "assign") {
    const current = await loadWeek(normalizeOffset(body.weekOffset));
    if (current.trashState.trashScheduleCompletions?.[body.dateKey])
      return NextResponse.json(
        { error: "Không thể sửa lịch đã hoàn thành" },
        { status: 409 },
      );
    const requested = body.userIds ?? (body.userId ? [body.userId] : []);
    const eligible = new Set(
      getEligibleTrashUsers(current.users).map((user) => user.id),
    );
    if (
      !Array.isArray(requested) ||
      requested.length > 2 ||
      new Set(requested).size !== requested.length ||
      requested.some((id) => !eligible.has(id))
    )
      return NextResponse.json(
        { error: "Chọn tối đa 2 nhân sự khác nhau, đủ điều kiện đổ rác" },
        { status: 400 },
      );
    const overrides = {
      ...(current.trashState.trashScheduleOverrides || {}),
      [body.dateKey]: requested.length > 1 ? requested : requested[0] || null,
    };
    const [currentYear, currentMonth] = toVietnamDateKey()
      .split("-")
      .map(Number);
    const nextMonthStart = `${currentMonth === 12 ? currentYear + 1 : currentYear}-${String(currentMonth === 12 ? 1 : currentMonth + 1).padStart(2, "0")}-01`;
    const affectsFuturePlan = String(body.dateKey || "") < nextMonthStart;
    await saveTrashScheduleState({
      ...current.trashState,
      trashScheduleOverrides: overrides,
      trashScheduleRevision:
        Number(current.trashState.trashScheduleRevision || 0) +
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
    current.trashState.trashScheduleOverrides || {},
  );
  if (!nextWeek.length)
    return NextResponse.json(
      { error: "Không có nhân sự để đôn lịch" },
      { status: 400 },
    );

  const queue = [...current.schedules, nextWeek[0]];
  const overrides = { ...(current.trashState.trashScheduleOverrides || {}) };
  for (let position = index; position < current.schedules.length; position += 1)
    overrides[current.schedules[position].dateKey] =
      queue[position + 1].userIds?.length > 1
        ? queue[position + 1].userIds
        : queue[position + 1].userId;

  await saveTrashScheduleState({
    ...current.trashState,
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
