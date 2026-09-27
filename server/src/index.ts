import "./env.js";
import { createApp, getAllowedOrigins } from "./app.js";
import { assertRuntimeEnv } from "./config/runtime.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSocketServer } from "./socket/index.js";
import { prisma } from "./lib/prisma.js";
import { initTracing } from "./lib/tracing.js";
import { initSentry, flushSentry } from "./lib/sentry.js";

// Initialize observability early
initTracing();
initSentry();

assertRuntimeEnv();

const app = createApp();
const port = process.env.PORT || 5000;

// Create raw Node HTTP server for socket.io
const httpServer = createServer(app);

// Init socket.io on that server with CORS. Reuse the same allow-list as the
// HTTP API so ALLOWED_ORIGINS is the single source of truth for both.
const io = new Server(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  }
});

// Inject custom socket logic
initSocketServer(io);

// ── Queue retention: prune notifications older than 3 days, every 24h ──
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - THREE_DAYS_MS);
    const res = await (prisma.notification as never as {
      deleteMany: (a: never) => Promise<{ count: number }>;
    }).deleteMany({ where: { createdAt: { lt: cutoff } } } as never);
    if (res.count > 0) console.log(`[prune] deleted ${res.count} old notifications`);
  } catch (e) {
    console.error("[prune] error:", e);
  }
}, 24 * 60 * 60 * 1000);

httpServer.listen(port, () => {
  console.log("Server and WebSockets are running on port", port);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  
  // Close socket.io
  io.close(() => {
    console.log('[server] Socket.io closed');
  });
  
  // Flush Sentry events
  await flushSentry(5000);
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
