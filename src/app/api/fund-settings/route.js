import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSettings, saveSettings } from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;
const defaults = {
  category_official: 150000,
  category_probation: 150000,
  category_intern: 100000,
  category_collaborator: 100000,
};

const normalize = (amounts) =>
  Object.fromEntries(
    Object.keys(defaults).map((key) => [
      key,
      Number(amounts?.[key]) || defaults[key],
    ]),
  );

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({
    minimumAmounts: normalize(settings.fundMinimumAmounts),
  });
}

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  if (!["admin", "assistant"].includes(token?.role)) {
    return NextResponse.json(
      { error: "Bạn không có quyền cập nhật mức đóng quỹ" },
      { status: 403 },
    );
  }
  try {
    const body = await req.json();
    const minimumAmounts = normalize(body.minimumAmounts);
    if (
      Object.values(minimumAmounts).some(
        (amount) => !Number.isInteger(amount) || amount < 1000,
      )
    ) {
      return NextResponse.json(
        { error: "Mức đóng tối thiểu phải từ 1.000 VNĐ" },
        { status: 400 },
      );
    }
    const settings = getSettings();
    saveSettings({ ...settings, fundMinimumAmounts: minimumAmounts });
    return NextResponse.json({ minimumAmounts });
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu mức đóng không hợp lệ" },
      { status: 400 },
    );
  }
}
