import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { appendAuditLog, getAssets, saveAssets } from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManageAssets = (token) => token?.role === "admin" || token?.role === "assistant";
const normalizeData = (data) => ({
  imports: Array.isArray(data.imports) ? data.imports : [],
  exports: Array.isArray(data.exports) ? data.exports : [],
});

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!canManageAssets(token)) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  return NextResponse.json(normalizeData(getAssets()));
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!canManageAssets(token)) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    const body = await req.json();
    const data = normalizeData(getAssets());
    const type = body.type === "export" ? "export" : "import";
    const quantity = Number(body.quantity);
    if (!body.code?.trim() || !body.name?.trim() || !body.date || !body.location?.trim() || !body.person?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ các trường bắt buộc" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Số lượng phải là số nguyên lớn hơn 0" }, { status: 400 });
    }
    const source = data.imports.find((item) => item.code === body.code);
    if (type === "export") {
      if (!source) return NextResponse.json({ error: "Mã tài sản không tồn tại trong bảng nhập" }, { status: 400 });
      const imported = data.imports.filter((item) => item.code === body.code).reduce((sum, item) => sum + item.quantity, 0);
      const exported = data.exports.filter((item) => item.code === body.code).reduce((sum, item) => sum + item.quantity, 0);
      if (quantity > imported - exported) return NextResponse.json({ error: `Số lượng tồn kho chỉ còn ${imported - exported}` }, { status: 400 });
    }
    const record = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: body.code.trim(), name: type === "export" ? source.name : body.name.trim(), date: body.date,
      quantity, location: type === "export" ? source.location : body.location.trim(), person: body.person.trim(),
      note: body.note?.trim() || "", createdAt: new Date().toISOString(),
    };
    data[type === "export" ? "exports" : "imports"].unshift(record);
    saveAssets(data);
    appendAuditLog({
      adminId: token.id, adminName: token.name || "Người dùng", adminEmail: token.email || "",
      action: type === "export" ? "EXPORT_ASSET" : "IMPORT_ASSET", targetType: "ASSET", targetId: record.id,
      details: `${type === "export" ? "Xuất" : "Nhập"} ${quantity} ${record.name} (${record.code})`,
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[API Assets] POST:", error);
    return NextResponse.json({ error: "Không thể lưu giao dịch tài sản" }, { status: 500 });
  }
}
