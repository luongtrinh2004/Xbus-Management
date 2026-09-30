import { classifyGalleryMedia } from "@/libs/galleryMediaTypes";
import { createGalleryImagePreview } from "@/libs/galleryImagePreview";
import { randomUUID } from "node:crypto";
import { auditGallery } from "@/libs/galleryAudit";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import path from "path";
import sharp from "sharp";
import { getGallery, saveGallery, getUsers } from "@/libs/dataRepository";
import { uploadMediaObject } from "@/libs/minioClient";
import { sendMentionNotifications } from "@/libs/galleryMentions";

const secret = process.env.NEXTAUTH_SECRET;

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const DEPARTMENT_NAMES = {
  ap: "AP",
  web_app: "Web App",
  van_hanh: "Vận Hành",
  quan_ly_du_an: "Quản Lý Dự Án",
  mua_sam: "Mua Sắm",
};

export async function POST(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để tải lên" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Find actual uploader from users database
    const users = await getUsers();
    const matchedUser = users.find(
      (u) =>
        (token?.email && u.email?.toLowerCase() === token.email.toLowerCase()) ||
        (token?.id && u.id === token.id)
    );

    const uploader = {
      id: matchedUser?.id || token.id,
      name: matchedUser?.name || token.name || "Thành viên Xbus",
      email: matchedUser?.email || token.email || "",
      code: matchedUser?.code || "XBUS",
      avatar:
        matchedUser?.avatarUrl ||
        (matchedUser?.gender === "female"
          ? "/images/avatars/female-user.png"
          : matchedUser?.role === "admin"
            ? "/images/avatars/male-admin.png"
            : "/images/avatars/male-user.png"),
      role:
        matchedUser?.role === "admin"
          ? "Quản Lý Dự Án"
          : matchedUser?.role === "assistant"
            ? "Trợ lý Văn phòng"
            : "Kỹ sư",
      department: DEPARTMENT_NAMES[matchedUser?.typeId] || matchedUser?.typeId || "Xbus",
    };

    const currentData = await getGallery();
    const currentItems = Array.isArray(currentData.items) ? currentData.items : [];

    // --- CASE A: JSON payload (Pre-uploaded files finalization - INSTANT SUBMIT) ---
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { title = "", description = "", tags = [], privacy = "public", uploadedFiles = [] } = body;

      if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
        return NextResponse.json({ error: "Chưa có tệp tin nào được tải lên" }, { status: 400 });
      }

      const postId = String(body.postId || "");
      if (!/^post_[a-f0-9-]{36}$/.test(postId) || uploadedFiles.some(file =>
        file.postId !== postId || !String(file.filePath || file.objectKey || "").startsWith(`posts/${postId}/`))) {
        return NextResponse.json({ error: "Tệp tải lên không thuộc bài đăng này" }, { status: 400 });
      }
      if (currentItems.some(item => item.id === postId || item.postId === postId)) {
        return NextResponse.json({ error: "Bài đăng đã tồn tại" }, { status: 409 });
      }
      const firstFile = uploadedFiles[0];
      const postTitle = title.trim();
      const postDescription = description.trim();
      const totalSize = uploadedFiles.reduce((acc, f) => acc + (Number(f.fileSize) || 0), 0);
      const hasVideo = uploadedFiles.some((f) => f.type === "video");
      const hasImage = uploadedFiles.some((f) => f.type === "image");

      const newPost = {
        id: postId,
        postId,
        mediaSource: "minio",
        title: postTitle,
        description: postDescription,
        uploader,
        uploadedAt: new Date().toISOString(),
        privacy: privacy || "public",
        tags: Array.isArray(tags) && tags.length > 0 ? tags : ["#xbus"],
        likes: 0,
        isLiked: false,
        likedBy: [],
        comments: [],
        totalFiles: uploadedFiles.length,
        fileSize: totalSize,
        fileSizeFormatted: formatBytes(totalSize),
        type: hasVideo ? "video" : "image",
        hasVideo,
        hasImage,
        url: firstFile.url,
        thumbnail: firstFile.thumbnail || firstFile.url,
        dimensions: firstFile.dimensions || "1920 x 1080",
        fileFormat: firstFile.fileFormat || "MEDIA",
        files: uploadedFiles.map((f, idx) => ({
          id: f.id || `media_${Date.now()}_${idx}`,
          fileName: f.fileName,
          type: f.type,
          url: f.url,
          thumbnail: f.thumbnail || f.url,
          filePath: f.filePath || f.objectKey,
          storageType: f.storageType,
          fileSize: f.fileSize,
          fileSizeFormatted: f.fileSizeFormatted || formatBytes(f.fileSize),
          fileFormat: f.fileFormat,
          dimensions: f.dimensions,
          duration: f.duration,
          durationSeconds: f.durationSeconds,
        })),
        exif: {
          uploadedVia: "Web Uploader (MinIO Object Storage)",
          totalFiles: uploadedFiles.length,
        },
      };

      currentItems.unshift(newPost);
      await saveGallery({ items: currentItems });
    await auditGallery(token, "CREATE_GALLERY_POST", newPost, `${newPost.totalFiles} tệp; phạm vi: ${{public: "Công khai", team: "Nội bộ team", private: "Chỉ mình tôi"}[newPost.privacy] || "Không xác định"}`);

      // Gửi thông báo nếu có người dùng hoặc @All được gắn thẻ
      sendMentionNotifications({
        actor: uploader,
        text: `${postTitle} ${postDescription}`,
        explicitTaggedUserIds: Array.isArray(body.taggedUserIds) ? body.taggedUserIds : [],
        explicitIsTagAll: body.isTagAll === true,
        postId,
        postTitle,
      }).catch((e) => console.warn("[Upload Case A] Mention notification error:", e));

      const newUsedBytes = currentItems.reduce((acc, i) => acc + (Number(i.fileSize) || 0), 0);

      return NextResponse.json({
        success: true,
        post: newPost,
        items: [newPost],
        storage: {
          maxBytes: null,
          usedBytes: newUsedBytes,
          remainingBytes: null,
          percentUsed: 0,
        },
      });
    }

    // --- CASE B: Traditional FormData fallback ---
    const formData = await req.formData();
    const files = formData.getAll("files");
    const singleFile = formData.get("file");

    const allFilesToUpload = [];
    if (files && files.length > 0) {
      for (const f of files) {
        if (f instanceof File && f.size > 0) allFilesToUpload.push(f);
      }
    } else if (singleFile instanceof File && singleFile.size > 0) {
      allFilesToUpload.push(singleFile);
    }

    if (allFilesToUpload.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy tệp để tải lên" }, { status: 400 });
    }

    const titleInput = String(formData.get("title") || "").trim();
    const descriptionInput = String(formData.get("description") || "").trim();
    const privacyInput = String(formData.get("privacy") || "public").trim();
    let tagsInput = [];
    try {
      const parsed = JSON.parse(formData.get("tags") || "[]");
      if (Array.isArray(parsed)) tagsInput = parsed;
    } catch {
      const rawTags = String(formData.get("tags") || "");
      if (rawTags) tagsInput = rawTags.split(",").map((t) => t.trim());
    }

    const postId = `post_${randomUUID()}`;
    const uploadedFilesList = [];

    for (let i = 0; i < allFilesToUpload.length; i++) {
      const file = allFilesToUpload[i];
      const { mimeType, isVideo, isImage } = classifyGalleryMedia(file);

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

      const mainUpload = await uploadMediaObject({
        objectName: objectKey,
        buffer,
        mimeType,
      });

      const publicUrl = mainUpload.url;
      let thumbnailUrl = publicUrl;
      let dimensions = isVideo ? "1920 x 1080" : "1920 x 1080";

      if (isImage) {
        try {
          const thumbFileName = `thumb_${path.basename(uniqueFileName, ext)}.webp`;
          const thumbKey = `posts/${postId}/thumbnails/${thumbFileName}`;

          const imageInfo = await createGalleryImagePreview(buffer, mimeType);

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
          thumbnailUrl = "/images/gallery-image-unavailable.svg";
        }
      }

      uploadedFilesList.push({
        id: `media_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
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
      });
    }

    const firstFile = uploadedFilesList[0];
    const postTitle = titleInput || firstFile.fileName.replace(/\.[^/.]+$/, "");
    const totalSize = uploadedFilesList.reduce((acc, f) => acc + f.fileSize, 0);
    const hasVideo = uploadedFilesList.some((f) => f.type === "video");
    const hasImage = uploadedFilesList.some((f) => f.type === "image");

    const newPost = {
      id: postId,
      postId,
      mediaSource: "minio",
      title: postTitle,
      description: descriptionInput || "Tệp media được tải lên hệ thống lưu trữ nội bộ Xbus.",
      uploader,
      uploadedAt: new Date().toISOString(),
      privacy: privacyInput || "public",
      tags: tagsInput.length > 0 ? tagsInput : ["#xbus"],
      likes: 0,
      isLiked: false,
      likedBy: [],
      comments: [],
      totalFiles: uploadedFilesList.length,
      fileSize: totalSize,
      fileSizeFormatted: formatBytes(totalSize),
      type: hasVideo ? "video" : "image",
      hasVideo,
      hasImage,
      url: firstFile.url,
      thumbnail: firstFile.thumbnail || firstFile.url,
      dimensions: firstFile.dimensions || "1920 x 1080",
      fileFormat: firstFile.fileFormat,
      files: uploadedFilesList,
      exif: {
        uploadedVia: "Web Uploader (MinIO Object Storage)",
        totalFiles: uploadedFilesList.length,
      },
    };

    currentItems.unshift(newPost);
    await saveGallery({ items: currentItems });
    await auditGallery(token, "CREATE_GALLERY_POST", newPost, `${newPost.totalFiles} tệp; phạm vi: ${{public: "Công khai", team: "Nội bộ team", private: "Chỉ mình tôi"}[newPost.privacy] || "Không xác định"}`);

    sendMentionNotifications({
      actor: uploader,
      text: `${postTitle} ${descriptionInput || ""}`,
      postId,
      postTitle,
    }).catch((e) => console.warn("[Upload Case B] Mention notification error:", e));

    const newUsedBytes = currentItems.reduce((acc, i) => acc + (Number(i.fileSize) || 0), 0);

    return NextResponse.json({
      success: true,
      post: newPost,
      items: [newPost],
      storage: {
        maxBytes: null,
        usedBytes: newUsedBytes,
        remainingBytes: null,
        percentUsed: 0,
      },
    });
  } catch (error) {
    console.error("[POST /api/gallery/upload] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi trong quá trình lưu trữ tệp lên máy chủ" }, { status: 500 });
  }
}
