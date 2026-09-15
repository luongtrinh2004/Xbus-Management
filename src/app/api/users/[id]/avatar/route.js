import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers } from "@/libs/jsonRepository";
import path from "path";
import fs from "fs";

const secret = process.env.NEXTAUTH_SECRET;
const AVATARS_DIR = path.join(process.cwd(), "public", "images", "avatars");
const MAX_SIZE_MB = 5;
const DEFAULT_AVATAR_FILES = new Set([
  "male-admin.png",
  "female-admin.png",
  "male-user.png",
  "female-user.png",
  "assistant.png",
]);

const getAvatarFilePath = (avatarUrl) => {
  if (!avatarUrl?.startsWith("/images/avatars/")) return null;
  const fileName = path.basename(avatarUrl.split("?")[0]);
  return DEFAULT_AVATAR_FILES.has(fileName)
    ? null
    : path.join(AVATARS_DIR, fileName);
};

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = params;
    const users = getUsers();
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

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
    }

    // Có mã nhân sự thì dùng mã làm tên file; chưa có mã thì giữ nguyên tên file tải lên.
    const ext =
      file.type === "image/webp"
        ? "webp"
        : file.type === "image/png"
          ? "png"
          : "jpg";
    const fileName = user.code
      ? `${user.code}.${ext}`
      : path.basename(file.name || `avatar.${ext}`);
    if (DEFAULT_AVATAR_FILES.has(fileName)) {
      return NextResponse.json(
        { error: "Tên ảnh trùng với ảnh mặc định của hệ thống" },
        { status: 400 },
      );
    }

    // Xóa avatar cũ nếu là file custom (không phải default)
    const oldPath = getAvatarFilePath(user.avatarUrl);
    if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    const filePath = path.join(AVATARS_DIR, fileName);

    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);
    if (
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).size !== buffer.length
    ) {
      throw new Error("Không thể lưu file ảnh");
    }

    // Cập nhật avatarUrl trong user record
    const avatarUrl = `/images/avatars/${fileName}`;
    const updatedUsers = users.map((u) =>
      u.id === id
        ? { ...u, avatarUrl, updatedAt: new Date().toISOString() }
        : u,
    );
    saveUsers(updatedUsers);

    // Filename luôn mới; query timestamp cũng tránh CDN/browser trả lại ảnh cũ.
    return NextResponse.json({
      avatarUrl,
      previewUrl: `${avatarUrl}?v=${Date.now()}`,
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

    const { id } = params;
    const users = getUsers();
    const user = users.find((u) => u.id === id);
    if (!user)
      return NextResponse.json(
        { error: "Không tìm thấy nhân sự" },
        { status: 404 },
      );
    if (token.role !== "admin" && token.id !== id) {
      return NextResponse.json(
        { error: "Không có quyền thực hiện" },
        { status: 403 },
      );
    }
    if (!["admin", "assistant"].includes(user.role)) {
      return NextResponse.json(
        { error: "Chỉ có thể xóa ảnh của quản trị viên hoặc trợ lý" },
        { status: 403 },
      );
    }

    const filePath = getAvatarFilePath(user.avatarUrl);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    saveUsers(
      users.map((u) =>
        u.id === id
          ? { ...u, avatarUrl: "", updatedAt: new Date().toISOString() }
          : u,
      ),
    );
    return NextResponse.json({ avatarUrl: "" });
  } catch (error) {
    console.error("[API Avatar] DELETE error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
