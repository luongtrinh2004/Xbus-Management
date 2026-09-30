import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ensureBucket, getMinioClient, MINIO_BUCKET } from "@/libs/minioClient";

export const runtime = "nodejs";
const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  const token = await getToken({ req, secret });
  if (!token?.id) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  const form = await req.formData();
  const sessionId = String(form.get("sessionId") || "");
  const index = Number(form.get("index"));
  const chunk = form.get("chunk");
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(sessionId) || !Number.isInteger(index) || index < 0 || !(chunk instanceof File)) {
    return NextResponse.json({ error: "Chunk không hợp lệ" }, { status: 400 });
  }
  if (!(await ensureBucket())) return NextResponse.json({ error: "MinIO không sẵn sàng" }, { status: 503 });
  const buffer = Buffer.from(await chunk.arrayBuffer());
  const key = `uploads/${token.id}/${sessionId}/chunks/${String(index).padStart(8, "0")}`;
  await getMinioClient().putObject(MINIO_BUCKET, key, buffer, buffer.length, { "Content-Type": "application/octet-stream" });
  return NextResponse.json({ success: true, index, size: buffer.length, key });
}
