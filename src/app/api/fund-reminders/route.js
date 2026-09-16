import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import nodemailer from "nodemailer";
import {
  getFunds,
  getUsers,
  saveFunds,
  appendAuditLog,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const nowDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  if (!["admin", "assistant"].includes(token?.role))
    return NextResponse.json(
      { error: "Không có quyền thiết lập nhắc quỹ" },
      { status: 403 },
    );
  const {
    month,
    year,
    paymentDeadline,
    reminderDaysBefore,
    emailReminderEnabled,
  } = await req.json();
  const funds = await getFunds();
  const fund = funds.find(
    (item) => item.month === Number(month) && item.year === Number(year),
  );
  if (!fund || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDeadline || ""))
    return NextResponse.json(
      { error: "Deadline không hợp lệ" },
      { status: 400 },
    );
  fund.paymentDeadline = paymentDeadline;
  fund.reminderDaysBefore = [
    ...new Set(
      (reminderDaysBefore || [])
        .map(Number)
        .filter((day) => Number.isInteger(day) && day > 0 && day <= 31),
    ),
  ];
  fund.emailReminderEnabled = Boolean(emailReminderEnabled);
  fund.reminderLogs ||= [];
  await saveFunds(funds);
  return NextResponse.json(fund);
}

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!["admin", "assistant"].includes(token?.role))
    return NextResponse.json(
      { error: "Không có quyền gửi nhắc quỹ" },
      { status: 403 },
    );
  const { month, year, userId } = await req.json();
  const funds = await getFunds();
  const fund = funds.find(
    (item) => item.month === Number(month) && item.year === Number(year),
  );
  const user = (await getUsers()).find((item) => item.id === userId);
  if (
    !fund ||
    !user ||
    (fund.members || []).some(
      (item) =>
        item.userId === userId && (item.paid || item.obligationCancelled),
    )
  )
    return NextResponse.json(
      { error: "Không thể gửi nhắc cho nhân sự này" },
      { status: 400 },
    );
  if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD)
    return NextResponse.json(
      { error: "Email nhắc chưa được cấu hình" },
      { status: 503 },
    );
  await nodemailer
    .createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD,
      },
    })
    .sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `Nhắc đóng quỹ tháng ${month}/${year}`,
      text: `Chào ${user.name}, bạn chưa đóng quỹ tháng ${month}/${year}. Hạn đóng: ${fund.paymentDeadline || "chưa thiết lập"}. Vui lòng truy cập hệ thống để thanh toán.`,
    });
  fund.reminderLogs ||= [];
  fund.reminderLogs.push({
    userId,
    sentAt: new Date().toISOString(),
    trigger: "manual",
    deadline: fund.paymentDeadline || null,
  });
  await saveFunds(funds);
  await appendAuditLog({
    adminId: token.id,
    adminName: token.name,
    adminEmail: token.email,
    action: "SEND_FUND_REMINDER",
    targetType: "FUND",
    targetId: fund.id,
    details: `Đã xếp hàng gửi nhắc đóng quỹ cho ${user.email}`,
  });
  return NextResponse.json({
    message: "Đã ghi nhận yêu cầu gửi nhắc",
    sentAt: nowDate(),
  });
}
