import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers, appendAuditLog } from "@/libs/dataRepository";
import { isSafeStaffCode, storeAvatar, removeAvatar } from "@/libs/avatarStorage";

const secret = process.env.NEXTAUTH_SECRET;
const MAX_SIZE_MB = 5;

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    const users = await getUsers();
    const user = users.find((u) => u.id === id);

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân sự" },
        { status: 404 },
      );
    }

    // Chỉ admin hoặc chính user đó mới được upload
    if (token.role !== "admin" && token.id !== id) {
      return NextResponse.json(
        { error: "Không có quyền thực hiện" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("avatar");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Không tìm thấy file ảnh" },
        { status: 400 },
      );
    }

    // Kiểm tra loại file
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP" },
        { status: 400 },
      );
    }

    // Kiểm tra kích thước (max 5MB)
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Ảnh không được vượt quá ${MAX_SIZE_MB}MB` },
        { status: 400 },
      );
    }

    const staffCode = String(user.code || "")
      .trim()
      .toUpperCase();
    if (!isSafeStaffCode(staffCode)) {
      return NextResponse.json(
        {
          error: "Cần có mã nhân sự hợp lệ trước khi tải ảnh đại diện lên",
        },
        { status: 400 },
      );
    }

    // Mỗi mã nhân sự có đúng một thư mục và một ảnh đại diện trong thư mục đó.
    const ext =
      file.type === "image/webp"
        ? "webp"
        : file.type === "image/png"
          ? "png"
          : "jpg";
    const avatarUrl = await storeAvatar(staffCode, ext, Buffer.from(bytes));
    const updatedUsers = users.map((u) =>
      u.id === id
        ? { ...u, avatarUrl, updatedAt: new Date().toISOString() }
        : u,
    );
    await saveUsers(updatedUsers);
    await appendAuditLog({ adminId: token.id, adminName: token.name, adminEmail: token.email,
      action: "UPDATE_USER_AVATAR", targetType: "USER", targetId: id,
      details: `Cập nhật ảnh đại diện của ${user.name} (${user.code})` });
    await removeAvatar(user.avatarUrl, avatarUrl).catch(error =>
      console.error("[Avatar] Không thể dọn ảnh cũ:", error));

    // avatarUrl đã có version và được lưu vào nguồn dữ liệu để mọi màn hình,
    // kể cả session sau khi đăng nhập lại, đều nhận đúng ảnh mới nhất.
    return NextResponse.json({
      avatarUrl,
      previewUrl: avatarUrl,
    });
  } catch (error) {
    console.error("[API Avatar] POST error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token)
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });

    const { id } = await params;
    const users = await getUsers();
    const user = users.find((u) => u.id === id);
    if (!user)
      return NextResponse.json(
        { error: "Không tìm thấy nhân sự" },
        { status: 404 },
      );
    if (token.role !== "admin") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên có quyền xóa ảnh đại diện" },
        { status: 403 },
      );
    }

    await removeAvatar(user.avatarUrl);
    await saveUsers(
      users.map((u) =>
        u.id === id
          ? { ...u, avatarUrl: "", updatedAt: new Date().toISOString() }
          : u,
      ),
    );
    await appendAuditLog({ adminId: token.id, adminName: token.name, adminEmail: token.email,
      action: "DELETE_USER_AVATAR", targetType: "USER", targetId: id,
      details: `Xóa ảnh đại diện của ${user.name} (${user.code})` });
    return NextResponse.json({ avatarUrl: "" });
  } catch (error) {
    console.error("[API Avatar] DELETE error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
