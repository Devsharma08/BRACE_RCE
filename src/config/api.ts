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
 * Retries up to 3 times with exponential backoff
 */
export async function fetchCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;
    
    const maxRetries = 3;
    const baseDelay = 500; // ms
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Try v1 endpoint first, fallback to legacy
            const urls = [`${backendURL.replace(/\/api$/, '')}/api/v1/csrf-token`, `${backendURL}/csrf-token`];
            for (const url of urls) {
                try {
                    const res = await axios.get(url, { withCredentials: true });
                    csrfToken = res.data?.csrfToken;
                    if (csrfToken) return csrfToken;
                } catch {
                    // Try next URL
                }
            }
            if (csrfToken) break;
        } catch {
            // Continue to retry
        }
        
        // Exponential backoff before retry
        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
        }
    }
    
    return csrfToken || '';
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

/**
 * Read the CSRF token straight from the `csrf_token` cookie.
 *
 * The server sets that cookie with `httpOnly:false` precisely so the SPA can
 * echo it back in the `x-csrf-token` header (double-submit pattern). We prefer
 * the LIVE cookie value over the module-cached token returned by
 * fetchCsrfToken(): on a cold first load several API GETs race, and every one
 * that arrives without a cookie mints its own token and overwrites the cookie
 * via Set-Cookie. The browser keeps whichever Set-Cookie lands last, which can
 * differ from the body token fetchCsrfToken() cached — and that mismatch is
 * exactly what the server rejects with 403 "Invalid CSRF token" on the first
 * POST (e.g. starting a 1v1 battle by cloning a template). Reading the cookie
 * at request time guarantees header === cookie, so the double-submit check
 * always passes regardless of request ordering.
 */
function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Add CSRF token to mutating requests
api.interceptors.request.use((config) => {
    const method = config.method?.toUpperCase();
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (method && mutatingMethods.includes(method)) {
        // Prefer the live cookie (source of truth); fall back to the token
        // fetchCsrfToken() cached so a POST still works if the cookie was
        // cleared but a token was fetched earlier in the session.
        const token = readCsrfCookie() || csrfToken;
        if (token) {
            (config.headers as any).set('x-csrf-token', token);
        }
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