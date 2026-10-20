import nodemailer from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

function createTransporter(): Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('Gmail SMTP is not configured (missing GMAIL_USER / GMAIL_APP_PASSWORD).');
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send an email through Gmail's SMTP server. The "from" address is the Gmail
 * account configured in GMAIL_USER, so messages appear to come from Gmail.
 *
 * Throws if GMAIL_USER / GMAIL_APP_PASSWORD are missing.
 */
export async function sendGmailEmail(options: SendEmailOptions): Promise<SentMessageInfo> {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"BRACE RCE" <${process.env.GMAIL_USER}>`,
    ...options,
  });
  return info;
}

/**
 * Queue an email for asynchronous delivery via BullMQ.
 *
 * The email worker picks up the job and calls `sendGmailEmail` with retry/backoff.
 * This allows the request cycle to return immediately without waiting for SMTP.
 */
export async function sendQueuedEmail(options: SendEmailOptions): Promise<string> {
  const { emailQueue } = await import("./queues.js");
  const job = await emailQueue.add("send", options, {
    removeOnComplete: true,
    removeOnFail: { age: 86400 },
  });
  return job.id || "unknown";
}

