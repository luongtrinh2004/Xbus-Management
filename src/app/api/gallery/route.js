import { resolveGalleryMinioFiles } from "@/libs/galleryMinioFiles";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGallery } from "@/libs/dataRepository";

const secret = process.env.NEXTAUTH_SECRET;
const MAX_STORAGE_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function normalizeToPosts(rawItems = []) {
  const postsMap = new Map();
  const result = [];

  for (const item of rawItems) {
    // If it's already a full Post with files array:
    if (Array.isArray(item.files)) {
      result.push(item);
      continue;
    }

    // If it's a legacy item with postId:
    const key = item.postId || item.id;
    if (!postsMap.has(key)) {
      const post = {
        id: key,
        postId: key,
        title: item.title,
        description: item.description,
        uploader: item.uploader,
        uploadedAt: item.uploadedAt,
        privacy: item.privacy || "public",
        tags: item.tags || [],
        likes: item.likes || 0,
        isLiked: item.isLiked || false,
        likedBy: item.likedBy || [],
        comments: item.comments || [],
        totalFiles: 0,
        fileSize: 0,
        fileSizeFormatted: "0 Bytes",
        type: item.type || "image",
        hasVideo: item.type === "video",
        hasImage: item.type === "image",
        url: item.url,
        thumbnail: item.thumbnail || item.url,
        dimensions: item.dimensions,
        fileFormat: item.fileFormat,
        files: [],
      };
      postsMap.set(key, post);
      result.push(post);
    }

    const post = postsMap.get(key);
    post.files.push({
      id: item.id,
      fileName: item.fileName,
      type: item.type,
      url: item.url,
      thumbnail: item.thumbnail || item.url,
      filePath: item.filePath,
      fileSize: item.fileSize,
      fileSizeFormatted: item.fileSizeFormatted,
      fileFormat: item.fileFormat,
      dimensions: item.dimensions,
      duration: item.duration,
      durationSeconds: item.durationSeconds,
    });
    post.totalFiles = post.files.length;
    post.fileSize += Number(item.fileSize) || 0;
    if (item.type === "video") {
      post.type = "video";
      post.hasVideo = true;
    }
  }

  // Format total file sizes
  result.forEach((p) => {
    p.fileSizeFormatted = formatBytes(p.fileSize);
  });

  return result;
}

export async function GET(req) {
  try {
    const token = await getToken({ req, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase().trim();
    const type = searchParams.get("type") || "all";
    const time = searchParams.get("time") || "all";
    const uploader = searchParams.get("uploader") || "all";
    const sort = searchParams.get("sort") || "newest";
    const largestOnly = searchParams.get("largestOnly") === "true";

    const data = await getGallery();
    const rawItems = Array.isArray(data.items) ? data.items : [];

    // Normalize to Post-based representation (1 Post = 1 Card on UI)
    const allPosts = await resolveGalleryMinioFiles(normalizeToPosts(rawItems));

    // Calculate real storage statistics across every sub-file
    let usedBytes = 0;
    let imageBytes = 0;
    let videoBytes = 0;
    let imageCount = 0;
    let videoCount = 0;
    let totalFiles = 0;

    for (const post of allPosts) {
      if (Array.isArray(post.files)) {
        for (const f of post.files) {
          const sz = Number(f.fileSize) || 0;
          usedBytes += sz;
          totalFiles += 1;
          if (f.type === "video") {
            videoBytes += sz;
            videoCount += 1;
          } else {
            imageBytes += sz;
            imageCount += 1;
          }
        }
      } else {
        const sz = Number(post.fileSize) || 0;
        usedBytes += sz;
        totalFiles += 1;
        if (post.type === "video") {
          videoBytes += sz;
          videoCount += 1;
        } else {
          imageBytes += sz;
          imageCount += 1;
        }
      }
    }

    const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - usedBytes);
    const percentUsed = Number(((usedBytes / MAX_STORAGE_BYTES) * 100).toFixed(1));

    // Filter Posts
    let filtered = allPosts.filter((post) => {
      // 1. Search Query
      if (search) {
        const matchTitle = post.title?.toLowerCase().includes(search);
        const matchUploader = post.uploader?.name?.toLowerCase().includes(search);
        const matchTags = post.tags?.some((t) => t.toLowerCase().includes(search));
        const matchAnyFile = post.files?.some((f) => f.fileName?.toLowerCase().includes(search));
        if (!matchTitle && !matchUploader && !matchTags && !matchAnyFile) return false;
      }

      // 2. Type Filter (Image / Video)
      if (type !== "all") {
        if (type === "video" && !post.hasVideo && post.type !== "video") return false;
        if (type === "image" && !post.hasImage && post.type !== "image") return false;
      }

      // 3. Time Filter
      if (time !== "all") {
        const itemDate = new Date(post.uploadedAt);
        const now = new Date();
        if (time === "today") {
          const isToday =
            itemDate.getDate() === now.getDate() &&
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (time === "this_week") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (itemDate < oneWeekAgo) return false;
        } else if (time === "this_month") {
          const isThisMonth =
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        }
      }

      // 4. Uploader
      if (uploader !== "all" && post.uploader?.name !== uploader) return false;

      // 5. Largest Only
      if (largestOnly) {
        if ((post.fileSize || 0) < 10 * 1024 * 1024) return false;
      }

      return true;
    });

    // Sort Posts
    filtered.sort((a, b) => {
      if (sort === "likes_desc" || sort === "likes") {
        const countA = typeof a.likes === "number" ? a.likes : (Array.isArray(a.likedBy) ? a.likedBy.length : 0);
        const countB = typeof b.likes === "number" ? b.likes : (Array.isArray(b.likedBy) ? b.likedBy.length : 0);
        return countB - countA;
      }
      if (sort === "comments_desc" || sort === "comments") {
        const countA = Array.isArray(a.comments) ? a.comments.length : 0;
        const countB = Array.isArray(b.comments) ? b.comments.length : 0;
        return countB - countA;
      }
      if (sort === "largest" || sort === "size_desc") return (b.fileSize || 0) - (a.fileSize || 0);
      if (sort === "smallest" || sort === "size_asc") return (a.fileSize || 0) - (b.fileSize || 0);
      if (sort === "newest") return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sort === "oldest") return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      return 0;
    });

    return NextResponse.json({
      items: filtered,
      total: filtered.length,
      storage: {
        maxBytes: MAX_STORAGE_BYTES,
        usedBytes,
        imageBytes,
        videoBytes,
        remainingBytes,
        percentUsed,
        totalFiles,
        imageCount,
        videoCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/gallery] Lỗi:", error);
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}
