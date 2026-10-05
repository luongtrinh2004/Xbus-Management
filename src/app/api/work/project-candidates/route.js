import { NextResponse } from "next/server";
import { loadWorkContext, publicUser } from "@/libs/workApi";

export async function GET(req) {
  const { actor, users } = await loadWorkContext(req);
  if (!actor)
    return NextResponse.json(
      { error: "Vui lòng đăng nhập bằng tài khoản đang hoạt động" },
      { status: 401 },
    );
  return NextResponse.json({
    canCreate: true,
    users: users.map(publicUser),
  });
}
