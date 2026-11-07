import { logger } from "../lib/logger.js";
import { createQueueWorker } from "../lib/queue.js";
import type { Job } from "bullmq";
import {
  prepareFinalCode,
  SANDBOX_BUDGETS,
  fireOnPiston,
  pistonLanguageMap,
  getFileName,
  normalize,
  type SupportedLanguage,
} from "../services/codeExecution.js";

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

const PISTON_URL = process.env.PISTON_URL || "http://127.0.0.1:2000";

const SUPPORTED_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set([
  "javascript", "python", "java", "cpp", "c",
]);

/**
 * How many test cases of one submission may run at once, per language.
 *
 * Not a single global number, because the languages are not equally
 * expensive to run concurrently. JavaScript, Python and C are cheap and
 * overlap well. The JVM is not: a single trivial Two Sum case through the
 * reflection driver measured 2930ms wall but 8274ms CPU — it burns roughly
 * 2.8 cores during startup, JIT and GC. Running four of those at once made
 * them contend, CPU time ballooned past `run_cpu_time`, cases were killed,
 * and a 13-case submission FAILED at 3/13 in 36.6s — worse than the serial
 * 31s it replaced. Measured, not assumed.
 *
 * The aim is to keep the aggregate CPU demand of concurrent JVMs under the
 * per-process ceiling, so the limit is deliberately conservative.
 */
const CASE_CONCURRENCY: Record<SupportedLanguage, number> = {
  javascript: 4,
  python: 4,
  c: 4,
  cpp: 4,
  java: 2,
};

/** Validate and normalize a language string from the job payload. */
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

  // MapWithConcurrency: bound concurrency per language so a single submission
  // can't saturate the shared Piston sandbox.
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

  const runOneCase = async (
    testCase: CodeExecutionJobData["cases"][number],
    index: number,
  ) => {
    const testCaseInput = testCase.input || "";
    const startTime = performance.now();

    const payload = {
      language: pistonLanguageMap[executionLanguage],
      version: "*",
      files: [
        {
          name: getFileName(executionLanguage),
          content: finalCode,
        },
      ],
      stdin: testCaseInput,
      compile_timeout: budget.compileTimeoutMs,
      run_timeout: budget.runTimeoutMs,
      run_cpu_time: budget.runCpuTimeMs,
      compile_memory_limit: budget.compileMemoryLimitBytes,
      run_memory_limit: budget.runMemoryLimitBytes,
    };

    let data: any;
    try {
      data = await fireOnPiston(executionLanguage, payload);
      if (data.message && data.message.includes("runtime is unknown")) {
        throw new Error("Piston runtime unknown: " + data.message);
      }
      if (!data.run) {
        throw new Error("Piston invalid output format: " + JSON.stringify(data));
      }
    } catch (apiError) {
      const apiErrMsg = apiError instanceof Error ? apiError.message : String(apiError);
      logger.error({ submissionId, caseIndex: index, error: apiErrMsg }, "[code-exec] Piston execution failed");
      return {
        testCaseIndex: testCase.testCaseIndex,
        output: "",
        expectedOutput: testCase.expectedOutput,
        passed: false,
        runtimeMs: 0,
        memoryKb: 0,
        runtimeError: `Code execution service unavailable: ${apiErrMsg}`,
        error: apiErrMsg,
      };
    }

    const endTime = performance.now();

    if (data.compile && data.compile.code !== 0) {
      const compileOutput = String(data.compile?.output ?? "").substring(0, 64 * 1024);
      return {
        testCaseIndex: testCase.testCaseIndex,
        output: "",
        expectedOutput: testCase.expectedOutput,
        passed: false,
        runtimeMs: Math.round(endTime - startTime),
        memoryKb: 0,
        runtimeError: `Compilation Error: ${compileOutput || "Compilation failed"}`,
        error: "Compilation Error",
      };
    }

    const actualOutput = normalize(data.run?.stdout || "");
    const expectedOutput = normalize(testCase.expectedOutput);
    const processExitCode = data.run?.code ?? data.run?.signal ?? 0;

    // Custom-input runs have no expected output: a clean run (exit code 0) is
    // the best we can assert — never auto-pass on empty expected output.
    const isCustomInputRun = testCase.expectedOutput === "";
    const passed = expectedOutput !== ""
      ? actualOutput === expectedOutput
      : processExitCode === 0;

    let runtimeError: string | undefined;
    if (processExitCode !== 0 && data.run?.stderr) {
      runtimeError = String(data.run.stderr).substring(0, 64 * 1024);
    } else if (data.run?.message) {
      runtimeError = String(data.run.message).substring(0, 64 * 1024);
    } else if (data.run?.signal) {
      runtimeError = `Process terminated by ${data.run.signal}`;
    }

    return {
      testCaseIndex: testCase.testCaseIndex,
      output: actualOutput,
      expectedOutput: testCase.expectedOutput,
      passed,
      runtimeMs: Math.round(Number(data.run.cpu_time) || Number(data.run.wall_time) || (endTime - startTime)),
      memoryKb: Math.round(Number(data.run.memory ?? 0) / 1024),
      runtimeError,
      error: runtimeError,
    };
  };

  const CONCURRENCY = CASE_CONCURRENCY[executionLanguage];
  const results = await mapWithConcurrency(cases, CONCURRENCY, runOneCase);

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
  Number(process.env.CODE_EXEC_CONCURRENCY || 4)
);
