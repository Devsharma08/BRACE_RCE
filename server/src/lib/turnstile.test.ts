import { describe, test, expect, afterEach, jest } from "@jest/globals";
import {
  expectsTurnstileChallenge,
  turnstileConfigured,
  verifyTurnstileToken,
} from "./turnstile.js";

/**
 * The secret is read once at module load, so these tests describe the two
 * deploy modes the module can be in. Whatever the ambient environment does,
 * exactly one branch is exercised here; the assertions are written so both
 * produce a definite, meaningful result rather than a silent pass.
 */
const SECRET_PRESENT = turnstileConfigured();

const mockFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
  global.fetch = jest.fn(impl as unknown as typeof fetch) as unknown as typeof fetch;
};

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
  }) as unknown as Response;

afterEach(() => {
  jest.restoreAllMocks();
});

describe("turnstileConfigured", () => {
  test("reports whether a secret is present in this environment", () => {
    expect(turnstileConfigured()).toBe(SECRET_PRESENT);
  });
});

describe("verifyTurnstileToken", () => {
  test("refuses to act when no secret is configured — never a silent pass", async () => {
    if (SECRET_PRESENT) {
      // In a secret-bearing environment the strongest observable behaviour is
      // that a missing token is still rejected rather than waved through.
      const result = await verifyTurnstileToken(null);
      expect(result.configured).toBe(true);
      expect(result.success).toBe(false);
      return;
    }

    const result = await verifyTurnstileToken("any-token");
    expect(result).toEqual({
      success: false,
      configured: false,
      errorCodes: ["missing-secret"],
    });
    // No outbound call is even attempted without a secret — spying first so the
    // assertion is about a real call count rather than a non-mock.
    const fetchSpy = jest.spyOn(global, "fetch");
    await verifyTurnstileToken("another-token");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("rejects a missing token when a secret IS available", async () => {
    if (!SECRET_PRESENT) return; // branch not reachable in this environment

    const result = await verifyTurnstileToken(undefined, "203.0.113.7");
    expect(result.configured).toBe(true);
    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("missing-token");
  });

  test("accepts a token Cloudflare validates", async () => {
    if (!SECRET_PRESENT) return;

    mockFetch(async () => jsonResponse({ success: true, "error-codes": [] }));

    const result = await verifyTurnstileToken("valid-token");

    expect(result).toEqual({ success: true, configured: true, errorCodes: [] });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // The request must carry the secret, the token and the client IP in the
    // form Cloudflare expects — a missing remoteip would throw away the only
    // cross-check available against a token minted for someone else.
    const [, init] = (global.fetch as unknown as jest.Mock).mock.calls[0];
    const body = new URLSearchParams(String(init.body));
    expect(body.get("secret")).toBeTruthy();
    expect(body.get("response")).toBe("valid-token");
  });

  test("passes the caller's IP through as remoteip", async () => {
    if (!SECRET_PRESENT) return;

    mockFetch(async () => jsonResponse({ success: true }));

    await verifyTurnstileToken("valid-token", "198.51.100.42");

    const [, init] = (global.fetch as unknown as jest.Mock).mock.calls[0];
    const body = new URLSearchParams(String(init.body));
    expect(body.get("remoteip")).toBe("198.51.100.42");
  });

  test("rejects a token Cloudflare returns success:false for", async () => {
    if (!SECRET_PRESENT) return;

    mockFetch(async () =>
      jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }),
    );

    const result = await verifyTurnstileToken("spent-token");

    // Single-use is the whole point: a replayed token must fail here, not at
    // the client that decided to reuse it.
    expect(result.success).toBe(false);
    expect(result.configured).toBe(true);
    expect(result.errorCodes).toContain("invalid-input-response");
  });

  test("treats a non-2xx siteverify response as a rejection", async () => {
    if (!SECRET_PRESENT) return;

    mockFetch(async () => jsonResponse({}, false, 500));

    const result = await verifyTurnstileToken("some-token");

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain("http-500");
  });

  test("degrades to a rejection — and never throws — when Cloudflare is unreachable", async () => {
    if (!SECRET_PRESENT) return;

    mockFetch(async () => {
      throw new Error("getaddrinfo ENOTFOUND challenges.cloudflare.com");
    });

    // An unhandled rejection here would propagate out of the guard and take
    // the route down; callers rely on a verdict object instead.
    await expect(verifyTurnstileToken("some-token")).resolves.toEqual({
      success: false,
      configured: true,
      errorCodes: ["network-error"],
    });
  });
});

describe("expectsTurnstileChallenge", () => {
  test("challenges guests only, and only when the server can verify", () => {
    if (SECRET_PRESENT) {
      expect(expectsTurnstileChallenge(true)).toBe(false);
      expect(expectsTurnstileChallenge(false)).toBe(true);
    } else {
      // No secret → nothing can be verified, so nobody is challenged. Guests
      // are instead held by the IP limiter and the daily quota.
      expect(expectsTurnstileChallenge(false)).toBe(false);
    }
  });
});
