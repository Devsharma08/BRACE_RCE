import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { getAllowedOrigins } from "../lib/origins.js";

/**
 * UI-only guard for POST /execute — headers verification + persisted daily
 * quota + append-only audit log. Two jobs, layered:
 *
 * 1. BROWSER REQUEST VERIFICATION (headers only — no challenge, no secret):
 *    - `Origin` present → must be on the ALLOWED_ORIGINS allow-list or point
 *      at this API's own host (same-origin deployments). A forged cross-site
 *      POST from an attacker page dies here with a 403 before any work runs.
 *    - `Origin` present → must also carry
 *      `X-Requested-With: XMLHttpRequest`, the app's custom marker (set by
 *      src/features/terminal/api.ts). Custom headers cannot ride a
 *      cross-origin request without a preflight the allow-list rejects.
 *    - `Sec-Fetch-Site: cross-site` with no allow-listed Origin → reject
 *      (fetch-metadata belt-and-braces for browsers that drop Origin).
 *    - Neither header (curl, CI smoke scripts, Postman) → allowed through:
 *      non-browser clients are still held by the in-memory burst limiter and
 *      the daily quota below.
 *
 * 2. DAILY QUOTA + AUDIT (ExecutionQuota / ExecutionLog):
 *    - Key = sha256("u:<userId>") when the auth cookie verifies, else
 *      sha256("ip:<client ip>") — raw identifiers never reach the database.
 *    - EXEC_DAILY_QUOTA (default 600) per UTC day; exceeding → 429.
 *    - One ExecutionLog row per request, written fire-and-forget on response
 *      finish; audit failures never fail a run.
 *    - Quota bookkeeping FAILS OPEN: if the tables are missing or the DB
 *      hiccups, execution proceeds — a deploy that ships code before
 *      `prisma db push` must not take /execute down.
 */

/** Value our own clients set for X-Requested-With. */
const APP_XHR_VALUE = "XMLHttpRequest";
/** Cap stored origin strings so a hostile header can't bloat the log. */
const MAX_ORIGIN_LEN = 256;

const dailyQuotaLimit = (): number => {
  const raw = Number(process.env.EXEC_DAILY_QUOTA);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 600;
};

const headerValue = (req: Request, name: string): string | undefined => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

const sha256 = (input: string): string => createHash("sha256").update(input).digest("hex");

/** Allow-list check: configured origins, else the API's own host. */
const originAllowed = (origin: string, req: Request): boolean => {
  if (getAllowedOrigins().includes(origin)) return true;
  try {
    const host = headerValue(req, "host");
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
};

/** Identify the requester: authenticated user when the cookie verifies, else IP. */
const resolveRequester = (req: Request): { rawKey: string; userId: string | null } => {
  let userId = (req as { userId?: string }).userId ?? null;
  if (!userId && req.cookies?.token) {
    try {
      const decoded = verifyToken(req.cookies.token) as { userId?: string } | null;
      if (decoded?.userId) userId = decoded.userId;
    } catch {
      // Invalid/expired token → fall back to IP keying below.
    }
  }
  if (userId) return { rawKey: `u:${userId}`, userId };
  return { rawKey: `ip:${req.ip ?? req.socket?.remoteAddress ?? "unknown"}`, userId: null };
};

const secondsUntilUtcMidnight = (): number => {
  const now = new Date();
  const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.round((nextUtcMidnight - now.getTime()) / 1000));
};

export function executionGuard() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // ── 1. Browser request verification (headers only) ─────────────────────
    const origin = headerValue(req, "origin");
    const secFetchSite = headerValue(req, "sec-fetch-site");
    const requestedWith = headerValue(req, "x-requested-with");

    if (origin) {
      if (!originAllowed(origin, req)) {
        return res.status(403).json({
          status: "error",
          message: "Origin not allowed for code execution.",
        });
      }
      if (requestedWith !== APP_XHR_VALUE) {
        return res.status(403).json({
          status: "error",
          message: "Missing X-Requested-With header. Reload the page and try again.",
        });
      }
    } else if (secFetchSite === "cross-site") {
      // Fetch metadata without an Origin to vouch for it: a browser is making
      // a cross-site call — never legitimate for execution.
      return res.status(403).json({
        status: "error",
        message: "Cross-site execution requests are not allowed.",
      });
    }

    // ── 2. Daily quota (persisted; fails open) ──────────────────────────────
    const { rawKey, userId } = resolveRequester(req);
    const keyHash = sha256(rawKey);
    const date = new Date().toISOString().slice(0, 10);
    const limit = dailyQuotaLimit();

    try {
      const row = await prisma.executionQuota.upsert({
        where: { keyHash_date: { keyHash, date } },
        create: { keyHash, date, count: 1 },
        update: { count: { increment: 1 } },
        select: { count: true },
      });
      if (row.count > limit) {
        return res.status(429).json({
          status: "error",
          message: `Daily execution quota exceeded (${limit}/day). Resets at 00:00 UTC.`,
          retryAfterSeconds: secondsUntilUtcMidnight(),
        });
      }
    } catch (err) {
      // Fail open: quota is an abuse brake, not a correctness gate. A missing
      // table (code deployed before `db push`) or a transient DB error must
      // not break execution.
      console.warn(
        "[executionGuard] quota check unavailable, allowing request:",
        err instanceof Error ? err.message : err,
      );
    }

    // ── 3. Audit log on response finish (fire-and-forget) ───────────────────
    const startedAt = Date.now();
    const originForLog = origin ? origin.slice(0, MAX_ORIGIN_LEN) : null;
    const mode = req.body?.mode === "SUBMIT" ? "SUBMIT" : "RUN";
    res.on("finish", () => {
      prisma.executionLog
        .create({
          data: {
            keyHash,
            userId,
            mode,
            origin: originForLog,
            status: res.statusCode,
            durationMs: Date.now() - startedAt,
          },
        })
        .catch((err: unknown) => {
          console.warn("[executionGuard] audit write failed:", err instanceof Error ? err.message : err);
        });
    });

    next();
  };
}