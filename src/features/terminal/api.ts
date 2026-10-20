import type { ExecuteCodeRequest, ExecutionResult } from "./types";
import { api } from "../../config/api";

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

export interface AsyncGradingStatus {
  status: "queued" | "running" | "completed" | "failed";
  result?: AsyncGradingResult;
  error?: string;
}

/**
 * Submit a code submission for async grading via BullMQ queue.
 * Returns immediately with a jobId to poll for results.
 * Used for SUBMIT mode where the user can wait for results.
 */
export const submitForAsyncGrading = async (request: {
  code: string;
  language: string;
  oid: string;
}): Promise<{ status: string; jobId: string; totalCases: number }> => {
  const res = await api.post("/execute/grade", request, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  return res.data;
};

/**
 * Poll for async grading results.
 * Returns the current status: queued, running, completed, or failed.
 */
export const pollGradingStatus = async (jobId: string): Promise<AsyncGradingStatus> => {
  const res = await api.get(`/execute/grade/${jobId}`);
  const data = res.data;
  if (data.status === "completed" && data.result) {
    return { status: "completed", result: data.result };
  }
  if (data.status === "failed") {
    return { status: "failed", error: data.error };
  }
  return { status: data.status === "queued" || data.status === "running" ? "running" : data.status };
};

/**
 * Poll for async grading results with exponential backoff.
 * Resolves when grading is complete or after maxAttempts.
 */
export const waitForGradingResult = async (
  jobId: string,
  maxAttempts = 30,
  baseDelayMs = 1000
): Promise<AsyncGradingStatus> => {
  let attempt = 0;
  while (attempt < maxAttempts) {
    const status = await pollGradingStatus(jobId);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    const delay = baseDelayMs * Math.pow(1.5, attempt);
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10000)));
    attempt++;
  }
  return { status: "running" };
};

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.error ?? record.message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

// In-flight request deduplication cache
// Key: `${oid}|${mode}|${codeHash}`
const inFlightRequests = new Map<string, AbortController>();

// Simple hash for code comparison
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function getRequestKey(request: ExecuteCodeRequest): string {
  return `${request.oid}|${request.mode}|${hashCode(request.code)}`;
}

// Fetch all system problems (with solved status, code_snippets, test_cases).
// The list endpoint is paginated (default limit 25) — page through until the
// server returns fewer rows than requested so the terminal sidebar always sees
// the full catalog, not just the first page.
//
// Goes through the shared axios client (not raw fetch) so the resolved API
// version is used: backendURL points at /api/v1, while a hand-rolled fetch to
// /api/problems/* hits the legacy mount. Same controller today, but one
// consistent path avoids "works signed in, breaks in incognito" drift.
export const fetchSystemProblems = async (
  signal?: AbortSignal,
  pageSize = 100,
) => {
  const all: any[] = [];
  let page = 1;
  for (;;) {
    const res = await api.get("/problems/system", {
      params: { page, limit: pageSize },
      signal,
    });
    const batch = Array.isArray(res.data?.problems) ? res.data.problems : [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }
  return all;
};

// Fetch a single problem by ID or github_oid
export const fetchProblemById = async (id: string, signal?: AbortSignal) => {
  const res = await api.get(`/problems/${encodeURIComponent(id)}`, { signal });
  return res.data?.problem;
};

export const executeCode = async (request: ExecuteCodeRequest): Promise<ExecutionResult> => {
  const key = getRequestKey(request);

  // Abort previous request for same problem+mode+code
  const existingController = inFlightRequests.get(key);
  if (existingController) {
    existingController.abort();
  }

  // Create new controller with timeout
  const controller = new AbortController();
  inFlightRequests.set(key, controller);

  // Ceiling for the whole request, including compilation.
  //
  // This used to be 30s, which was shorter than a single compiled-language
  // submission can legitimately take: measured end to end through this API, a
  // 13-case C++ submission needs ~16s and Java ~9s now that cases run
  // concurrently (51s and 31s when they ran one at a time). Under the old
  // serial loop C++ and Java were aborted by the browser *after* the server had
  // already computed the correct answer, so users saw a network error for
  // solutions that were right.
  //
  // Compilation is a large part of this: the sandbox budget allows up to 15s for
  // g++/javac alone, plus queueing behind other users' submissions on a shared
  // Piston. 120s leaves headroom without letting a runaway request pin a
  // connection indefinitely.
  const EXECUTE_REQUEST_TIMEOUT_MS = 120000;

  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
    inFlightRequests.delete(key);
  }, EXECUTE_REQUEST_TIMEOUT_MS);

  // Goes through the shared axios client so guests ride the SAME versioned
  // path (/api/v1) as every other page — the raw-fetch /api/execute legacy
  // mount is what 404'd incognito visits while signed-in runs kept working.
  // axios rejects non-2xx natively, and its `signal` replaces the manual
  // response.ok check below.
  try {
    const res = await api.post<ExecutionResult>("/execute", request, {
      headers: {
        // Custom marker enforced by the server's /execute UI-only guard
        // whenever the browser sends an Origin header (executionGuard.ts).
        // A cross-origin page cannot set a custom header without a preflight
        // the origin allow-list would reject.
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: controller.signal,
    });

    return res.data;
  } catch (error) {
    // Distinguish our own timeout from the "superseded by a newer submission"
    // abort, which is a normal user action and must keep its existing behaviour.
    if (timedOut) {
      throw new Error(
        "Execution took longer than " +
          Math.round(EXECUTE_REQUEST_TIMEOUT_MS / 1000) +
          "s and was stopped. Compiled languages are slower to run and to " +
          "compile — try again, or switch to a lighter language.",
      );
    }
    // axios wraps non-2xx in an error with `response.data` — surface the
    // server's message (bot-check / quota / validation) instead of "Request
    // failed with status code N".
    if (error && typeof error === "object" && "response" in error) {
      const payload = (error as { response?: unknown }).response;
      const data = (payload && typeof payload === "object" && "data" in payload)
        ? (payload as { data?: unknown }).data
        : undefined;
      throw new Error(getErrorMessage(data, "Failed to execute code"));
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    inFlightRequests.delete(key);
  }
};