import type { FileEntry } from "../../context/fileNamesContext";
import type { ExecuteCodeRequest, ExecutionResult, FileContentResponse } from "./types";

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "")}/api`;

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.error ?? record.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
};

const readJson = async <T>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

export const fetchFileNames = async () => {
  const response = await fetch(`${API_BASE_URL}/github/filenames`);

  if (!response.ok) {
    throw new Error("Failed to load file names");
  }

  return readJson<FileEntry[]>(response);
};

export const fetchFileContent = async (oid: string, name?: string) => {
  const url = `${API_BASE_URL}/github/filecontent?oid=${encodeURIComponent(oid)}` + 
              (name ? `&name=${encodeURIComponent(name)}` : "") + 
              `&_cb=${Date.now()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to load file content");
  }

  return readJson<FileContentResponse>(response);
};

export const executeCode = async (request: ExecuteCodeRequest) => {
  const response = await fetch(`${API_BASE_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(getErrorMessage(errorPayload, "Failed to execute code"));
  }

  return readJson<ExecutionResult>(response);
};
