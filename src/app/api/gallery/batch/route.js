import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery, saveGallery } from "@/libs/dataRepository";
import { deleteMediaObject } from "@/libs/minioClient";

const secret = process.env.NEXTAUTH_SECRET;
const MAX_STORAGE_BYTES = 20 * 1024 * 1024 * 1024;

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { action, ids = [], tags = [] } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Danh sách tệp rỗng" }, { status: 400 });
    }

    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    if (action === "delete") {
      // Delete objects from MinIO / fallback
      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        if (item) {
          if (item.filePath) {
            await deleteMediaObject(item.filePath);
          } else if (item.url) {
            await deleteMediaObject(item.url);
          }
          if (item.thumbnail && item.thumbnail !== item.url) {
            await deleteMediaObject(item.thumbnail);
          }
        }
      }

      // Filter remaining
      const remainingItems = items.filter((i) => !ids.includes(i.id));
      await saveGallery({ items: remainingItems });

      const newUsedBytes = remainingItems.reduce((acc, i) => acc + (Number(i.fileSize) || 0), 0);

      return NextResponse.json({
        success: true,
        deletedCount: ids.length,
        storage: {
          maxBytes: MAX_STORAGE_BYTES,
          usedBytes: newUsedBytes,
          remainingBytes: Math.max(0, MAX_STORAGE_BYTES - newUsedBytes),
          percentUsed: Number(((newUsedBytes / MAX_STORAGE_BYTES) * 100).toFixed(1)),
        },
      });
    }

    if (action === "tag") {
      if (!Array.isArray(tags) || tags.length === 0) {
        return NextResponse.json({ error: "Danh sách thẻ rỗng" }, { status: 400 });
      }

      items.forEach((item) => {
        if (ids.includes(item.id)) {
          const currentTags = item.tags || [];
          item.tags = Array.from(new Set([...currentTags, ...tags]));
        }
      });

      await saveGallery({ items });

      return NextResponse.json({ success: true, updatedCount: ids.length });
    }

    return NextResponse.json({ error: "Thao tác không hỗ trợ" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/gallery/batch] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi thao tác hàng loạt" }, { status: 500 });
  }
}
