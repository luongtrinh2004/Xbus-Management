import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Readable, Transform } from 'node:stream';
import { ensureBucket, getMinioClient, MINIO_BUCKET } from '@/libs/minioClient';
import { getGalleryQueueConnection } from '@/libs/galleryQueue';
import { requireUploadSession, uploadSessionKey, CHUNK_BYTES } from '@/libs/galleryUploadSessions';
export const runtime = 'nodejs';
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const index = Number(url.searchParams.get('index'));
    const meta = await requireUploadSession(sessionId, token.id);
    if (!url.searchParams.has('index') || !Number.isInteger(index) || index < 0 || index >= meta.totalChunks || !req.body) throw Error('Chunk không hợp lệ');
    const state = await getGalleryQueueConnection().hget(uploadSessionKey(sessionId), 'state');
    if (state !== 'uploading') throw Error('Phiên upload đã chuyển sang xử lý');
    const expected = Math.min(CHUNK_BYTES, meta.size - index * CHUNK_BYTES);
    if (Number(req.headers.get('content-length')) !== expected) throw Error('Kích thước chunk không hợp lệ');
    if (!(await ensureBucket())) return NextResponse.json({ error: 'MinIO không sẵn sàng' }, { status: 503 });
    let size = 0;
    const limiter = new Transform({ transform(chunk, encoding, done) { size += chunk.length; done(size > expected ? Error('Chunk quá lớn') : null, chunk); },
      flush(done) { done(size !== expected ? Error('Chunk chưa tải đủ') : null); } });
    const input = Readable.fromWeb(req.body);
    input.on('error', error => limiter.destroy(error));
    const stream = input.pipe(limiter);
    try {
      await getMinioClient().putObject(MINIO_BUCKET, `uploads/${token.id}/${sessionId}/chunks/${String(index).padStart(8,'0')}`, stream, expected);
    } finally { input.destroy(); limiter.destroy(); }
    await getGalleryQueueConnection().hset(uploadSessionKey(sessionId), `chunk:${index}`, String(size), 'error', '');
    return NextResponse.json({ success: true, index, size });
  } catch (error) { return NextResponse.json({ error: error.message || 'Không thể tải chunk' }, { status: 400 }); }
}

export async function PATCH(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
  try {
    const { sessionId } = await req.json();
    await requireUploadSession(sessionId, token.id);
    const redis = getGalleryQueueConnection();
    await redis.eval("if redis.call('HGET', KEYS[1], 'state') == 'uploading' then return redis.call('HSET', KEYS[1], 'error', ARGV[1]) end return 0", 1, uploadSessionKey(sessionId), 'Tải lên bị gián đoạn. Chọn lại file gốc để tiếp tục các phần còn thiếu.');
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Không tìm thấy phiên upload' }, { status: 400 }); }
}

export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
  try {
    const sessionId = new URL(req.url).searchParams.get('sessionId');
    const meta = await requireUploadSession(sessionId, token.id);
    const status = await getGalleryQueueConnection().hgetall(uploadSessionKey(sessionId));
    return NextResponse.json({ meta, state: status.state, chunks: Object.keys(status).filter(k => k.startsWith('chunk:')).map(k => Number(k.slice(6))) });
  } catch { return NextResponse.json({ error: 'Phiên upload đã hết hạn hoặc không thuộc tài khoản này' }, { status: 404 }); }
}
