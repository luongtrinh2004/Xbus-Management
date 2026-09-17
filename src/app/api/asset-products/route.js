import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAssets, saveAssetProduct } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManage = (token) => ["admin", "assistant"].includes(token?.role);
const slug = (value) =>
  String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  try {
    const body = await req.json();
    const code = String(body.code || "")
      .trim()
      .toUpperCase();
    const name = String(body.name || "").trim();
    const unit = String(body.unit || "").trim();
    if (!code || !name || !unit)
      return NextResponse.json(
        { error: "Mã, tên và đơn vị tính là bắt buộc" },
        { status: 400 },
      );
    const { products = [] } = await getAssets();
    const existing = products.find((item) => item.code === code);
    if (existing && !body.id)
      return NextResponse.json(
        { error: "Mã sản phẩm đã tồn tại" },
        { status: 409 },
      );
    if (body.id && existing && existing.id !== body.id)
      return NextResponse.json(
        { error: "Mã sản phẩm đã tồn tại" },
        { status: 409 },
      );
    const product = {
      id: body.id || `product_${slug(code) || Date.now()}`,
      code,
      name,
      unit,
      description: String(body.description || "").trim(),
      location: String(body.location || "").trim(),
      active: body.active !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await saveAssetProduct(product);
    return NextResponse.json(product, { status: body.id ? 200 : 201 });
  } catch (error) {
    console.error("[API Asset Products]", error);
    return NextResponse.json(
      { error: "Không thể lưu sản phẩm" },
      { status: 500 },
    );
  }
}
