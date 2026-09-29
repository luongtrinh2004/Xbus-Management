import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery, saveGallery, getUsers } from "@/libs/dataRepository";
import { createNotification } from "@/libs/notificationStorage";
import { sendMentionNotifications } from "@/libs/galleryMentions";

const secret = process.env.NEXTAUTH_SECRET;

const DEPARTMENT_NAMES = {
  ap: "AP",
  web_app: "Web App",
  van_hanh: "Vận Hành",
  quan_ly_du_an: "Quản Lý Dự Án",
  mua_sam: "Mua Sắm",
};

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const content = body?.content;
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "Nội dung bình luận không được trống" }, { status: 400 });
    }

    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    const index = items.findIndex((i) => i.id === id || (i.postId && i.postId === id));
    if (index === -1) {
      return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
    }

    const users = await getUsers();
    const matched = users.find(
      (u) =>
        (token?.email && u.email?.toLowerCase() === token.email.toLowerCase()) ||
        (token?.id && u.id === token.id)
    );

    const newComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author: {
        id: matched?.id || token.id,
        name: matched?.name || token.name || "Thành viên Xbus",
        avatar:
          matched?.avatarUrl ||
          (matched?.gender === "female"
            ? "/images/avatars/female-user.png"
            : matched?.role === "admin"
              ? "/images/avatars/male-admin.png"
              : "/images/avatars/male-user.png"),
        department: DEPARTMENT_NAMES[matched?.typeId] || matched?.typeId || "Xbus",
      },
      content: String(content).trim(),
      createdAt: new Date().toISOString(),
    };

    const item = items[index];
    if (!Array.isArray(item.comments)) item.comments = [];
    item.comments.push(newComment);

    // Sync across items with same postId
    if (item.postId) {
      for (const it of items) {
        if (it.postId === item.postId && it.id !== item.id) {
          if (!Array.isArray(it.comments)) it.comments = [];
          it.comments.push(newComment);
        }
      }
    }

    await saveGallery({ items });

    // Send notification to post author if someone else commented
    const authorId = item.uploader?.id;
    if (authorId && authorId !== token.id) {
      try {
        const postTitle = item.title || "ảnh/video";
        const shortContent =
          newComment.content.length > 50
            ? newComment.content.substring(0, 50) + "..."
            : newComment.content;

        createNotification({
          userId: authorId,
          type: "gallery_comment",
          title: "Bình luận mới",
          message: `${newComment.author.name} đã bình luận bài đăng "${postTitle}": "${shortContent}"`,
          link: `/gallery?open=${item.id}`,
          metadata: {
            postId: item.id,
            commentId: newComment.id,
            actorId: token.id,
            actorName: newComment.author.name,
          },
        });
      } catch (notiErr) {
        console.warn("[POST comment] Không thể gửi thông báo:", notiErr);
      }
    }

    // Gửi thông báo nếu có người dùng hoặc @All được gắn thẻ trong bình luận
    const postTitle = item.title || "ảnh/video";
    sendMentionNotifications({
      actor: newComment.author,
      text: newComment.content,
      explicitTaggedUserIds: Array.isArray(body.taggedUserIds) ? body.taggedUserIds : [],
      explicitIsTagAll: body.isTagAll === true,
      postId: item.id,
      commentId: newComment.id,
      postTitle,
    }).catch((e) => console.warn("[Comment] Mention notification error:", e));

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error) {
    console.error("[POST comment] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi thêm bình luận" }, { status: 500 });
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
    const { commentId, content } = body;

    if (!commentId || !content || !String(content).trim()) {
      return NextResponse.json({ error: "Thiếu thông tin bình luận" }, { status: 400 });
    }

    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    const index = items.findIndex((i) => i.id === id || (i.postId && i.postId === id));
    if (index === -1) {
      return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
    }

    const item = items[index];
    const comments = Array.isArray(item.comments) ? item.comments : [];
    const cmt = comments.find((c) => c.id === commentId);

    if (!cmt) {
      return NextResponse.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
    }

    // Check permission: author or admin/assistant
    const isOwner =
      cmt.author?.id === token.id ||
      (cmt.author?.name && token.name && cmt.author.name === token.name);
    const isAllowed = isOwner || token.role === "admin" || token.role === "assistant";

    if (!isAllowed) {
      return NextResponse.json({ error: "Bạn không có quyền sửa bình luận này" }, { status: 403 });
    }

    cmt.content = String(content).trim();
    cmt.updatedAt = new Date().toISOString();

    // Sync across items with same postId
    if (item.postId) {
      for (const it of items) {
        if (it.postId === item.postId && it.id !== item.id && Array.isArray(it.comments)) {
          const otherCmt = it.comments.find((c) => c.id === commentId);
          if (otherCmt) {
            otherCmt.content = cmt.content;
            otherCmt.updatedAt = cmt.updatedAt;
          }
        }
      }
    }

    await saveGallery({ items });

    // Send mention notification for updated comment if new mentions
    sendMentionNotifications({
      actor: cmt.author,
      text: cmt.content,
      explicitTaggedUserIds: Array.isArray(body.taggedUserIds) ? body.taggedUserIds : [],
      explicitIsTagAll: body.isTagAll === true,
      postId: item.id,
      commentId: cmt.id,
      postTitle: item.title || "ảnh/video",
    }).catch((e) => console.warn("[PATCH comment] Mention error:", e));

    return NextResponse.json({ success: true, comment: cmt });
  } catch (error) {
    console.error("[PATCH comment] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi chỉnh sửa bình luận" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    let commentId = searchParams.get("commentId");

    if (!commentId) {
      try {
        const body = await req.json();
        commentId = body?.commentId;
      } catch {}
    }

    if (!commentId) {
      return NextResponse.json({ error: "Thiếu mã bình luận" }, { status: 400 });
    }

    const data = await getGallery();
    const items = Array.isArray(data.items) ? data.items : [];

    const index = items.findIndex((i) => i.id === id || (i.postId && i.postId === id));
    if (index === -1) {
      return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
    }

    const item = items[index];
    const comments = Array.isArray(item.comments) ? item.comments : [];
    const cmt = comments.find((c) => c.id === commentId);

    if (!cmt) {
      return NextResponse.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
    }

    // Check permission: author or admin/assistant
    const isOwner =
      cmt.author?.id === token.id ||
      (cmt.author?.name && token.name && cmt.author.name === token.name);
    const isAllowed = isOwner || token.role === "admin" || token.role === "assistant";

    if (!isAllowed) {
      return NextResponse.json({ error: "Bạn không có quyền xóa bình luận này" }, { status: 403 });
    }

    item.comments = comments.filter((c) => c.id !== commentId);

    // Sync across items with same postId
    if (item.postId) {
      for (const it of items) {
        if (it.postId === item.postId && it.id !== item.id && Array.isArray(it.comments)) {
          it.comments = it.comments.filter((c) => c.id !== commentId);
        }
      }
    }

    await saveGallery({ items });

    return NextResponse.json({ success: true, message: "Đã xóa bình luận", commentId });
  } catch (error) {
    console.error("[DELETE comment] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi xóa bình luận" }, { status: 500 });
  }
}
