import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { enqueueGalleryUpload, getGalleryQueueConnection } from '@/libs/galleryQueue';
import { requireUploadSession, uploadSessionKey, CHUNK_BYTES } from '@/libs/galleryUploadSessions';
export const runtime = 'nodejs';
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
  try {
    const { sessionId } = await req.json();
    const meta = await requireUploadSession(sessionId, token.id);
    const redis = getGalleryQueueConnection();
    const status = await redis.hgetall(uploadSessionKey(sessionId));
    for (let i=0; i<meta.totalChunks; i++) if (Number(status[`chunk:${i}`]) !== Math.min(CHUNK_BYTES, meta.size-i*CHUNK_BYTES)) throw Error('Tệp chưa tải đủ các chunk');
    const job = await enqueueGalleryUpload({ ...meta, sourceKey: `uploads/${token.id}/${sessionId}/source` });
    // Worker owns processing status; never overwrite it with a delayed HTTP response.
    return NextResponse.json({ success: true, jobId: job.id }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error.message || 'Không thể xếp hàng xử lý' }, { status: 400 }); }
}
