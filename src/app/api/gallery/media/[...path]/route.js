import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getMinioClient, MINIO_BUCKET, ensureBucket } from "@/libs/minioClient";

export async function GET(req, { params }) {
  try {
    const { path: pathSegments } = await params;
    const objectKey = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;

    if (!objectKey) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Try reading from MinIO
    try {
      const isAvailable = await ensureBucket();
      if (isAvailable) {
        const client = getMinioClient();
        const stat = await client.statObject(MINIO_BUCKET, objectKey);
        const stream = await client.getObject(MINIO_BUCKET, objectKey);

        const contentType = stat.metaData?.["content-type"] || "application/octet-stream";

        // Convert Node.js readable stream to Web ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
        });

        return new NextResponse(webStream, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(stat.size),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (minioErr) {
      // If object not in MinIO or MinIO is offline, continue to fallback below
    }

    // Fallback: Check local public/uploads/gallery
    const localPath = path.join(process.cwd(), "public", "uploads", "gallery", objectKey);
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      const fileStream = fs.createReadStream(localPath);

      const ext = path.extname(localPath).toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".mp4") contentType = "video/mp4";
      else if (ext === ".webm") contentType = "video/webm";

      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(stat.size),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse("File not found", { status: 404 });
  } catch (err) {
    console.error("[Media Stream Proxy] Lỗi:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
