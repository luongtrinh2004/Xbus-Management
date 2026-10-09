import { overtimeContext, overtimeFailure } from "@/libs/overtimeApi";
import { NextResponse } from "next/server";
import { readOvertime, mutateOvertimeStorage } from "@/libs/overtimeRepository";
import {
  isOtManager,
  mutateOvertime,
  overtimeView,
  parseOtFilters,
  OvertimeError,
} from "@/libs/overtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req) {
  try {
    const { users, actor } = await overtimeContext(req);
    const state = await readOvertime();
    const params = new URL(req.url).searchParams;
    if (params.has("id")) {
      const record = state.requests.find(
        (item) =>
          item.id === params.get("id") &&
          (isOtManager(actor) || item.userId === actor.id),
      );
      if (!record) throw new OvertimeError("Không tìm thấy đơn OT", 404);
      const names = new Map(users.map((user) => [user.id, user.name]));
      return NextResponse.json({
        record,
        history: state.history
          .filter((item) => item.overtimeId === record.id)
          .map((item) => ({
            ...item,
            actorName: names.get(item.changedBy) || "Nhân sự đã nghỉ",
          })),
      });
    }
    const filters = parseOtFilters(params);
    const view = overtimeView(state, actor, users, filters);
    const page = Number(params.get("page") || 1),
      limit = Number(params.get("limit") || 10);
    if (!Number.isInteger(page) || page < 1 || ![10, 25, 50].includes(limit))
      throw new OvertimeError("Phân trang không hợp lệ");
    const { entries, ...stats } = view;
    return NextResponse.json({
      ...stats,
      entries: entries.slice((page - 1) * limit, page * limit),
      total: entries.length,
      page,
      limit,
      filters,
      config: state.config,
      actor: { id: actor.id, name: actor.name, role: actor.role },
      users: (isOtManager(actor) ? users : [actor]).map((user) => ({
        id: user.id,
        name: user.name,
        status: user.status,
      })),
    });
  } catch (error) {
    return overtimeFailure(error);
  }
}
async function write(req, createOnly) {
  try {
    const { users, actor } = await overtimeContext(req);
    let body;
    try {
      body = await req.json();
    } catch {
      throw new OvertimeError("Nội dung yêu cầu không hợp lệ");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new OvertimeError("Nội dung yêu cầu không hợp lệ");
    if (createOnly) body.action = "create";
    const result = await mutateOvertimeStorage((state) => ({
      state,
      result: mutateOvertime(state, actor, body, users),
    }));
    return NextResponse.json(result, { status: createOnly ? 201 : 200 });
  } catch (error) {
    return overtimeFailure(error);
  }
}
export const POST = (req) => write(req, true);
export const PATCH = (req) => write(req, false);
