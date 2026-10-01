import { createHash } from "node:crypto";
import { ensureBucket, getMinioClient, MINIO_BUCKET } from "./minioClient.js";
import { classifyGalleryMedia } from "./galleryMediaTypes.js";

const videoTypes = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo', mkv: 'video/x-matroska', m4v: 'video/mp4', mpg: 'video/mpeg', mpeg: 'video/mpeg', '3gp': 'video/3gpp', mts: 'video/mp2t' };
const mediaUrl = (key, version) => `/api/gallery/media/${key.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(version || '')}`;
const formatSize = size => `${(size / 1024 / 1024).toFixed(2)} MB`;

// Database owns post content. MinIO owns the file list for folder-based posts.
// If MinIO is offline, gracefully return existing database items instead of crashing.
export async function resolveGalleryMinioFiles(items, client = getMinioClient()) {
  try {
    const isAvailable = await ensureBucket();
    if (!isAvailable) {
      return items;
    }

    const objects = [];
    for await (const object of client.listObjectsV2(MINIO_BUCKET, 'posts/', true)) {
      if (object.name && !object.name.endsWith('/')) objects.push(object);
    }
  // A file manually copied to posts/<postId>/ must be visible even when its
  // database entry has not been created yet.
  const knownIds = new Set(items.map(post => post.id));
  const discoveredIds = new Set(objects.map(object => object.name.split('/')[1]).filter(Boolean));
  const discoveredPosts = [...discoveredIds]
    .filter(id => !knownIds.has(id))
    .map(id => {
      const first = objects.find(object => object.name.startsWith(`posts/${id}/`));
      return {
        id, postId: id, mediaSource: 'minio', title: `Tệp trong ${id}`,
        description: 'Tệp được đồng bộ từ thư mục MinIO.', uploader: { name: 'MinIO' },
        uploadedAt: first?.lastModified ? new Date(first.lastModified).toISOString() : new Date(0).toISOString(),
        privacy: 'public', tags: [], likes: 0, isLiked: false, likedBy: [], comments: [], files: [],
      };
    });
  const allItems = [...items, ...discoveredPosts];
  const folderPosts = allItems.filter(post => post.mediaSource === 'minio' ||
    post.files?.some(file => (file.filePath || '').startsWith(`posts/${post.id}/`)));
  if (!folderPosts.length) return allItems;
  const byName = new Map(objects.map(object => [object.name, object]));
  const eligible = new Set(folderPosts.map(post => post.id));
  return allItems.map(post => {
    if (!eligible.has(post.id)) return post;
    const prefix = `posts/${post.id}/`;
    const previous = new Map((post.files || []).map(file => [file.filePath, file]));
    const files = objects.filter(object => object.name.startsWith(prefix)).flatMap(object => {
      const relative = object.name.slice(prefix.length);
      if (relative.split('/').some(part => ['thumbnails', 'previews'].includes(part))) return [];
      const fileName = relative.split('/').pop();
      const ext = fileName.split('.').pop().toLowerCase();
      const media = classifyGalleryMedia({ name: fileName, type: videoTypes[ext] || '' });
      if (!media.isImage && !media.isVideo) return [];
      const old = previous.get(object.name);
      const version = object.etag || String(object.lastModified || '');
      const url = mediaUrl(object.name, version);
      const thumbKey = `${prefix}thumbnails/thumb_${fileName.replace(/\.[^.]+$/, '')}.webp`;
      const thumb = byName.get(thumbKey);
      const browserImage = /^(jpg|jpeg|jfif|png|gif|webp|avif|svg|bmp|ico)$/.test(ext);
      return [{ ...old,
        id: old?.id || `media_${createHash('sha256').update(object.name).digest('hex').slice(0, 24)}`,
        fileName: old?.fileName || fileName, filePath: object.name, objectKey: object.name,
        type: media.isVideo ? 'video' : 'image', mimeType: media.mimeType,
        url, thumbnail: thumb ? mediaUrl(thumbKey, thumb.etag) :
          media.isImage && !browserImage ? '/images/gallery-image-unavailable.svg' : url,
        storageType: 'minio', fileSize: object.size || 0,
        fileSizeFormatted: formatSize(object.size || 0), fileFormat: ext.toUpperCase(),
      }];
    });
    // Locally stored uploads still work; they are not objects missing from MinIO.
    for (const old of post.files || []) {
      if (!byName.has(old.filePath) && (old.storageType === 'local_fallback' || old.url?.startsWith('/uploads/gallery/'))) files.push(old);
    }
    const size = files.reduce((sum, file) => sum + (Number(file.fileSize) || 0), 0);
    return { ...post, files, mediaSource: 'minio', totalFiles: files.length,
      fileSize: size, fileSizeFormatted: formatSize(size),
      hasVideo: files.some(file => file.type === 'video'), hasImage: files.some(file => file.type === 'image'),
      type: files.some(file => file.type === 'video') ? 'video' : 'image',
      url: files[0]?.url || '', thumbnail: files[0]?.thumbnail || '/images/gallery-image-unavailable.svg',
    };
  });
  } catch (err) {
    console.warn('[MinIO] Không thể lấy danh sách files từ MinIO, sử dụng dữ liệu database:', err?.message || err);
    return items;
  }
}

