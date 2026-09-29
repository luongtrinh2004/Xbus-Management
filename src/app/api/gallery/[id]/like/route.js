import { auditGallery } from "@/libs/galleryAudit";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery, saveGallery } from "@/libs/dataRepository";
import { createNotification } from "@/libs/notificationStorage";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    const index = items.findIndex((i) => i.id === id || (i.postId && i.postId === id));
    if (index === -1) {
      return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
    }

    const item = items[index];
    const likedBy = Array.isArray(item.likedBy) ? item.likedBy : [];
    const userIndex = likedBy.indexOf(token.id);

    let isLiked = false;
    if (userIndex > -1) {
      likedBy.splice(userIndex, 1);
      isLiked = false;
    } else {
      likedBy.push(token.id);
      isLiked = true;
    }

    item.likedBy = likedBy;
    item.likes = likedBy.length;
    item.isLiked = isLiked;

    // Synchronize for items with same postId
    if (item.postId) {
      for (const it of items) {
        if (it.postId === item.postId) {
          it.likedBy = likedBy;
          it.likes = likedBy.length;
          it.isLiked = isLiked;
        }
      }
    }

    await saveGallery({ items });
    await auditGallery(token, isLiked ? "LIKE_GALLERY_POST" : "UNLIKE_GALLERY_POST", item);

    // Send notification to post author if someone else liked
    const authorId = item.uploader?.id;
    if (isLiked && authorId && authorId !== token.id) {
      try {
        const postTitle = item.title || "ảnh/video";
        createNotification({
          userId: authorId,
          type: "gallery_like",
          title: "Lượt thích mới",
          message: `${token.name || "Một thành viên"} đã thả tim bài đăng "${postTitle}" của bạn.`,
          link: `/gallery?open=${item.id}`,
          metadata: { postId: item.id, actorId: token.id, actorName: token.name },
        });
      } catch (notiErr) {
        console.warn("[POST like] Không thể gửi thông báo:", notiErr);
      }
    }

    return NextResponse.json({ success: true, likes: item.likes, isLiked });
  } catch (error) {
    console.error("[POST like] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi tương tác" }, { status: 500 });
  }
}
