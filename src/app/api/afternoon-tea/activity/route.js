import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { publishAfternoonTeaEvent } from "@/libs/afternoonTeaRealtime";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(request) {
  const token = await getToken({ req: request, secret });
  if (!token?.id) {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }
  const body = await request.json();
  if (!body?.invitationId || !body?.userId || !body?.field) {
    return NextResponse.json(
      { error: "Thiếu dữ liệu hoạt động" },
      { status: 400 },
    );
  }
  if (!["page", "shop", "drink", "size", "note"].includes(body.field)) {
    return NextResponse.json(
      { error: "Trường hoạt động không hợp lệ" },
      { status: 400 },
    );
  }
  const canEditOther = ["admin", "assistant"].includes(token.role);
  if (!canEditOther && body.userId !== token.id) {
    return NextResponse.json(
      { error: "Không có quyền cập nhật" },
      { status: 403 },
    );
  }
  publishAfternoonTeaEvent({
    type: "activity",
    invitationId: String(body.invitationId),
    userId: String(body.userId),
    field: String(body.field),
    editorId: token.id,
    clientId: String(body.clientId || "").slice(0, 120),
    order: body.order
      ? {
          shop: String(body.order.shop || "").slice(0, 120),
          drink: String(body.order.drink || "").slice(0, 240),
          menuItemId: String(body.order.menuItemId || "").slice(0, 120),
          size: String(body.order.size || "").slice(0, 60),
          price: Math.max(0, Number(body.order.price) || 0),
          note: String(body.order.note || "").slice(0, 300),
        }
      : null,
  });
  return NextResponse.json({ ok: true });
}
