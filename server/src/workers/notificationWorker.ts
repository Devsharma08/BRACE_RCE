import { logger } from "../lib/logger.js";
import { createQueueWorker } from "../lib/queue.js";
import type { Job } from "bullmq";

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const processor = async (job: Job<NotificationJobData>): Promise<{ id: string }> => {
  const { userId, type, title, body, data } = job.data;

  logger.info({ userId, type }, `[notification] Creating notification for user ${userId}`);

  const { createNotification } = await import("../services/notificationService.js");
  const notif = await createNotification({
    userId,
    type: type as any,
    title,
    body,
    data: data as any,
  });

  // Push the notification to the user's live sockets so it appears
  // immediately without waiting for a list refetch. Previously the worker
  // created the DB row and returned silently — anything going through
  // enqueueNotification (weekly analysis, future queued join notifs, etc.)
  // would never appear until the client happened to refetch.
  try {
    const { emitNotification } = await import("../socket/ioRegistry.js");
    await emitNotification(userId, notif);
  } catch (err) {
    // Non-fatal: the DB row exists; the client will see it on next refetch.
    logger.warn(`[notification] Socket emit failed for ${userId}: ${String(err)}`);
  }

  return { id: notif.id };
};

export const notificationWorker = createQueueWorker<NotificationJobData, { id: string }>(
  "notifications",
  processor,
  Number(process.env.NOTIFICATION_CONCURRENCY || 5)
);

logger.info(`[notification] Worker started with concurrency=${Number(process.env.NOTIFICATION_CONCURRENCY || 5)}`);
