import { resolveGalleryMinioFiles } from "@/libs/galleryMinioFiles";
import { auditGallery } from "@/libs/galleryAudit";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery, saveGallery } from "@/libs/dataRepository";
import { deleteMediaObject } from "@/libs/minioClient";
import { sendMentionNotifications } from "@/libs/galleryMentions";

const secret = process.env.NEXTAUTH_SECRET;
const MAX_STORAGE_BYTES = 20 * 1024 * 1024 * 1024;

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    const data = await getGallery();
    const items = await resolveGalleryMinioFiles(Array.isArray(data.items) ? data.items : []);

    // Find all items matching by id or postId
    const targetItems = items.filter(
      (i) => i.id === id || (i.postId && i.postId === id)
    );

    if (targetItems.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });
    }

    const targetItem = targetItems[0];

    // Check permissions: admin, assistant, or post owner (by id or email)
    const isOwner =
      (targetItem.uploader?.id && token?.id && targetItem.uploader.id === token.id) ||
      (targetItem.uploader?.email && token?.email && targetItem.uploader.email.toLowerCase() === token.email.toLowerCase());

    const isAllowed =
      token.role === "admin" ||
      token.role === "assistant" ||
      isOwner;

    if (!isAllowed) {
      return NextResponse.json({ error: "Bạn không có quyền xóa bài đăng này" }, { status: 403 });
    }

    // Collect all items to delete (matching by id or same postId)
    const itemsToDelete = items.filter(
      (i) =>
        i.id === id ||
        (i.postId && i.postId === id) ||
        (i.postId && targetItem.postId && i.postId === targetItem.postId)
    );

    // Delete all physical files from MinIO / local fallback
    for (const item of itemsToDelete) {
      if (item.filePath) await deleteMediaObject(item.filePath);
      else if (item.url) await deleteMediaObject(item.url);

      if (item.thumbnail && item.thumbnail !== item.url) {
        await deleteMediaObject(item.thumbnail);
      }

      if (Array.isArray(item.files)) {
        for (const f of item.files) {
          if (f.filePath) await deleteMediaObject(f.filePath);
          else if (f.url) await deleteMediaObject(f.url);
          if (f.thumbnail && f.thumbnail !== f.url) await deleteMediaObject(f.thumbnail);
        }
      }
    }

    // Filter out deleted items
    const remainingItems = items.filter(
      (i) =>
        !(
          i.id === id ||
          (i.postId && i.postId === id) ||
          (i.postId && targetItem.postId && i.postId === targetItem.postId)
        )
    );

    await saveGallery({ items: remainingItems });
    await auditGallery(token, "DELETE_GALLERY_POST", targetItem);

    const newUsedBytes = remainingItems.reduce((acc, i) => acc + (Number(i.fileSize) || 0), 0);

    return NextResponse.json({
      success: true,
      message: "Đã xóa bài đăng thành công",
      storage: {
        maxBytes: MAX_STORAGE_BYTES,
        usedBytes: newUsedBytes,
        remainingBytes: Math.max(0, MAX_STORAGE_BYTES - newUsedBytes),
        percentUsed: Number(((newUsedBytes / MAX_STORAGE_BYTES) * 100).toFixed(1)),
      },
    });
  } catch (error) {
    console.error("[DELETE /api/gallery/[id]] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi xóa bài đăng" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    // Find all items matching by id or postId
    const targetItems = items.filter(
      (i) => i.id === id || (i.postId && i.postId === id)
    );

    if (targetItems.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });
    }

    const target = targetItems[0];

    // Check permissions: admin, assistant, or post owner (by id or email)
    const isOwner =
      (target.uploader?.id && token?.id && target.uploader.id === token.id) ||
      (target.uploader?.email && token?.email && target.uploader.email.toLowerCase() === token.email.toLowerCase());

    const isAllowed =
      token.role === "admin" ||
      token.role === "assistant" ||
      isOwner;

    if (!isAllowed) {
      return NextResponse.json({ error: "Bạn không có quyền chỉnh sửa bài đăng này" }, { status: 403 });
    }

    const updateFields = (it) => {
      if (body.title !== undefined) it.title = String(body.title).trim();
      if (body.description !== undefined) it.description = String(body.description).trim();
      if (body.privacy !== undefined) it.privacy = body.privacy;
      if (body.channel !== undefined) it.channel = ["memory", "relax", "report"].includes(body.channel) ? body.channel : "memory";
      if (Array.isArray(body.tags)) it.tags = body.tags;
    };

    // Update all matching items (for multi-file legacy posts)
    for (const it of targetItems) {
      updateFields(it);
    }

    // Also sync across any other items sharing target.postId
    if (target.postId) {
      for (const it of items) {
        if (it.postId === target.postId) {
          updateFields(it);
        }
      }
    }

    await saveGallery({ items });
    await auditGallery(token, "UPDATE_GALLERY_POST", target, `Tiêu đề: ${target.title || "(trống)"}; mô tả: ${target.description || "(trống)"}; thẻ: ${(target.tags || []).join(", ")}; phạm vi: ${{public: "Công khai", team: "Nội bộ team", private: "Chỉ mình tôi"}[target.privacy] || "Không xác định"}`);

    // Gửi thông báo nếu có người dùng hoặc @All được gắn thẻ khi chỉnh sửa
    const postTitle = target.title || "";
    const postDesc = target.description || "";
    sendMentionNotifications({
      actor: { id: token.id, name: token.name || "Một thành viên" },
      text: `${postTitle} ${postDesc}`,
      explicitTaggedUserIds: Array.isArray(body.taggedUserIds) ? body.taggedUserIds : [],
      explicitIsTagAll: body.isTagAll === true,
      postId: target.id,
      postTitle,
    }).catch((e) => console.warn("[PATCH post] Mention notification error:", e));

    return NextResponse.json({ success: true, item: target });
  } catch (error) {
    console.error("[PATCH /api/gallery/[id]] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi cập nhật bài đăng" }, { status: 500 });
  }
}
