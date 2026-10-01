import { classifyGalleryMedia } from "./galleryMediaTypes";
import { getGalleryQueueConnection } from './galleryQueue';
export const CHUNK_BYTES = 100_000_000;
export const uploadSessionKey = id => `gallery:upload:${id}`;
export async function createUploadSessions(postId, ownerId, uploads) {
  if (!Array.isArray(uploads) || !uploads.length || uploads.some(f =>
    !/^[a-f0-9-]{36}$/.test(f.sessionId || '') || typeof f.name !== 'string' ||
    !f.name || f.name.length > 255 || !Number.isSafeInteger(f.size) || f.size <= 0 || f.size > 20 * 1024 ** 3) ||
    new Set(uploads.map(f => f.sessionId)).size !== uploads.length) throw new Error('Danh sách tệp không hợp lệ');
  if (uploads.some(file => {
    const media = classifyGalleryMedia({ name: file.name });
    return !media.isImage && !media.isVideo && !media.isArchive;
  })) throw new Error('Chỉ chấp nhận ảnh, video, ZIP hoặc RAR');
  const redis = getGalleryQueueConnection();
  for (const f of uploads) {
    const key = uploadSessionKey(f.sessionId);
    const meta = { postId, ownerId, fileName: f.name, size: f.size, totalChunks: Math.ceil(f.size / CHUNK_BYTES), sessionId: f.sessionId };
    if (!(await redis.hsetnx(key, 'meta', JSON.stringify(meta)))) throw new Error('Phiên upload đã tồn tại');
    await redis.hset(key, 'state', 'uploading', 'progress', '0');
    await redis.expire(key, 7 * 86400);
  }
  return uploads.map(f => ({ sessionId: f.sessionId, name: f.name, size: f.size }));
}
export async function requireUploadSession(sessionId, ownerId) {
  if (!/^[a-f0-9-]{36}$/.test(sessionId || '')) throw new Error('Phiên upload không hợp lệ');
  const raw = await getGalleryQueueConnection().hget(uploadSessionKey(sessionId), 'meta');
  const meta = raw && JSON.parse(raw);
  if (!meta || meta.ownerId !== ownerId) throw new Error('Không tìm thấy phiên upload');
  return meta;
}
export async function withGalleryUploadProgress(posts) {
  const redis = posts.some(p => p.uploadSessions?.length) ? getGalleryQueueConnection() : null;
  return Promise.all(posts.map(async post => {
    if (!post.uploadSessions?.length) return post;
    const sessions = await Promise.all(post.uploadSessions.map(async file => {
      const status = await redis.hgetall(uploadSessionKey(file.sessionId));
      const received = Object.entries(status).filter(([key]) => key.startsWith('chunk:')).reduce((n, [,v]) => n + Number(v), 0);
      return { ...file, readyFiles: Number(status.readyFiles || 0), totalFiles: Number(status.totalFiles || 0), uploadedBytes: Math.min(file.size, received), totalBytes: file.size, bytesPerSecond: 0, state: status.state || 'expired', progress: status.state === 'completed' ? 100 :
        Math.min(99, Math.round(received / file.size * 70 + Number(status.progress || 0) * .3)), error: status.error || '' };
    }));
    const size = sessions.reduce((n,s) => n + s.size, 0);
    return { ...post, uploadState: { sessions, progress: Math.round(sessions.reduce((n,s) => n+s.size*s.progress,0)/size),
      state: sessions.every(s => s.state === 'completed') ? 'completed' : sessions.some(s => ['failed','expired'].includes(s.state)) ? 'failed' : 'uploading' } };
  }));
}
