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

  // Auto-cleanup after 30s timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
    inFlightRequests.delete(key);
  }, 30000);

  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(getErrorMessage(errorPayload, "Failed to execute code"));
    }

    return await readJson<ExecutionResult>(response);
  } finally {
    clearTimeout(timeoutId);
    inFlightRequests.delete(key);
  }
};