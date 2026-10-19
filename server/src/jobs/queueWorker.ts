import "../env.js";
import { assertRuntimeEnv } from "../config/runtime.js";
import { initTracing } from "../lib/tracing.js";
import { initSentry, flushSentry } from "../lib/sentry.js";
import { startAllWorkers, stopAllWorkers } from "../lib/queue.js";
import { closeRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

initTracing();
initSentry();
assertRuntimeEnv();

logger.info("Starting queue worker process");

const workers = await startAllWorkers();

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[worker] Received ${signal}, shutting down gracefully...`);

  await stopAllWorkers(workers);

  await closeRedisClient();

  await flushSentry(5000);

  logger.info("[worker] Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
