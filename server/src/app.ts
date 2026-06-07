import cors from "cors";
import express, { type Express } from "express";
import type { Request, Response } from "express";
import { executeRouter } from "./routes/execute.js";
import { githubRouter } from "./routes/github.js";

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api/execute", executeRouter);
  app.use("/api/github", githubRouter);

  app.get("/health", (_req: Request, res: Response) => {
    console.log("Health Check");
    res.send("Everything's Good!");
  });

  return app;
};
