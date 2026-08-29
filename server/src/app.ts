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

// Read allowed origins from env (ALLOWED_ORIGINS is a comma-separated list)
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
};

export const createApp = (): Express => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  const allowedOrigins = getAllowedOrigins();
  // @ts-ignore - Bypass faulty TS definition for cors in ESM
  app.use((cors as any)({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  app.use("/api/execute", executeRouter);
  app.use("/api/auth",authRouter);
  app.use("/api/friends",friendsRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/rooms", roomsRouter);
  app.use("/api/problems", problemsRouter);


  
  app.get("/health", (_req: Request, res: Response) => {
    console.log("Health Check");
    res.send("Everything's Good!");
  });

  return app;
};
