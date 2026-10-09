import { NextResponse } from "next/server";
import { overtimeContext, overtimeFailure } from "@/libs/overtimeApi";
import { readOvertime } from "@/libs/overtimeRepository";
import {
  isOtManager,
  OvertimeError,
  overtimeView,
  parseOtFilters,
} from "@/libs/overtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req) {
  try {
    const { actor, users } = await overtimeContext(req);
    if (!isOtManager(actor))
      throw new OvertimeError(
        "Chỉ Admin và trợ lý được xem thống kê toàn bộ nhân sự",
        403,
      );
    const filters = {
      ...parseOtFilters(new URL(req.url).searchParams),
      scope: "all",
    };
    const view = overtimeView(await readOvertime(), actor, users, filters);
    const totals = new Map(
      view.employees.map((employee) => [employee.userId, employee]),
    );
    const employees = users
      .filter((user) => !filters.userId || filters.userId === user.id)
      .map(
        (user) =>
          totals.get(user.id) || {
            userId: user.id,
            name: user.name || user.email || "Nhân sự chưa đặt tên",
            registeredMinutes: 0,
            confirmedMinutes: 0,
            completed: 0,
          },
      )
      .sort(
        (a, b) =>
          b.confirmedMinutes - a.confirmedMinutes ||
          b.registeredMinutes - a.registeredMinutes ||
          a.name.localeCompare(b.name, "vi"),
      );
    return NextResponse.json({
      summary: view.summary,
      employees,
      months: view.months,
      types: view.types,
      filters,
      users: users.map((user) => ({
        id: user.id,
        name: user.name || user.email || "Nhân sự chưa đặt tên",
      })),
      totalRequests: view.entries.length,
    });
  } catch (error) {
    return overtimeFailure(error);
  }
}
