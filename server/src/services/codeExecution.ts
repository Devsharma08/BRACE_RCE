import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { saveSubmisssion } from "./submissionEvaluator.js";
import { verifyToken } from '../lib/jwt.js';
import CircuitBreaker from 'opossum';

/** PISTON_URL must be set in production and must use HTTPS. */
const PISTON_URL = (() => {
  const url = process.env.PISTON_URL;
  if (!url) {
    if (process.env.NODE_MODE === "production") {
      throw new Error("PISTON_URL must be set in production");
    }
    return "http://127.0.0.1:2000"; // Dev fallback only
  }
  if (process.env.NODE_MODE === "production" && !url.startsWith("https://")) {
    throw new Error("PISTON_URL must use HTTPS in production");
  }
  return url;
})();

/**
 * Per-language sandbox budgets.
 *
 * The previous code sent the same 5000/3000 ms to every runtime, which is fine
 * for JavaScript and Python but wrong twice over for the compiled and VM
 * languages: g++ needs seconds just to compile, and the JVM burns several
 * seconds of CPU across its GC/JIT threads before executing a single line.
 *
 * `runCpuTimeMs` is the important one. Piston enforces BOTH a wall limit
 * (--wall-time, from run_timeout) and a CPU limit summed across every thread
 * (--time, from run_cpu_time), and the JVM routinely exceeds 3s of CPU while
 * running in well under a second of wall time. Leaving run_cpu_time unset let
 * Piston apply its 3000ms default, which killed every Java submission.
 *
 * These are REQUEST-side values. Piston caps each one server-side and rejects
 * anything higher, so they are upper bounds that are also clamped by the
 * deployment. If a request is rejected outright the failure is reported
 * per-language rather than silently degrading every language.
 */
type SandboxBudget = {
  compileTimeoutMs: number;
  runTimeoutMs: number;
  runCpuTimeMs: number;
  compileMemoryLimitBytes: number;
  runMemoryLimitBytes: number;
};

const MB = 1024 * 1024;

// Exported so the verification harnesses build byte-identical payloads to the
// ones production sends. `verify_languages.ts` previously hardcoded
// 5000/3000 with no `run_cpu_time`, which meant it was testing Java under a
// budget the product no longer uses — it reported failures that could not occur
// in production and, worse, could not reproduce production ones.
export const SANDBOX_BUDGETS: Record<SupportedLanguage, SandboxBudget> = {
  javascript: {
    compileTimeoutMs: 5000,
    runTimeoutMs: 3000,
    runCpuTimeMs: 4000,
    compileMemoryLimitBytes: 268435456,
    runMemoryLimitBytes: 268435456,
  },
  python: {
    compileTimeoutMs: 5000,
    runTimeoutMs: 3000,
    runCpuTimeMs: 4000,
    compileMemoryLimitBytes: 268435456,
    runMemoryLimitBytes: 268435456,
  },
  c: {
    compileTimeoutMs: 10000,
    runTimeoutMs: 3000,
    runCpuTimeMs: 4000,
    compileMemoryLimitBytes: 512 * MB,
    runMemoryLimitBytes: 268435456,
  },
  cpp: {
    compileTimeoutMs: 15000,
    runTimeoutMs: 4000,
    runCpuTimeMs: 6000,
    compileMemoryLimitBytes: 512 * MB,
    runMemoryLimitBytes: 268435456,
  },
  java: {
    compileTimeoutMs: 15000,
    // Generous, because these are wall-clock ceilings and JVM startup is the
    // cost being measured. Measured through the API: one trivial Two Sum case
    // runs ~2.9s of wall time when it has the box to itself and ~7.5s when two
    // JVMs share it. At the old 8000ms a 13-case submission died mid-run with
    // "Time limit exceeded (wall clock)" and a SIGKILL — the JVM was killed
    // while still starting up, not because the user's code was slow.
    //
    // This is a sandbox *startup* budget, not a limit on the submitted code: the
    // user's method itself runs in single-digit milliseconds, as `avgCpu` of
    // ~10ms on the C++/JS runs shows. Loosening it lets a correct submission
    // finish; it cannot let an infinite loop run much longer, because that is
    // bounded by runCpuTimeMs and, in practice, by the client's own budget.
    runTimeoutMs: 20000,
    // The JVM needs seconds of CPU across GC/JIT threads for a trivial program.
    runCpuTimeMs: 20000,
    compileMemoryLimitBytes: 768 * MB,
    runMemoryLimitBytes: 512 * MB,
  },
};

/**
 * Caps learned from Piston at runtime.
 *
 * Piston rejects any request whose limit exceeds what the deployment allows
 * ("compile_timeout cannot exceed the configured limit of 10000"), and those
 * ceilings are deployment-specific. Hard-coding values therefore either breaks
 * on a stock Piston or under-uses a tuned one.
 *
 * Instead we start from the requested budget, learn the real ceiling from the
 * rejection, and clamp. The learned value is cached per language+key so the
 * clamp happens once, not on every submission.
 */
type BudgetKey = "compile_timeout" | "run_timeout" | "run_cpu_time";
const learnedCaps = new Map<string, number>();

const capCacheKey = (lang: SupportedLanguage, key: BudgetKey) => `${lang}:${key}`;

/**
 * Pull the ceiling out of a Piston rejection.
 *
 * Matches messages like:
 *   "compile_timeout cannot exceed the configured limit of 10000"
 *   "run_cpu_time cannot exceed the configured limit of 3000"
 * Returns undefined for anything unrecognised so we can fail loudly instead.
 */
function parseCapFromError(message: string): { key: BudgetKey; cap: number } | null {
  const m = message.match(
    /(compile_timeout|run_timeout|run_cpu_time)\s+cannot exceed the configured limit of\s+(\d+)/i,
  );
  if (!m) return null;
  const key = m[1]!.toLowerCase() as BudgetKey;
  const cap = Number(m[2]);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return { key, cap };
}

/**
 * Fire one payload at Piston, learning and applying deployment ceilings.
 *
 * Extracted from `executeCode` so the verification harnesses exercise the same
 * request path as production. The harnesses previously sent their own limits and
 * had no clamping at all, so they disagreed with the product in both directions:
 * they reported failures the product cannot have, and could not reproduce the
 * ones it does.
 *
 * Returns the parsed Piston body. Throws with an actionable message when the
 * deployment genuinely cannot serve the request.
 */
export async function fireOnPiston(
  lang: SupportedLanguage,
  payload: Record<string, unknown>,
): Promise<any> {
  // One clamped retry is enough; two would just hammer Piston.
  let retriedWithCap = false;

  try {
    applyLearnedCaps(lang, payload);
    return await pistonBreaker.fire(payload);
  } catch (apiError) {
    const apiErrMsg = apiError instanceof Error ? apiError.message : String(apiError);

    // A rejection because a requested limit is above the deployment ceiling is
    // recoverable: learn the ceiling and retry once, clamped.
    const parsed = parseCapFromError(apiErrMsg);
    if (parsed && !retriedWithCap) {
      retriedWithCap = true;
      const cacheKey = capCacheKey(lang, parsed.key);
      await withCapLearnLock(lang, async () => {
        if (!learnedCaps.has(cacheKey) || (learnedCaps.get(cacheKey) ?? 0) < parsed.cap) {
          learnedCaps.set(cacheKey, parsed.cap);
          console.warn(
            `[piston] ${lang}: clamping ${parsed.key} to ${parsed.cap}ms ` +
            `(learned from Piston; deployment limit is below what we request)`,
          );
        }
        applyLearnedCaps(lang, payload);
      });
      try {
        const clamped: any = await pistonBreaker.fire(payload);
        if (clamped && !clamped.run) {
          throw new Error(`Piston rejected the clamped request: ${JSON.stringify(clamped)}`);
        }
        return clamped;
      } catch (retryError) {
        const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
        throw new Error(`Code execution is misconfigured for ${lang}: ${retryMsg}`);
      }
    }

    throw new Error(
      /cannot exceed the configured limit/i.test(apiErrMsg)
        ? `Code execution is misconfigured for ${lang}: ${apiErrMsg}`
        : "Code execution service unavailable",
    );
  }
}

/** Apply any ceiling Piston has already taught us for this language. */
function applyLearnedCaps(
  lang: SupportedLanguage,
  payload: Record<string, unknown>,
): void {
  for (const key of ["compile_timeout", "run_timeout", "run_cpu_time"] as BudgetKey[]) {
    const cap = learnedCaps.get(capCacheKey(lang, key));
    if (cap !== undefined) {
      const current = Number(payload[key]);
      if (Number.isFinite(current) && current > cap) payload[key] = cap;
    }
  }
}

/**
 * Serialise the "learn a ceiling from Piston and retry" step per language.
 *
 * Without this, every in-flight case of a first-ever Java submission hits the
 * same rejection at the same moment and each one pays for its own clamp+retry.
 * With it, one case probes and updates `learnedCaps`, and the rest wait and then
 * simply apply the ceiling they now know about.
 */
const capLearnLocks = new Map<string, Promise<void>>();

async function withCapLearnLock<T>(lang: SupportedLanguage, fn: () => Promise<T>): Promise<T> {
  const key = String(lang);
  const previous = capLearnLocks.get(key) ?? Promise.resolve();
  // Run our work, then release the lock regardless of the outcome, so a
  // rejection in one case cannot wedge the queue for every later submission.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  capLearnLocks.set(key, previous.then(() => gate));
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (capLearnLocks.get(key) === gate) capLearnLocks.delete(key);
  }
}

/**
 * `items.map(worker)` with at most `limit` workers in flight, preserving order.
 *
 * Used to run a submission's test cases side by side. The bound matters: an
 * unbounded map would fire one sandbox job per case at once, and Piston is
 * shared with every other user, so a single 15-case submission could saturate
 * it and slow down unrelated traffic.
 */
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

/**
 * Ceiling for the whole HTTP call to Piston.
 *
 * A sandbox cannot outlive compile + run, so this is derived from the budget
 * with generous headroom rather than fixed. The old hard-coded 6000 ms was
 * already below what a healthy g++ request costs end to end (~3.1s measured,
 * and much more when the box is loaded). Worse, `errorThresholdPercentage: 50`
 * meant that once half of the recent requests timed out, the breaker opened and
 * EVERY language failed fast -- one slow C++ submission could take down
 * execution for JavaScript users.
 */
const PISTON_CALL_TIMEOUT_MS = 45000;

/** Circuit breaker for Piston API — fails fast after repeated failures. */
const pistonBreaker = new CircuitBreaker(
  async (payload: any) => {
    const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PISTON_CALL_TIMEOUT_MS),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Piston API error ${response.status}: ${errText}`);
    }
    return response.json();
  },
  {
    timeout: PISTON_CALL_TIMEOUT_MS,
    // Only genuine infrastructure failures should open the circuit. A timeout
    // inside the sandbox is a USER problem and returns a normal 200 response
    // with a time-limit status, so it never reaches the breaker at all.
    errorThresholdPercentage: 75,
    resetTimeout: 30000,
    rollingCountTimeout: 20000,
    rollingCountBuckets: 10,
    volumeThreshold: 10,
  }
);

pistonBreaker.on("open", () => console.error("[circuit-breaker] Piston circuit OPEN — failing fast"));
pistonBreaker.on("close", () => console.log("[circuit-breaker] Piston circuit CLOSED — recovered"));
pistonBreaker.on("halfOpen", () => console.log("[circuit-breaker] Piston circuit HALF-OPEN — testing"));

/** Strip server-internal file paths and Node.js stack frames from error messages */
function sanitizeErrorMessage(raw: string): string {
  return raw
    .split("\n")
    .filter(line => {
      // Remove lines referencing internal node paths
      if (line.includes("node:internal/")) return false;
      if (line.includes("node_modules")) return false;
      // Keep first few stack frames from user code only
      return true;
    })
    .join("\n")
    .replace(/\/[^\s]*\/brace-exec-[^/]+\/[^\s]*/g, "<script>") // hide temp file paths
    .replace(/\s*\(node:[^)]+\)/g, "") // remove (node:internal/...) refs
    .trim();
}

type SupportedLanguage = "javascript" | "java" | "c" | "cpp" | "python";
type ExecutionMode = "RUN" | "SUBMIT";

type ExecuteBody = {
  code?: unknown;
  language?: unknown;
  oid?: unknown;
  mode?: unknown;
  customInput?: unknown;
  /**
   * Run exactly this stored case (0-based) in RUN mode, keeping its real
   * expected output so the verdict is a genuine pass/fail rather than a bare
   * "here is your output" comparison.
   *
   * The previous behaviour sent the case's input as `customInput`, which the
   * server replaces with `{ expectedOutput: "" }`. That made it impossible to
   * tell a correct solution from a wrong one on a single-case run.
   */
  testCaseIndex?: unknown;
  performanceId?: unknown;
  roomId?:unknown
};

type TestCaseRecord = {
  input: string;
  expectedOutput: string;
  problemId?: string;
  /**
   * True index of this case within the problem's stored set. Present only on a
   * single-case run, where the array itself holds one element and the array
   * position would otherwise be 0 regardless of which case was chosen.
   */
  __index?: number;
};

type CodeSnippetRecord = {
  language: string;
  wrapperCode?: string | null;
};

type ExecutionDetail = {
  testCaseIndex: number;
  output: string;
  expectedOutput: string;
  passed: boolean;
  problemId?: string;
  runtimeError: string | null;
  /**
   * Per-case resource usage. `metrics` is the shape the frontend already reads
   * (src/features/terminal/types.ts) but which the backend never populated, so
   * the UI has always shown blanks for time and space.
   */
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
};

const normalize = (value: string) => (value || "").replace(/\r\n/g, "\n").trim();

const problemIdPayload = (currentCase: TestCaseRecord) => {
  return currentCase.problemId ? { problemId: currentCase.problemId } : {};
};

const getExecutionMode = (mode: unknown): ExecutionMode => {
  return mode === "SUBMIT" ? "SUBMIT" : "RUN";
};

const getLanguage = (language: unknown): SupportedLanguage => {
  switch (language) {
    case 'cpp':
    case 'c++': return 'cpp';
    case 'py':
    case 'python': return 'python';
    case 'javascript':
    case 'js': return 'javascript';
    case 'java': return 'java';
    case 'c11':
    case 'c': return 'c';
    default: return 'javascript';
  }
};

const getExtension = (language: SupportedLanguage) => {
  const extensionMap = {
    "javascript": "js",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "python": "py",
  };
  return extensionMap[language];
};

const pistonLanguageMap: Record<SupportedLanguage, string> = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "c++",
  c: "c",
};

const getFileName = (language: SupportedLanguage) => {
  if (language === "java") return "Main.java";
  return `main.${getExtension(language)}`;
};

import { buildOperationWrapper, detectOperationSignature } from './operationWrapper.js';

import { buildSpecialWrapper, detectSpecialKind } from './specialWrapper.js';

/**
 * Marker a batched driver prints instead of output when a single case throws.
 * Recognised by `runBatched` so it can hand the submission to the per-case path
 * and get a proper per-case error message.
 */
const BATCH_ERR_MARK = "__ERR__";

/**
 * Languages whose generated driver understands the `__CASE__<lineCount>`
 * framing. Anything not listed here keeps the per-case path, which is proven.
 *
 * Only Java and C++ are enabled so far. Their drivers were restructured for
 * this; the C and JavaScript drivers still read a single case, and pointing the
 * batch builder at them would frame stdin their wrappers cannot parse.
 */
const BATCHABLE_LANGUAGES: ReadonlySet<string> = new Set<SupportedLanguage>(["java", "cpp"]);

export function supportsBatching(language: string): boolean {
  return BATCHABLE_LANGUAGES.has(language as SupportedLanguage);
}

/**
 * Would batched cases share mutable state that the per-case path would reset?
 *
 * Batching runs every case in ONE process, so a `static` field (Java) or a
 * `static`/file-scope variable (C++) persists from one case to the next. Per-case
 * execution starts a fresh process each time, so the same submission can pass
 * unbatched and fail batched. That is a wrong verdict, not a slow one, so it
 * disables batching instead.
 *
 * Deliberately conservative: a false positive only costs the slower path. Java
 * `static final` constants are immutable and stay eligible. C++ file-scope
 * variables written without the `static` keyword are NOT detected — that would
 * need real parsing, and the residual risk is documented rather than guessed at.
 */
function hasSharedMutableState(language: string, code: string): boolean {
  if (!code) return false;
  if (language === "java") {
    // Strip immutable constants, then look for any remaining `static`.
    return /\bstatic\b/.test(code.replace(/\bstatic\s+final\b/g, "static"));
  }
  if (language === "cpp" || language === "c") {
    return /\bstatic\b/.test(code);
  }
  return false;
}

export function prepareFinalCode(
  executionLanguage: SupportedLanguage,
  sourceCode: string,
  snippet?: { code?: string; wrapperCode?: string | null }
): string {
  let wrapperCode = snippet?.wrapperCode || "";

  /**
   * Is this stored wrapper a placeholder rather than a real driver?
   *
   * The seeder writes wrappers for problems it had no driver for. Two shapes
   * exist in the live database — a comment-only one (`// Wrapper`, 90 of the
   * 194 JavaScript snippets) and an empty-bodied one that is otherwise valid
   * code (`public class Main { public static void main(String[] a) {
   * // Test wrapper } }`, all 187 Java snippets). The old guard rejected only
   * the literal "TODO", so these placeholders were accepted and took precedence
   * over the generated driver that actually works. Java compiled cleanly, ran
   * an empty `main`, printed nothing, and the submission failed on empty output
   * with no error message at all — the worst kind of failure, because nothing
   * looks wrong.
   *
   * A wrapper is only usable if it does real work: it has to invoke the
   * solution and print something. Anything else is a placeholder, and the
   * generated reflection-based driver is used instead — which is exactly what
   * already happens when no wrapper is stored.
   */
  const isPlaceholderWrapper = (w: string): boolean => {
    if (!w) return true;
    if (w.includes("TODO")) return true;

    // Comment-only: nothing left once comments are stripped.
    const withoutComments = w
      .replace(/\/\*[\s\S]*?\*\//g, "")  // block comments
      .replace(/\/\/[^\n]*/g, "")       // line comments
      .replace(/^\s*#.*$/gm, "")        // python/shell-style comments
      .trim();
    if (withoutComments.length === 0) return true;

    // Structurally real, but does it invoke the solution and print a result?
    // A wrapper with an empty main / empty exported function drives nothing.
    const invokesSolution =
      /\bSolution\b|module\.exports|require\(|\bsolve\b|\btwoSum\b|\bSolution\s*\(/i.test(w) ||
      /new\s+[A-Z]\w*\s*\(|Class\.forName|getMethod|getDeclaredMethod/i.test(w);
    const emitsOutput =
      /System\.out|print|console\.log|stdout|puts|cout|fwrite/i.test(w) ||
      /=>\s*\S|return\s+\S/.test(withoutComments);

    return !(invokesSolution && emitsOutput);
  };

  const storedWrapperIsUsable = !isPlaceholderWrapper(wrapperCode);

  // ═══════════════════════════════════════════════════════════
  //  SHARED TYPE DETECTION UTILITIES
  // ═══════════════════════════════════════════════════════════
  type TypeKind =
    | 'int' | 'long' | 'double' | 'float' | 'bool' | 'string' | 'char'
    | 'int_array' | 'int_array_2d' | 'string_array' | 'long_array' | 'double_array'
    | 'list_node' | 'tree_node' | 'node' | 'out_size_ptr'
    | 'void' | 'unknown';

  function detectKind(rawType: string): TypeKind {
    // Strip the `std::` namespace before matching.
    //
    // Fully-qualified names are the idiomatic C++ style, and they slipped
    // through every pattern: `std::vector<std::string>` does not contain the
    // literal `vector<string` (there is a `std::` between `<` and `string`), so
    // it fell through to the `string` fallback and the generated main() declared
    // `string arg0` instead of `vector<string>`, which failed to compile.
    // `std::vector<std::vector<int>>` was likewise mis-detected as int_array.
    const t = rawType
      .replace(/public:|private:|protected:|static|inline|const|virtual/gi, '')
      .replace(/\bstd::/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
    if (t === 'void') return 'void';
    if (t.includes('treenode') || t.includes('structtreenode')) return 'tree_node';
    if (t.includes('listnode') || t.includes('structlistnode') || t.includes('node*')) return 'list_node';
    // 2D containers first
    if (t.includes('vector<vector') || t.includes('list<list') || t.includes('[][]') || t.includes('int[][]') || t.includes('integer[][]') || t.includes('int**')) return 'int_array_2d';
    // 1D containers
    if (t.includes('vector<int') || t.includes('vector<integer') || t.includes('int[]') || t.includes('integer[]') || t.includes('list<int') || t.includes('list<integer') || t.includes('int*')) return 'int_array';
    if (t.includes('vector<long') || t.includes('long[]') || t.includes('list<long') || t.includes('long*')) return 'long_array';
    if (t.includes('vector<double') || t.includes('double[]') || t.includes('list<double') || t.includes('double*')) return 'double_array';
    if (t.includes('vector<string') || t.includes('string[]') || t.includes('list<string') || t.includes('char**')) return 'string_array';
    // Primitives
    if (t === 'int' || t === 'integer') return 'int';
    if (t === 'long' || t === 'longlong') return 'long';
    if (t === 'double') return 'double';
    if (t === 'float') return 'float';
    if (t === 'bool' || t === 'boolean') return 'bool';
    if (t.includes('string') || t === 'str' || t.includes('char*')) return 'string';
    if (t === 'char') return 'char';
    return 'unknown';
  }

  interface ParsedParam { rawType: string; name: string; kind: TypeKind; }
  interface ParsedSig { returnKind: TypeKind; funcName: string; params: ParsedParam[]; isVoid: boolean; }

  /** Parse function sig from C++/Java style code: RetType funcName(T1 p1, T2 p2) { */
  function parseCppJavaSig(codeToSearch: string): ParsedSig | null {
    const sigRe = /([\w<>,\s:*&[\]]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+\s*)?\{/g;
    const skip = new Set(['main','Solution','Node','TreeNode','ListNode','if','for','while','catch','else']);
    let m: RegExpExecArray | null;
    while ((m = sigRe.exec(codeToSearch)) !== null) {
      const retRaw = (m[1] ?? '').trim();
      const name = (m[2] ?? '').trim();
      if (!name || skip.has(name) || /^[A-Z]/.test(name)) continue;
      const paramsRaw = (m[3] ?? '').trim();
      const params: ParsedParam[] = [];
      if (paramsRaw) {
        const parts: string[] = [];
        let depth = 0, cur = '';
        for (const ch of paramsRaw) {
          if (ch === '<' || ch === '[') depth++;
          else if (ch === '>' || ch === ']') depth--;
          if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        if (cur.trim()) parts.push(cur.trim());
        for (const part of parts) {
          const tokens = part.replace(/[&*]/g, ' ').trim().split(/\s+/);
          const paramName = tokens[tokens.length - 1] ?? `p${params.length}`;
          let kind = detectKind(part);
          if (paramName.toLowerCase().includes('returnsize') || paramName.toLowerCase().includes('retsize')) kind = 'out_size_ptr';
          params.push({ rawType: part, name: paramName, kind });
        }
      }
      const returnKind = detectKind(retRaw);
      return { returnKind, funcName: name, params, isVoid: returnKind === 'void' };
    }
    return null;
  }

  function parsePythonSig(codeToSearch: string): ParsedSig | null {
    const m = codeToSearch.match(/def\s+(\w+)\s*\((.*?)\)\s*(?:->.*?)?:/);
    if (!m) return null;
    const funcName = m[1] ?? '';
    const rawParams = (m[2] ?? '').split(',').map(p => p.trim()).filter(p => p && p !== 'self');
    const params: ParsedParam[] = rawParams.map((p, i) => {
      const name = (p.split(':')[0] ?? '').split('=')[0]?.trim() ?? `arg${i}`;
      const hint = p.includes(':') ? ((p.split(':')[1] ?? '').split('=')[0]?.trim() ?? '') : '';
      return { rawType: hint, name, kind: detectKind(hint) };
    });
    return { returnKind: 'unknown', funcName, params, isVoid: false };
  }

  // ═══════════════════════════════════════════════════════════
  //  1. JAVASCRIPT
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "javascript") {
    // ── Operation-sequence problems ─────────────────────────────────────
    // Design problems (MaxStack, Twitter, KthLargest, ...) exercise a CLASS
    // through a scripted call sequence rather than a single call with JSON
    // arguments, so they need a different driver. Detected from the starter
    // snippet: only these problems declare `X.prototype.method = ...`.
    // ── Graph and async problems ─────────────────────────────────────────
    // Clone Graph takes an adjacency list that the generic tree heuristic
    // would mangle, and Debounce / Promise Time Limit / promiseAll take
    // functions and return promises. Both need their own driver.
    const specialKind = detectSpecialKind(snippet?.code || sourceCode);
    if (specialKind) {
      return `${sourceCode}\n${buildSpecialWrapper(specialKind)}`;
    }

    const operationSig = detectOperationSignature(snippet?.code || sourceCode);
    if (operationSig) {
      return `${sourceCode}\n${buildOperationWrapper(operationSig)}`;
    }

    const userFuncMatch = sourceCode.match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)|class\s+Solution\s*\{\s*(\w+)\s*\((.*?)\)/);
    const userFuncName = userFuncMatch ? (userFuncMatch[1] || userFuncMatch[3] || userFuncMatch[5]) : null;

    if (wrapperCode && userFuncName && !wrapperCode.includes(userFuncName)) wrapperCode = "";

    const treeHelpers = `
function ListNode(val, next) {
  this.val = (val===undefined ? 0 : val);
  this.next = (next===undefined ? null : next);
}
function TreeNode(val, left, right) {
  this.val = (val===undefined ? 0 : val);
  this.left = (left===undefined ? null : left);
  this.right = (right===undefined ? null : right);
}
function _Node(val, next, random) {
  this.val = (val===undefined ? 0 : val);
  this.next = (next===undefined ? null : next);
  this.random = (random===undefined ? null : random);
}
function Node(val, left, right, next, random) {
  this.val = (val===undefined ? 0 : val);
  this.left = (left===undefined ? null : left);
  this.right = (right===undefined ? null : right);
  this.next = (next===undefined ? null : next);
  this.random = (random===undefined ? null : random);
}
function arrayToListNode(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const dummy = new ListNode(0);
  let curr = dummy;
  for (let i = 0; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return dummy.next;
}
function listNodeToArray(head) {
  if (!head) return [];
  const res = [];
  let curr = head;
  while (curr) {
    res.push(curr.val);
    curr = curr.next;
  }
  return res;
}
function isListNode(obj) {
  return obj && typeof obj === 'object' && ('val' in obj && 'next' in obj && !('left' in obj) && !('random' in obj));
}
function arrayToTree(arr) {
  if (!Array.isArray(arr) || arr.length === 0 || arr[0] === null || arr[0] === undefined) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift();
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) { curr.left = new TreeNode(arr[i]); queue.push(curr.left); }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) { curr.right = new TreeNode(arr[i]); queue.push(curr.right); }
    i++;
  }
  return root;
}
function treeToArray(root) {
  if (!root) return [];
  const result = []; const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) { result.push(node.val); queue.push(node.left); queue.push(node.right); }
    else { result.push(null); }
  }
  while (result.length > 0 && result[result.length - 1] === null) result.pop();
  return result;
}
function isTreeNode(obj) { return obj && typeof obj === 'object' && ('val' in obj && ('left' in obj || 'right' in obj)); }
function arrayToRandomList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const nodes = arr.map(item => { const val = Array.isArray(item) ? item[0] : (item && typeof item === 'object' ? item.val : item); return new _Node(val); });
  for (let i = 0; i < arr.length; i++) {
    if (i < arr.length - 1) nodes[i].next = nodes[i + 1];
    const randIdx = Array.isArray(arr[i]) ? arr[i][1] : null;
    if (randIdx !== null && randIdx !== undefined && nodes[randIdx]) nodes[i].random = nodes[randIdx];
  }
  return nodes[0];
}
function randomListToArray(head) {
  if (!head) return [];
  const nodes = []; const map = new Map(); let curr = head;
  while (curr) { map.set(curr, nodes.length); nodes.push(curr); curr = curr.next; }
  return nodes.map(node => [node.val, node.random && map.has(node.random) ? map.get(node.random) : null]);
}
function isRandomNode(obj) { return obj && typeof obj === 'object' && ('val' in obj && ('random' in obj || ('next' in obj && 'val' in obj))); }
`;

    if (!wrapperCode || wrapperCode.trim() === "// Wrapper" || wrapperCode.includes("module.exports")) {
      const match = (snippet?.code || sourceCode).match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)|class\s+Solution\s*\{\s*(\w+)\s*\((.*?)\)/);
      if (match) {
        const funcName = match[1] || match[3] || match[5];
        const argsStr = (match[2] || match[4] || match[6] || "").trim();
        const argCount = argsStr ? argsStr.split(',').length : 0;
        const isRandomProblem = sourceCode.includes("copyRandomList") || sourceCode.includes("random") || sourceCode.includes("_Node");
        const isTreeProblem = !isRandomProblem && (sourceCode.includes(".left") || sourceCode.includes(".right") || sourceCode.includes("TreeNode"));
        const isListProblem = !isRandomProblem && (sourceCode.includes("ListNode") || sourceCode.includes("partition") || sourceCode.includes("reverseList") || sourceCode.includes("mergeTwoLists") || sourceCode.includes("deleteNode"));
        const paramNames = argsStr.split(',').map(s => s.trim().toLowerCase());

        wrapperCode = `const fs = require('fs');
${treeHelpers}
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);
if (input.length === 0) { throw new Error("TEST CASE ERROR: The input provided is empty."); }
`;
        for (let i = 0; i < argCount; i++) {
          const pNameStr = JSON.stringify(paramNames[i] || '');
          wrapperCode += `const rawArg${i} = input[${i}] !== undefined ? JSON.parse(input[${i}]) : undefined;
`;
          wrapperCode += `const isArgTree${i} = ${isTreeProblem} && Array.isArray(rawArg${i}) && (${pNameStr}.includes('root') || ${pNameStr}.includes('tree') || ${pNameStr}.includes('node') || ${pNameStr} === 'p' || ${pNameStr} === 'q' || ${pNameStr} === 't1' || ${pNameStr} === 't2');
`;
          wrapperCode += `const isArgList${i} = ${isListProblem} && Array.isArray(rawArg${i}) && (${pNameStr}.includes('head') || ${pNameStr}.includes('l1') || ${pNameStr}.includes('l2') || ${pNameStr}.includes('list'));
`;
          wrapperCode += `const arg${i} = (${isRandomProblem} && Array.isArray(rawArg${i})) ? arrayToRandomList(rawArg${i}) : isArgTree${i} ? arrayToTree(rawArg${i}) : isArgList${i} ? arrayToListNode(rawArg${i}) : rawArg${i};
`;
        }
        const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
        wrapperCode += `let res;
try {
  if (typeof Solution !== 'undefined' && typeof (new Solution())['${funcName}'] === 'function') {
    res = (new Solution())['${funcName}'](${callArgs});
  } else if (typeof ${funcName} === 'function') {
    res = ${funcName}(${callArgs});
  }
} catch (e) {
  console.error("EXECUTION ERROR:", e.message || e);
  process.exit(1);
}
`;
        wrapperCode += `const outVal = isListNode(res) ? listNodeToArray(res) : isRandomNode(res) ? randomListToArray(res) : (res === null && ${isRandomProblem}) ? [] : (res === null && (${isTreeProblem} || ${isListProblem})) ? [] : (isTreeNode(res) ? treeToArray(res) : (res !== undefined ? res : (isTreeNode(arg0) ? treeToArray(arg0) : (isListNode(arg0) ? listNodeToArray(arg0) : arg0))));
`;
        // NOTE: the backslash must be doubled. Inside a template literal `/\s/g`
        // would collapse to `/s/g`, stripping every literal "s" from the output
        // (e.g. `false` was printed as `fale`).
        wrapperCode += `console.log(JSON.stringify(outVal).replace(/\\s/g, ''));`;
      }
    }

    if (wrapperCode) {
      wrapperCode = wrapperCode.replace(
        /const input = fs\.readFileSync\(0, ['"]utf-8['"]\)\.trim\(\)\.split\(['"]\n['"]\);/g,
        `const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);`
      );
      const isListProb = sourceCode.includes("ListNode") || sourceCode.includes("head") || sourceCode.includes("partition");
      if (isListProb && wrapperCode.includes("JSON.parse")) {
        wrapperCode = wrapperCode.replace(
          /(const|let|var)\s+(arg0)\s*=\s*JSON\.parse\((input\[0\])\);/g,
          `let $2 = JSON.parse($3); if (Array.isArray($2) && typeof arrayToListNode === 'function') { $2 = arrayToListNode($2); }`
        );
      }
    }
    return `${treeHelpers}
${sourceCode}
${wrapperCode}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  2. PYTHON
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "python") {
    const pyNodeHelpers = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=0, left=None, right=None, next=None, random=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next
        self.random = random

_Node = Node

def _to_list_node(arr):
    if not isinstance(arr, list): return arr
    dummy = ListNode(0)
    curr = dummy
    for v in arr:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next

def _from_list_node(head):
    if not isinstance(head, ListNode): return [] if head is None else head
    res = []
    curr = head
    while curr:
        res.append(curr.val)
        curr = curr.next
    return res

def _to_tree_node(arr):
    if not isinstance(arr, list) or not arr or arr[0] is None: return None
    root = TreeNode(arr[0])
    q = [root]
    i = 1
    while q and i < len(arr):
        curr = q.pop(0)
        if i < len(arr) and arr[i] is not None:
            curr.left = TreeNode(arr[i])
            q.append(curr.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            curr.right = TreeNode(arr[i])
            q.append(curr.right)
        i += 1
    return root

def _from_tree_node(root):
    if not isinstance(root, TreeNode): return [] if root is None else root
    res = []
    q = [root]
    last_non_none = 0
    while q:
        curr = q.pop(0)
        if curr:
            res.append(curr.val)
            last_non_none = len(res)
            q.append(curr.left)
            q.append(curr.right)
        else:
            res.append(None)
    return res[:last_non_none]
`;

    const isListProblem = sourceCode.includes("ListNode") || sourceCode.includes("head") || sourceCode.includes("partition") || sourceCode.includes("reverseList");
    const isTreeProblem = sourceCode.includes("TreeNode") || sourceCode.includes("root");

    const sig = parsePythonSig(snippet?.code || sourceCode);
    const funcName = sig?.funcName || "solution";
    const isSolutionClass = sourceCode.includes('class Solution');
    const argCount = sig?.params.length || 2;

    let pyWrapper = `
import sys, json, math, collections, heapq, itertools, functools, bisect
`;
    pyWrapper += `input_lines = [line.strip() for line in sys.stdin.read().strip().splitlines() if line.strip() != '']
`;
    pyWrapper += `if len(input_lines) == 0: raise Exception("TEST CASE ERROR: Input is empty.")
`;
    for (let i = 0; i < argCount; i++) {
      pyWrapper += `raw_arg${i} = json.loads(input_lines[${i}]) if ${i} < len(input_lines) else None
`;
      const pName = sig?.params[i]?.name.toLowerCase() || '';
      const isArgTree = isTreeProblem && (pName.includes('root') || pName.includes('tree') || pName.includes('node') || pName === 'p' || pName === 'q' || pName === 't1' || pName === 't2');
      const isArgList = isListProblem && (pName.includes('head') || pName.includes('l1') || pName.includes('l2') || pName.includes('list'));
      if (isArgList) {
        pyWrapper += `arg${i} = _to_list_node(raw_arg${i}) if isinstance(raw_arg${i}, list) else raw_arg${i}\n`;
      } else if (isArgTree) {
        pyWrapper += `arg${i} = _to_tree_node(raw_arg${i}) if isinstance(raw_arg${i}, list) else raw_arg${i}\n`;
      } else {
        pyWrapper += `arg${i} = raw_arg${i}\n`;
      }
    }
    const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
    pyWrapper += `res = None
`;
    if (isSolutionClass) {
      pyWrapper += `sol = Solution()
if hasattr(sol, '${funcName}'): res = getattr(sol, '${funcName}')(${callArgs})
`;
    } else {
      pyWrapper += `if '${funcName}' in globals(): res = globals()['${funcName}'](${callArgs})
`;
    }
    pyWrapper += `out_val = res if res is not None else (arg0 if 'arg0' in locals() else None)
`;
    pyWrapper += `if isinstance(out_val, ListNode): out_val = _from_list_node(out_val)
`;
    pyWrapper += `elif isinstance(out_val, TreeNode): out_val = _from_tree_node(out_val)
`;
    pyWrapper += `print(json.dumps(out_val, separators=(',', ':')))
`;

    return `from typing import *
import sys, json, math, collections, heapq, itertools, functools, bisect
${pyNodeHelpers}
${sourceCode}
${pyWrapper}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  3. JAVA  (reflection-based — handles all types dynamically)
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "java") {
    let sanitizedSource = sourceCode
      .replace(/^package\s+[\w.]+;\s*/gm, "")
      .replace(/public\s+class\s+Solution/g, "class Solution")
      .replace(/^import\s+[\w.*]+;\s*/gm, "")
      .trim();

    // Main must come FIRST in the file.
    //
    // Java compiles a file whose public class matches its filename, but it does
    // not pick the entry point — `java Main.java` in source-launcher mode runs
    // the FIRST class in the file. Emitting the user's `class Solution` before
    // `public class Main` therefore launched `Solution` and failed with
    // "can't find main(String[]) method in class: Solution" for every problem
    // that had a stored wrapper (187 of them). Declaration order does not
    // affect compilation, so hoisting `Main` is safe.
    if (storedWrapperIsUsable) return `${wrapperCode}
${sanitizedSource}`;

    const javaReflectionMain = `import java.util.*;
import java.io.*;
import java.lang.reflect.*;
import java.util.stream.*;

// NOTE: Main must be the FIRST top-level class in this file. Piston runs Java in
// source-launcher mode, which executes the first class declared; when ListNode
// came first the launcher picked it and failed with
// "can't find main(String[]) method in class: ListNode". The node helper classes
// are therefore emitted AFTER Main, which Java permits since forward references
// between top-level classes are legal.
public class Main {
  // Batched execution.
  //
  // JVM startup costs ~2.4s of CPU before any user code runs, and Piston charges
  // it once per invocation. Paying it 13 times for a 13-case submission cost
  // ~51s end to end; paying it once costs ~4s. So the backend may pack several
  // cases into one invocation, each preceded by a "__CASE__<lineCount>" header
  // so the split never has to guess where a case ends.
  //
  // Stdin WITHOUT a header is treated as one legacy case and printed exactly as
  // before, so the existing harnesses and any stored-format caller keep working.
  private static final String CASE_HDR = "__CASE__";
  private static final String ERR_MARK = "__ERR__";

  public static void main(String[] args) throws Exception {
    List<String> raw = new ArrayList<>();
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String line;
    while ((line = br.readLine()) != null) raw.add(line);

    int i = 0;
    while (i < raw.size() && raw.get(i).trim().isEmpty()) i++;
    if (i >= raw.size() || !raw.get(i).trim().startsWith(CASE_HDR)) {
      // Legacy single case: run exactly as before, with NO capture and NO catch.
      // Letting the exception propagate is what gives the backend a non-zero
      // exit and a stderr message to show the user. Swallowing it here would
      // turn "your code threw" into "wrong answer", which is what happened in the
      // first draft of this method.
      runCaseBody(normalise(raw).toArray(new String[0]));
      return;
    }

    StringBuilder sb = new StringBuilder();
    while (i < raw.size()) {
      String header = raw.get(i++).trim();
      if (header.isEmpty()) continue;
      if (!header.startsWith(CASE_HDR)) break;
      int count;
      try { count = Integer.parseInt(header.substring(CASE_HDR.length()).trim()); }
      catch (NumberFormatException e) { sb.append(ERR_MARK).append("malformed case header").append('\\n'); continue; }
      List<String> chunk = new ArrayList<>();
      for (int k = 0; k < count && i < raw.size(); k++) chunk.add(raw.get(i++));
      sb.append(runCase(normalise(chunk))).append('\\n');
    }
    System.out.print(sb);
  }

  private static List<String> normalise(List<String> in) {
    List<String> out = new ArrayList<>();
    for (String s : in) { String t = s.trim(); if (!t.isEmpty()) out.add(t); }
    return out;
  }

  /**
   * Runs one case of a BATCH and returns what it printed, instead of printing.
   *
   * The existing design-pattern helpers (runDesignCase / runDesignActionCase)
   * write to System.out themselves, so the stream is captured for the duration
   * of the call rather than refactoring those two methods. This code is
   * single-threaded and runs inside a sandbox, so the swap is contained.
   *
   * A case that throws must not take the batch down with it, so the throw is
   * converted to a single __ERR__ line and the remaining cases still run. The
   * backend treats that marker as "this batch is not fully trustworthy" and
   * re-runs the submission per case, which yields the real per-case error.
   */
  private static String runCase(List<String> inputLines) {
    String[] lines = inputLines.toArray(new String[0]);
    PrintStream realOut = System.out;
    ByteArrayOutputStream captured = new ByteArrayOutputStream();
    try {
      System.setOut(new PrintStream(captured, true, "UTF-8"));
      runCaseBody(lines);
    } catch (Throwable t) {
      String msg = String.valueOf(t.getMessage());
      if (msg == null || msg.isEmpty()) msg = t.getClass().getSimpleName();
      return ERR_MARK + msg.replace('\\n', ' ').replace('\\r', ' ');
    } finally {
      System.setOut(realOut);
    }
    String text = captured.toString();
    while (text.endsWith("\\n") || text.endsWith("\\r")) text = text.substring(0, text.length() - 1);
    return text;
  }

  private static void runCaseBody(String[] inputLines) throws Exception {
    if (isDesignCase(Solution.class, inputLines)) { runDesignCase(Solution.class, inputLines); return; }
    if (isDesignActionCase(Solution.class, inputLines)) { runDesignActionCase(Solution.class, inputLines); return; }
    Method[] candidates = Arrays.stream(Solution.class.getDeclaredMethods())
        .filter(m -> Modifier.isPublic(m.getModifiers()) && !m.getName().equals("main") && !m.isSynthetic())
        .toArray(Method[]::new);
    InvocationPlan plan = selectInvocation(candidates, inputLines);
    Method target = plan.method;
    Object instance = Modifier.isStatic(target.getModifiers()) ? null : Solution.class.getDeclaredConstructor().newInstance();
    Object result = invokeTarget(target, instance, plan.args);
    if (target.getReturnType() == void.class) {
      if (plan.args.length > 0) System.out.println(format(plan.args[0]));
    } else {
      System.out.println(result != null ? format(result) : "null");
    }
  }
  private static Object invokeTarget(Method m, Object inst, Object[] args) throws Exception {
    try { return m.invoke(inst, args); }
    catch (InvocationTargetException e) {
      Throwable c = e.getCause();
      if (c instanceof Exception) throw (Exception)c;
      if (c instanceof Error) throw (Error)c;
      throw new RuntimeException(c);
    }
  }
  private static class InvocationPlan { final Method method; final Object[] args; InvocationPlan(Method m,Object[] a){method=m;args=a;} }
  private static class ActionCall { final String name; final String rawArgs; ActionCall(String n,String r){name=n;rawArgs=r;} }
  private static InvocationPlan selectInvocation(Method[] candidates, String[] lines) throws Exception {
    if (candidates.length == 0) throw new RuntimeException("No public solution method found");
    Exception last = null;
    for (Method m : candidates) { try { return new InvocationPlan(m, parseArguments(m.getGenericParameterTypes(), lines)); } catch (Exception e) { last = e; } }
    throw new IllegalArgumentException("Could not match input to any method. Last: " + (last == null ? "?" : last.getMessage()));
  }
  private static boolean isDesignCase(Class<?> clazz, String[] lines) {
    if (lines.length < 2) return false;
    List<String> ops; try { ops = parseOperationNames(lines[0]); } catch (Exception e) { return false; }
    if (ops.size() < 2) return false;
    List<String> groups; try { groups = getArrayItems(lines[1]); } catch (Exception e) { return false; }
    if (ops.size() != groups.size()) return false;
    Set<String> methods = Arrays.stream(clazz.getDeclaredMethods()).filter(m->Modifier.isPublic(m.getModifiers())).map(Method::getName).collect(Collectors.toSet());
    for (int i=1;i<ops.size();i++) if (!methods.contains(ops.get(i))) return false;
    return true;
  }
  private static void runDesignCase(Class<?> clazz, String[] lines) throws Exception {
    List<String> ops = parseOperationNames(lines[0]), groups = getArrayItems(lines[1]);
    List<String> outputs = new ArrayList<>();
    Object inst = constructInstance(clazz, groups.get(0)); outputs.add("null");
    for (int i=1;i<ops.size();i++) {
      Method m = findMethod(clazz, ops.get(i), groups.get(i));
      Object[] a = parseArgumentGroup(m.getGenericParameterTypes(), groups.get(i));
      Object r = invokeTarget(m, Modifier.isStatic(m.getModifiers()) ? null : inst, a);
      outputs.add(m.getReturnType()==void.class ? "null" : format(r));
    }
    System.out.println("[" + String.join(",", outputs) + "]");
  }
  private static boolean isDesignActionCase(Class<?> clazz, String[] lines) {
    List<ActionCall> calls = parseActionCalls(lines); if (calls.isEmpty()) return false;
    Set<String> methods = Arrays.stream(clazz.getDeclaredMethods()).filter(m->Modifier.isPublic(m.getModifiers())).map(Method::getName).collect(Collectors.toSet());
    int start = methods.contains(calls.get(0).name) ? 0 : 1;
    if (start==1&&calls.size()==1) return true;
    for (int i=start;i<calls.size();i++) if (!methods.contains(calls.get(i).name)) return false;
    return true;
  }
  private static void runDesignActionCase(Class<?> clazz, String[] lines) throws Exception {
    List<ActionCall> calls = parseActionCalls(lines); List<String> outputs = new ArrayList<>();
    Set<String> methods = Arrays.stream(clazz.getDeclaredMethods()).filter(m->Modifier.isPublic(m.getModifiers())).map(Method::getName).collect(Collectors.toSet());
    int start=0; Object inst;
    if (!calls.isEmpty()&&!methods.contains(calls.get(0).name)){inst=constructInstance(clazz,calls.get(0).rawArgs);outputs.add("null");start=1;}
    else {inst=constructInstance(clazz,"[]");}
    for (int i=start;i<calls.size();i++){
      ActionCall call=calls.get(i); Method m=findMethod(clazz,call.name,call.rawArgs);
      Object[] a=parseArgumentGroup(m.getGenericParameterTypes(),call.rawArgs);
      Object r=invokeTarget(m,Modifier.isStatic(m.getModifiers())?null:inst,a);
      outputs.add(m.getReturnType()==void.class?"null":format(r));
    }
    System.out.println("[" + String.join(",", outputs) + "]");
  }
  private static List<ActionCall> parseActionCalls(String[] lines) {
    String raw = String.join(",", lines).trim(); if (raw.isEmpty()) return Collections.emptyList();
    if (looksLikeArray(raw)) raw = raw.substring(1, raw.length()-1);
    List<ActionCall> calls = new ArrayList<>();
    for (String item : splitTopLevel(raw)) {
      String t=item.trim(); int op=t.indexOf('(');
      if (op<=0||!t.endsWith(")")) return Collections.emptyList();
      String name=t.substring(0,op).trim();
      if (!name.matches("[A-Za-z_\$][A-Za-z0-9_\$]*")) return Collections.emptyList();
      String a=t.substring(op+1,t.length()-1).trim();
      calls.add(new ActionCall(name, a.isEmpty()?"[]":"["+a+"]"));
    }
    return calls;
  }
  private static Object[] parseArguments(Type[] paramTypes, String[] lines) throws Exception {
    if (paramTypes.length>1&&lines.length==1&&looksLikeArray(lines[0])) {
      try { return parseArgumentGroup(paramTypes, lines[0]); } catch (Exception ignored) {}
    }
    Object[] args = new Object[paramTypes.length];
    for (int i=0;i<paramTypes.length;i++) args[i] = i<lines.length ? parseValue(lines[i],paramTypes[i]) : getDefault(paramTypes[i]);
    return args;
  }
  private static Object[] parseArgumentGroup(Type[] paramTypes, String rawArgs) throws Exception {
    List<String> items = getArrayItems(rawArgs);
    if (items.size()!=paramTypes.length) throw new IllegalArgumentException("Expected "+paramTypes.length+" args, got "+items.size());
    Object[] args = new Object[paramTypes.length];
    for (int i=0;i<paramTypes.length;i++) args[i]=parseValue(items.get(i),paramTypes[i]);
    return args;
  }
  private static Object parseValue(String raw, Type type) throws Exception {
    String t = raw.trim();
    if (type instanceof Class<?>) {
      Class<?> c = (Class<?>)type;
      if (isNull(t)&&!c.isPrimitive()) return null;
      if (c==String.class) return unquote(t);
      if (c==int.class||c==Integer.class) return parseInt(t);
      if (c==long.class||c==Long.class) return Long.parseLong(unquote(t).trim());
      if (c==double.class||c==Double.class) return Double.parseDouble(unquote(t).trim());
      if (c==float.class||c==Float.class) return Float.parseFloat(unquote(t).trim());
      if (c==boolean.class||c==Boolean.class) return Boolean.parseBoolean(unquote(t));
      if (c==char.class||c==Character.class){String s=unquote(t);return s.isEmpty()?'\0':s.charAt(0);}
      if (c.isArray()) return parseArray(t, c.getComponentType());
      if (List.class.isAssignableFrom(c)) return parseList(t, Object.class);
      if (c.getSimpleName().equals("ListNode")) return parseListNode(t);
      if (c.getSimpleName().equals("TreeNode")) return parseTreeNode(t);
      if (c.getSimpleName().equals("Node")) return parseNodeVal(t);
      return parseObject(t, c);
    }
    if (type instanceof ParameterizedType) {
      ParameterizedType pt=(ParameterizedType)type; Type raw2=pt.getRawType();
      if (raw2 instanceof Class<?>&&List.class.isAssignableFrom((Class<?>)raw2))
        return parseList(t, pt.getActualTypeArguments()[0]);
    }
    return unquote(t);
  }
  private static Object getDefault(Type type) {
    if (type instanceof Class<?>){Class<?>c=(Class<?>)type;
      if(c==int.class||c==Integer.class)return 0;if(c==long.class||c==Long.class)return 0L;
      if(c==double.class||c==Double.class)return 0.0;if(c==boolean.class||c==Boolean.class)return false;
      if(c.isArray())return Array.newInstance(c.getComponentType(),0);if(List.class.isAssignableFrom(c))return new ArrayList<>();}
    return null;
  }
  private static Object parseArray(String raw, Class<?> comp) throws Exception {
    String t=raw.trim(); if(isNull(t))return null; if(t.equals("[]"))return Array.newInstance(comp,0);
    List<String>items=getArrayItems(t); Object arr=Array.newInstance(comp,items.size());
    for(int i=0;i<items.size();i++)Array.set(arr,i,parseValue(items.get(i),comp)); return arr;
  }
  @SuppressWarnings("unchecked")
  private static List<Object> parseList(String raw, Type elem) throws Exception {
    String t=raw.trim(); if(isNull(t))return null; if(t.equals("[]"))return new ArrayList<>();
    List<String>items=getArrayItems(t); List<Object>list=new ArrayList<>();
    for(String item:items)list.add(parseValue(item,elem)); return list;
  }
  private static Object parseListNode(String raw) throws Exception {
    String t=raw.trim(); if(t.equals("[]")||isNull(t))return null;
    List<String>items=getArrayItems(t); if(items.isEmpty())return null;
    Class<?>cls=Class.forName("ListNode"); Constructor<?>ctor=cls.getConstructor(int.class); Field nf=cls.getField("next");
    Object head=null,curr=null;
    for(String item:items){Object node=ctor.newInstance(parseInt(item));if(head==null){head=node;curr=node;}else{nf.set(curr,node);curr=node;}}
    return head;
  }
  private static Object parseTreeNode(String raw) throws Exception {
    String t=raw.trim(); if(t.equals("[]")||isNull(t))return null;
    List<String>items=getArrayItems(t); if(items.isEmpty()||isNull(items.get(0)))return null;
    Class<?>cls=Class.forName("TreeNode"); Constructor<?>ctor=cls.getConstructor(int.class);
    Field lf=cls.getField("left"),rf=cls.getField("right");
    Object root=ctor.newInstance(parseInt(items.get(0))); Queue<Object>q=new LinkedList<>();q.add(root);
    int i=1;
    while(!q.isEmpty()&&i<items.size()){
      Object curr=q.poll(); String lv=items.get(i++).trim();
      if(!isNull(lv)){Object l=ctor.newInstance(parseInt(lv));lf.set(curr,l);q.add(l);}
      if(i<items.size()){String rv=items.get(i++).trim();if(!isNull(rv)){Object r=ctor.newInstance(parseInt(rv));rf.set(curr,r);q.add(r);}}
    }
    return root;
  }
  private static Object parseNodeVal(String raw) throws Exception {
    String t=raw.trim(); if(t.equals("[]")||t.equals("null"))return null;
    Class<?>cls=Class.forName("Node"); boolean isGraph=false;
    try{cls.getField("neighbors");isGraph=true;}catch(Exception e){}
    List<String>items=getArrayItems(t); if(items.isEmpty())return null;
    if(isGraph){
      Constructor<?>ctor=cls.getConstructor(int.class);Field nf=cls.getField("neighbors");
      int n=items.size(); Object[]nodes=new Object[n]; for(int i=0;i<n;i++)nodes[i]=ctor.newInstance(i+1);
      for(int i=0;i<n;i++){String nb=items.get(i).trim();if(nb.equals("[]"))continue;
        @SuppressWarnings("unchecked")List<Object>nbList=(List<Object>)nf.get(nodes[i]);
        for(String id:getArrayItems(nb))nbList.add(nodes[parseInt(id)-1]);}
      return nodes[0];
    } else {
      Constructor<?>ctor=cls.getConstructor(int.class);Field nextF=cls.getField("next"),randF=cls.getField("random");
      int n=items.size();Object[]nodes=new Object[n];int[]randIdx=new int[n];Arrays.fill(randIdx,-1);
      for(int i=0;i<n;i++){List<String>pair=getArrayItems(items.get(i).trim());nodes[i]=ctor.newInstance(parseInt(pair.get(0)));
        String ri=pair.get(1).trim();if(!isNull(ri))randIdx[i]=parseInt(ri);}
      for(int i=0;i<n;i++){if(i<n-1)nextF.set(nodes[i],nodes[i+1]);if(randIdx[i]!=-1)randF.set(nodes[i],nodes[randIdx[i]]);}
      return nodes[0];
    }
  }
  private static Object parseObject(String raw, Class<?>clazz) throws Exception {
    String t=raw.trim(); if(isNull(t))return null;
    if(looksLikeArray(t)){for(Constructor<?>ctor:clazz.getDeclaredConstructors()){try{ctor.setAccessible(true);return ctor.newInstance(parseArgumentGroup(ctor.getGenericParameterTypes(),t));}catch(Exception ignored){}}}
    try{Constructor<?>c=clazz.getDeclaredConstructor(String.class);c.setAccessible(true);return c.newInstance(unquote(t));}
    catch(Exception e){throw new IllegalArgumentException("Cannot construct "+clazz.getSimpleName()+" from: "+raw);}
  }
  private static String format(Object v) {
    if(v==null)return "null"; Class<?>c=v.getClass();
    if(c.getSimpleName().equals("ListNode"))return formatListNode(v);
    if(c.getSimpleName().equals("TreeNode"))return formatTreeNode(v);
    if(c.getSimpleName().equals("Node"))return formatNode(v);
    if(c.isArray()){int len=Array.getLength(v);List<String>items=new ArrayList<>();for(int i=0;i<len;i++)items.add(format(Array.get(v,i)));return "["+String.join(",",items)+"]";}
    if(v instanceof Collection<?>){List<String>items=new ArrayList<>();for(Object o:(Collection<?>)v)items.add(format(o));return "["+String.join(",",items)+"]";}
    return v.toString();
  }
  private static String formatListNode(Object head){
    try{Class<?>cls=Class.forName("ListNode");Field vf=cls.getField("val"),nf=cls.getField("next");
      List<String>r=new ArrayList<>();Object curr=head;while(curr!=null){r.add(String.valueOf(vf.get(curr)));curr=nf.get(curr);}
      return "["+String.join(",",r)+"]";}catch(Exception e){return "null";}
  }
  private static String formatTreeNode(Object root){
    try{Class<?>cls=Class.forName("TreeNode");Field vf=cls.getField("val"),lf=cls.getField("left"),rf=cls.getField("right");
      List<String>elems=new ArrayList<>();List<Object>q=new ArrayList<>();q.add(root);int lastNN=0,i=0;
      while(i<q.size()){Object curr=q.get(i++);if(curr!=null){elems.add(String.valueOf(vf.get(curr)));lastNN=elems.size();q.add(lf.get(curr));q.add(rf.get(curr));}else elems.add("null");}
      return "["+String.join(",",elems.subList(0,lastNN))+"]";}catch(Exception e){return "[]";}
  }
  private static String formatNode(Object root){
    try{Class<?>cls=Class.forName("Node");boolean isGraph=false;try{cls.getField("neighbors");isGraph=true;}catch(Exception e){}
      if(isGraph){Field nf=cls.getField("neighbors");Map<Object,Integer>nm=new LinkedHashMap<>();List<Object>q=new ArrayList<>();q.add(root);nm.put(root,1);int idx=0;
        while(idx<q.size()){Object curr=q.get(idx++);for(Object nb:(List<?>)nf.get(curr)){if(!nm.containsKey(nb)){nm.put(nb,nm.size()+1);q.add(nb);}}}
        List<String>rep=new ArrayList<>();for(Object curr:q){List<String>ids=new ArrayList<>();for(Object nb:(List<?>)nf.get(curr))ids.add(String.valueOf(nm.get(nb)));rep.add("["+String.join(",",ids)+"]");}
        return "["+String.join(",",rep)+"]";
      }else{Field vf=cls.getField("val"),nextF=cls.getField("next"),randF=cls.getField("random");
        Map<Object,Integer>nm=new LinkedHashMap<>();List<Object>list=new ArrayList<>();Object curr=root;int i=0;
        while(curr!=null){list.add(curr);nm.put(curr,i++);curr=nextF.get(curr);}
        List<String>rep=new ArrayList<>();for(Object node:list){Object rand=randF.get(node);String ri=rand==null?"null":String.valueOf(nm.get(rand));rep.add("["+vf.get(node)+","+ri+"]");}
        return "["+String.join(",",rep)+"]";}}catch(Exception e){return "null";}
  }
  private static boolean looksLikeArray(String s){s=s==null?"":s.trim();return s.startsWith("[")&&s.endsWith("]");}
  private static boolean isNull(String s){return s==null||s.trim().equalsIgnoreCase("null")||s.trim().isEmpty();}
  private static boolean isQuoted(String s){if(s.length()<2)return false;char f=s.charAt(0),l=s.charAt(s.length()-1);return(f=='"'&&l=='"')||(f=='\\''&&l=='\\'');}
  private static String unquote(String s){s=s==null?"":s.trim();return isQuoted(s)?s.substring(1,s.length()-1):s;}
  private static int parseInt(String s){String c=unquote(s).trim();if(c.equalsIgnoreCase("INF")||c.equalsIgnoreCase("INTEGER.MAX_VALUE"))return Integer.MAX_VALUE;if(c.equalsIgnoreCase("-INF")||c.equalsIgnoreCase("INTEGER.MIN_VALUE"))return Integer.MIN_VALUE;return Integer.parseInt(c);}
  private static List<String> getArrayItems(String raw){String t=raw==null?"":raw.trim();if(!looksLikeArray(t))throw new IllegalArgumentException("Expected array, got: "+raw);if(t.equals("[]"))return new ArrayList<>();return splitTopLevel(t.substring(1,t.length()-1));}
  private static List<String> splitTopLevel(String raw){List<String>result=new ArrayList<>();int depth=0;boolean inStr=false;char q='\0';StringBuilder sb=new StringBuilder();for(int i=0;i<raw.length();i++){char c=raw.charAt(i);if(inStr){if(c==q)inStr=false;sb.append(c);continue;}if(c=='\\\\'||c=='"'){inStr=true;q=c;sb.append(c);continue;}if(c=='['||c=='{'||c=='(')depth++;else if(c==']'||c=='}'||c==')')depth--;else if(c==','&&depth==0){result.add(sb.toString().trim());sb.setLength(0);continue;}sb.append(c);}if(sb.length()>0)result.add(sb.toString().trim());return result;}
  private static List<String> parseOperationNames(String raw){List<String>items=getArrayItems(raw);List<String>ops=new ArrayList<>();for(String item:items){String t=item.trim();if(!isQuoted(t))return Collections.emptyList();ops.add(unquote(t));}return ops;}
  private static Object constructInstance(Class<?>clazz,String rawArgs)throws Exception{for(Constructor<?>ctor:clazz.getDeclaredConstructors()){try{ctor.setAccessible(true);return ctor.newInstance(parseArgumentGroup(ctor.getGenericParameterTypes(),rawArgs));}catch(Exception ignored){}}throw new IllegalArgumentException("Cannot construct "+clazz.getSimpleName()+" from: "+rawArgs);}
  private static Method findMethod(Class<?>clazz,String name,String rawArgs)throws Exception{for(Method m:clazz.getDeclaredMethods()){if(!Modifier.isPublic(m.getModifiers())||!m.getName().equals(name))continue;try{parseArgumentGroup(m.getGenericParameterTypes(),rawArgs);return m;}catch(Exception ignored){}}throw new IllegalArgumentException("No matching method: "+name+"("+rawArgs+")");}
}

class ListNode {
  public int val;
  public ListNode next;
  public ListNode() {}
  public ListNode(int val) { this.val = val; }
  public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
  public int val;
  public TreeNode left;
  public TreeNode right;
  public TreeNode() {}
  public TreeNode(int val) { this.val = val; }
  public TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
`;

    return `${javaReflectionMain}${sanitizedSource}`;
  }


  // ═══════════════════════════════════════════════════════════
  //  4. C++
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "cpp") {
    if (storedWrapperIsUsable && !wrapperCode.includes("return 0;")) return `${sourceCode}
${wrapperCode}`;

    const sig = parseCppJavaSig(snippet?.code || sourceCode);
    const funcName = sig?.funcName || "solution";
    const params = sig?.params || [];
    const returnKind = sig?.returnKind || 'unknown';
    const isVoid = returnKind === 'void';

    function cppReadArg(kind: TypeKind, varName: string, idx: number): string {
      const safe = `(lines.size()>${idx}?lines[${idx}]:"[]")`;
      const safeInt = `(lines.size()>${idx}?lines[${idx}]:"0")`;
      switch (kind) {
        case 'list_node':    return `    auto ${varName} = parseListNode(${safe});
`;
        case 'tree_node':    return `    auto ${varName} = parseTreeNode(${safe});
`;
        case 'int_array':    return `    auto ${varName} = parseIntVec(${safe});
`;
        case 'long_array':   return `    auto ${varName} = parseLongVec(${safe});
`;
        case 'double_array': return `    auto ${varName} = parseDoubleVec(${safe});
`;
        case 'string_array': return `    auto ${varName} = parseStringVec(${safe});
`;
        case 'int_array_2d': return `    auto ${varName} = parseInt2DVec(${safe});
`;
        case 'string': case 'char': return `    string ${varName} = lines.size()>${idx}?lines[${idx}]:""; if(!${varName}.empty()&&${varName}.front()=='"')${varName}=${varName}.substr(1,${varName}.size()-2);
`;
        case 'bool':   return `    bool ${varName} = (lines.size()>${idx}&&(lines[${idx}]=="true"||lines[${idx}]=="1"));
`;
        case 'long':   return `    long long ${varName} = lines.size()>${idx}?stoll(lines[${idx}]):0LL;
`;
        case 'double': case 'float': return `    double ${varName} = lines.size()>${idx}?stod(lines[${idx}]):0.0;
`;
        default:       return `    int ${varName} = ${safeInt}=="[]"||${safeInt}.empty()?0:stoi(${safeInt});
`;
      }
    }

    function cppPrint(kind: TypeKind, varName: string): string {
      switch (kind) {
        case 'list_node':    return `    printListNode(${varName});
`;
        case 'tree_node':    return `    printTreeNode(${varName});
`;
        case 'int_array': case 'long_array': case 'double_array': case 'string_array': return `    printVec(${varName});
`;
        case 'int_array_2d': return `    print2DVec(${varName});
`;
        case 'bool': return `    cout<<(${varName}?"true":"false")<<endl;
`;
        default:     return `    cout<<${varName}<<endl;
`;
      }
    }

    const stdHeaders = `
#include<iostream>
#include<vector>
#include<string>
#include<sstream>
#include<algorithm>
#include<unordered_map>
#include<unordered_set>
#include<queue>
#include<stack>
#include<cmath>
#include<climits>
#include<set>
#include<map>
#include<numeric>
#include<functional>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`;

    const cppHelpers = `
template<typename T>
void printVec(const vector<T>& v){cout<<"[";for(size_t i=0;i<v.size();i++){cout<<v[i];if(i+1<v.size())cout<<",";}cout<<"]"<<endl;}
template<typename T>
void print2DVec(const vector<vector<T>>& v){cout<<"[";for(size_t i=0;i<v.size();i++){cout<<"[";for(size_t j=0;j<v[i].size();j++){cout<<v[i][j];if(j+1<v[i].size())cout<<",";}cout<<"]";if(i+1<v.size())cout<<",";}cout<<"]"<<endl;}
vector<int> parseIntVec(const string& s){vector<int>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty())try{r.push_back(stoi(tok));}catch(...){};}return r;}
vector<long long> parseLongVec(const string& s){vector<long long>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty())try{r.push_back(stoll(tok));}catch(...){};}return r;}
vector<double> parseDoubleVec(const string& s){vector<double>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty())try{r.push_back(stod(tok));}catch(...){};}return r;}
vector<string> parseStringVec(const string& s){vector<string>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty()&&tok.front()=='"')tok=tok.substr(1,tok.size()-2);r.push_back(tok);}return r;}
vector<vector<int>> parseInt2DVec(const string& s){vector<vector<int>>r;int d=0,st=0;for(int i=0;i<(int)s.size();i++){if(s[i]=='['){if(d==0)st=i;d++;}else if(s[i]==']'){d--;if(d==0)r.push_back(parseIntVec(s.substr(st,i-st+1)));}}return r;}
ListNode* parseListNode(const string& s){vector<int>v=parseIntVec(s);if(v.empty())return nullptr;ListNode* d=new ListNode(0);ListNode* c=d;for(int x:v){c->next=new ListNode(x);c=c->next;}return d->next;}
void printListNode(ListNode* head){cout<<"[";ListNode* c=head;while(c){cout<<c->val;if(c->next)cout<<",";c=c->next;}cout<<"]"<<endl;}
vector<string> parseRawTokens(const string& s){vector<string>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){while(!tok.empty()&&(tok.front()==' '||tok.front()=='\t'))tok.erase(0,1);while(!tok.empty()&&(tok.back()==' '||tok.back()=='\t'))tok.pop_back();if(!tok.empty())r.push_back(tok);}return r;}
TreeNode* parseTreeNode(const string& s){vector<string>v=parseRawTokens(s);if(v.empty()||v[0]=="null"||v[0]=="None"||v[0]=="[]")return nullptr;TreeNode* root=new TreeNode(stoi(v[0]));queue<TreeNode*>q;q.push(root);size_t i=1;while(!q.empty()&&i<v.size()){TreeNode* c=q.front();q.pop();if(i<v.size()){if(v[i]!="null"&&v[i]!="None"){c->left=new TreeNode(stoi(v[i]));q.push(c->left);}}i++;if(i<v.size()){if(v[i]!="null"&&v[i]!="None"){c->right=new TreeNode(stoi(v[i]));q.push(c->right);}}i++;}return root;}
void printTreeNode(TreeNode* root){if(!root){cout<<"[]"<<endl;return;}cout<<"[";queue<TreeNode*>q;q.push(root);vector<string>r;while(!q.empty()){TreeNode* c=q.front();q.pop();if(c){r.push_back(to_string(c->val));q.push(c->left);q.push(c->right);}else{r.push_back("null");}}while(!r.empty()&&r.back()=="null")r.pop_back();for(size_t i=0;i<r.size();i++){cout<<r[i];if(i+1<r.size())cout<<",";}cout<<"]"<<endl;}
`;

    let cppMain = '';
    // One case is a function so it can be called either once (legacy single case)
    // or once per framed chunk (batched). The argument parsing below only ever
    // references `lines`, so moving it unchanged into a function is safe.
    cppMain += `static void runOneCase(const vector<string>& lines){
`;
    cppMain += `    (void)lines;
`;

    const callArgNames: string[] = [];
    params.forEach((p, i) => {
      const argVar = `arg${i}`;
      callArgNames.push(argVar);
      cppMain += cppReadArg(p.kind, argVar, i);
    });

    const callArgs = callArgNames.join(', ');
    cppMain += `    Solution sol;
`;
    if (isVoid) {
      cppMain += `    sol.${funcName}(${callArgs});
`;
      if (params.length > 0) cppMain += cppPrint(params[0]!.kind, callArgNames[0] ?? 'arg0');
    } else {
      cppMain += `    auto res=sol.${funcName}(${callArgs});
`;
      cppMain += cppPrint(returnKind, 'res');
    }
    cppMain += `}
`;

    // The driver: stdin with no header is one legacy case and is printed exactly
    // as before, including letting any exception (e.g. a bad_alloc from a huge
    // input) terminate the process so the backend sees a real failure. With
    // headers, each case is wrapped in try/catch so one bad case cannot take the
    // rest of the batch down; the backend treats an __ERR__ line as a signal to
    // re-run per case and get the real error.
    cppMain += `int main(){
    vector<string> all;
    string line;
    while(getline(cin,line)){if(line.back()=='\\r')line.pop_back();all.push_back(line);}
    size_t i=0;
    while(i<all.size()&&all[i].empty())i++;
    if(i>=all.size()||all[i].compare(0,8,"__CASE__")!=0){
        vector<string> lines;
        for(size_t k=i;k<all.size();k++)if(!all[k].empty())lines.push_back(all[k]);
        runOneCase(lines);
        return 0;
    }
    while(i<all.size()){
        string header=all[i++];
        if(header.empty())continue;
        if(header.compare(0,8,"__CASE__")!=0)break;
        int count=atoi(header.c_str()+8);
        vector<string> lines;
        for(int k=0;k<count&&i<all.size();k++){if(!all[i].empty())lines.push_back(all[i]);i++;}
        cout.flush();
        try{runOneCase(lines);}catch(const exception& e){cout<<"__ERR__"<<e.what()<<endl;}catch(...){cout<<"__ERR__unknown error"<<endl;}
        cout.flush();
    }
    return 0;
}
`;

    return `${stdHeaders}\n${cppHelpers}\n${sourceCode}\n\n${cppMain}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  5. C
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "c") {
    if (storedWrapperIsUsable && !wrapperCode.includes("return 0;")) return `${wrapperCode}\n${sourceCode}`;

    const cHeaders = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stddef.h>
#include <math.h>
#include <limits.h>

struct ListNode {
    int val;
    struct ListNode *next;
};
struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};
`;

    const cHelpers = `
static struct ListNode* parseListNode(const char* s) {
    int arr[4096]; int sz = 0;
    char tmp[8192]; strncpy(tmp, s, 8191);
    char* p = tmp; while(*p && *p!='[') p++; if(*p) p++;
    char* e = p; while(*e && *e!=']') e++; *e = '\\0';
    char* t = strtok(p, ",");
    while(t && sz < 4096) { while(*t==' ') t++; if(*t) arr[sz++] = atoi(t); t = strtok(NULL, ","); }
    if (sz == 0) return NULL;
    struct ListNode* head = (struct ListNode*)malloc(sizeof(struct ListNode));
    head->val = arr[0]; head->next = NULL;
    struct ListNode* curr = head;
    for (int i = 1; i < sz; i++) {
        struct ListNode* node = (struct ListNode*)malloc(sizeof(struct ListNode));
        node->val = arr[i]; node->next = NULL;
        curr->next = node;
        curr = node;
    }
    return head;
}
static void printListNode(struct ListNode* head) {
    printf("[");
    struct ListNode* curr = head;
    while(curr) {
        printf("%d", curr->val);
        if (curr->next) printf(",");
        curr = curr->next;
    }
    printf("]\\n");
}
`;

    const sig = parseCppJavaSig(snippet?.code || sourceCode);
    const funcName = sig?.funcName || "";
    const params = sig?.params || [];
    const returnKind = sig?.returnKind || 'unknown';
    const isVoid = returnKind === 'void';

    let cMain = `int main(){
    char buf[131072]={0}; int pos=0,c;
    while((c=getchar())!=EOF&&pos<131071)buf[pos++]=(char)c;
    buf[pos]='\\0';
    char lines[64][8192]; int lineCount=0;
    char* tok=strtok(buf,"\\n");
    while(tok&&lineCount<64){
        while(*tok==' '||*tok=='\\r')tok++;
        strncpy(lines[lineCount++],tok,8191);
        tok=strtok(NULL,"\\n");
    }
`;

    const callArgNames: string[] = [];
    let outSizeVar = "";
    // Stdin line index, tracked SEPARATELY from the parameter index.
    //
    // C signatures carry a synthetic size parameter for every array
    // (`int* nums, int numsSize`). That size param is derived from the array
    // and consumes NO stdin line, but it still occupies a parameter slot. Using
    // the parameter index as the line index therefore shifted every parameter
    // after the first array onto the wrong line: for
    // twoSum(int* nums, int numsSize, int target, int* returnSize) the wrapper
    // read `target` from lines[2] instead of lines[1], so every such program
    // saw target 0 and returned an empty answer.
    let lineIdx = 0;
    params.forEach((p, i) => {
      const pName = p.name.toLowerCase();
      if (p.kind === 'out_size_ptr') {
        const v = `retSz${i}`;
        outSizeVar = v;
        cMain += `    int ${v} = 0;
`;
        callArgNames.push(`&${v}`);
        // Output-only parameter: consumes no stdin line.
        return;
      }
      if (pName.endsWith("size") && i > 0 && params[i-1]!.kind.includes("array")) {
        // Redundant size param for previous array in C - szVar was already
        // added by the previous array param. Consumes no stdin line.
        return;
      }
      // Everything below this point reads exactly one stdin line.
      const ln = lineIdx++;
      if (p.kind === 'list_node') {
        const v = `arg${i}`; callArgNames.push(v);
        cMain += `    struct ListNode* ${v} = parseListNode(lineCount>${ln}?lines[${ln}]:"[]");
`;
      } else if (p.kind === 'int_array') {
        const szV = `sz${i}`, arrV = `arg${i}`;
        callArgNames.push(arrV, szV);
        cMain += `    int ${arrV}[4096]; int ${szV}=0;
    {char tmp[8192];strncpy(tmp,lineCount>${ln}?lines[${ln}]:"[]",8191);char*p=tmp;while(*p&&*p!='[')p++;if(*p)p++;char*e=p;while(*e&&*e!=']')e++;*e='\\0';char*t=strtok(p,",");while(t&&${szV}<4096){while(*t==' ')t++;if(*t)${arrV}[${szV}++]=atoi(t);t=strtok(NULL,",");}}
`;
      } else if (p.kind === 'string') {
        const v = `arg${i}`; callArgNames.push(v);
        cMain += `    char ${v}[8192]={0};
    {char* p=lineCount>${ln}?lines[${ln}]:"";if(*p=='"')p++;strncpy(${v},p,8191);int len=strlen(${v});if(len>0&&${v}[len-1]=='"')${v}[len-1]='\\0';}
`;
      } else if (p.kind === 'string_array') {
        // char** arrays. Without this branch a `char** words` parameter fell
        // through to the generic int branch, so the generated call became
        // solve(arg0) with arg0 an int -- which failed to compile.
        const szV = `sz${i}`, arrV = `arg${i}`;
        callArgNames.push(arrV, szV);
        cMain += `    char* ${arrV}[256]; char ${arrV}_buf[256][256]; int ${szV}=0;
    {char tmp[8192];strncpy(tmp,lineCount>${ln}?lines[${ln}]:"[]",8191);char*p=tmp;while(*p&&*p!='[')p++;if(*p)p++;char*e=p;while(*e&&*e!=']')e++;*e='\\0';char*t=strtok(p,",");while(t&&${szV}<256){while(*t==' '||*t=='\\r')t++;if(*t){if(*t=='"')t++;char*w=${arrV}_buf[${szV}];int k=0;while(*t&&*t!='"'){if(k<255)w[k++]=*t;t++;}w[k]='\\0';${arrV}[${szV}++]=w;}t=strtok(NULL,",");}}
`;
      } else {
        const v = `arg${i}`; callArgNames.push(v);
        cMain += `    int ${v}=lineCount>${ln}?atoi(lines[${ln}]):0;
`;
      }
    });

    if (funcName) {
      const callArgs = callArgNames.join(',');
      if (isVoid && params.length > 0 && params[0]!.kind === 'int_array') {
        const szV = callArgNames[1] ?? 'sz0';
        cMain += `    ${funcName}(${callArgs});
    printf("[");for(int _i=0;_i<${szV};_i++){printf("%d",(${callArgNames[0] ?? 'arg0'})[_i]);if(_i+1<${szV})printf(",");}printf("]\\n");
`;
      } else if (returnKind === 'list_node') {
        cMain += `    struct ListNode* res = ${funcName}(${callArgs});
    printListNode(res);
`;
      } else if (returnKind === 'int_array') {
        cMain += `    int* res = ${funcName}(${callArgs});
    int sz = ${outSizeVar ? outSizeVar : '2'};
    printf("[");for(int _i=0;_i<sz;_i++){printf("%d",res[_i]);if(_i+1<sz)printf(",");}printf("]\\n");
`;
      } else if (returnKind === 'bool') {
        cMain += `    printf("%s\\n",${funcName}(${callArgs})?"true":"false");
`;
      } else if (!isVoid) {
        cMain += `    printf("%d\\n",(int)${funcName}(${callArgs}));
`;
      }
    }
    cMain += `    return 0;
}
`;

    return `${cHeaders}\n${cHelpers}\n${sourceCode}\n\n${cMain}`;
  }

  return `${sourceCode}\n${wrapperCode}`;
}



export const executeCode = async (req: Request, res: Response) => {
  const { code, language, oid, mode, customInput, testCaseIndex, timeTaken } = req.body as ExecuteBody & { timeTaken?: string };
  const sourceCode = typeof code === "string" ? code : "";
  const githubOid = typeof oid === "string" ? oid : "";
  const executionMode = getExecutionMode(mode);
  const executionLanguage = getLanguage(language);
  const userCustomInput = typeof customInput === "string" ? customInput : "";
  // -1 means "not a single-case run". Only a non-negative integer selects a case.
  const singleCaseIndex =
    typeof testCaseIndex === "number" && Number.isInteger(testCaseIndex) && testCaseIndex >= 0
      ? testCaseIndex
      : -1;

  try {
    let casesToRun: TestCaseRecord[] = [];

    // Fetch test cases and wrapper code from DB if it's a real problem
    let finalCode = sourceCode;
    
    if (githubOid && !githubOid.startsWith("local-")) {
      const fileData = await prisma.problem.findFirst({
        where: { 
          OR: [
            { github_oid: githubOid },
            { id: githubOid }
          ]
        },
        select: { test_cases: true, code_snippets: true },
        // MUST match the `orderBy` in problems.ts (getSystemProblems and
        // getProblemById). The client renders card N from index N and matches
        // each ExecutionDetail by testCaseIndex, so a different order here
        // would paint every verdict onto the wrong card. TestCase has no
        // ordinal column, so the id is what both sides pin to.
        orderBy: { id: "asc" },
      });

      const testCases = (fileData?.test_cases ?? []) as TestCaseRecord[];

      if (executionMode === "SUBMIT") {
        // SUBMIT always grades the FULL stored set. It must never be narrowed
        // to one case, or a solution could be marked solved on a single pass.
        casesToRun = testCases;
      } else if (singleCaseIndex >= 0 && singleCaseIndex < testCases.length) {
        // Single-case run: keep this case's real expected output so the caller
        // gets a true verdict, and report its true index so the UI can light up
        // the matching card instead of guessing from array position.
        const chosen = testCases[singleCaseIndex];
        casesToRun = [{ ...chosen, __index: singleCaseIndex }];
      } else {
        casesToRun = testCases.slice(0, 1);
      }
      const snippet = fileData?.code_snippets?.find((s: any) => s.language === executionLanguage);
      finalCode = prepareFinalCode(executionLanguage, sourceCode, snippet);
    }

    // Override if custom input is provided — only meaningful for RUN mode.
    // In SUBMIT mode we MUST evaluate against the real test cases, otherwise
    // a single custom input would let users game the pass/fail scoring.
    if (userCustomInput.length > 0 && executionMode !== "SUBMIT") {
      casesToRun = [{ input: userCustomInput, expectedOutput: "" }];
    }

    if (casesToRun.length === 0) {
      casesToRun = [{ input: "", expectedOutput: "" }];
    }

    const results: ExecutionDetail[] = [];
    let totalPassed = 0;
    let totalRuntimeMs = 0;
    let totalMemoryKb = 0;
    let maxRuntimeMs = 0;
    let maxMemoryKb = 0;
    let totalCompileMs = 0;
    let maxCompileMemoryKb = 0;
    let totalCpuMs = 0;
    let runCount = 0;
    let payloadBytes = 0;
    const budget = SANDBOX_BUDGETS[executionLanguage];
    const submissionStart = performance.now();

    /**
     * One test case, executed on its own.
     *
     * Returns a self-contained outcome instead of writing to the shared
     * accumulators, because cases now run concurrently and the totals have to be
     * derived only from the cases we actually keep (see `keptThrough`) to match
     * the original short-circuit behaviour exactly.
     */
    type CaseOutcome = {
      index: number;
      detail: ExecutionDetail;
      passed: boolean;
      compileFailed: boolean;
      runtimeMs: number;
      memoryKb: number;
      cpuMs: number;
      compileMs: number;
      compileMemoryKb: number;
    };

    /**
     * Runs every case in ONE sandbox invocation instead of one per case.
     *
     * The fixed per-invocation cost is ~95% of a C++ request (331ms for
     * `int main(){}` versus 2540ms for the generated wrapper) and most of a Java
     * one (~2.4s of CPU before any user code). Paying it N times is what made a
     * 13-case Java submission take ~51s.
     *
     * The generated Java driver understands a `__CASE__<lineCount>` framing, so
     * the split needs no guessing. Only languages whose driver actually
     * implements it are eligible — see `supportsBatching`. Anything irregular
     * (line-count mismatch, non-zero exit, a compile failure, or a `__ERR__`
     * line) returns null and the caller re-runs the proven per-case path, so a
     * batching bug can cost time but cannot produce a wrong verdict.
     */
    const runBatched = async (): Promise<CaseOutcome[] | null> => {
      if (!supportsBatching(executionLanguage)) return null;
      if (casesToRun.length < 2) return null;

      // A case with no expected output is a custom-input run: there is nothing
      // to compare, and batching would hide which output belonged to it.
      if (casesToRun.some((c) => (c.expectedOutput ?? "") === "")) return null;

      // The batch contract is one output line per case. A case whose expected
      // output spans several lines cannot be split back out of it. None of the
      // 2,500 stored cases do this today (checked), but a custom problem could,
      // so it is refused rather than assumed.
      if (
        casesToRun.some((c) =>
          String(c.expectedOutput ?? "")
            .split("\n")
            .filter((l) => l.trim().length > 0).length > 1,
        )
      ) {
        return null;
      }

      // One process for all cases means shared state leaks between them, which
      // the per-case path would have reset.
      if (hasSharedMutableState(executionLanguage, sourceCode)) return null;

      const startTime = performance.now();
      const stdin = casesToRun
        .map((c) => {
          const body = String(c.input ?? "");
          const lineCount = body.length === 0 ? 0 : body.replace(/\n$/, "").split("\n").length;
          return `__CASE__${lineCount}\n${body}`;
        })
        .join("\n");

      const payload = {
        "language": pistonLanguageMap[executionLanguage] || executionLanguage,
        "version": "*",
        "files": [{ "name": getFileName(executionLanguage), "content": finalCode }],
        "stdin": stdin,
        "compile_timeout": budget.compileTimeoutMs,
        "run_timeout": budget.runTimeoutMs,
        "run_cpu_time": budget.runCpuTimeMs,
        "compile_memory_limit": budget.compileMemoryLimitBytes,
        "run_memory_limit": budget.runMemoryLimitBytes,
      };
      payloadBytes += Buffer.byteLength(JSON.stringify(payload), "utf8");

      let data: any;
      try {
        data = await fireOnPiston(executionLanguage, payload as Record<string, unknown>);
      } catch {
        return null;
      }
      if (!data?.run) return null;
      // A compile error or a killed process invalidates the whole batch: the
      // per-case path reproduces the exact per-case message a user needs.
      if (data.compile && data.compile.code !== 0) return null;
      if (data.run.code !== 0 || data.run.signal) return null;

      const lines = String(data.run.stdout ?? "")
        .split("\n")
        .map((l) => l.trim());
      // Trailing newline yields one empty tail entry; anything else is a real
      // mismatch and must not be guessed at.
      while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
      if (lines.length !== casesToRun.length) return null;
      // A case that threw is reported per line, and its siblings' results are
      // still valid, but the per-case path gives a better message. Defer.
      if (lines.some((l) => l.startsWith(BATCH_ERR_MARK))) return null;

      const totalMs = Math.round(performance.now() - startTime);
      const cpuMs = Number(data.run.cpu_time) || 0;
      const wallMs = Number(data.run.wall_time) || 0;
      const memoryKb = Math.round(Number(data.run.memory) / 1024) || 0;
      // The whole batch shares one process, so per-case cost is the amortised
      // share. Reporting the full batch cost on every case would inflate the
      // totals by the number of cases.
      const perCaseMs = Math.max(1, Math.round(totalMs / casesToRun.length));

      return casesToRun.map((c, i) => {
        const expected = String(c.expectedOutput ?? "").trim();
        const output = lines[i] ?? "";
        return {
          index: i,
          passed: output === expected,
          compileFailed: false,
          runtimeMs: perCaseMs,
          memoryKb,
          cpuMs: cpuMs ? Math.round(cpuMs / casesToRun.length) : 0,
          wallMs: wallMs ? Math.round(wallMs / casesToRun.length) : 0,
          compileMs: 0,
          compileMemoryKb: 0,
          detail: {
            // Batching only runs with >= 2 cases (see the guard above), so the
            // array position IS the stored index here. `trueIndex` is not in
            // scope in this function and would not be correct anyway.
            testCaseIndex: i,
            output,
            expectedOutput: expected,
            passed: output === expected,
            runtimeError: null,
            metrics: {
              durationMs: perCaseMs,
              memoryKb,
              cpuMs: cpuMs ? Math.round(cpuMs / casesToRun.length) : 0,
              wallMs: wallMs ? Math.round(wallMs / casesToRun.length) : 0,
              compileMs: 0,
              compileMemoryKb: 0,
              roundTripMs: totalMs,
              exitCode: data.run.code ?? null,
              signal: data.run.signal ?? null,
              sandboxStatus: data.run.status ?? null,
              sandboxMessage: null,
              outputTruncated: false,
              stdout: output,
              stderr: "",
              compileOutput: "",
            },
          },
        };
      });
    };

    const runOneCase = async (
      currentCase: TestCaseRecord,
      index: number,
    ): Promise<CaseOutcome> => {
      // A single-case run holds one element in `casesToRun`, so its array
      // position is always 0 no matter which stored case was chosen. Prefer the
      // recorded __index so the verdict lands on the card the user clicked.
      const trueIndex = currentCase.__index ?? index;
      const testCaseInput = currentCase.input || "";
      const startTime = performance.now();
      // One clamped retry per case is enough; two would just hammer Piston.
      // Clamp/retry lives in fireOnPiston so the verification harnesses share it.

      const payload = {
        "language": pistonLanguageMap[executionLanguage] || executionLanguage,
        "version": "*",
        "files": [
          {
            "name": getFileName(executionLanguage),
            "content": finalCode,
          }
        ],
        "stdin": testCaseInput,
        "compile_timeout": budget.compileTimeoutMs,
        "run_timeout": budget.runTimeoutMs,
        // Explicit, because Piston otherwise applies its own 3000ms default,
        // which the JVM exceeds on startup alone.
        "run_cpu_time": budget.runCpuTimeMs,
        "compile_memory_limit": budget.compileMemoryLimitBytes,
        "run_memory_limit": budget.runMemoryLimitBytes,
      };
      payloadBytes += Buffer.byteLength(JSON.stringify(payload), "utf8");

      let data: any;

      // Clamps anything we already know this deployment will not accept, learns
      // a ceiling from a rejection and retries once. Shared with the verification
      // harnesses so they exercise the identical request path.
      try {
        data = await fireOnPiston(executionLanguage, payload as Record<string, unknown>);
        if (data.message && data.message.includes("runtime is unknown")) {
          throw new Error("Piston runtime unknown: " + data.message);
        }
        if (!data.run) {
          throw new Error("Piston invalid output format: " + JSON.stringify(data));
        }
      } catch (apiError) {
        const apiErrMsg = apiError instanceof Error ? apiError.message : String(apiError);
        console.error("Piston execution failed:", apiErrMsg);
        throw new Error(apiErrMsg);
      }

      if (!data) {
        // Defensive: the clamp path above always assigns `data` or throws, so
        // this should be unreachable. Reported rather than swallowed so a
        // regression here is visible instead of silently dropping a test case.
        return {
          index,
          passed: false,
          compileFailed: true,
          runtimeMs: Math.round(performance.now() - startTime),
          memoryKb: 0,
          cpuMs: 0,
          compileMs: 0,
          compileMemoryKb: 0,
          detail: {
            testCaseIndex: trueIndex,
            output: "",
            expectedOutput: currentCase.expectedOutput,
            passed: false,
            runtimeError: "Code execution service unavailable",
            metrics: {
              durationMs: Math.round(performance.now() - startTime),
              memoryKb: 0,
              cpuMs: 0,
              wallMs: 0,
              compileMs: 0,
              compileMemoryKb: 0,
              roundTripMs: Math.round(performance.now() - startTime),
              exitCode: null,
              signal: null,
              sandboxStatus: null,
              sandboxMessage: null,
              outputTruncated: false,
              stdout: "",
              stderr: "",
              compileOutput: "",
            },
          },
        };
      }

      const endTime = performance.now();
      let caseRuntimeMs = Math.round(endTime - startTime);
      let caseMemoryKb = 0;
      let caseCpuMs = 0;
      let caseWallMs = Math.round(endTime - startTime);

      if (data.run) {
        // Piston reports `cpu_time` (ms) and `wall_time` (ms), not `time`
        // (seconds). The old `data.run.time` check therefore never matched,
        // so every submission reported the HTTP round trip as its runtime,
        // network and sandbox startup included. Prefer real CPU time, fall
        // back to wall time, and only then to the round trip.
        const cpuMs = Number(data.run.cpu_time);
        const wallMs = Number(data.run.wall_time);
        if (Number.isFinite(cpuMs) && cpuMs > 0) {
          caseRuntimeMs = Math.round(cpuMs);
          caseCpuMs = Math.round(cpuMs);
        } else if (Number.isFinite(wallMs) && wallMs > 0) {
          caseRuntimeMs = Math.round(wallMs);
          caseWallMs = Math.round(wallMs);
        } else if (typeof data.run.time === "number") {
          caseRuntimeMs = Math.round(data.run.time * 1000);
        } else if (typeof data.run.time === "string") {
          caseRuntimeMs = Math.round(parseFloat(data.run.time) * 1000);
        }

        if (typeof data.run.memory === "number") {
          caseMemoryKb = Math.round(data.run.memory / 1024);
        } else if (typeof data.run.memory === "string") {
          caseMemoryKb = Math.round(parseFloat(data.run.memory) / 1024);
        }

      }
      // Compile stage cost, which dominates every compiled language.
      const caseCompileMs = Math.round(Number(data.compile?.time ?? 0) * 1000);
      const caseCompileMemoryKb = Math.round(Number(data.compile?.memory ?? 0) / 1024);

      // One closure so all three push sites (compile failure, normal, early
      // exit) emit an identical shape and none can drift from the type.
      const buildMetrics = () => ({
        durationMs: caseRuntimeMs,
        memoryKb: caseMemoryKb,
        cpuMs: caseCpuMs,
        wallMs: caseWallMs,
        compileMs: caseCompileMs,
        compileMemoryKb: caseCompileMemoryKb,
        roundTripMs: Math.round(endTime - startTime),
        exitCode: data?.run?.code ?? null,
        signal: data?.run?.signal ?? null,
        sandboxStatus: data?.run?.status ?? null,
        sandboxMessage: data?.run?.message ?? null,
        outputTruncated: Boolean(data?.run?.output && data.run.output.length > 64 * 1024),
        stdout: String(data?.run?.stdout ?? "").substring(0, 64 * 1024),
        stderr: String(data?.run?.stderr ?? "").substring(0, 64 * 1024),
        compileOutput: String(data?.compile?.output ?? "").substring(0, 64 * 1024),
      });

      const MAX_OUTPUT_BYTES = 64*1024;
      let runOutput = data.run?.output || "";
      if(runOutput.length > MAX_OUTPUT_BYTES){
        runOutput = runOutput.substring(0, MAX_OUTPUT_BYTES) + "\n... [OUTPUT TRUNCATED]";
      }
      let compileOutput = (data.compile?.output || "").substring(0, MAX_OUTPUT_BYTES);

      if (data.compile && data.compile.code !== 0) {
        // Returned rather than `break`-ing: the caller decides where the
        // submission stops, so that short-circuiting stays in one place now
        // that cases are dispatched concurrently.
        return {
          index,
          passed: false,
          compileFailed: true,
          runtimeMs: caseRuntimeMs,
          memoryKb: caseMemoryKb,
          cpuMs: caseCpuMs,
          compileMs: caseCompileMs,
          compileMemoryKb: caseCompileMemoryKb,
          detail: {
            testCaseIndex: trueIndex,
            output: "",
            expectedOutput: currentCase.expectedOutput,
            passed: false,
            runtimeError: sanitizeErrorMessage(compileOutput) || "Compilation Error",
            metrics: buildMetrics(),
          },
        };
      }

      const actualOutput = normalize(data.run?.stdout || runOutput);
      const expectedOutput = normalize(currentCase.expectedOutput);

      // Promote the exit-code/stderr computation so `passed` below can use it.
      const processExitCode = data.run?.code ?? data.run?.signal ?? 0;

      // Custom-input runs have no expected output, so never auto-pass them —
      // a clean run (exit code 0) is the best we can assert. This prevents a
      // user from submitting custom input in SUBMIT mode to fake a PASS.
      const isCustomInputRun = userCustomInput.length > 0 && expectedOutput === "";
      const passed = expectedOutput !== ""
        ? actualOutput === expectedOutput
        : processExitCode === 0;

      // NOTE: `totalPassed` is deliberately NOT incremented here. Totals are
      // accumulated by the caller over the cases it keeps, so counting in both
      // places double-counted every pass: a 13-case all-pass submission reported
      // `26/13` and a FAILED status. The per-case suites invoke the wrapper
      // directly and never went through `executeCode`, so only a live
      // end-to-end submission exposed it.
      //
      // Only treat stderr as runtimeError if the process exited with non-zero code
      // (some runtimes write warnings/info to stderr even on success)
      const storeRuntimeError = processExitCode !== 0 && Boolean(data.run?.stderr);

      // A timeout kills the process with SIGKILL and leaves stderr EMPTY, so
      // the check above produced no message at all and the user saw a bare
      // "FAILED" with nothing to act on. Piston does report a reason in
      // `run.message` ("Time limit exceeded", "Out of memory", ...), so
      // surface that whenever stderr gives us nothing to show.
      const sandboxReason =
        data.run?.message ||
        data.run?.status ||
        (data.run?.signal ? `Process terminated by ${data.run.signal}` : "");
      const runtimeErrorText = storeRuntimeError
        ? sanitizeErrorMessage(String(data.run.stderr))
        : sandboxReason
          ? sanitizeErrorMessage(String(sandboxReason))
          : null;

      return {
        index,
        passed,
        compileFailed: false,
        runtimeMs: caseRuntimeMs,
        memoryKb: caseMemoryKb,
        cpuMs: caseCpuMs,
        compileMs: caseCompileMs,
        compileMemoryKb: caseCompileMemoryKb,
        detail: {
          testCaseIndex: trueIndex,
          output: runOutput,
          expectedOutput: currentCase.expectedOutput,
          passed,
          ...problemIdPayload(currentCase),
          runtimeError: runtimeErrorText,
          metrics: buildMetrics(),
        },
      };
    };

    // Run the cases side by side rather than one after another.
    //
    // Each case is a separate Piston invocation, and for compiled languages the
    // invocation is dominated by compilation (~95% of a C++ case). Serially that
    // cost was paid once per case: measured through this API, a 13-case C++
    // submission took 51.4s and Java 31s, which is past the client's request
    // budget — the browser gave up while the server was still working, so users
    // saw a network error for a correct answer.
    //
    // The bound keeps a single submission from opening one sandbox job per case
    // on a Piston shared by every user, and leaves headroom for the rest of the
    // traffic. 4 measured as the sweet spot: enough to hide compile latency
    // behind a handful of concurrent jobs without saturating the sandbox.
    // How many test cases of one submission may run at once, per language.
    //
    // Not a single global number, because the languages are not equally
    // expensive to run concurrently. JavaScript, Python and C are cheap and
    // overlap well. The JVM is not: a single trivial Two Sum case through the
    // reflection driver measured 2930ms wall but 8274ms CPU — it burns roughly
    // 2.8 cores during startup, JIT and GC. Running four of those at once made
    // them contend, CPU time ballooned past `run_cpu_time`, cases were killed,
    // and a 13-case submission FAILED at 3/13 in 36.6s — worse than the serial
    // 31s it replaced. Measured, not assumed.
    //
    // The aim is to keep the aggregate CPU demand of concurrent JVMs under the
    // per-process ceiling, so the limit is deliberately conservative.
    const CASE_CONCURRENCY: Record<SupportedLanguage, number> = {
      javascript: 4,
      python: 4,
      c: 4,
      cpp: 4,
      java: 2,
    };

    const CONCURRENCY = CASE_CONCURRENCY[executionLanguage] ?? 4;

    // One invocation for every case when the language's driver can read the
    // batched framing; otherwise the proven per-case path. `runBatched` returns
    // null on anything it cannot account for, so a batch that would misreport is
    // simply re-run the old way.
    let outcomes = await runBatched();
    if (outcomes) {
      console.log(
        `[execute] ${executionLanguage}: ${casesToRun.length} cases in ONE sandbox invocation`,
      );
    } else {
      outcomes = await mapWithConcurrency(casesToRun, CONCURRENCY, runOneCase);
    }

    // Re-apply the original short-circuit now that every case has run.
    //
    // The serial loop stopped at the first failing case in SUBMIT mode and at
    // the first compile error in both modes, so the totals and the results array
    // only ever covered the cases up to that point. Reproducing that here keeps
    // the response byte-identical to the serial version — important because 893
    // existing problem-bank assertions and 50 wrapper-shape assertions depend on
    // it — while still getting the wall-clock benefit of running concurrently.
    //
    // `mapWithConcurrency` preserves index order, so the first stopping index is
    // simply the first one in the array.
    let keptThrough = outcomes.length;
    for (const [position, outcome] of outcomes.entries()) {
      const shouldStop = outcome.compileFailed ||
        (executionMode === "SUBMIT" && !outcome.passed);
      if (shouldStop) {
        keptThrough = position + 1;
        break;
      }
    }

    for (const outcome of outcomes.slice(0, keptThrough)) {
      results.push(outcome.detail);
      if (outcome.passed) totalPassed++;
      totalRuntimeMs += outcome.runtimeMs;
      if (outcome.memoryKb > 0) totalMemoryKb += outcome.memoryKb;
      if (outcome.runtimeMs > maxRuntimeMs) maxRuntimeMs = outcome.runtimeMs;
      if (outcome.memoryKb > maxMemoryKb) maxMemoryKb = outcome.memoryKb;
      totalCpuMs += outcome.cpuMs;
      if (outcome.compileMs > 0) totalCompileMs += outcome.compileMs;
      if (outcome.compileMemoryKb > maxCompileMemoryKb) maxCompileMemoryKb = outcome.compileMemoryKb;
      runCount++;
    }

    // If cases ran past the stopping point, say so rather than leaving the
    // submission looking like it was never continued.
    const discardedCases = outcomes.length - keptThrough;

    const avgRuntimeMs = runCount > 0 ? Math.round(totalRuntimeMs / runCount) : 0;
    const avgMemoryKb = runCount > 0 ? Math.round(totalMemoryKb / runCount) : 0;

    // ═══════════════════════════════════════════════════════════
    //  1v1 SUBMISSION VERIFICATION & RESOLUTION
    // ═══════════════════════════════════════════════════════════

    let userPerfId = typeof req.body.performanceId === "string" ? req.body.performanceId.trim() : "";
    const requestedRoomId = typeof req.body.roomId === "string" ? req.body.roomId.trim() : "";
    
    let userId = (req as any).userId;
    if(!userId && req.cookies?.token){
      try {
        const decoded = verifyToken(req.cookies.token) as { userId?: string } | null;
        userId = decoded?.userId;
      } catch (error) {
        console.error("Failed to verify token:", error);
      }
    }
    if (!userPerfId && requestedRoomId && userId) {
      const cleanEventId = requestedRoomId.startsWith("room-")
        ? requestedRoomId.replace("room-", "")
        : requestedRoomId;

       const targetEvent = await prisma.event.findFirst({
        where: {
          OR: [{ id: cleanEventId }, { roomCode: requestedRoomId }],
        },
        select: { id: true },
      });

      if (!targetEvent) {
        return res.status(404).json({ error: "Room not found" });
      }

      const roomPerf = await prisma.userPersonalPerformance.findFirst({
        where: { userId , eventId:targetEvent.id },
        orderBy: { createdAt: "desc" }
      });
      if (roomPerf) {
        userPerfId = roomPerf.id;
      } else{
        const createdPerf = await prisma.userPersonalPerformance.create({
          data: {
            userId,
            eventId: targetEvent.id,
            status:"PENDING",
          },
        });
        userPerfId = createdPerf.id;
      }
    }

     if (!userPerfId && userId) {
      const activePerf = await prisma.userPersonalPerformance.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (activePerf) {
        userPerfId = activePerf.id;
      }
    }
    
    if (executionMode === "SUBMIT" && userPerfId) {
      const problemId = casesToRun[0]?.problemId || githubOid;
      if (problemId) {
        // Record how long (ms) the user took from the battle start until this
        // successful submission. Falls back to the performance's createdAt when
        // the event has no startedAt (e.g. old events / custom rooms).
        let timeTakenMs: number | undefined;
        if (totalPassed === casesToRun.length && userPerfId) {
          try {
            const perfWithEvent = await prisma.userPersonalPerformance.findUnique({
              where: { id: userPerfId },
              select: {
                createdAt: true,
                event: { select: { startedAt: true } }
              }
            });
            const startedAt = perfWithEvent?.event?.startedAt || perfWithEvent?.createdAt;
            if (startedAt) {
              timeTakenMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
            }
          } catch (error) {
            console.error("Failed to compute timeTakenMs:", error);
          }
        }

        await saveSubmisssion({
          performanceId: userPerfId,
          problemId,
          submittedCode: sourceCode,
          language: executionLanguage,
          status: totalPassed === casesToRun.length ? "PASSED" : "FAILED",
          runtimeMs: avgRuntimeMs,
          memoryKb: avgMemoryKb,
          passedCase: totalPassed,
          totalCases: casesToRun.length,
          timeTakenMs,
        }).catch(e => console.error("Failed to save submission:", e));
      }
    }

    // --- PRACTICE MODE: upsert UserProblemProgress for solo submissions ---
    if (executionMode === "SUBMIT" && userId && githubOid && !githubOid.startsWith("local-")) {
      try {
        const practiceTargetProblem = await prisma.problem.findFirst({
          where: { OR: [{ github_oid: githubOid }, { id: githubOid }] },
          select: { id: true }
        });

        if (practiceTargetProblem) {
          const allPassed = totalPassed === casesToRun.length && casesToRun.length > 0;
          // Always record an activity tick so streak/monthly heatmaps count every
          // solo SUBMIT — `timeTaken` (timer string) is client-optional, so fall
          // back to an ISO timestamp that sorts with existing entries.
          const activityTick = typeof timeTaken === "string" && timeTaken.length > 0
            ? timeTaken
            : new Date().toISOString();
          const { invalidateUserAnalyticsCache } = await import("../controllers/analytics.js");
          await prisma.userProblemProgress.upsert({
            where: { userId_problemId: { userId, problemId: practiceTargetProblem.id } },
            create: {
              userId,
              problemId: practiceTargetProblem.id,
              isSolved: allPassed,
              solvedAt: allPassed ? new Date() : null,
              attempts: 1,
              lastCode: sourceCode,
              lastLanguage: executionLanguage,
              submissionTimes: [activityTick],
            },
            update: {
              isSolved: allPassed ? true : undefined, // never go back to unsolved
              solvedAt: allPassed ? new Date() : undefined,
              attempts: { increment: 1 },
              lastCode: sourceCode,
              lastLanguage: executionLanguage,
              submissionTimes: { push: activityTick },
            }
          });
          invalidateUserAnalyticsCache(userId);
          // The practice path never went through invalidateUserProblemsCache,
          // so the 10-minute problems cache kept serving the PRE-submit payload:
          // the DB row said solved, yet the list still reported isSolved=false and
          // attempts=0 for up to 10 minutes. Every other progress write path
          // (submissionEvaluator, profile) already does this.
          const { invalidateUserProblemsCache } = await import("../controllers/problems.js");
          invalidateUserProblemsCache(userId);
        }
      } catch (e) {
        console.error("Failed to upsert UserProblemProgress:", e);
      }
    }

    return res.json({
      mode: executionMode,
      totalCases: casesToRun.length,
      passedCases: totalPassed,
      status: totalPassed === casesToRun.length ? "PASSED" : "FAILED",
      problemId: casesToRun[0]?.problemId || "",
      // Retained at the top level: analytics, leaderboards and history all read
      // these two, so they must keep their original meaning (per-case average).
      runtimeMs: avgRuntimeMs,
      memoryKb: avgMemoryKb,
      language: executionLanguage,
      // Full resource picture for the whole submission. `runtimeMs`/`memoryKb`
      // above are averages and are NOT enough on their own: a submission that
      // is fast on average can still peak badly on one case, and compile cost
      // is invisible in the per-case averages.
      metrics: {
        casesExecuted: runCount,
        avgRuntimeMs,
        maxRuntimeMs,
        totalRuntimeMs,
        avgMemoryKb,
        maxMemoryKb,
        totalMemoryKb,
        avgCpuMs: runCount > 0 ? Math.round(totalCpuMs / runCount) : 0,
        totalCpuMs,
        totalCompileMs,
        maxCompileMemoryKb,
        // End-to-end for the whole request, including every sandbox round trip.
        wallMs: Math.round(performance.now() - submissionStart),
        requestPayloadBytes: payloadBytes,
        codeBytes: Buffer.byteLength(finalCode, "utf8"),
        // Cases that ran concurrently but are not reported, because the
        // submission short-circuited at an earlier one. Non-zero only after a
        // failure; 0 for a clean pass.
        casesSkippedAfterStop: discardedCases,
      },
      // The limits actually requested, so a user hitting a ceiling can see it.
      budget: {
        language: executionLanguage,
        compileTimeoutMs: budget.compileTimeoutMs,
        runTimeoutMs: budget.runTimeoutMs,
        runCpuTimeMs: budget.runCpuTimeMs,
        runMemoryLimitBytes: budget.runMemoryLimitBytes,
        compileMemoryLimitBytes: budget.compileMemoryLimitBytes,
      },
      details: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution failure";
    console.error("System Core Fault:", error);
    return res.status(500).json({ error: "System execution failure", details: message });
  }
};
