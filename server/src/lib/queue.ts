import { Worker, type Worker as WorkerType, type Processor, type Job } from "bullmq";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export function createQueueWorker<TJobData = unknown, TReturn = unknown>(
  name: string,
  processor: Processor<TJobData, TReturn>,
  concurrency: number
): WorkerType<TJobData, TReturn> {
  const worker = new Worker<TJobData, TReturn>(name, processor, {
    connection: { url: REDIS_URL },
    concurrency,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });

  worker.on("completed", (job: Job<TJobData>) => {
    logger.info(`[${name}] Job ${job.id} completed`);
  });

  worker.on("failed", (job: Job<TJobData> | undefined, err: Error) => {
    logger.error(`[${name}] Job ${job?.id ?? "unknown"} failed: ${err.message}`);
  });

  worker.on("error", (err: Error) => {
    logger.error(`[${name}] Worker error: ${err.message}`);
  });

  worker.on("drained", () => {
    logger.info(`[${name}] Queue drained`);
  });

  return worker;
}

export async function startAllWorkers(): Promise<WorkerType[]> {
  const workers: WorkerType[] = [];

  const { codeExecutionWorker } = await import("../workers/codeExecutionWorker.js");
  const { emailWorker } = await import("../workers/emailWorker.js");
  const { notificationWorker } = await import("../workers/notificationWorker.js");

  workers.push(codeExecutionWorker, emailWorker, notificationWorker);

  logger.info(`Started ${workers.length} queue workers`);
  return workers;
}

export async function stopAllWorkers(workers: WorkerType[]): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  logger.info("All queue workers stopped");
}

export type { WorkerType, Job };
