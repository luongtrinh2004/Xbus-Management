import { actionLabel, targetLabels } from "@/libs/auditLabels";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuditLogs, getUsers, getFunds } from "@/libs/dataRepository";
import { toVietnamDateKey } from "@/libs/dateTime";
import { resolveAvatar } from "@/utils/getDefaultAvatar";

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
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const actor = (searchParams.get("actor") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const action = (searchParams.get("action") || "").trim();
    const targetType = (searchParams.get("targetType") || "").trim();
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const exportAll = searchParams.get("exportAll") === "true";

    const users = await getUsers();
    const funds = await getFunds();
    const rawLogs = await getAuditLogs();

    const allLogs = rawLogs.map((log) => {
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
      const member = fund?.members?.find(
        (m) => String(m.orderCode) === orderCode,
      );
      const actorUser = users.find(
        (user) =>
          user.id === (member?.userId || log.adminId) ||
          (log.adminName &&
            user.name?.toLowerCase() === log.adminName?.toLowerCase()) ||
          (log.adminEmail &&
            user.email?.toLowerCase() === log.adminEmail?.toLowerCase()),
      );

      const adminName =
        actorUser?.name ||
        (legacyPayment ? "Người đóng chưa xác định" : log.adminName) ||
        "Không xác định";

      let actorRole = actorUser?.role || log.actorRole;
      if (!actorRole || actorRole === "unknown") {
        if (
          log.adminEmail === "admin@phenikaa-x.com" ||
          log.adminId === "usr_admin_001" ||
          log.adminName?.toLowerCase().includes("quản trị")
        ) {
          actorRole = "admin";
        } else if (legacyPayment || member) {
          actorRole = "user";
        } else {
          actorRole = "user";
        }
      }

      const actorAvatar = resolveAvatar(
        actorUser || {
          avatarUrl: log.adminAvatarUrl,
          role: actorRole,
          gender: "male",
        },
      );

      const timestamp = log.timestamp || log.createdAt;
      const dateKey = toVietnamDateKey(timestamp);

      return {
        ...log,
        adminName,
        actorRole,
        actorAvatar,
        createdAt: timestamp,
        timestamp,
        dateKey,
        details: legacyPayment
          ? actorUser
            ? `${actorUser.name} đã đóng ${Number(member?.amount || 0).toLocaleString("vi-VN")} đồng quỹ tháng ${fund?.month}/${fund?.year}, mã đơn ${orderCode}`
            : log.details.replace(/^PayOS xác nhận đóng quỹ:/, "Đã đóng quỹ:")
          : log.details,
      };
    });

    // Extract unique actors, actions, targetTypes across allLogs before filtering
    const uniqueActorsMap = new Map();
    const uniqueActionsSet = new Set();
    const uniqueTargetsSet = new Set();

    allLogs.forEach((log) => {
      if (log.adminName && log.adminName !== "Không xác định") {
        uniqueActorsMap.set(log.adminName, {
          name: log.adminName,
          role: log.actorRole,
          avatar: log.actorAvatar,
        });
      }
      if (log.action) uniqueActionsSet.add(log.action);
      if (log.targetType) uniqueTargetsSet.add(log.targetType);
    });

    // Add registered users who might not have actions yet
    users.forEach((u) => {
      if (u.name && !uniqueActorsMap.has(u.name)) {
        uniqueActorsMap.set(u.name, {
          name: u.name,
          role: u.role || "user",
          avatar: resolveAvatar(u),
        });
      }
    });

    // Filter
    let filteredLogs = allLogs;

    if (startDate) {
      filteredLogs = filteredLogs.filter((log) => log.dateKey >= startDate);
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter((log) => log.dateKey <= endDate);
    }
    if (actor && actor !== "all") {
      const lowerActor = actor.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.adminName?.toLowerCase() === lowerActor ||
          log.adminName?.toLowerCase().includes(lowerActor) ||
          log.adminId === actor,
      );
    }
    if (role && role !== "all") {
      filteredLogs = filteredLogs.filter((log) => log.actorRole === role);
    }
    if (action && action !== "all") {
      filteredLogs = filteredLogs.filter((log) => log.action === action);
    }
    if (targetType && targetType !== "all") {
      filteredLogs = filteredLogs.filter((log) => log.targetType === targetType);
    }
    if (search) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.adminName?.toLowerCase().includes(search) ||
          log.details?.toLowerCase().includes(search) ||
          log.action?.toLowerCase().includes(search) ||
          actionLabel(log.action).toLowerCase().includes(search) ||
          targetLabels[log.targetType]?.toLowerCase().includes(search) ||
          log.targetType?.toLowerCase().includes(search),
      );
    }

    if (exportAll) {
      return NextResponse.json({
        logs: filteredLogs,
        total: filteredLogs.length,
      });
    }

    const total = filteredLogs.length;
    const skip = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(skip, skip + limit);

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        total,
        limit,
      },
      filterOptions: {
        actors: Array.from(uniqueActorsMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "vi"),
        ),
        actions: Array.from(uniqueActionsSet),
        targetTypes: Array.from(uniqueTargetsSet),
      },
    });
  } catch (error) {
    console.error("[API AuditLogs] GET:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
