import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getWaterExemptions,
  getUsers,
  saveWaterExemptions,
} from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET() {
  return NextResponse.json({ userIds: getWaterExemptions() });
}

export async function PATCH(req) {
  const token = await getToken({ req, secret });
  if (token?.role !== "admin") {
    return NextResponse.json(
      { error: "Chỉ Admin có quyền quản lý danh sách miễn bê nước" },
      { status: 403 },
    );
  }
  const { userIds = [] } = await req.json();
  const eligibleIds = new Set(
    getUsers()
      .filter((user) => user.status === "able" && user.role === "user")
      .map((user) => user.id),
  );
  const normalized = [...new Set(userIds)].filter((id) => eligibleIds.has(id));
  saveWaterExemptions(normalized);
  return NextResponse.json({ userIds: normalized });
}
