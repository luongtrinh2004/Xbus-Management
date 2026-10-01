import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getGalleryQueue } from "@/libs/galleryQueue";

export const runtime = "nodejs";

export async function GET(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id || token.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const queue = getGalleryQueue();
  const [counts, jobs] = await Promise.all([
    queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    queue.getJobs(["active", "waiting", "failed", "completed"], 0, 99, true),
  ]);
  return NextResponse.json({ counts, jobs: await Promise.all(jobs.map(async job => ({ state: await job.getState(), id: job.id, name: job.name, data: job.data, progress: job.progress, failedReason: job.failedReason, timestamp: job.timestamp, finishedOn: job.finishedOn }))) });
}
