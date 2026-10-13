import { createHash } from "node:crypto";
import { ensureBucket, getMinioClient, MINIO_BUCKET } from "./minioClient";

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function storeTeaMenuImage({ buffer, mimeType, checksum }) {
  const extension = extensions[mimeType];
  if (
    !extension ||
    !/^[a-f0-9]{64}$/.test(checksum) ||
    createHash("sha256").update(buffer).digest("hex") !== checksum
  )
    throw new Error("Ảnh menu hoặc checksum không hợp lệ");
  if (!(await ensureBucket()))
    throw new Error("Không thể kết nối MinIO để lưu ảnh menu");
  const key = `afternoon-tea/menus/${checksum}.${extension}`;
  const client = getMinioClient();
  try {
    await client.statObject(MINIO_BUCKET, key);
  } catch (error) {
    if (!["NoSuchKey", "NotFound", "NoSuchObject"].includes(error?.code))
      throw error;
    await client.putObject(MINIO_BUCKET, key, buffer, buffer.length, {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  }
  return `/api/media/${key}?storage=minio`;
}
