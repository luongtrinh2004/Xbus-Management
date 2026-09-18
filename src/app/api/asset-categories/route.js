import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  deleteAssetCategory,
  getAssets,
  saveAssetCategory,
} from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const canManage = (token) => ["admin", "assistant"].includes(token?.role);
const slug = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!token) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const { categories = [] } = await getAssets();
  return NextResponse.json(categories);
}

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Tên loại sản phẩm là bắt buộc" }, { status: 400 });
  const { categories = [] } = await getAssets();
  const duplicate = categories.find(
    (item) => item.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi") && item.id !== body.id,
  );
  if (duplicate) return NextResponse.json({ error: "Loại sản phẩm đã tồn tại" }, { status: 409 });
  const category = {
    id: body.id || `asset_category_${slug(name) || Date.now()}`,
    name,
    createdAt: categories.find((item) => item.id === body.id)?.createdAt || new Date().toISOString(),
  };
  await saveAssetCategory(category);
  return NextResponse.json(category, { status: body.id ? 200 : 201 });
}

export async function DELETE(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  const { id } = await req.json();
  const { products = [] } = await getAssets();
  if (products.some((item) => item.categoryId === id))
    return NextResponse.json(
      { error: "Loại sản phẩm đang được sử dụng, không thể xóa" },
      { status: 409 },
    );
  await deleteAssetCategory(id);
  return NextResponse.json({ success: true });
}
