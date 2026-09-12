import "./env.js";
import { createApp } from "./app.js";
import { assertRuntimeEnv } from "./config/runtime.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSocketServer } from "./services/socket.js";
import { prisma } from "./lib/prisma.js";

assertRuntimeEnv();

const app = createApp();
const port = process.env.PORT || 5000;

// Create raw Node HTTP server for socket.io
const httpServer = createServer(app);

// Init socket.io on that server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
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
