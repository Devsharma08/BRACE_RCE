import cors from "cors";
import express, { type Express } from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";

import { executeRouter } from "./routes/execute.js";
import {authRouter} from "./routes/auth.js";
import { friendsRouter } from "./routes/friends.js";
import profileRouter from "./routes/profile.js";
import { roomsRouter } from "./routes/room.js";
import { problemsRouter } from "./routes/problems.js";
import analyticsRouter from "./routes/analytics.js";
import leaderboardRouter from "./routes/leaderboard.js";
import roadmapRouter from "./routes/roadmap.js";
import { adminRouter } from "./routes/admin.js";
import { learningItemsRouter } from "./routes/learning-items.js";
import { notificationsRouter } from "./routes/notifications.js";
import { feedbackRouter } from "./routes/feedback.js";

/**
 * Read allowed origins from env (ALLOWED_ORIGINS is a comma-separated list).
 * Values are normalised (quotes stripped, trimmed, trailing slashes removed,
 * duplicates removed) because browsers send the `Origin` header bare — e.g.
 * `http://localhost:5173` — so a configured `"http://localhost:5173/"` would
 * otherwise never match and every preflight would fail silently.
 */
export const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const origins = envOrigins
    ? envOrigins.split(",")
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

  return Array.from(
    new Set(
      origins
        .map((o) => o.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, ""))
        .filter(Boolean)
    )
  );
};

export const createApp = (): Express => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  const allowedOrigins = getAllowedOrigins();
  // With `withCredentials: true` on the client (see src/config/api.ts) the auth
  // cookie must ride along, and browsers reject a `*` wildcard
  // Access-Control-Allow-Origin for credentialed requests. So instead of a
  // wildcard we echo the caller's origin back, but only when it is on the
  // allow-list. Requests with no Origin header (same-origin, curl, server to
  // server) are not CORS requests and are always let through.
  // @ts-ignore - Bypass faulty TS definition for cors in ESM
  app.use((cors as any)({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Deny gracefully: no CORS headers are attached, but the request itself
        // is not turned into a 500. The browser still blocks the response.
        callback(null, false);
      }
    },
    credentials: true,
  }));
  app.use("/api/execute", executeRouter);
  app.use("/api/auth",authRouter);
  app.use("/api/friends",friendsRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/problems", problemsRouter);
    app.use("/api/analytics", analyticsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/roadmap", roadmapRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/learning-items", learningItemsRouter);
  app.use("/api/learning-paths", learningPathsRouter);



  
  app.get("/health", (_req: Request, res: Response) => {
    console.log("Health Check");
    res.send("Everything's Good!");
  });

  return app;
};
