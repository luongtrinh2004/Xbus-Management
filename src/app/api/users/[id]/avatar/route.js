import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUsers, saveUsers } from "@/libs/dataRepository";
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
const isSafeStaffCode = (value) =>
  /^[\p{L}\p{N}_-]+$/u.test(String(value || ""));
const avatarRoot = path.resolve(AVATARS_DIR);

const getAvatarFilePath = (avatarUrl) => {
  if (!avatarUrl?.startsWith("/images/avatars/")) return null;
  let relativePath;
  try {
    relativePath = decodeURIComponent(
      avatarUrl.split("?")[0].replace("/images/avatars/", ""),
    );
  } catch {
    return null;
  }
  const fileName = path.basename(relativePath);
  if (DEFAULT_AVATAR_FILES.has(fileName)) return null;
  const filePath = path.resolve(AVATARS_DIR, relativePath);
  return filePath.startsWith(`${avatarRoot}${path.sep}`) ? filePath : null;
};

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = params;
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

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(AVATARS_DIR)) {
      fs.mkdirSync(AVATARS_DIR, { recursive: true });
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
    const fileName = `${staffCode}.${ext}`;
    const userAvatarDir = path.join(AVATARS_DIR, staffCode);

    // Xóa avatar cũ (kể cả cấu trúc tên-file cũ), sau đó xóa toàn bộ nội dung
    // thư mục của mã để bảo đảm chỉ còn đúng một ảnh mới.
    const oldPath = getAvatarFilePath(user.avatarUrl);
    if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    if (fs.existsSync(userAvatarDir))
      fs.rmSync(userAvatarDir, { recursive: true, force: true });
    fs.mkdirSync(userAvatarDir, { recursive: true });
    const filePath = path.join(userAvatarDir, fileName);

    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);
    if (
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).size !== buffer.length
    ) {
      throw new Error("Không thể lưu file ảnh");
    }

    // Cập nhật avatarUrl trong user record
    const avatarUrl = `/images/avatars/${encodeURIComponent(staffCode)}/${encodeURIComponent(fileName)}`;
    const updatedUsers = users.map((u) =>
      u.id === id
        ? { ...u, avatarUrl, updatedAt: new Date().toISOString() }
        : u,
    );
    await saveUsers(updatedUsers);

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

    const filePath = getAvatarFilePath(user.avatarUrl);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const avatarDir = filePath && path.dirname(filePath);
    if (
      avatarDir &&
      path.dirname(avatarDir) === avatarRoot &&
      fs.existsSync(avatarDir)
    )
      fs.rmSync(avatarDir, { recursive: true, force: true });
    await saveUsers(
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
