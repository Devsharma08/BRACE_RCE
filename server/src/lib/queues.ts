import { Queue } from "bullmq";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * In BullMQ 5.x, passing a pre-created but unconnected Redis client to `new
 * Queue()` causes the queue to silently hang on the first `.add()` call,
 * because BullMQ never invokes `.connect()` on the client it receives.
 *
 * Instead, pass the connection string via the `connection.url` option so
 * BullMQ creates and manages its own ioredis instance internally.
 */
function createQueue(name: string) {
  return new Queue(name, {
    connection: { url: REDIS_URL },
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