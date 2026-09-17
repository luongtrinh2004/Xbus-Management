import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTypes, saveTypes } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;

function createDepartmentId(name, existingTypes) {
  const baseId = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  // Dự phòng cho tên chỉ gồm ký tự không thể chuyển thành slug.
  const safeBaseId = baseId || "bo_phan";
  let id = safeBaseId;
  let suffix = 2;

  while (existingTypes.some((type) => type.id === id)) {
    id = `${safeBaseId}_${suffix}`;
    suffix += 1;
  }

  return id;
}

export async function GET() {
  try {
    const types = await getTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error("[API Departments] GET error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token || token.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Tên bộ phận không được để trống" },
        { status: 400 },
      );
    }

    const types = await getTypes();

    // Kiểm tra trùng tên
    if (
      types.some((t) => t.name.toLowerCase() === body.name.trim().toLowerCase())
    ) {
      return NextResponse.json(
        { error: "Tên bộ phận đã tồn tại" },
        { status: 409 },
      );
    }

    const newType = {
      id: createDepartmentId(body.name, types),
      name: body.name.trim(),
      description: body.description?.trim() || "",
      active: true,
      createdAt: new Date().toISOString(),
    };

    types.push(newType);
    await saveTypes(types);

    return NextResponse.json(newType, { status: 201 });
  } catch (error) {
    console.error("[API Departments] POST error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
