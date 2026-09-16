import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuditLogs, getUsers, getFunds } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!["admin", "assistant"].includes(token?.role)) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const users = await getUsers();
    const funds = await getFunds();
    const allLogs = (await getAuditLogs()).map((log) => {
      const legacyPayment =
        log.action === "PAYOS_FUND_PAYMENT" && log.adminId === "payos";
      const orderCode = legacyPayment
        ? log.details?.match(/mã đơn\s+(\d+)/)?.[1]
        : null;
      const fund = legacyPayment
        ? funds.find((f) =>
            f.members?.some((m) => String(m.orderCode) === orderCode),
          )
        : null;
      const member = fund?.members.find(
        (m) => String(m.orderCode) === orderCode,
      );
      const actor = users.find(
        (user) => user.id === (member?.userId || log.adminId),
      );
      return {
        ...log,
        adminName:
          actor?.name ||
          (legacyPayment ? "Người đóng chưa xác định" : log.adminName) ||
          "Không xác định",
        actorRole: actor?.role || log.actorRole || "unknown",
        details: legacyPayment
          ? actor
            ? `${actor.name} đã đóng ${Number(member.amount).toLocaleString("vi-VN")} đồng quỹ tháng ${fund.month}/${fund.year}, mã đơn ${orderCode}`
            : log.details.replace(/^PayOS xác nhận đóng quỹ:/, "Đã đóng quỹ:")
          : log.details,
      };
    });
    const skip = (page - 1) * limit;
    const logs = allLogs.slice(skip, skip + limit);

    // Thêm alias createdAt từ timestamp
    const mapped = logs.map((l) => ({
      ...l,
      createdAt: l.timestamp || l.createdAt,
    }));

    return NextResponse.json({
      logs: mapped,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allLogs.length / limit),
        total: allLogs.length,
        limit,
      },
    });
  } catch (error) {
    console.error("[API AuditLogs] GET:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
