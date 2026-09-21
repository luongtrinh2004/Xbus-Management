import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  deleteAssetUnit,
  getAssets,
  saveAssetUnit,
} from "@/libs/dataRepository";
import { assetUnitIdFromName } from "@/libs/assetIds";

const secret = process.env.NEXTAUTH_SECRET;
const canManage = (token) => ["admin", "assistant"].includes(token?.role);

export async function GET(req) {
  const token = await getToken({ req, secret });
  if (!token)
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const { units = [] } = await getAssets();
  return NextResponse.json(units);
}

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name)
    return NextResponse.json(
      { error: "Tên đơn vị tính là bắt buộc" },
      { status: 400 },
    );
  const { units = [] } = await getAssets();
  const current = units.find((item) => item.id === body.id);
  const duplicate = units.find(
    (item) =>
      item.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi") &&
      item.id !== body.id,
  );
  if (duplicate)
    return NextResponse.json(
      { error: "Đơn vị tính đã tồn tại" },
      { status: 409 },
    );
  const unit = {
    id: body.id || assetUnitIdFromName(name),
    name,
    createdAt: current?.createdAt || new Date().toISOString(),
  };
  await saveAssetUnit(unit, current?.name || "");
  return NextResponse.json(unit, { status: body.id ? 200 : 201 });
}

export async function DELETE(req) {
  const token = await getToken({ req, secret });
  if (!canManage(token))
    return NextResponse.json(
      { error: "Không có quyền truy cập" },
      { status: 403 },
    );
  const { id } = await req.json();
  const { products = [], units = [] } = await getAssets();
  const unit = units.find((item) => item.id === id);
  if (!unit)
    return NextResponse.json(
      { error: "Đơn vị tính không tồn tại" },
      { status: 404 },
    );
  if (products.some((item) => item.unit === unit.name))
    return NextResponse.json(
      { error: "Đơn vị tính đang được sử dụng, không thể xóa" },
      { status: 409 },
    );
  await deleteAssetUnit(id);
  return NextResponse.json({ success: true });
}
