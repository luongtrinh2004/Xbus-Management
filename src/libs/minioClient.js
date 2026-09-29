import * as Minio from "minio";
import fs from "fs/promises";
import path from "path";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "127.0.0.1";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "9000", 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";
const MINIO_ACCESS_KEY =
  process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "xbus_admin";
const MINIO_SECRET_KEY =
  process.env.MINIO_SECRET_KEY ||
  process.env.MINIO_ROOT_PASSWORD ||
  "xbus_secret_password";

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "xbus-gallery";

let clientInstance = null;
let bucketInitialized = false;

export function getMinioClient() {
  if (!clientInstance) {
    clientInstance = new Minio.Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }
  return clientInstance;
}

/**
 * Checks if MinIO is reachable and ensures the target bucket exists with public read policy
 */
export async function ensureBucket() {
  if (bucketInitialized) return true;
  try {
    const client = getMinioClient();
    const exists = await client.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await client.makeBucket(MINIO_BUCKET);

      // Set public read policy for the bucket
      const publicPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
          },
        ],
      };
      await client.setBucketPolicy(MINIO_BUCKET, JSON.stringify(publicPolicy));
    }
    bucketInitialized = true;
    return true;
  } catch (err) {
    console.warn("[MinIO] Không thể kết nối hoặc khởi tạo bucket MinIO:", err?.message || err);
    return false;
  }
}

/**
 * Upload an object buffer to MinIO. If MinIO is offline, gracefully fall back to local disk.
 */
export async function uploadMediaObject({ objectName, buffer, mimeType }) {
  const isAvailable = await ensureBucket();

  if (isAvailable) {
    try {
      const client = getMinioClient();
      await client.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
        "Content-Type": mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      });

      // Construct public URL
      const publicHost = process.env.MINIO_PUBLIC_URL;
      const url = publicHost
        ? `${publicHost.replace(/\/$/, "")}/${MINIO_BUCKET}/${objectName}`
        : `/api/gallery/media/${objectName}`;

      return {
        success: true,
        storageType: "minio",
        objectName,
        url,
      };
    } catch (uploadErr) {
      console.warn("[MinIO] Upload lên MinIO lỗi, chuyển sang fallback lưu cục bộ:", uploadErr);
    }
  }

  // Fallback to local public/uploads/gallery
  const localTarget = path.join(process.cwd(), "public", "uploads", "gallery", objectName);
  await fs.mkdir(path.dirname(localTarget), { recursive: true });
  await fs.writeFile(localTarget, buffer);

  return {
    success: true,
    storageType: "local_fallback",
    objectName,
    url: `/uploads/gallery/${objectName}`,
  };
}

/**
 * Delete object from MinIO and/or local fallback
 */
export async function deleteMediaObject(objectName) {
  if (!objectName) return;

  // Clean path format if full URL or leading slashes
  const cleanKey = objectName
    .replace(/^\/?api\/gallery\/media\//, "")
    .replace(/^\/?uploads\/gallery\//, "")
    .replace(/^https?:\/\/[^/]+\/[^/]+\//, "");

  // Try delete from MinIO
  try {
    const isAvailable = await ensureBucket();
    if (isAvailable) {
      const client = getMinioClient();
      await client.removeObject(MINIO_BUCKET, cleanKey);
    }
  } catch (err) {
    console.warn("[MinIO] Lỗi khi xóa object khỏi MinIO:", cleanKey, err?.message);
  }

  // Also try delete local file if exists
  try {
    const localTarget = path.join(process.cwd(), "public", "uploads", "gallery", cleanKey);
    await fs.unlink(localTarget);
  } catch {}
}

/**
 * Delete multiple objects
 */
export async function deleteMultipleMediaObjects(objectNames = []) {
  if (!Array.isArray(objectNames) || objectNames.length === 0) return;
  for (const name of objectNames) {
    await deleteMediaObject(name);
  }
}

/**
 * Get readable stream from MinIO for proxy streaming
 */
export async function getMediaStream(objectName) {
  const client = getMinioClient();
  return client.getObject(MINIO_BUCKET, objectName);
}
