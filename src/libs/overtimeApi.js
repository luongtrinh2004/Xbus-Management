import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers } from "@/libs/dataRepository";
import { OvertimeError } from "./overtime.js";

export async function overtimeContext(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) throw new OvertimeError("Vui lòng đăng nhập", 401);
  const users = await getUsers();
  const actor = users.find(
    (user) => user.id === token.id && user.status === "able",
  );
  if (!actor) throw new OvertimeError("Tài khoản không có quyền truy cập", 403);
  return { users, actor };
}
export function overtimeFailure(error) {
  if (!(error instanceof OvertimeError)) console.error("[Overtime]", error);
  return NextResponse.json(
    {
      error:
        error instanceof OvertimeError
          ? error.message
          : "Không thể xử lý OT. Vui lòng thử lại.",
    },
    { status: error instanceof OvertimeError ? error.status : 500 },
  );
}
