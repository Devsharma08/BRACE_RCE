import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { codeExecutionQueue } from "../lib/queues.js";
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

export interface AsyncGradingResult {
  passed: number;
  total: number;
  status: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  details: Array<{
    testCaseIndex: number;
    output: string;
    expectedOutput: string;
    passed: boolean;
    runtimeError: string | null;
    metrics: {
      durationMs: number;
      memoryKb: number;
      cpuMs: number;
      wallMs: number;
      compileMs: number;
      compileMemoryKb: number;
      roundTripMs: number;
      exitCode: number | null;
      signal: string | null;
      sandboxStatus: string | null;
      sandboxMessage: string | null;
      outputTruncated: boolean;
      stderr: string;
      stdout: string;
      compileOutput: string;
    };
  }>;
}

const GRADING_RESULT_TTL_SECONDS = 300;

async function redisGet<T>(key: string): Promise<T | undefined> {
  try {
    const client = getRedisClient();
    if (!client.isOpen) return undefined;
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client.isOpen) return;
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // ignore
  }
}

export const enqueueAsyncGrading = async (req: AuthRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ status: "error", message: "Authentication required" });

  const { code, language, oid, cases } = req.body as {
    code?: string;
    language?: string;
    oid?: string;
    cases?: Array<{ input: string; expectedOutput: string; testCaseIndex: number }>;
  };

  if (!code || !language || !oid) {
    return res.status(400).json({ status: "error", message: "code, language, and oid are required" });
  }

  try {
    let problemId = oid;
    let testCases = cases;

    if (!testCases) {
      const fileData = await prisma.problem.findFirst({
        where: { OR: [{ github_oid: oid }, { id: oid }] },
        select: { 
          id: true, 
          test_cases: { orderBy: { id: "asc" } } 
        },
      });

      problemId = fileData?.id || oid;
      testCases = (fileData?.test_cases ?? []).map((tc, i) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        testCaseIndex: i,
      }));
    }

    const job = await codeExecutionQueue.add("grade", {
      submissionId: `async-${Date.now()}-${req.userId}`,
      code,
      language,
      problemId,
      cases: testCases,
      userId: req.userId,
    }, {
      jobId: `grade:${problemId}:${req.userId}:${Date.now()}`,
    });

    return res.json({
      status: "queued",
      jobId: job.id,
      submissionId: job.data?.submissionId ?? job.id,
      totalCases: testCases.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[async-grading] Enqueue failed: ${message}`);
    return res.status(500).json({ status: "error", message });
  }
};

export const checkGradingStatus = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params;

  try {
    const cached = await redisGet<{ status: string; result?: AsyncGradingResult }>(`grading:result:${jobId}`);
    if (cached) {
      return res.json({ status: "completed", result: cached.result });
    }

    const jobStatus = await codeExecutionQueue.getJob(jobId as string);
    if (!jobStatus) {
      return res.status(404).json({ status: "error", message: "Job not found" });
    }

    const state = await jobStatus.getState();

    if (state === "completed") {
      const result = jobStatus.returnvalue as AsyncGradingResult | undefined;
      if (result) {
        await redisSet(`grading:result:${jobId}`, { status: "completed", result }, GRADING_RESULT_TTL_SECONDS);
        return res.json({ status: "completed", result });
      }
    }

    if (state === "failed") {
      return res.json({ status: "failed", error: jobStatus.failedReason || "Job failed" });
    }

    return res.json({ status: state === "waiting" || state === "delayed" ? "queued" : "running" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ status: "error", message });
  }
};
