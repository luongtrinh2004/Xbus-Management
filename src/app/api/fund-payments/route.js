import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import QRCode from "qrcode";
import { PayOS } from "@payos/node";
import {
  appendAuditLog,
  getFunds,
  getSettings,
  getUsers,
  saveFunds,
} from "@/libs/dataRepository";
import {
  snapshotFund,
  periodKey,
  currentFundPeriod,
  minimumOnlinePaymentAmount,
} from "@/libs/fundRules";

const secret = process.env.NEXTAUTH_SECRET;
const configured = () =>
  Boolean(
    (process.env.PAYOS_CLIENT_ID || process.env.CLIENT_ID) &&
      (process.env.PAYOS_API_KEY || process.env.API_KEY) &&
      (process.env.PAYOS_CHECKSUM_KEY || process.env.CHECKSUM_KEY),
  );
const payOS = () =>
  new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || process.env.CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY || process.env.API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || process.env.CHECKSUM_KEY,
  });

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!token?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  if (!configured())
    return NextResponse.json(
      {
        error:
          "PayOS chưa được cấu hình. Vui lòng thêm credentials Payment Channel.",
      },
      { status: 503 },
    );
  try {
    const { month, year, amount } = await req.json();
    if (
      periodKey({ month: Number(month), year: Number(year) }) >
      periodKey(currentFundPeriod())
    )
      return NextResponse.json(
        { error: "Chưa đến kỳ đóng quỹ. Không thể thanh toán trước." },
        { status: 403 },
      );
    const funds = await getFunds();
    const fundIndex = funds.findIndex(
      (fund) => fund.month === Number(month) && fund.year === Number(year),
    );
    if (fundIndex < 0)
      return NextResponse.json(
        { error: "Không tìm thấy kỳ quỹ" },
        { status: 404 },
      );
    const users = await getUsers();
    const user = users.find((item) => item.id === token.id);
    if (!user || user.status !== "able")
      return NextResponse.json(
        { error: "Tài khoản không thể đóng quỹ" },
        { status: 403 },
      );
    const contribution = Number(amount);
    snapshotFund(funds[fundIndex], users, await getSettings());
    if (
      !Number.isSafeInteger(contribution) ||
      contribution < minimumOnlinePaymentAmount
    )
      return NextResponse.json(
        {
          error: `Số tiền đóng phải từ ${minimumOnlinePaymentAmount.toLocaleString("vi-VN")} đồng`,
        },
        { status: 400 },
      );
    const existing = (funds[fundIndex].members || []).find(
      (item) => item.userId === user.id,
    );
    if (!existing || existing.obligationCancelled)
      return NextResponse.json(
        { error: "Nghĩa vụ đóng quỹ không còn hiệu lực" },
        { status: 409 },
      );
    if (existing?.paid)
      return NextResponse.json(
        { error: "Bạn đã đóng quỹ trong kỳ này" },
        { status: 409 },
      );
    const orderCode = Date.now();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (!appUrl)
      return NextResponse.json(
        { error: "Chưa cấu hình URL ứng dụng" },
        { status: 500 },
      );
    const payment = await payOS().paymentRequests.create({
      orderCode,
      amount: contribution,
      description: `Quy phong ${month}/${year}`,
      items: [
        {
          name: `Quỹ phòng ${month}/${year}`,
          quantity: 1,
          price: contribution,
        },
      ],
      returnUrl: `${appUrl}/fund?section=members&orderCode=${orderCode}`,
      cancelUrl: `${appUrl}/fund?section=members`,
    });
    const qrDataUrl = payment.qrCode
      ? await QRCode.toDataURL(payment.qrCode, { width: 280, margin: 1 })
      : null;
    const members = funds[fundIndex].members || [];
    const record = {
      ...existing,
      userId: user.id,
      paid: false,
      amount: contribution,
      paymentStatus: "PENDING",
      orderCode,
      paymentLinkId: payment.paymentLinkId,
      checkoutUrl: payment.checkoutUrl,
      createdAt: new Date().toISOString(),
    };
    const index = members.findIndex((item) => item.userId === user.id);
    if (index >= 0) members[index] = record;
    else members.push(record);
    funds[fundIndex].members = members;
    await saveFunds(funds);
    return NextResponse.json(
      {
        orderCode,
        amount: contribution,
        qrDataUrl,
        accountName: payment.accountName,
        checkoutUrl: payment.checkoutUrl,
        status: "PENDING",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Fund payment] create:", error);
    const payOSError =
      typeof error?.desc === "string" && error.desc.trim()
        ? `PayOS: ${error.desc.trim()}`
        : "Không thể tạo yêu cầu thanh toán PayOS";
    return NextResponse.json({ error: payOSError }, { status: 502 });
  }
}

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!token?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const orderCode = Number(req.nextUrl.searchParams.get("orderCode"));
  if (!Number.isSafeInteger(orderCode) || orderCode <= 0)
    return NextResponse.json(
      { error: "Mã đơn thanh toán không hợp lệ" },
      { status: 400 },
    );
  const funds = await getFunds();
  for (const fund of funds) {
    const paymentIndex = (fund.members || []).findIndex(
      (item) => Number(item.orderCode) === orderCode,
    );
    if (paymentIndex >= 0) {
      const payment = fund.members[paymentIndex];
      if (
        payment.userId !== token.id &&
        !["admin", "assistant"].includes(token.role)
      )
        return NextResponse.json(
          { error: "Không có quyền xem giao dịch" },
          { status: 403 },
        );

      if (!payment.paid && configured()) {
        try {
          const remotePayment = await payOS().paymentRequests.get(orderCode);
          const remoteStatus = remotePayment.status || "PENDING";

          if (
            remoteStatus === "PAID" &&
            Number(remotePayment.amountPaid) >= Number(payment.amount)
          ) {
            const now = new Date().toISOString();
            const transactions = remotePayment.transactions || [];
            const latestTransaction = transactions.at(-1);
            fund.members[paymentIndex] = {
              ...payment,
              paid: true,
              paymentStatus: "PAID",
              paidAt: latestTransaction?.transactionDateTime || now,
              paymentReference: latestTransaction?.reference || "",
              updatedAt: now,
            };
            fund.updatedAt = now;
            await saveFunds(funds);
            const payer = (await getUsers()).find(
              (user) => user.id === payment.userId,
            );
            await appendAuditLog({
              adminId: payment.userId,
              adminName: payer?.name || payment.memberName || "Nhân sự",
              adminEmail: payer?.email || "",
              action: "PAYOS_FUND_PAYMENT",
              targetType: "FUND",
              targetId: fund.id,
              details: `${payer?.name || payment.memberName || "Nhân sự"} đã đóng ${Number(payment.amount).toLocaleString("vi-VN")} đồng quỹ tháng ${fund.month}/${fund.year}, mã đơn ${orderCode}`,
            });
            return NextResponse.json({ status: "PAID", paid: true });
          }

          if (payment.paymentStatus !== remoteStatus) {
            fund.members[paymentIndex] = {
              ...payment,
              paymentStatus: remoteStatus,
              updatedAt: new Date().toISOString(),
            };
            await saveFunds(funds);
          }
        } catch (error) {
          console.error("[Fund payment] reconcile:", error);
        }
      }

      const currentPayment = fund.members[paymentIndex];
      return NextResponse.json({
        status:
          currentPayment.paymentStatus ||
          (currentPayment.paid ? "PAID" : "PENDING"),
        paid: Boolean(currentPayment.paid),
      });
    }
  }
  return NextResponse.json(
    { error: "Không tìm thấy yêu cầu thanh toán" },
    { status: 404 },
  );
}
