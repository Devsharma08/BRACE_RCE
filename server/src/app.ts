import cors from "cors";
import express, { type Express } from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";

import { executeRouter } from "./routes/execute.js";
import { githubRouter } from "./routes/github.js";
import {authRouter} from "./routes/auth.js";

export const createApp = (): Express => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use(cors());
  app.use(express.json());
  app.use("/api/execute", executeRouter);
  app.use("/api/github", githubRouter);
  app.use("/api/auth",authRouter);

  app.get("/health", (_req: Request, res: Response) => {
    console.log("Health Check");
    res.send("Everything's Good!");
  });

  return app;
};
