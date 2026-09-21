import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "node:crypto";
import {
  appendAuditLog,
  getAssets,
  saveAssetProduct,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManage = (token) => ["admin", "assistant"].includes(token?.role);
const createProductId = () =>
  `product_${Date.now().toString(36)}_${crypto.randomBytes(8).toString("hex")}`;

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
    if ((!code && !body.id) || !name || !unit)
      return NextResponse.json(
        { error: "Mã, tên và đơn vị tính là bắt buộc" },
        { status: 400 },
      );
    const { products = [], units = [] } = await getAssets();
    const configuredUnit = units.find(
      (item) => item.name.toLocaleLowerCase("vi") === unit.toLocaleLowerCase("vi"),
    );
    if (!configuredUnit)
      return NextResponse.json(
        { error: "Đơn vị tính không có trong cấu hình sản phẩm" },
        { status: 400 },
      );
    const existingByCode = code
      ? products.find((item) => item.code === code)
      : null;
    const existingById = body.id
      ? products.find((item) => item.id === body.id)
      : null;
    if (existingByCode && !body.id)
      return NextResponse.json(
        { error: "Mã sản phẩm đã tồn tại" },
        { status: 409 },
      );
    if (body.id && existingByCode && existingByCode.id !== body.id)
      return NextResponse.json(
        { error: "Mã sản phẩm đã tồn tại" },
        { status: 409 },
      );
    const product = {
      id: body.id || createProductId(),
      code,
      name,
      categoryId: String(body.categoryId || "").trim(),
      unit: configuredUnit.name,
      description: String(body.description || "").trim(),
      location: String(body.location || "").trim(),
      active: body.active !== false,
      createdAt: existingById?.createdAt || new Date().toISOString(),
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

    const {
      products: currentProducts = [],
      categories = [],
      units = [],
    } = await getAssets();
    const currentByCode = new Map(
      currentProducts
        .filter((item) => item.code)
        .map((item) => [item.code.toUpperCase(), item]),
    );
    const currentByName = new Map(
      currentProducts.map((item) => [item.name.toLocaleLowerCase("vi"), item]),
    );
    const incomingByCode = new Map();

    for (const [rowIndex, row] of body.products.entries()) {
      let code = String(row.code || "")
        .trim()
        .toUpperCase();
      const name = String(row.name || "").trim();
      if (!name) continue;
      const requestedCategoryId = String(row.categoryId || "").trim();
      const requestedCategoryName = String(row.categoryName || "").trim();
      const category = categories.find(
        (item) =>
          item.id === requestedCategoryId ||
          item.name.toLocaleLowerCase("vi") ===
            requestedCategoryName.toLocaleLowerCase("vi"),
      );
      const requestedUnit = String(row.unit || "Cái").trim() || "Cái";
      const unit = units.find(
        (item) =>
          item.name.toLocaleLowerCase("vi") ===
          requestedUnit.toLocaleLowerCase("vi"),
      );
      if (!unit)
        throw new Error(
          `Đơn vị tính "${requestedUnit}" của sản phẩm ${code || name} chưa được cấu hình`,
        );
      incomingByCode.set(code || `__empty_code_${rowIndex}`, {
        code: code || "",
        name,
        categoryId: category?.id || "",
        unit: unit.name,
        description: String(row.description || "").trim(),
        location: String(row.location || "").trim(),
        active: row.active !== false,
      });
    }

    if (!incomingByCode.size)
      return NextResponse.json(
        { error: "Không tìm thấy dòng có Tên sản phẩm" },
        { status: 400 },
      );

    let added = 0;
    let updated = 0;
    for (const item of incomingByCode.values()) {
      const existing = item.code
        ? currentByCode.get(item.code)
        : currentByName.get(item.name.toLocaleLowerCase("vi"));
      await saveAssetProduct({
        ...existing,
        ...item,
        id: existing?.id || createProductId(),
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
      details: `Import danh sách mới: thêm ${added}, cập nhật ${updated} sản phẩm`,
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
