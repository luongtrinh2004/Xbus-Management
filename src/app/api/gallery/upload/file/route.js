import { auditGallery } from "@/libs/galleryAudit";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import path from "path";
import sharp from "sharp";
import { uploadMediaObject } from "@/libs/minioClient";
import { getGallery } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const MAX_STORAGE_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB per file

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const postId = String(formData.get("postId") || "");
    if (!/^post_[a-f0-9-]{36}$/.test(postId)) {
      return NextResponse.json({ error: "Mã bài đăng không hợp lệ" }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Không tìm thấy tệp để tải lên" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Tệp "${file.name}" vượt quá giới hạn tối đa 500 MB/file` },
        { status: 400 }
      );
    }

    // Check storage limit
    const currentData = await getGallery();
    const currentItems = Array.isArray(currentData.items) ? currentData.items : [];
    if (currentItems.some(item => item.id === postId || item.postId === postId)) {
      return NextResponse.json({ error: "Bài đăng đã được lưu, vui lòng tạo bài mới" }, { status: 409 });
    }
    const currentUsedBytes = currentItems.reduce((acc, i) => acc + (Number(i.fileSize) || 0), 0);

    if (currentUsedBytes + file.size > MAX_STORAGE_BYTES) {
      return NextResponse.json(
        {
          error: `Dung lượng MinIO lưu trữ sẽ vượt quá hạn ngạch 20 GB (${formatBytes(currentUsedBytes)} / 20 GB).`,
        },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const isVideo = mimeType.startsWith("video/");
    const isImage = mimeType.startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: `Định dạng "${file.name}" không được hỗ trợ. Vui lòng chỉ tải ảnh hoặc video.` },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase() || (isVideo ? ".mp4" : ".jpg");
    const cleanBaseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${cleanBaseName}${ext}`;
    const objectFolder = isVideo ? "videos" : "images";
    const objectKey = `posts/${postId}/${objectFolder}/${uniqueFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO
    const mainUpload = await uploadMediaObject({
      objectName: objectKey,
      buffer,
      mimeType,
    });

    const publicUrl = mainUpload.url;
    let thumbnailUrl = publicUrl;
    let dimensions = isVideo ? "1920 x 1080" : "1920 x 1080";

    // If image: generate WebP thumbnail via sharp
    if (isImage) {
      try {
        const thumbFileName = `thumb_${path.basename(uniqueFileName, ext)}.webp`;
        const thumbKey = `posts/${postId}/thumbnails/${thumbFileName}`;

        const imageInfo = await sharp(buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer({ resolveWithObject: true });

        const thumbUpload = await uploadMediaObject({
          objectName: thumbKey,
          buffer: imageInfo.data,
          mimeType: "image/webp",
        });

        thumbnailUrl = thumbUpload.url;
        if (imageInfo.info.width && imageInfo.info.height) {
          dimensions = `${imageInfo.info.width} x ${imageInfo.info.height}`;
        }
      } catch (sharpErr) {
        console.warn("[Upload] Không tạo được thumbnail:", sharpErr);
        thumbnailUrl = publicUrl;
      }
    } else if (isVideo) {
      const thumbFile = formData.get("thumbnail");
      if (thumbFile && thumbFile instanceof File && thumbFile.size > 0) {
        try {
          const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer());
          const thumbFileName = `thumb_${path.basename(uniqueFileName, ext)}.webp`;
          const thumbKey = `posts/${postId}/thumbnails/${thumbFileName}`;

          const imageInfo = await sharp(thumbBuffer)
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true });

          const thumbUpload = await uploadMediaObject({
            objectName: thumbKey,
            buffer: imageInfo.data,
            mimeType: "image/webp",
          });

          thumbnailUrl = thumbUpload.url;
          if (imageInfo.info.width && imageInfo.info.height) {
            dimensions = `${imageInfo.info.width} x ${imageInfo.info.height}`;
          }
        } catch (thumbErr) {
          console.warn("[Upload Video] Không tạo được thumbnail:", thumbErr);
        }
      }
    }

    await auditGallery(token, "UPLOAD_GALLERY_FILE", { fileName: file.name }, `${isVideo ? "Video" : "Ảnh"}; ${formatBytes(file.size)}; đường dẫn: ${objectKey}`);
    return NextResponse.json({
      success: true,
      fileData: {
        id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        type: isVideo ? "video" : "image",
        url: publicUrl,
        thumbnail: thumbnailUrl,
        filePath: objectKey,
        storageType: mainUpload.storageType || "minio",
        fileSize: file.size,
        fileSizeFormatted: formatBytes(file.size),
        fileFormat: ext.replace(".", "").toUpperCase(),
        dimensions,
        duration: isVideo ? "02:30" : undefined,
        durationSeconds: isVideo ? 150 : undefined,
        mimeType,
        objectKey,
        postId,
      },
    });
  } catch (error) {
    console.error("[POST /api/gallery/upload/file] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi tải tệp lên máy chủ" }, { status: 500 });
  }
}
