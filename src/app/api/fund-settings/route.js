import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getSettings,
  saveSettings,
  getFunds,
  saveFundSnapshots,
  getUsers,
  appendAuditLog,
} from "@/libs/dataRepository";
import {
  defaultFundAmounts,
  currentFundPeriod,
  fundCategories,
  periodKey,
  snapshotFund,
} from "@/libs/fundRules";

const secret = process.env.NEXTAUTH_SECRET;
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const currentPeriodKey = () => periodKey(currentFundPeriod());
const rulesOf = (settings) => {
  if (settings.fundContributionRules?.length)
    return settings.fundContributionRules;
  const window = settings.fundContributionWindow;
  if (!window) return [];
  return Object.keys(fundCategories).map((categoryId) => ({
    id: `legacy-${categoryId}`,
    categoryId,
    amount: Number(
      window.amounts?.[categoryId] ?? defaultFundAmounts[categoryId],
    ),
    startPeriod: window.startPeriod,
    endPeriod: window.endPeriod,
    note: "",
    createdAt: null,
    updatedAt: null,
  }));
};
const response = (settings) => ({
  rules: rulesOf(settings),
  history: settings.fundContributionRuleHistory || [],
  minimumAmounts: defaultFundAmounts,
  voluntaryUserIds: settings.fundVoluntarySurplusUserIds || [],
});
const validateRule = (body, rules) => {
  if (!Object.hasOwn(fundCategories, body.categoryId))
    throw new Error("Loại nhân sự không hợp lệ");
  const amount = Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("Số tiền phải là số nguyên lớn hơn 0");
  if (
    !periodPattern.test(body.startPeriod || "") ||
    !periodPattern.test(body.endPeriod || "") ||
    body.startPeriod > body.endPeriod
  )
    throw new Error("Khoảng thời gian áp dụng không hợp lệ");
  if (
    rules.some(
      (rule) =>
        rule.id !== body.id &&
        rule.categoryId === body.categoryId &&
        rule.startPeriod <= body.endPeriod &&
        rule.endPeriod >= body.startPeriod,
    )
  )
    throw new Error("Loại nhân sự đã có mức đóng trong khoảng thời gian này");
  return {
    id: body.id || `fund-rule-${Date.now()}`,
    categoryId: body.categoryId,
    amount,
    startPeriod: body.startPeriod,
    endPeriod: body.endPeriod,
    note: String(body.note || "").trim(),
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

async function persist(req, operation) {
  const token = await getToken({ req, secret });
  if (!["admin", "assistant"].includes(token?.role))
    return NextResponse.json(
      { error: "Không có quyền cập nhật cài đặt" },
      { status: 403 },
    );
  try {
    const body = await req.json();
    const settings = await getSettings();
    const rules = rulesOf(settings);
    const funds = await getFunds();
    const users = await getUsers();
    for (const fund of funds) snapshotFund(fund, users, settings);
    // Changing contribution rules only needs to freeze the current roster/rates.
    // Rewriting payments here can resurrect metadata for a deleted user and fail
    // the users foreign key, while no financial transaction is being changed.
    await saveFundSnapshots(funds);
    let updatedRules;
    let updatedHistory = settings.fundContributionRuleHistory || [];
    let details;
    if (operation === "delete") {
      const existing = rules.find((rule) => rule.id === body.id);
      if (!existing) throw new Error("Không tìm thấy mức đóng cần xóa");
      if (existing.endPeriod < currentPeriodKey())
        throw new Error(
          "Mức đóng đã hết hiệu lực được lưu làm lịch sử và không thể xóa",
        );
      updatedHistory = [
        ...updatedHistory,
        {
          ...existing,
          id: `fund-rule-history-${Date.now()}`,
          sourceRuleId: existing.id,
          historyAction: "deleted",
          archivedAt: new Date().toISOString(),
        },
      ];
      updatedRules = rules.filter((rule) => rule.id !== body.id);
      details = "Xóa cấu hình mức đóng quỹ";
    } else {
      const existing = body.id
        ? rules.find((rule) => rule.id === body.id)
        : null;
      if (body.id && !existing)
        throw new Error("Không tìm thấy mức đóng cần sửa");
      if (existing?.endPeriod < currentPeriodKey())
        throw new Error(
          "Mức đóng đã hết hiệu lực được lưu làm lịch sử và không thể sửa",
        );
      const rule = validateRule(body, rules);
      if (existing)
        updatedHistory = [
          ...updatedHistory,
          {
            ...existing,
            id: `fund-rule-history-${Date.now()}`,
            sourceRuleId: existing.id,
            historyAction: "updated",
            archivedAt: new Date().toISOString(),
          },
        ];
      updatedRules = body.id
        ? rules.map((item) => (item.id === body.id ? rule : item))
        : [...rules, rule];
      details = `${body.id ? "Cập nhật" : "Thêm"} mức đóng ${fundCategories[rule.categoryId]} ${rule.amount.toLocaleString("vi-VN")} đồng, ${rule.startPeriod} đến ${rule.endPeriod}`;
    }
    const updated = {
      ...settings,
      fundContributionWindow: null,
      fundContributionRules: updatedRules,
      fundContributionRuleHistory: updatedHistory,
    };
    await saveSettings(updated);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name,
      adminEmail: token.email,
      action:
        operation === "delete" ? "DELETE_FUND_SETTING" : "UPDATE_FUND_SETTINGS",
      targetType: "FUND",
      details,
    });
    return NextResponse.json(response(updated));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Không thể lưu cài đặt" },
      { status: 400 },
    );
  }
}

export async function GET(req) {
  if (!(await getToken({ req, secret }))?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  return NextResponse.json(response(await getSettings()));
}
export async function POST(req) {
  return persist(req, "save");
}
export async function PATCH(req) {
  return persist(req, "save");
}
export async function DELETE(req) {
  return persist(req, "delete");
}
