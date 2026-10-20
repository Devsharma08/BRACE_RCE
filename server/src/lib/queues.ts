import { Queue } from "bullmq";
import { createClient } from "redis";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

function createRedisClient() {
  const client = createClient({ url: REDIS_URL });
  client.on("error", (err: Error) => logger.error(`Redis client error: ${err.message}`));
  return client;
}

function createQueue(name: string) {
  return new Queue(name, {
    connection: createRedisClient() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  });
}

export const codeExecutionQueue = createQueue("code-execution");
export const emailQueue = createQueue("emails");
export const notificationQueue = createQueue("notifications");

logger.info("Queue infrastructure initialized: code-execution, emails, notifications");