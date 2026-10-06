import type { ExecuteCodeRequest, ExecutionResult } from "./types";

const rawUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const API_BASE_URL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.error ?? record.message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

const readJson = async <T>(response: Response): Promise<T> => {
  return (await response.json()) as T;
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
export const fetchSystemProblems = async (
  signal?: AbortSignal,
  pageSize = 100,
) => {
  const all: any[] = [];
  let page = 1;
  for (;;) {
    const response = await fetch(
      `${API_BASE_URL}/problems/system?page=${page}&limit=${pageSize}`,
      { signal, credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to load problems");
    const data = await readJson<{ status: string; problems: any[] }>(response);
    const batch = Array.isArray(data.problems) ? data.problems : [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }
  return all;
};

// Fetch a single problem by ID or github_oid
export const fetchProblemById = async (id: string, signal?: AbortSignal) => {
  const response = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}`, { signal, credentials: "include" });
  if (!response.ok) throw new Error("Failed to load problem");
  const data = await readJson<{ status: string; problem: any }>(response);
  return data.problem;
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

  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Custom marker enforced by the server's /execute UI-only guard
        // whenever the browser sends an Origin header (executionGuard.ts).
        // A cross-origin page cannot set a custom header without a preflight
        // the origin allow-list would reject.
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "include",
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(getErrorMessage(errorPayload, "Failed to execute code"));
    }

    return await readJson<ExecutionResult>(response);
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
    throw error;
  } finally {
    clearTimeout(timeoutId);
    inFlightRequests.delete(key);
  }
};