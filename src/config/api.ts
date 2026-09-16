import axios from "axios"
import type { QueryClient } from "@tanstack/react-query";

const rawUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
export const backendURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

export const api = axios.create({
    baseURL: backendURL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

/**
 * Instant auth invalidation (point 40/52): if the server revokes the session
 * (suspension, token rotation), the 15-minute auth-me staleTime must not keep
 * the UI acting authenticated. Any 401 flips the cache to logged-out at once.
 *
 * Guarded to run once (Root StrictMode double-mounts) and skips the signin /
 * google endpoints themselves — a failed login attempt is not a logout.
 */
let authInvalidationWired = false;

export function wireAuthInvalidation(queryClient: QueryClient): void {
    if (authInvalidationWired) return;
    authInvalidationWired = true;
    api.interceptors.response.use(
        (res) => res,
        (err) => {
            const url: string = err?.config?.url ?? "";
            const isAuthEndpoint =
                url.includes("/auth/signin") || url.includes("/auth/google");
            if (err?.response?.status === 401 && !isAuthEndpoint) {
                queryClient.setQueryData(["auth-me"], null);
            }
            return Promise.reject(err);
        }
    );
}