import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let connection;
let queue;

export function getGalleryQueueConnection() {
  if (!connection) {
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 500, 3000),
    });

    connection.on("error", (err) => {
      // Bắt sự kiện error của ioredis để tránh spam console khi Redis chưa bật ở local
      if (err.code === "ECONNREFUSED") return;
      console.warn("[Redis] Lỗi kết nối:", err.message);
    });
  }
  return connection;
}

export function getGalleryQueue() {
  if (!queue) queue = new Queue("gallery-upload", { connection: getGalleryQueueConnection() });
  return queue;
}

export async function enqueueGalleryUpload(data) {
  return getGalleryQueue().add("process-upload", data, {
    jobId: data.sessionId,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
