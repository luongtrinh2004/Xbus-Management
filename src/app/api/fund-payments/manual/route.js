import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getFunds,
  saveFunds,
  getUsers,
  getSettings,
} from "@/libs/dataRepository";
import { createNotification } from "@/libs/notificationStorage";
import { snapshotFund } from "@/libs/fundRules";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const month = Number(body.month);
    const year = Number(body.year);
    const amount = Number(body.amount);
    const note = String(body.note || "").trim();

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year)
    ) {
      return NextResponse.json({ error: "Kỳ không hợp lệ" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Số tiền đóng không hợp lệ" },
        { status: 400 },
      );
    }

    const [allFunds, users, settings] = await Promise.all([
      getFunds(),
      getUsers(),
      getSettings(),
    ]);

    const fundIndex = allFunds.findIndex(
      (f) => f.month === month && f.year === year,
    );
    if (fundIndex < 0) {
      return NextResponse.json(
        { error: "Không tìm thấy kỳ quỹ" },
        { status: 404 },
      );
    }

    snapshotFund(allFunds[fundIndex], users, settings);

    const members = allFunds[fundIndex].members || [];
    let member = members.find((m) => m.userId === token.id);
    if (!member) {
      member = {
        userId: token.id,
        memberName: token.name,
        paid: false,
        amount: 0,
      };
      members.push(member);
    }

    if (member.obligationCancelled) {
      return NextResponse.json(
        { error: "Nghĩa vụ đóng quỹ của bạn trong kỳ này đã được hủy" },
        { status: 400 },
      );
    }

    member.amount = amount;
    member.paid = false;
    member.pendingApproval = true;
    member.paymentMethod = "manual";
    member.note = note;
    member.paidAt = new Date().toISOString();
    member.updatedAt = new Date().toISOString();

    allFunds[fundIndex].members = members;
    await saveFunds(allFunds);

    // Gửi thông báo cho toàn bộ Admin và Trợ lý
    createNotification({
      targetRole: "admin",
      type: "fund_manual_payment",
      title: "Yêu cầu duyệt đóng quỹ thủ công",
      message: `${token.name || "Nhân sự"} đã nộp quỹ thủ công ${amount.toLocaleString("vi-VN")}đ cho tháng ${String(month).padStart(2, "0")}/${year}. Đang chờ xác nhận.`,
      link: "/fund?section=members",
      action: {
        actionType: "confirm_fund",
        month,
        year,
        userId: token.id,
        amount,
        memberName: token.name,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Đã gửi yêu cầu đóng quỹ thủ công thành công. Vui lòng chờ admin/trợ lý xác nhận.",
    });
  } catch (error) {
    console.error("[API Manual Payment] POST Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
