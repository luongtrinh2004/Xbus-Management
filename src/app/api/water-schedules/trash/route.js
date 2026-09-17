import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getSettings,
  getUsers,
  getWaterExemptions,
  saveSettings,
} from "@/libs/dataRepository";
import { getTrashSchedules } from "@/libs/waterScheduler";
import { toVietnamDateKey } from "@/libs/dateTime";

const secret = process.env.NEXTAUTH_SECRET;
const normalizeOffset = (value) =>
  Math.max(-52, Math.min(52, Number(value) || 0));

const loadWeek = async (weekOffset) => {
  const [users, exemptUserIds, settings] = await Promise.all([
    getUsers(),
    getWaterExemptions(),
    getSettings(),
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
