import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  appendAuditLog,
  getAssets,
  saveAssetProduct,
} from "@/libs/dataRepository";

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
      categoryId: String(body.categoryId || "").trim(),
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

export async function PUT(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );

  try {
    const body = await req.json();
    if (!Array.isArray(body.products) || !body.products.length)
      return NextResponse.json(
        { error: "File Excel không có dữ liệu sản phẩm" },
        { status: 400 },
      );

    const { products: currentProducts = [] } = await getAssets();
    const currentByCode = new Map(
      currentProducts.map((item) => [item.code.toUpperCase(), item]),
    );
    const incomingByCode = new Map();

    for (const row of body.products) {
      const code = String(row.code || "")
        .trim()
        .toUpperCase();
      const name = String(row.name || "").trim();
      if (!code || !name) continue;
      incomingByCode.set(code, {
        code,
        name,
        categoryId: String(row.categoryId || "").trim(),
        unit: String(row.unit || "Cái").trim() || "Cái",
        description: String(row.description || "").trim(),
        location: String(row.location || "").trim(),
        active: row.active !== false,
      });
    }

    if (!incomingByCode.size)
      return NextResponse.json(
        { error: "Không tìm thấy dòng có đủ Mã và Tên sản phẩm" },
        { status: 400 },
      );

    let added = 0;
    let updated = 0;
    for (const item of incomingByCode.values()) {
      const existing = currentByCode.get(item.code);
      await saveAssetProduct({
        ...existing,
        ...item,
        id: existing?.id || `product_${slug(item.code) || Date.now()}`,
        active: item.active,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
      if (existing) updated += 1;
      else added += 1;
    }

    await appendAuditLog({
      adminId: token.id,
      adminName: token.name || "Người dùng",
      adminEmail: token.email || "",
      action: "UPSERT_ASSET_PRODUCTS_FROM_EXCEL",
      targetType: "ASSET_PRODUCT",
      details: `Import Excel: thêm ${added}, cập nhật ${updated} sản phẩm`,
    });

    return NextResponse.json({ summary: { added, updated } });
  } catch (error) {
    console.error("[API Asset Products Import]", error);
    return NextResponse.json(
      { error: error.message || "Không thể import danh sách sản phẩm" },
      { status: 400 },
    );
  }
}
