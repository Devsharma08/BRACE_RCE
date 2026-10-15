import { Router, type Router as ExpressRouter } from "express";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

/**
 * Public stats endpoint (no auth, no CSRF).
 *
 * The `/about` page used to hardcode its numbers (209 problems, 3,117 cases),
 * but those values drift out of the database and are never actually measured
 * by any query. Everything here is a live Prisma count of the current
 * database state, so the About page never displays a stale figure again.
 */
export const statsRouter: ExpressRouter = Router();

statsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const [problemCount, testCaseCount] = await Promise.all([
      prisma.problem.count({ where: { isCustom: false } }),
      prisma.testCase.count(),
    ]);
    return res.json({
      status: "success",
      data: { problems: problemCount, testCases: testCaseCount },
    });
  } catch (error) {
    console.error("Fetch stats error:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

