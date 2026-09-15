import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuditLogs, getUsers } from "@/libs/dataRepository";

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
    const allLogs = (await getAuditLogs()).map((log) => {
      const actor = users.find((user) => user.id === log.adminId);
      return {
        ...log,
        adminName: actor?.name || log.adminName || "Không xác định",
        actorRole: actor?.role || log.actorRole || "admin",
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
