import { classifyGalleryMedia } from "@/libs/galleryMediaTypes";
import { createGalleryImagePreview } from "@/libs/galleryImagePreview";
import { extractGalleryArchive, isGalleryArchive } from "@/libs/galleryArchive";
import { auditGallery } from "@/libs/galleryAudit";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import path from "path";
import sharp from "sharp";
import { uploadMediaObject } from "@/libs/minioClient";
import { getGallery } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals < 0 ? 0 : decimals))} ${["Bytes", "KB", "MB", "GB"][i]}`;
}

async function uploadOneMedia({ name, buffer, postId, thumbnailBuffer }) {
  const { mimeType, isVideo, isImage } = classifyGalleryMedia({ name, type: "" });
  if (!isVideo && !isImage) return null;

  const ext = path.extname(name).toLowerCase() || (isVideo ? ".mp4" : ".jpg");
  const cleanBaseName = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, "_") || "media";
  const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${cleanBaseName}${ext}`;
  const objectKey = `posts/${postId}/${isVideo ? "videos" : "images"}/${uniqueFileName}`;
  const mainUpload = await uploadMediaObject({ objectName: objectKey, buffer, mimeType });
  let thumbnail = mainUpload.url;
  let dimensions = "1920 x 1080";

  try {
    let preview;
    if (isImage) preview = await createGalleryImagePreview(buffer, mimeType);
    else if (thumbnailBuffer) {
      preview = await sharp(thumbnailBuffer).resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    }
    if (preview) {
      const thumbKey = `posts/${postId}/thumbnails/thumb_${path.basename(uniqueFileName, ext)}.webp`;
      const thumbUpload = await uploadMediaObject({ objectName: thumbKey, buffer: preview.data, mimeType: "image/webp" });
      thumbnail = thumbUpload.url;
      if (preview.info.width && preview.info.height) dimensions = `${preview.info.width} x ${preview.info.height}`;
    }
  } catch (error) {
    // A preview failure must never make a valid original image/video fail.
    console.warn("[Gallery upload] Không tạo được thumbnail:", error?.message || error);
    if (isImage) thumbnail = "/images/gallery-image-unavailable.svg";
  }

  return {
    id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fileName: path.basename(name), type: isVideo ? "video" : "image", url: mainUpload.url,
    thumbnail, filePath: objectKey, objectKey, storageType: "minio", fileSize: buffer.length,
    fileSizeFormatted: formatBytes(buffer.length), fileFormat: ext.slice(1).toUpperCase(), dimensions,
    duration: isVideo ? "02:30" : undefined, durationSeconds: isVideo ? 150 : undefined, mimeType, postId,
  };
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get("file");
    const postId = String(formData.get("postId") || "");
    if (!/^post_[a-f0-9-]{36}$/.test(postId)) return NextResponse.json({ error: "Mã bài đăng không hợp lệ" }, { status: 400 });
    if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Không tìm thấy tệp để tải lên" }, { status: 400 });

    const currentItems = (await getGallery()).items || [];
    if (currentItems.some(item => item.id === postId || item.postId === postId)) {
      return NextResponse.json({ error: "Bài đăng đã được lưu, vui lòng tạo bài mới" }, { status: 409 });
    }

    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const archive = isGalleryArchive(file.name);
    const extracted = archive ? await extractGalleryArchive(file.name, sourceBuffer) : null;
    const entries = extracted?.files || [{ name: file.name, buffer: sourceBuffer }];
    const thumbnailFile = formData.get("thumbnail");
    const thumbnailBuffer = !archive && thumbnailFile instanceof File && thumbnailFile.size > 0
      ? Buffer.from(await thumbnailFile.arrayBuffer()) : null;
    const uploaded = [];
    let skippedFiles = extracted?.skippedFiles || 0;
    for (const entry of entries) {
      const media = await uploadOneMedia({ name: entry.name, buffer: entry.buffer, postId, thumbnailBuffer });
      if (media) uploaded.push(media);
      else skippedFiles += 1;
    }
    if (!uploaded.length) {
      return NextResponse.json({ error: "Archive không có ảnh hoặc video được hỗ trợ" }, { status: 400 });
    }
    await auditGallery(token, archive ? "UPLOAD_GALLERY_ARCHIVE" : "UPLOAD_GALLERY_FILE",
      { fileName: file.name }, `${uploaded.length} media; bỏ qua ${skippedFiles} tệp; đường dẫn: posts/${postId}`);
    return NextResponse.json({ success: true, fileData: uploaded[0], fileDataList: uploaded, extractedFiles: uploaded.length, skippedFiles });
  } catch (error) {
    console.error("[POST /api/gallery/upload/file] Lỗi:", error);
    return NextResponse.json({ error: "Không thể giải nén hoặc tải tệp lên máy chủ" }, { status: 500 });
  }
}
