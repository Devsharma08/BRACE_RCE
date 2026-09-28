import axios from "axios"
import type { QueryClient } from "@tanstack/react-query";

const rawUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
// Use /api/v1 for new versioned API, fallback to /api for legacy
export const backendURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

export const api = axios.create({
    baseURL: backendURL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from server on app initialization
 */
export async function fetchCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;
    try {
        // Try v1 endpoint first, fallback to legacy
        const urls = [`${backendURL.replace(/\/api$/, '')}/api/v1/csrf-token`, `${backendURL}/csrf-token`];
        for (const url of urls) {
            try {
                const res = await axios.get(url, { withCredentials: true });
                csrfToken = res.data?.csrfToken;
                if (csrfToken) break;
            } catch {
                // Try next URL
            }
        }
        return csrfToken || '';
    } catch {
        return '';
    }
}

/**
 * Get current CSRF token
 */
export function getCsrfToken(): string | null {
    return csrfToken;
}

/**
 * Set CSRF token (e.g., after fetching)
 */
export function setCsrfToken(token: string): void {
    csrfToken = token;
}

/**
 * Clear CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
    csrfToken = null;
}

// Add CSRF token to mutating requests
api.interceptors.request.use((config) => {
    const method = config.method?.toUpperCase();
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (method && mutatingMethods.includes(method) && csrfToken) {
        (config.headers as any).set('x-csrf-token', csrfToken);
    }
    return config;
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