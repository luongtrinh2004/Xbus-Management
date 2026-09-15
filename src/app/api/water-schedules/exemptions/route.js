import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getWaterExemptions,
  getUsers,
  saveWaterExemptions,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET() {
  return NextResponse.json({ userIds: await getWaterExemptions() });
}

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  if (!["admin", "assistant"].includes(token?.role)) {
    return NextResponse.json(
      { error: "Chỉ Admin có quyền quản lý danh sách miễn bê nước" },
      { status: 403 },
    );
  }
  const { userIds = [] } = await req.json();
  const eligibleIds = new Set(
    (await getUsers())
      .filter((user) => user.status === "able" && user.role === "user")
      .map((user) => user.id),
  );
  const normalized = [...new Set(userIds)].filter((id) => eligibleIds.has(id));
  await saveWaterExemptions(normalized);
  return NextResponse.json({ userIds: normalized });
}
