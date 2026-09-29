import fs from "node:fs/promises";
import path from "node:path";
import { ensureBucket, getMinioClient, MINIO_BUCKET } from "./minioClient";

export const isSafeStaffCode = value => /^[\p{L}\p{N}_-]+$/u.test(String(value || ""));
const root = path.resolve(process.cwd(), "public/images/avatars");
const defaults = new Set(["male-admin.png", "female-admin.png", "male-user.png", "female-user.png", "assistant.png"]);

export function parseAvatarUrl(url) {
  if (typeof url !== "string") return null;
  const prefix = ["/api/media/avatars/", "/images/avatars/"].find(p => url.startsWith(p));
  if (!prefix) return null;
  let relative;
  try { relative = decodeURIComponent(url.split("?")[0].slice(prefix.length)); }
  catch { return null; }
  const segments = relative.split("/");
  if (segments.some(s => !s || s === "." || s === ".." || s.includes("\\") || s.includes("\0"))) return null;
  if (defaults.has(segments.at(-1))) return null;
  return {
    key: `avatars/${relative}`,
    localPath: path.join(root, ...segments),
    minio: new URLSearchParams(url.split("?")[1] || "").get("storage") === "minio",
  };
}

export async function storeAvatar(staffCode, extension, buffer) {
  if (!isSafeStaffCode(staffCode) || !["jpg", "jpeg", "png", "webp"].includes(extension)) throw new Error("Ảnh hoặc mã nhân sự không hợp lệ");
  if (!(await ensureBucket())) throw new Error("Không thể kết nối MinIO để lưu ảnh đại diện");
  const key = `avatars/${staffCode}/${staffCode}.${extension}`;
  await getMinioClient().putObject(MINIO_BUCKET, key, buffer, buffer.length, {
    "Content-Type": extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}`,
    "Cache-Control": "no-store, max-age=0",
  });
  return `/api/media/avatars/${encodeURIComponent(staffCode)}/${encodeURIComponent(`${staffCode}.${extension}`)}?storage=minio&v=${Date.now()}`;
}

// Call only after the user record has been saved successfully.
export async function removeAvatar(url, keepUrl = "") {
  const old = parseAvatarUrl(url);
  const keep = parseAvatarUrl(keepUrl);
  if (!old || (old.minio === keep?.minio && old.key === keep?.key)) return;
  if (old.minio) {
    await getMinioClient().removeObject(MINIO_BUCKET, old.key);
  } else {
    try { await fs.unlink(old.localPath); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

export async function moveAvatarToStaffCode(url, previousCode, nextCode) {
  const old = parseAvatarUrl(url);
  if (!old || previousCode === nextCode) return url;
  const extension = path.extname(old.key).slice(1).toLowerCase();
  let buffer;
  if (old.minio) {
    const stream = await getMinioClient().getObject(MINIO_BUCKET, old.key);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    buffer = Buffer.concat(chunks);
  } else {
    try { buffer = await fs.readFile(old.localPath); }
    catch (error) { if (error.code === "ENOENT") return url; throw error; }
  }
  return storeAvatar(nextCode, extension, buffer);
}
