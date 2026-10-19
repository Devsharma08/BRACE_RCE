import { logger } from "../lib/logger.js";
import { createQueueWorker } from "../lib/queue.js";
import type { Job } from "bullmq";
import type { SendEmailOptions } from "../lib/gmail.js";

export interface EmailJobData extends SendEmailOptions {}

const processor = async (job: Job<EmailJobData>): Promise<{ success: true; messageId: string }> => {
  const { to, subject, text, html } = job.data;

  logger.info(`[email] Sending to ${to}: ${subject}`);

  const { sendGmailEmail } = await import("../lib/gmail.js");
  const info = await sendGmailEmail({ to, subject, text, html });

  return { success: true, messageId: info.messageId };
};

export const emailWorker = createQueueWorker<EmailJobData, { success: true; messageId: string }>(
  "emails",
  processor,
  Number(process.env.EMAIL_CONCURRENCY || 2)
);

logger.info(`[email] Worker started with concurrency=${Number(process.env.EMAIL_CONCURRENCY || 2)}`);
