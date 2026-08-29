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

// Fetch all system problems (with solved status, code_snippets, test_cases)
export const fetchSystemProblems = async (signal?: AbortSignal) => {
  const response = await fetch(`${API_BASE_URL}/problems/system`, { signal, credentials: "include" });
  if (!response.ok) throw new Error("Failed to load problems");
  const data = await readJson<{ status: string; problems: any[] }>(response);
  return data.problems;
};

// Fetch a single problem by ID or github_oid
export const fetchProblemById = async (id: string, signal?: AbortSignal) => {
  const response = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}`, { signal, credentials: "include" });
  if (!response.ok) throw new Error("Failed to load problem");
  const data = await readJson<{ status: string; problem: any }>(response);
  return data.problem;
};

export const executeCode = async (request: ExecuteCodeRequest) => {
  const response = await fetch(`${API_BASE_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(getErrorMessage(errorPayload, "Failed to execute code"));
  }

  return readJson<ExecutionResult>(response);
};
