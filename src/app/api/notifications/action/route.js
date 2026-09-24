import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getFunds, saveFunds, getUsers } from "@/libs/dataRepository";
import { createNotification } from "@/libs/notificationStorage";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    if (!["admin", "assistant"].includes(token.role)) {
      return NextResponse.json(
        { error: "Bạn không có quyền thực hiện hành động này" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { actionType, month, year, userId } = body;

    if (actionType === "confirm_fund") {
      const allFunds = await getFunds();
      const fund = allFunds.find(
        (f) => f.month === Number(month) && f.year === Number(year),
      );

      if (!fund) {
        return NextResponse.json(
          { error: "Không tìm thấy kỳ quỹ tương ứng" },
          { status: 404 },
        );
      }

      const member = (fund.members || []).find((m) => m.userId === userId);
      if (!member) {
        return NextResponse.json(
          { error: "Không tìm thấy thành viên trong kỳ quỹ" },
          { status: 404 },
        );
      }

      member.paid = true;
      member.pendingApproval = false;
      member.confirmedBy = token.name || "Quản trị viên";
      member.confirmedAt = new Date().toISOString();
      member.paidAt = member.paidAt || new Date().toISOString();

      await saveFunds(allFunds);

      // Gửi thông báo lại cho thành viên
      createNotification({
        userId,
        type: "fund_confirmed",
        title: "Xác nhận đóng quỹ thành công",
        message: `${token.name || "Quản trị viên"} đã xác nhận khoản đóng quỹ ${Number(member.amount || 0).toLocaleString("vi-VN")}đ tháng ${String(month).padStart(2, "0")}/${year} của bạn.`,
        link: "/fund?section=members",
      });

      return NextResponse.json({
        success: true,
        message: `Đã xác nhận đóng quỹ cho ${member.memberName || "thành viên"}`,
      });
    }

    return NextResponse.json(
      { error: "Hành động không hỗ trợ" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[API Notifications Action] POST Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
