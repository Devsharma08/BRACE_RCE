import { logger } from "../lib/logger.js";
import { createQueueWorker } from "../lib/queue.js";
import type { Job } from "bullmq";
import {
  prepareFinalCode,
  SANDBOX_BUDGETS,
  normalize,
  type SupportedLanguage,
} from "../services/codeExecution.js";
import { executeDirectly } from "../services/directExecute.js";
import { createClient } from "redis";
import { randomBytes } from "crypto";

const GLOBAL_CONCURRENCY_KEY = "brace:exec:global:concurrency";
const MAX_GLOBAL_CONCURRENCY = 1;
const GLOBAL_CONCURRENCY_TTL_MS = 90000; // 90s: worst-case Java compile+run
const MAX_ACQUIRE_WAIT_MS = 30000; // fail fast after 30s waiting

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redis.connect().catch(() => {});

const acquireLockScript = `
  local current = redis.call('GET', KEYS[1])
  if current == false or current == '' then
    redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
    return 1
  end
  return 0
`;

const releaseLockScript = `
  local current = redis.call('GET', KEYS[1])
  if current == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

const lockToken = randomBytes(16).toString('hex');

async function acquireGlobalSemaphore(): Promise<void> {
  const deadline = Date.now() + MAX_ACQUIRE_WAIT_MS;
  while (true) {
    const acquired = await redis.eval(acquireLockScript, {
      keys: [GLOBAL_CONCURRENCY_KEY],
      arguments: [lockToken, String(GLOBAL_CONCURRENCY_TTL_MS)],
    });
    if (acquired === 1) return;
    if (Date.now() >= deadline) {
      throw new Error("judge busy: too many concurrent executions");
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

function releaseGlobalSemaphore(): void {
  redis.eval(releaseLockScript, {
    keys: [GLOBAL_CONCURRENCY_KEY],
    arguments: [lockToken],
  }).catch(() => {});
}

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
    runtimeError?: string;
    error?: string;
  }>;
}

const SUPPORTED_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set([
  "javascript", "python", "java", "cpp", "c",
]);

const CASE_CONCURRENCY: Record<SupportedLanguage, number> = {
  javascript: 4,
  python: 4,
  c: 4,
  cpp: 4,
  java: 2,
};

function resolveLanguage(language: unknown): SupportedLanguage {
  const lang = String(language ?? "").toLowerCase();
  switch (lang) {
    case "cpp": case "c++": return "cpp";
    case "py": case "python": return "python";
    case "javascript": case "js": return "javascript";
    case "java": return "java";
    case "c": return "c";
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

async function runOneCase(
  executionLanguage: SupportedLanguage,
  finalCode: string,
  testCase: CodeExecutionJobData["cases"][number],
  budget: (typeof SANDBOX_BUDGETS)[SupportedLanguage],
): Promise<CodeExecutionResult["details"][number]> {
  const testCaseInput = testCase.input || "";
  const startTime = performance.now();

  // All languages: use direct execution (system runtimes) instead of Piston,
  // because Piston runner packages are not installed and disk space
  // is too limited to install them.
  try {
    const result = await executeDirectly(executionLanguage, finalCode, testCaseInput, budget.runTimeoutMs, budget.compileTimeoutMs);
    const expectedOutput = normalize(testCase.expectedOutput);
    const actualOutput = normalize(result.stdout);
    const passed = expectedOutput !== ""
      ? actualOutput === expectedOutput
      : result.exitCode === 0;

    let runtimeError: string | undefined;
    if (result.error) {
      runtimeError = result.error.substring(0, 64 * 1024);
    } else if (result.exitCode !== 0 && result.stderr) {
      runtimeError = result.stderr.substring(0, 64 * 1024);
    }

    return {
      testCaseIndex: testCase.testCaseIndex,
      output: actualOutput,
      expectedOutput: testCase.expectedOutput,
      passed,
      runtimeMs: result.runtimeMs,
      memoryKb: 0,
      ...(runtimeError ? { runtimeError } : {}),
      ...(runtimeError ? { error: runtimeError } : {}),
    };
  } catch (err) {
    return {
      testCaseIndex: testCase.testCaseIndex,
      output: "",
      expectedOutput: testCase.expectedOutput,
      passed: false,
      runtimeMs: Math.round(performance.now() - startTime),
      memoryKb: 0,
      runtimeError: String(err).substring(0, 64 * 1024),
      error: String(err).substring(0, 64 * 1024),
    };
  }
}

const processor = async (job: Job<CodeExecutionJobData>): Promise<CodeExecutionResult> => {
  const { submissionId, code, language, problemId, cases } = job.data;
  const start = Date.now();

  const executionLanguage = resolveLanguage(language);
  const budget = SANDBOX_BUDGETS[executionLanguage];

  logger.info(
    { language: executionLanguage, caseCount: cases.length },
    `[code-exec] Processing submission ${submissionId} for problem ${problemId}`,
  );

  const { prepareFinalCode: importedPrepareFinalCode } = await import("../services/codeExecution.js");
  const finalCode = importedPrepareFinalCode(executionLanguage, code, undefined);

  async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const width = Math.max(1, Math.min(limit, items.length));
    await Promise.all(
      Array.from({ length: width }, async () => {
        while (cursor < items.length) {
          const index = cursor++;
          results[index] = await worker(items[index]!, index);
        }
      }),
    );
    return results;
  }

  const CONCURRENCY = CASE_CONCURRENCY[executionLanguage];
  const results = await (async () => {
    await acquireGlobalSemaphore();
    try {
      return await mapWithConcurrency(cases, CONCURRENCY, (testCase) =>
        runOneCase(executionLanguage, finalCode, testCase, budget),
      );
    } finally {
      releaseGlobalSemaphore();
    }
  })();

  const passed = results.filter((r) => r.passed).length;
  const runCases = results.filter((r) => r.runtimeMs > 0);
  const avgRuntimeMs = runCases.length > 0
    ? Math.round(runCases.reduce((sum, r) => sum + r.runtimeMs, 0) / runCases.length)
    : 0;
  const maxMemoryKb = Math.max(0, ...results.map((r) => r.memoryKb));

  const result: CodeExecutionResult = {
    passed,
    total: results.length,
    details: results.map((r) => ({
      testCaseIndex: r.testCaseIndex,
      output: r.output,
      expectedOutput: r.expectedOutput,
      passed: r.passed,
      runtimeMs: r.runtimeMs,
      memoryKb: r.memoryKb,
      ...(r.runtimeError ? { runtimeError: r.runtimeError } : {}),
      ...(r.error ? { error: r.error } : {}),
    })),
  };

  const duration = Date.now() - start;
  logger.info(
    { submissionId, language: executionLanguage, passed, total: results.length, duration },
    `[code-exec] Submission ${submissionId} done: ${passed}/${results.length} passed in ${duration}ms`,
  );

  return result;
};

export const codeExecutionWorker = createQueueWorker<CodeExecutionJobData, CodeExecutionResult>(
  "code-execution",
  processor,
  Number(process.env.CODE_EXEC_CONCURRENCY || 1)
);
