import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getMinioClient, MINIO_BUCKET, ensureBucket } from "@/libs/minioClient";
import { createMediaResponse } from "@/libs/mediaResponse";

export const runtime = "nodejs";

const contentTypes = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4",
  ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
};

export async function GET(req, { params }) {
  try {
    const { path: pathSegments } = await params;
    const objectKey = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
    if (!objectKey || objectKey.includes("\\") || objectKey.includes("\0") ||
        objectKey.split("/").some(segment => segment === ".." || segment === ".")) {
      return new NextResponse("Not Found", { status: 404 });
    }
    const fallbackType = contentTypes[path.extname(objectKey).toLowerCase()] || "application/octet-stream";
    try {
      if (await ensureBucket()) {
        const client = getMinioClient();
        const stat = await client.statObject(MINIO_BUCKET, objectKey);
        return await createMediaResponse(req, {
          size: stat.size,
          contentType: stat.metaData?.["content-type"] || fallbackType,
          getStream: range => range
            ? client.getPartialObject(MINIO_BUCKET, objectKey, range.start, range.end - range.start + 1)
            : client.getObject(MINIO_BUCKET, objectKey),
        });
      }
    } catch {
      // Older uploads and uploads made while MinIO was offline may be local.
    }

    const root = path.resolve(process.cwd(), "public", "uploads", "gallery");
    const localPath = path.resolve(root, objectKey);
    if (!localPath.startsWith(root + path.sep)) {
      return new NextResponse("Not Found", { status: 404 });
    }
    let stat;
    try {
      stat = await fs.promises.stat(localPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!stat?.isFile()) return new NextResponse("File not found", { status: 404 });
    return await createMediaResponse(req, {
      size: stat.size,
      contentType: fallbackType,
      getStream: range => fs.createReadStream(localPath, range || undefined),
    });
  } catch (err) {
    console.error("[Media Stream Proxy] Lỗi:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const HEAD = GET;
