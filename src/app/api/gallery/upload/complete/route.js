import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { CopyConditions } from "minio";
import { ensureBucket, getMinioClient, MINIO_BUCKET } from "@/libs/minioClient";
import { enqueueGalleryUpload } from "@/libs/galleryQueue";

export const runtime = "nodejs";
const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!token?.id) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const { sessionId, postId, fileName, totalChunks } = await req.json();
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(String(sessionId)) || !/^post_[a-f0-9-]{36}$/.test(String(postId)) || !Number.isInteger(totalChunks) || totalChunks < 1) return NextResponse.json({ error: "Phiên upload không hợp lệ" }, { status: 400 });
  if (!(await ensureBucket())) return NextResponse.json({ error: "MinIO không sẵn sàng" }, { status: 503 });
  const client = getMinioClient();
  const prefix = `uploads/${token.id}/${sessionId}/chunks/`;
  const sources = Array.from({ length: totalChunks }, (_, index) => ({ name: `${prefix}${String(index).padStart(8, "0")}`, matchETag: "" }));
  const objectKey = `uploads/${token.id}/${sessionId}/source`;
  await client.composeObject(MINIO_BUCKET, objectKey, sources);
  const job = await enqueueGalleryUpload({ ownerId: token.id, sessionId, postId, fileName, sourceKey: objectKey, totalChunks });
  return NextResponse.json({ success: true, jobId: job.id, status: "waiting" });
}
