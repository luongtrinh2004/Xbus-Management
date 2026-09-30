import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let connection;
let queue;

export function getGalleryQueueConnection() {
  if (!connection) connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  return connection;
}

export function getGalleryQueue() {
  if (!queue) queue = new Queue("gallery-upload", { connection: getGalleryQueueConnection() });
  return queue;
}

export async function enqueueGalleryUpload(data) {
  return getGalleryQueue().add("process-upload", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
