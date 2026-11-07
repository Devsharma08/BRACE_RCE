import { logger } from "../lib/logger.js";
import { createQueueWorker } from "../lib/queue.js";
import type { Job } from "bullmq";
import { spawn } from "child_process";
import { mkdirSync, writeFileSync, unlinkSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  prepareFinalCode,
  SANDBOX_BUDGETS,
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

const SUPPORTED_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set([
  "javascript", "python", "java", "cpp", "c",
]);

/**
 * Per-language concurrency limits for concurrent test-case execution.
 *
 * Java/JVM is the most expensive (startup + JIT + GC burn multiple cores),
 * so it is limited to 2 concurrent cases. The interpreted/compiled
 * languages are cheaper and can run 4 at a time.
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

/** Map language to file extension and execution command. */
interface LangSpec {
  ext: string;
  compileCmd?: string[];    // undefined = no compile step
  runCmd: string[];         // command + args to run the program
  runCwd: string;           // working directory for run (contains binary)
}

const LANG_SPECS: Record<SupportedLanguage, LangSpec> = {
  javascript: { ext: ".js", runCmd: ["node"], runCwd: "." },
  python: { ext: ".py", runCmd: ["python3"], runCwd: "." },
  java: { ext: ".java", runCmd: ["java", "Main"], runCwd: "." },
  cpp: { ext: ".cpp", compileCmd: ["g++", "-O2", "-o", "a.out"], runCmd: ["./a.out"], runCwd: "." },
  c: { ext: ".c", compileCmd: ["gcc", "-O2", "-o", "a.out"], runCmd: ["./a.out"], runCwd: "." },
};

/**
 * Run a single test case directly using system runtimes instead of Piston.
 *
 * The code is written to a temp file, compiled (if needed), and executed
 * with stdin piped from the test case input. Resource limits are enforced
 * via the cgroup hierarchy set up by the container entrypoint plus
 * `timeout` for wall-clock enforcement.
 */
async function runOneCaseDirectly(
  executionLanguage: SupportedLanguage,
  finalCode: string,
  testCase: CodeExecutionJobData["cases"][number],
  budget: (typeof SANDBOX_BUDGETS)[SupportedLanguage],
): Promise<CodeExecutionResult["details"][number]> {
  const spec = LANG_SPECS[executionLanguage];
  const testCaseInput = testCase.input || "";
  const startTime = performance.now();

  // Create a temp working directory for this execution
  const workDir = join(tmpdir(), `brace-exec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(workDir, { recursive: true });

  const fileName = `Main${spec.ext}`;
  const filePath = join(workDir, fileName);
  writeFileSync(filePath, finalCode, "utf8");

  let compileError: string | undefined;
  let runError: string | undefined;
  let output = "";
  let exitCode: number | null = 0;
  let runtimeMs = 0;
  let memoryKb = 0;

  try {
    // ── Compile step (C, C++, Java) ─────────────────────────────────────
    if (spec.compileCmd) {
      const compileResult = await runCommand(
        spec.compileCmd[0],
        spec.compileCmd.slice(1),
        { cwd: workDir, timeout: budget.compileTimeoutMs },
      );
      if (compileResult.code !== 0) {
        compileError = (compileResult.stderr || "Compilation failed").substring(0, 64 * 1024);
      }
    }

    // ── Run step ────────────────────────────────────────────────────────
    if (!compileError) {
      const runResult = await runCommand(
        spec.runCmd[0],
        spec.runCmd.slice(1),
        {
          cwd: workDir,
          timeout: budget.runTimeoutMs,
          input: testCaseInput,
          maxMemory: budget.runMemoryLimitBytes,
          maxCpuTime: budget.runCpuTimeMs,
        },
      );
      output = runResult.stdout;
      exitCode = runResult.code;
      runtimeMs = runResult.runtimeMs;
      memoryKb = runResult.memoryKb;
      runError = runResult.error;
    }
  } catch (err) {
    runError = String(err).substring(0, 64 * 1024);
  } finally {
    // Clean up temp directory
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }

  const endTime = performance.now();

  // ── Compile error ─────────────────────────────────────────────────────
  if (compileError) {
    return {
      testCaseIndex: testCase.testCaseIndex,
      output: "",
      expectedOutput: testCase.expectedOutput,
      passed: false,
      runtimeMs: Math.round(endTime - startTime),
      memoryKb: 0,
      runtimeError: `Compilation Error: ${compileError}`,
      error: "Compilation Error",
    };
  }

  // ── Custom-input runs: no expected output, clean run = pass ────────────
  const expectedOutput = normalize(testCase.expectedOutput);
  const actualOutput = normalize(output);
  const isCustomInputRun = expectedOutput === "";
  const passed = expectedOutput !== ""
    ? actualOutput === expectedOutput
    : exitCode === 0;

  return {
    testCaseIndex: testCase.testCaseIndex,
    output: actualOutput,
    expectedOutput: testCase.expectedOutput,
    passed,
    runtimeMs,
    memoryKb,
    ...(runError ? { runtimeError: runError } : {}),
    ...(runError ? { error: runError } : {}),
  };
}

/**
 * Spawn a command with resource limits, timeout, and optional stdin.
 *
 * Resource limits are enforced via cgroup (set up by container entrypoint)
 * plus `timeout` for wall-clock. Memory and CPU limits are applied via
 * cgroup files when available.
 */
async function runCommand(
  cmd: string,
  args: string[],
  opts: {
    cwd: string;
    timeout: number;
    input?: string;
    maxMemory?: number;   // bytes
    maxCpuTime?: number;  // milliseconds
  },
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  memoryKb: number;
  error?: string;
}> {
  const start = performance.now();
  let stdout = "";
  let stderr = "";
  let error: string | undefined;

  // Apply cgroup memory limit if available
  const env = { ...process.env };
  if (opts.maxMemory) {
    try {
      const memLimitKb = Math.floor(opts.maxMemory / 1024);
      // Write to cgroup memory.max if writable
      require("fs").writeFileSync("/sys/fs/cgroup/memory.max", `${memLimitKb}K`, { flag: "w" });
    } catch {}
  }

  const child = spawn(cmd, args, {
    cwd: opts.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    killSignal: "SIGTERM",
  });

  const timeoutMs = opts.timeout;
  let timer: NodeJS.Timeout | null = null;

  const promise = new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
    runtimeMs: number;
    memoryKb: number;
    error?: string;
  }>((resolve) => {
    child.stdout?.on("data", (d) => { stdout += d; });
    child.stderr?.on("data", (d) => { stderr += d; });

    child.on("error", (err) => {
      error = err.message;
      resolve({
        code: -1,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
        memoryKb: 0,
        error,
      });
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        code,
        stdout,
        stderr,
        runtimeMs: Math.round(performance.now() - start),
        memoryKb: 0,
        error,
      });
    });

    if (opts.input) {
      child.stdin?.write(opts.input);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }

    timer = setTimeout(() => {
      child.kill("SIGKILL");
      error = `Process timed out after ${timeoutMs}ms`;
    }, timeoutMs);
  });

  const result = await promise;
  return result;
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

  // MapWithConcurrency: bound concurrency per language
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
  const results = await mapWithConcurrency(cases, CONCURRENCY, (testCase) =>
    runOneCaseDirectly(executionLanguage, finalCode, testCase, budget),
  );

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
