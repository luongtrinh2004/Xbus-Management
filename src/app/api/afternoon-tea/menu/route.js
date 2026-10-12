import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { getToken } from "next-auth/jwt";
import {
  getAfternoonTea,
  getUsers,
  saveAfternoonTea,
} from "@/libs/dataRepository";
import { publishAfternoonTeaEvent } from "@/libs/afternoonTeaRealtime";
import { toVietnamDateKey } from "@/libs/dateTime";
import {
  extractMenuItemsWithGemini,
  optimizeMenuImageForGemini,
} from "@/libs/geminiMenu";

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
    const menuId = String(form.get("menuId") || "");
    const shop = String(form.get("shop") || "").trim();
    const file = form.get("image");
    const data = await getAfternoonTea();
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
    const currentUser = (await getUsers()).find(
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
    const existingMenu = menuId
      ? invitation.menus.find((item) => item.id === menuId)
      : null;
    if (menuId && !existingMenu) {
      return NextResponse.json(
        { error: "Không tìm thấy menu" },
        { status: 404 },
      );
    }
    if (
      (invitation.menus || []).some(
        (menu) =>
          menu.id !== existingMenu?.id &&
          menu.shop?.trim().toLocaleLowerCase("vi-VN") ===
            shop.toLocaleLowerCase("vi-VN"),
      )
    ) {
      return NextResponse.json(
        { error: "Tên quán này đã tồn tại trong lời mời" },
        { status: 400 },
      );
    }
    if (!existingMenu && invitation.menus.length >= 3) {
      return NextResponse.json(
        { error: "Mỗi lời mời chỉ hỗ trợ tối đa 3 quán" },
        { status: 400 },
      );
    }

    const scheduledDateKey = String(invitation.scheduledAt || "").slice(0, 10);
    const dateFolder = toVietnamDateKey(scheduledDateKey || new Date());
    const shopFolder = safeSegment(shop);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(fileBuffer).digest("hex");
    data.menuCatalog = data.menuCatalog || [];
    const existingCatalog = data.menuCatalog.find(
      (catalog) => catalog.checksum === checksum,
    );
    const fileName = `menu-${Date.now()}.${file.type.split("/")[1]}`;
    const relativeDir = path.posix.join(
      "/api/media/afternoon-tea",
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
    let catalog = existingCatalog;
    let imageUrl;
    if (!catalog) {
      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, fileName), fileBuffer);
      imageUrl = `${relativeDir}/${fileName}`;
      const aiImage = await optimizeMenuImageForGemini({
        buffer: fileBuffer,
        mimeType: file.type,
      });
      const items = await extractMenuItemsWithGemini(aiImage);
      catalog = {
        id: `menu_catalog_${Date.now()}`,
        checksum,
        imageUrl,
        items,
        status: "pending_review",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.menuCatalog.push(catalog);
    } else {
      // Catalog có thể được tái sử dụng, nhưng ảnh vật lý cũ có thể đã bị
      // xóa hoặc không còn cùng đường dẫn. Luôn lưu lại file vừa chọn.
      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, fileName), fileBuffer);
      imageUrl = `${relativeDir}/${fileName}`;
    }

    const nextMenu = {
      id: existingMenu?.id || `menu_${Date.now()}`,
      shop,
      imageUrl,
      checksum,
      catalogId: catalog.id,
      uploadedBy: token.id,
      uploadedAt: new Date().toISOString(),
    };
    if (existingMenu) Object.assign(existingMenu, nextMenu);
    else invitation.menus.push(nextMenu);
    await saveAfternoonTea(data);
    publishAfternoonTeaEvent({ type: "data" });
    return NextResponse.json({
      invitation,
      menu: nextMenu,
      catalog: { ...catalog, reused: Boolean(existingCatalog) },
    });
  } catch (error) {
    console.error("[AfternoonTea Menu]", error);
    const isGeminiBusy =
      /high demand|overload|unavailable|quota|rate limit/i.test(
        error?.message || "",
      );
    return NextResponse.json(
      {
        error: isGeminiBusy
          ? "Gemini đang quá tải. Hệ thống đã tự thử lại; vui lòng thử lại sau ít phút."
          : error?.message || "Không thể tải ảnh menu",
      },
      { status: isGeminiBusy ? 503 : 500 },
    );
  }
}
