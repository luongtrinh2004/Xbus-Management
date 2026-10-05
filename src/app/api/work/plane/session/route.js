import { NextResponse } from "next/server";
import { getWorkActor } from "@/libs/workApi";
import { syncPlanePersonnel } from "@/libs/planeIntegration";

export const runtime = "nodejs";

export async function POST(req) {
  const origin = req.headers.get("origin");
  let originHost;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || originHost !== req.headers.get("host")) {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  }
  try {
    const actor = await getWorkActor(req);
    if (!actor)
      return NextResponse.json(
        { error: "Vui lòng đăng nhập bằng tài khoản XBus đang hoạt động." },
        { status: 401 },
      );
    const data = await syncPlanePersonnel(actor.id);
    // Tickets are short-lived, single-use credentials; never cache this response.
    return NextResponse.json(
      { loginUrl: data.loginUrl, ticket: data.ticket, members: data.members },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Plane] Bootstrap failed:", error.message);
    return NextResponse.json(
      { error: "Không thể kết nối Plane hoặc đồng bộ nhân sự. Hãy thử lại." },
      { status: 502 },
    );
  }
}
