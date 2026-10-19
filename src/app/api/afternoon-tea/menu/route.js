import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getToken } from "next-auth/jwt";
import {
  getAfternoonTea,
  getUsers,
  saveAfternoonTea,
} from "@/libs/dataRepository";
import { publishAfternoonTeaEvent } from "@/libs/afternoonTeaRealtime";
import { storeTeaMenuImage } from "@/libs/teaMenuStorage";
import {
  extractMenuItemsWithGemini,
  optimizeMenuImageForGemini,
} from "@/libs/geminiMenu";

const secret = process.env.NEXTAUTH_SECRET;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(fileBuffer).digest("hex");
    data.menuCatalog = data.menuCatalog || [];
    const existingCatalog = data.menuCatalog.find(
      (catalog) => catalog.checksum === checksum,
    );
    const imageUrl = await storeTeaMenuImage({
      buffer: fileBuffer,
      mimeType: file.type,
      checksum,
    });
    let catalog = existingCatalog;
    if (!catalog || catalog.status === "extraction_failed") {
      const aiImage = await optimizeMenuImageForGemini({
        buffer: fileBuffer,
        mimeType: file.type,
      });
      let items = [];
      let status = "pending_review";
      try {
        items = await extractMenuItemsWithGemini(aiImage);
        if (!items.length) status = "extraction_failed";
      } catch (error) {
        // Image storage succeeded; extraction must not prevent manual ordering.
        console.error("[AfternoonTea Menu Extraction]", error);
        status = "extraction_failed";
      }
      const previousCatalog = catalog;
      catalog = {
        id: previousCatalog?.id || `menu_catalog_${Date.now()}`,
        checksum,
        imageUrl,
        items,
        status,
        createdAt: previousCatalog?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (previousCatalog) Object.assign(previousCatalog, catalog);
      else data.menuCatalog.push(catalog);
    } else {
      // Reuploads migrate legacy catalog images to the shared checksum object.
      catalog.imageUrl = imageUrl;
      for (const entry of data.invitations || []) {
        for (const menu of entry.menus || []) {
          if (menu.checksum === checksum || menu.catalogId === catalog.id)
            menu.imageUrl = imageUrl;
        }
      }
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
    if (["TimeoutError", "AbortError"].includes(error?.name)) {
      return NextResponse.json(
        { error: "Hệ thống đọc menu quá lâu. Vui lòng thử lại sau ít phút." },
        { status: 503 },
      );
    }
    const isGeminiBusy =
      /high demand|overload|unavailable|quota|rate limit/i.test(
        error?.message || "",
      );
    return NextResponse.json(
      {
        error: isGeminiBusy
          ? "Hệ thống đang quá tải. Hệ thống đã tự thử lại; vui lòng thử lại sau ít phút."
          : "Không thể tải ảnh menu. Vui lòng thử lại.",
      },
      { status: isGeminiBusy ? 503 : 500 },
    );
  }
}
