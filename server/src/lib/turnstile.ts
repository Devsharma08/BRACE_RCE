/**
 * Cloudflare Turnstile server-side verification.
 *
 * The browser-side widget is the visible half of the check; this is the half
 * that actually decides anything. A token is only proof once it has been
 * exchanged for a verdict against Cloudflare's siteverify endpoint — a client
 * that never ran the widget can still POST a well-formed token, and only this
 * call tells the two apart.
 *
 * Configuration: TURNSTILE_SECRET_KEY (server-only secret, never the site key
 * that ships in the browser bundle). With no secret configured every call
 * returns `configured: false`, which callers treat as an explicit policy
 * decision rather than silently passing — see `expectsTurnstileChallenge`.
 *
 * Deliberately NOT cached and NOT retried: tokens are single-use and expire in
 * ~5 minutes, so a cache would only serve verdicts for tokens the client has
 * already spent.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Keep the outbound call short — it sits in front of a sandbox run. */
const VERIFY_TIMEOUT_MS = 10_000;

export const TURNSTILE_SECRET_KEY = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();

/** True when this deployment owns a secret and can therefore verify tokens. */
export const turnstileConfigured = (): boolean => TURNSTILE_SECRET_KEY.length > 0;

export interface TurnstileResult {
  /** Cloudflare accepted the token. */
  success: boolean;
  /**
   * False when no secret is configured — the caller has no verdict to act on
   * and must choose a policy. Never treat this as `success`.
   */
  configured: boolean;
  /** Cloudflare's machine-readable reasons, for logs only. */
  errorCodes: string[];
}

/**
 * Verify one token.
 *
 * Never throws: an unreachable Cloudflare (DNS, network, 5xx) is a
 * `success: false` with `error-codes` filled in, so a network blip degrades to
 * a rejected run instead of an unhandled rejection that takes the route down.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  if (!turnstileConfigured()) {
    return { success: false, configured: false, errorCodes: ["missing-secret"] };
  }
  if (!token) {
    return { success: false, configured: true, errorCodes: ["missing-token"] };
  }

  const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
  // Optional, but Cloudflare uses it to flag tokens minted for a different
  // visitor — free extra signal when the proxy forwards a real client IP.
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      return { success: false, configured: true, errorCodes: [`http-${response.status}`] };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    return {
      success: payload.success === true,
      configured: true,
      errorCodes: Array.isArray(payload["error-codes"]) ? payload["error-codes"] : [],
    };
  } catch (err) {
    // AbortError (timeout) and fetch failures both land here.
    const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : "network-error";
    return { success: false, configured: true, errorCodes: [reason] };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Policy helper: should this request have carried a bot-check token?
 *
 * Guests do. Authenticated callers already prove identity on every request
 * with the session cookie that `executionGuard` verifies server-side, so
 * challenging them would add friction without adding signal.
 */
export function expectsTurnstileChallenge(isAuthenticated: boolean): boolean {
  return !isAuthenticated && turnstileConfigured();
}
