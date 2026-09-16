import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getSettings,
  saveSettings,
  getFunds,
  saveFunds,
  getUsers,
  appendAuditLog,
} from "@/libs/dataRepository";
import {
  defaultFundAmounts,
  snapshotFund,
  periodKey,
  currentFundPeriod,
} from "@/libs/fundRules";
const response = (settings) => ({
  minimumAmounts: defaultFundAmounts,
  window: settings.fundContributionWindow || null,
  voluntaryUserIds: settings.fundVoluntarySurplusUserIds || [],
});
export async function GET(req) {
  if (!(await getToken({ req, secret: process.env.NEXTAUTH_SECRET }))?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  return NextResponse.json(response(await getSettings()));
}
export async function PATCH(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!["admin", "assistant"].includes(token?.role))
    return NextResponse.json(
      { error: "Không có quyền cập nhật mức đóng quỹ" },
      { status: 403 },
    );
  try {
    const body = await req.json();
    const settings = await getSettings();
    const users = await getUsers();
    const valid = (p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p || "");
    if (
      !valid(body.startPeriod) ||
      !valid(body.endPeriod) ||
      body.startPeriod > body.endPeriod
    )
      throw new Error("Chọn khoảng thời gian hợp lệ cho cả bốn mức đóng");
    const amounts = Object.fromEntries(
      Object.keys(defaultFundAmounts).map((id) => [
        id,
        Number(body.amounts?.[id]),
      ]),
    );
    if (Object.values(amounts).some((n) => !Number.isSafeInteger(n) || n <= 0))
      throw new Error("Nhập đủ bốn mức đóng là số nguyên lớn hơn 0");
    if (
      !Array.isArray(body.voluntaryUserIds) ||
      body.voluntaryUserIds.some((id) => !users.some((u) => u.id === id))
    )
      throw new Error("Danh sách nhân sự không hợp lệ");
    const funds = await getFunds();
    // Freeze base rates before replacing the time window.
    for (const fund of funds) snapshotFund(fund, users, settings);
    for (const fund of funds)
      if (periodKey(fund) === periodKey(currentFundPeriod())) {
        for (const member of fund.members || [])
          member.voluntarySurplus = body.voluntaryUserIds.includes(
            member.userId,
          );
      }
    await saveFunds(funds);
    const updated = {
      ...settings,
      fundMinimumAmounts: defaultFundAmounts,
      fundContributionRules: [],
      fundContributionWindow: {
        amounts,
        startPeriod: body.startPeriod,
        endPeriod: body.endPeriod,
      },
      fundVoluntarySurplusUserIds: [...new Set(body.voluntaryUserIds)],
    };
    await saveSettings(updated);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name,
      adminEmail: token.email,
      action: "UPDATE_FUND_SETTINGS",
      targetType: "FUND",
      details:
        "Cập nhật bốn mức đóng, khoảng thời gian áp dụng và danh sách đóng dư tự nguyện cho kỳ mới.",
    });
    return NextResponse.json(response(updated));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Không thể lưu cấu hình" },
      { status: 400 },
    );
  }
}
