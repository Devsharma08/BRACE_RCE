import { logger } from "../lib/logger.js";
import { createQueueWorker } from "../lib/queue.js";
import type { Job } from "bullmq";

export interface CodeExecutionJobData {
  submissionId: string;
  code: string;
  language: string;
  problemId: string;
  cases: Array<{ input: string; expectedOutput: string; testCaseIndex: number }>;
  userId?: string;
}

export interface CodeExecutionResult {
  passed: number;
  total: number;
  details: Array<{
    testCaseIndex: number;
    output: string;
    expectedOutput: string;
    passed: boolean;
    runtimeMs: number;
    memoryKb: number;
  }>;
}

const PISTON_URL = process.env.PISTON_URL || "http://127.0.0.1:2000";

const normalize = (s: string) => (s || "").replace(/\r\n/g, "\n").trim();

async function runInPiston(payload: unknown): Promise<any> {
  const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`Piston returned ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

const processor = async (job: Job<CodeExecutionJobData>): Promise<CodeExecutionResult> => {
  const { submissionId, code, language, problemId, cases } = job.data;
  const start = Date.now();

  logger.info({ language, caseCount: cases.length }, `[code-exec] Processing submission ${submissionId} for problem ${problemId}`);

  const { prepareFinalCode } = await import("../services/codeExecution.js");

  const finalCode = prepareFinalCode(language as any, code, { code, wrapperCode: null });

  const results = await Promise.all(
    cases.map(async (testCase: CodeExecutionJobData["cases"][number]) => {
      const payload = {
        language,
        files: [{ name: "Main", content: finalCode }],
        stdin: testCase.input,
      };

      try {
        const response = await runInPiston(payload);
        const output = response?.run?.output ?? "";
        const expected = normalize(testCase.expectedOutput);
        const actual = normalize(output);
        const passed = actual === expected;

        return {
          testCaseIndex: testCase.testCaseIndex,
          output,
          expectedOutput: testCase.expectedOutput,
          passed,
          runtimeMs: response?.run?.metrics?.durationMs ?? 0,
          memoryKb: response?.run?.metrics?.memoryKb ?? 0,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          testCaseIndex: testCase.testCaseIndex,
          output: "",
          expectedOutput: testCase.expectedOutput,
          passed: false,
          runtimeMs: 0,
          memoryKb: 0,
          error: message,
        };
      }
    })
  );

  const passed = results.filter((r) => r.passed).length;
  const avgRuntimeMs = Math.round(results.reduce((sum: number, r) => sum + r.runtimeMs, 0) / results.length);
  const maxMemoryKb = Math.max(...results.map((r) => r.memoryKb));

  const result: CodeExecutionResult = {
    passed,
    total: results.length,
    details: results,
  };

  const duration = Date.now() - start;
  logger.info(`[code-exec] Submission ${submissionId} done: ${passed}/${results.length} passed in ${duration}ms`);

  return result;
};

export const codeExecutionWorker = createQueueWorker<CodeExecutionJobData, CodeExecutionResult>(
  "code-execution",
  processor,
  Number(process.env.CODE_EXEC_CONCURRENCY || 4)
);
