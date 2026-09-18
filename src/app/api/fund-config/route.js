import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getFunds,
  getSettings,
  saveFunds,
  saveSettings,
} from "@/libs/dataRepository";
import { encryptPayosSecret, publicPayosChannel } from "@/libs/payosChannels";

const secret = process.env.NEXTAUTH_SECRET;
const canManage = (token) => ["admin", "assistant"].includes(token?.role);
const deadlineFor = (year, month, day) => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
};
const payload = (settings) => ({
  reminder: settings.fundReminderSettings || {
    enabled: false,
    deadlineDay: 10,
    daysBefore: [3, 1],
  },
  channels: (settings.payosPaymentChannels || [])
    .filter((item) => !item.archived)
    .map((item) => publicPayosChannel(item, settings.activePayosChannelId)),
  legacyEnvironmentConfigured: Boolean(
    (process.env.PAYOS_CLIENT_ID || process.env.CLIENT_ID) &&
      (process.env.PAYOS_API_KEY || process.env.API_KEY) &&
      (process.env.PAYOS_CHECKSUM_KEY || process.env.CHECKSUM_KEY),
  ),
});

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  return NextResponse.json(payload(await getSettings()));
}

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền cập nhật cài đặt" },
      { status: 403 },
    );
  try {
    const body = await req.json();
    const settings = await getSettings();
    let details = "";
    if (body.action === "saveReminder") {
      const deadlineDay = Number(body.deadlineDay);
      const daysBefore = [...new Set((body.daysBefore || []).map(Number))]
        .filter((day) => Number.isInteger(day) && day > 0 && day <= 31)
        .sort((a, b) => b - a);
      if (!Number.isInteger(deadlineDay) || deadlineDay < 1 || deadlineDay > 28)
        throw new Error("Ngày hạn đóng phải từ 1 đến 28");
      settings.fundReminderSettings = {
        enabled: Boolean(body.enabled),
        deadlineDay,
        daysBefore,
      };
      const funds = await getFunds();
      for (const fund of funds) {
        fund.paymentDeadline = deadlineFor(fund.year, fund.month, deadlineDay);
        fund.reminderDaysBefore = daysBefore;
        fund.emailReminderEnabled = Boolean(body.enabled);
      }
      await saveFunds(funds);
      details = "Cập nhật cài đặt nhắc lịch đóng quỹ";
    } else if (body.action === "saveChannel") {
      const channels = settings.payosPaymentChannels || [];
      const existing = channels.find((item) => item.id === body.id);
      const name = String(body.name || "").trim();
      if (!name) throw new Error("Tên cấu hình PayOS là bắt buộc");
      if (!existing && (!body.clientId || !body.apiKey || !body.checksumKey))
        throw new Error(
          "Vui lòng nhập đầy đủ Client ID, API Key và Checksum Key",
        );
      const channel = {
        ...existing,
        id: existing?.id || `payos-channel-${Date.now()}`,
        name,
        archived: false,
        clientId: body.clientId
          ? encryptPayosSecret(body.clientId.trim())
          : existing.clientId,
        apiKey: body.apiKey
          ? encryptPayosSecret(body.apiKey.trim())
          : existing.apiKey,
        checksumKey: body.checksumKey
          ? encryptPayosSecret(body.checksumKey.trim())
          : existing.checksumKey,
        updatedAt: new Date().toISOString(),
      };
      settings.payosPaymentChannels = existing
        ? channels.map((item) => (item.id === existing.id ? channel : item))
        : [...channels, channel];
      settings.activePayosChannelId ||= channel.id;
      details = `${existing ? "Cập nhật" : "Thêm"} cấu hình PayOS ${name}`;
    } else if (body.action === "activateChannel") {
      if (
        !(settings.payosPaymentChannels || []).some(
          (item) => item.id === body.id,
        )
      )
        throw new Error("Không tìm thấy cấu hình PayOS");
      settings.activePayosChannelId = body.id;
      details = "Đổi kênh PayOS nhận tiền mặc định";
    } else if (body.action === "deleteChannel") {
      if (settings.activePayosChannelId === body.id)
        throw new Error("Hãy chọn kênh khác trước khi xóa kênh đang sử dụng");
      settings.payosPaymentChannels = (settings.payosPaymentChannels || []).map(
        (item) => (item.id === body.id ? { ...item, archived: true } : item),
      );
      details = "Xóa cấu hình PayOS";
    } else throw new Error("Thao tác không hợp lệ");

    await saveSettings(settings);
    await appendAuditLog({
      adminId: token.id,
      adminName: token.name,
      adminEmail: token.email,
      action: "UPDATE_FUND_CONFIG",
      targetType: "FUND",
      details,
    });
    return NextResponse.json(payload(settings));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Không thể lưu cài đặt" },
      { status: 400 },
    );
  }
}
