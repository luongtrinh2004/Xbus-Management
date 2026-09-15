import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import QRCode from "qrcode";
import { PayOS } from "@payos/node";
import {
  getFunds,
  getSettings,
  getUsers,
  saveFunds,
} from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;
const defaults = {
  category_official: 150000,
  category_probation: 150000,
  category_intern: 100000,
  category_collaborator: 100000,
};
const configured = () =>
  Boolean(
    process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY,
  );
const getMinimum = (categoryId) =>
  Number(getSettings().fundMinimumAmounts?.[categoryId]) ||
  defaults[categoryId] ||
  100000;
const payOS = () =>
  new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
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
    const funds = getFunds();
    const fundIndex = funds.findIndex(
      (fund) => fund.month === Number(month) && fund.year === Number(year),
    );
    if (fundIndex < 0)
      return NextResponse.json(
        { error: "Không tìm thấy kỳ quỹ" },
        { status: 404 },
      );
    const users = getUsers();
    const user = users.find((item) => item.id === token.id);
    if (!user || user.status !== "able")
      return NextResponse.json(
        { error: "Tài khoản không thể đóng quỹ" },
        { status: 403 },
      );
    const contribution = Number(amount);
    const minimum = getMinimum(user.categoryId);
    if (!Number.isInteger(contribution) || contribution < minimum)
      return NextResponse.json(
        {
          error: `Số tiền đóng tối thiểu là ${minimum.toLocaleString("vi-VN")} VNĐ`,
        },
        { status: 400 },
      );
    const existing = (funds[fundIndex].members || []).find(
      (item) => item.userId === user.id,
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
      returnUrl: `${appUrl}/fund?section=members`,
      cancelUrl: `${appUrl}/fund?section=members`,
    });
    const qrDataUrl = payment.qrCode
      ? await QRCode.toDataURL(payment.qrCode, { width: 280, margin: 1 })
      : null;
    const members = funds[fundIndex].members || [];
    const record = {
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
    saveFunds(funds);
    return NextResponse.json(
      {
        orderCode,
        amount: contribution,
        qrDataUrl,
        checkoutUrl: payment.checkoutUrl,
        status: "PENDING",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Fund payment] create:", error);
    return NextResponse.json(
      { error: "Không thể tạo yêu cầu thanh toán PayOS" },
      { status: 502 },
    );
  }
}

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!token?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const orderCode = Number(req.nextUrl.searchParams.get("orderCode"));
  for (const fund of getFunds()) {
    const payment = (fund.members || []).find(
      (item) => item.orderCode === orderCode,
    );
    if (payment) {
      if (
        payment.userId !== token.id &&
        !["admin", "assistant"].includes(token.role)
      )
        return NextResponse.json(
          { error: "Không có quyền xem giao dịch" },
          { status: 403 },
        );
      return NextResponse.json({
        status: payment.paymentStatus || (payment.paid ? "PAID" : "PENDING"),
        paid: Boolean(payment.paid),
      });
    }
  }
  return NextResponse.json(
    { error: "Không tìm thấy yêu cầu thanh toán" },
    { status: 404 },
  );
}
