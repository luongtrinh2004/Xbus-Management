import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { getToken } from "next-auth/jwt";
import {
  getAfternoonTea,
  getUsers,
  saveAfternoonTea,
} from "@/libs/jsonRepository";

const secret = process.env.NEXTAUTH_SECRET;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const safeSegment = (value) =>
  String(value || "khac")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "khac";

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    const form = await req.formData();
    const invitationId = String(form.get("invitationId") || "");
    const shop = String(form.get("shop") || "").trim();
    const file = form.get("image");
    const data = getAfternoonTea();
    const invitation = data.invitations.find(
      (item) => item.id === invitationId,
    );

    if (!token?.id)
      return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
    if (!invitation)
      return NextResponse.json(
        { error: "Không tìm thấy lời mời" },
        { status: 404 },
      );
    const currentUser = getUsers().find(
      (user) =>
        user.id === token.id ||
        user.email?.toLowerCase() === token.email?.toLowerCase(),
    );
    if (
      !["admin", "assistant"].includes(token.role) &&
      invitation.createdBy !== token.id &&
      invitation.createdBy !== currentUser?.id
    )
      return NextResponse.json(
        { error: "Chỉ người mời hoặc Admin được tải menu" },
        { status: 403 },
      );
    if (
      !shop ||
      !(file instanceof File) ||
      !imageTypes.has(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      return NextResponse.json(
        { error: "Cần tên quán và ảnh JPG, PNG hoặc WebP không quá 10MB" },
        { status: 400 },
      );
    }

    invitation.menus = invitation.menus || [];
    if (invitation.menus.length >= 3) {
      return NextResponse.json(
        { error: "Mỗi lời mời chỉ hỗ trợ tối đa 3 quán" },
        { status: 400 },
      );
    }

    const scheduledDate = invitation.scheduledAt
      ? new Date(invitation.scheduledAt)
      : new Date();
    const dateFolder = scheduledDate.toISOString().slice(0, 10);
    const shopFolder = safeSegment(shop);
    const fileName = `menu-${Date.now()}.${file.type.split("/")[1]}`;
    const relativeDir = path.posix.join(
      "/images/afternoon-tea",
      dateFolder,
      shopFolder,
    );
    const outputDir = path.join(
      process.cwd(),
      "public",
      "images",
      "afternoon-tea",
      dateFolder,
      shopFolder,
    );
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(outputDir, fileName),
      Buffer.from(await file.arrayBuffer()),
    );

    invitation.menus.push({
      id: `menu_${Date.now()}`,
      shop,
      imageUrl: `${relativeDir}/${fileName}`,
      uploadedBy: token.id,
      uploadedAt: new Date().toISOString(),
    });
    saveAfternoonTea(data);
    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("[AfternoonTea Menu]", error);
    return NextResponse.json(
      { error: "Không thể tải ảnh menu" },
      { status: 500 },
    );
  }
}
