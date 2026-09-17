import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getFunds, getUsers } from "@/libs/dataRepository";
import {
  aggregateFundContributions,
  personalFundContributions,
} from "@/libs/fundStatistics";
import { currentFundPeriod, periodKey } from "@/libs/fundRules";
export async function GET(req) {
  if (!(await getToken({ req, secret: process.env.NEXTAUTH_SECRET }))?.id)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const userId = req.nextUrl.searchParams.get("userId");
  const year = Number(req.nextUrl.searchParams.get("year"));
  const valid = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
  if (
    !valid(from) ||
    !valid(to) ||
    from > to ||
    to > periodKey(currentFundPeriod())
  )
    return NextResponse.json(
      {
        error:
          "Vui lòng chọn khoảng tháng hợp lệ, không vượt quá tháng hiện tại",
      },
      { status: 400 },
    );
  try {
    const [funds, users] = await Promise.all([getFunds(), getUsers()]);
    const selectedUser = userId
      ? users.find((user) => user.id === userId)
      : null;
    return NextResponse.json({
      members: aggregateFundContributions(funds, users, from, to),
      personal:
        selectedUser && Number.isInteger(year)
          ? {
              user: { id: selectedUser.id, name: selectedUser.name },
              year,
              months: personalFundContributions(funds, userId, year),
            }
          : null,
      from,
      to,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể tải thống kê đóng quỹ" },
      { status: 500 },
    );
  }
}
