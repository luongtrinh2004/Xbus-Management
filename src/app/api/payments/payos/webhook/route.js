import { NextResponse } from "next/server";
import { PayOS } from "@payos/node";
import {
  getFunds,
  saveFunds,
  appendAuditLog,
  getUsers,
  getSettings,
} from "@/libs/dataRepository";
import { payosCredentials } from "@/libs/payosChannels";

const payOS = (credentials) =>
  new PayOS({
    clientId: credentials.clientId,
    apiKey: credentials.apiKey,
    checksumKey: credentials.checksumKey,
  });

export async function POST(req) {
  try {
    const rawBody = await req.json();
    const unverifiedOrderCode = Number(
      rawBody?.data?.orderCode || rawBody?.orderCode,
    );
    const funds = await getFunds();
    const matchedMember = funds
      .flatMap((fund) => fund.members || [])
      .find((item) => Number(item.orderCode) === unverifiedOrderCode);
    const credentials = payosCredentials(
      await getSettings(),
      matchedMember?.paymentChannelId || "legacy-env",
    );
    if (!credentials)
      return NextResponse.json(
        { error: "PayOS chưa được cấu hình" },
        { status: 503 },
      );
    const webhookData = await payOS(credentials).webhooks.verify(rawBody);
    if (webhookData.code !== "00") return NextResponse.json({ code: "00" });
    const orderCode = Number(webhookData.orderCode);
    for (const fund of funds) {
      const index = (fund.members || []).findIndex(
        (item) => item.orderCode === orderCode,
      );
      if (index < 0) continue;
      const member = fund.members[index];
      if (member.paid) return NextResponse.json({ code: "00" });
      if (Number(webhookData.amount) !== Number(member.amount))
        return NextResponse.json(
          { error: "Số tiền thanh toán không khớp" },
          { status: 400 },
        );
      const now = new Date().toISOString();
      fund.members[index] = {
        ...member,
        paid: true,
        paymentStatus: "PAID",
        paidAt: now,
        paymentReference: webhookData.reference || "",
        updatedAt: now,
      };
      fund.updatedAt = now;
      await saveFunds(funds);
      const payer = (await getUsers()).find(
        (user) => user.id === member.userId,
      );
      await appendAuditLog({
        adminId: member.userId,
        adminName: payer?.name || member.memberName || "Nhân sự",
        adminEmail: payer?.email || "",
        action: "PAYOS_FUND_PAYMENT",
        targetType: "FUND",
        targetId: fund.id,
        details: `${payer?.name || member.memberName || "Nhân sự"} đã đóng ${member.amount.toLocaleString("vi-VN")} đồng quỹ tháng ${fund.month}/${fund.year}, mã đơn ${orderCode}`,
      });
      return NextResponse.json({ code: "00" });
    }
    return NextResponse.json({ code: "00" });
  } catch (error) {
    console.error("[PayOS webhook]:", error);
    return NextResponse.json(
      { error: "Webhook không hợp lệ" },
      { status: 400 },
    );
  }
}
