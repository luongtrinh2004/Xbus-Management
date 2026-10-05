import { auditGallery } from "@/libs/galleryAudit";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery, saveGallery, getUsers } from "@/libs/dataRepository";
import { createNotification } from "@/libs/notificationStorage";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const action = body?.action === "dislike" ? "dislike" : "like";

    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    const index = items.findIndex((i) => i.id === id || (i.postId && i.postId === id));
    if (index === -1) {
      return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
    }

    const item = items[index];
    if (!Array.isArray(item.likedBy)) item.likedBy = [];
    if (!Array.isArray(item.dislikedBy)) item.dislikedBy = [];

    // Lấy thông tin user đầy đủ
    let matchedUser = null;
    try {
      const allUsers = await getUsers();
      matchedUser = allUsers.find((u) => u.id === token.id || u.email?.toLowerCase() === token.email?.toLowerCase());
    } catch {}

    const userObj = {
      id: token.id,
      name: matchedUser?.name || token.name || "Thành viên Xbus",
      avatar: matchedUser?.avatarUrl || token.avatar || token.picture || "/images/avatars/male-user.png",
      department: matchedUser?.department || token.department || "Xbus",
      role: matchedUser?.role || token.role || "user",
      email: matchedUser?.email || token.email || "",
    };

    const findIdx = (list) =>
      list.findIndex((u) => (typeof u === "string" ? u === token.id : u?.id === token.id));

    let isLiked = false;
    let isDisliked = false;

    if (action === "like") {
      const likeIdx = findIdx(item.likedBy);
      if (likeIdx > -1) {
        // Bỏ thích
        item.likedBy.splice(likeIdx, 1);
        isLiked = false;
      } else {
        // Thêm thích
        item.likedBy.push(userObj);
        isLiked = true;
        // Bỏ dislike nếu đang dislike
        const disIdx = findIdx(item.dislikedBy);
        if (disIdx > -1) {
          item.dislikedBy.splice(disIdx, 1);
        }
      }
      isDisliked = findIdx(item.dislikedBy) > -1;
    } else {
      // Dislike action
      const disIdx = findIdx(item.dislikedBy);
      if (disIdx > -1) {
        // Bỏ không thích
        item.dislikedBy.splice(disIdx, 1);
        isDisliked = false;
      } else {
        // Thêm không thích
        item.dislikedBy.push(userObj);
        isDisliked = true;
        // Bỏ like nếu đang like
        const likeIdx = findIdx(item.likedBy);
        if (likeIdx > -1) {
          item.likedBy.splice(likeIdx, 1);
        }
      }
      isLiked = findIdx(item.likedBy) > -1;
    }

    item.likes = item.likedBy.length;
    item.dislikes = item.dislikedBy.length;
    item.isLiked = isLiked;
    item.isDisliked = isDisliked;

    // Synchronize for items with same postId
    if (item.postId) {
      for (const it of items) {
        if (it.postId === item.postId) {
          it.likedBy = item.likedBy;
          it.likes = item.likes;
          it.isLiked = isLiked;
          it.dislikedBy = item.dislikedBy;
          it.dislikes = item.dislikes;
          it.isDisliked = isDisliked;
        }
      }
    }

    await saveGallery({ items });
    await auditGallery(
      token,
      action === "like"
        ? (isLiked ? "LIKE_GALLERY_POST" : "UNLIKE_GALLERY_POST")
        : (isDisliked ? "DISLIKE_GALLERY_POST" : "UNDISLIKE_GALLERY_POST"),
      item
    );

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

    return NextResponse.json({
      success: true,
      likes: item.likes,
      isLiked,
      likedBy: item.likedBy,
      dislikes: item.dislikes,
      isDisliked,
      dislikedBy: item.dislikedBy,
    });
  } catch (error) {
    console.error("[POST like/dislike] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi tương tác" }, { status: 500 });
  }
}
