import { resolveGalleryMinioFiles } from "@/libs/galleryMinioFiles";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery } from "@/libs/dataRepository";
import { auditGallery } from "@/libs/galleryAudit";

const actions = new Set(["PLAY_GALLERY_VIDEO", "PAUSE_GALLERY_VIDEO", "SEEK_GALLERY_VIDEO", "DOWNLOAD_GALLERY_MEDIA", "SHARE_GALLERY_POST"]);

export async function POST(req, { params }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    const { id } = await params;
    const { action, fileId } = await req.json();
    if (!actions.has(action)) return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
    const data = await getGallery();
    const items = await resolveGalleryMinioFiles(data.items || []);
    const item = items.find(item => item.id === id || item.postId === id);
    if (!item) return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });
    const file = fileId && fileId !== item.id ? item.files?.find(file => file.id === fileId) : item;
    if (!file) return NextResponse.json({ error: "Không tìm thấy tệp" }, { status: 404 });
    if (["PLAY_GALLERY_VIDEO", "PAUSE_GALLERY_VIDEO", "SEEK_GALLERY_VIDEO"].includes(action) && file.type !== "video") {
      return NextResponse.json({ error: "Tệp không phải video" }, { status: 400 });
    }
    await auditGallery(token, action, item, file.fileName ? `Tệp: ${file.fileName}` : "");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Gallery activity]", error);
    return NextResponse.json({ error: "Không thể ghi lịch sử tương tác" }, { status: 500 });
  }
}
