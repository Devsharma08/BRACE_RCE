import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Client-side execution rate limiter.
 *
 * This is a courtesy guard, NOT a security boundary: it stops an impatient
 * double-click or a stuck button from hammering the sandbox, and it gives
 * immediate feedback before the request leaves the browser. The authoritative
 * limits live on the server, which tracks by IP/user and cannot be bypassed —
 * a 429 from here or there is rendered the same way.
 *
 * Two independent rules, both enforced on the same timestamp log:
 *
 *  - `minIntervalMs` — a hard gap between two executions. Compilation and
 *    queueing make back-to-back runs pointless, and this is what actually
 *    catches the "double-click SUBMIT" case where the first request is still
 *    in flight.
 *
 *  - `maxInWindow` over `windowMs` — the burst budget. Ten runs inside a
 *    minute is already generous for iterating on a solution; beyond that the
 *    caller gets told how long until a slot frees up rather than silently
 *    queueing.
 */
export interface ExecutionGuardOptions {
  /** Minimum gap between two executions, in milliseconds. */
  minIntervalMs?: number;
  /** Maximum executions allowed inside `windowMs`. */
  maxInWindow?: number;
  /** Sliding window length for the burst budget, in milliseconds. */
  windowMs?: number;
}

export interface ExecutionLimits {
  /** Default enforced values — exported so tests and UI copy agree. */
  readonly MIN_INTERVAL_MS: number;
  readonly MAX_IN_WINDOW: number;
  readonly WINDOW_MS: number;
}

export const EXECUTION_LIMITS: ExecutionLimits = {
  MIN_INTERVAL_MS: 3_000,
  MAX_IN_WINDOW: 10,
  WINDOW_MS: 60_000,
};

export interface ExecutionVerdict {
  allowed: boolean;
  /** Present when `allowed` is false — safe to show directly to the user. */
  message?: string;
  /** Milliseconds until the caller may retry. 0 when allowed. */
  retryInMs: number;
}

export interface ExecutionGuard {
  /** Ask whether an execution may start right now. Pure: records nothing. */
  check: () => ExecutionVerdict;
  /** Record that an execution was accepted. Call only after `check` passed. */
  record: () => void;
  /** Forget all recorded executions (e.g. on problem switch or sign-out). */
  reset: () => void;
  /** Live countdown to the next allowed execution, in seconds. */
  cooldownRemaining: number;
}

export function useExecutionGuard(
  options: ExecutionGuardOptions = {},
): ExecutionGuard {
  const minIntervalMs = options.minIntervalMs ?? EXECUTION_LIMITS.MIN_INTERVAL_MS;
  const maxInWindow = options.maxInWindow ?? EXECUTION_LIMITS.MAX_IN_WINDOW;
  const windowMs = options.windowMs ?? EXECUTION_LIMITS.WINDOW_MS;

  // A ref, not state: `check` is read from inside async callbacks that close
  // over it, and a stale-closure rate limiter is a limiter that never blocks.
  const timestamps = useRef<number[]>([]);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Drive the countdown only while the user is actually blocked, then stop the
  // interval — a permanent 1s tick in a page that may sit idle for an hour is
  // a needless wakeup on a laptop battery.
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const last = timestamps.current[timestamps.current.length - 1];
      const remaining = last === undefined ? 0 : Math.max(0, last + minIntervalMs - now);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        window.clearInterval(id);
        return;
      }
      setCooldownRemaining(Math.ceil(remaining / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [cooldownRemaining, minIntervalMs]);

  const check = useCallback((): ExecutionVerdict => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = timestamps.current.filter((t) => t > windowStart);
    const last = recent[recent.length - 1];

    if (last !== undefined) {
      const sinceLast = now - last;
      if (sinceLast < minIntervalMs) {
        const waitMs = minIntervalMs - sinceLast;
        return {
          allowed: false,
          message: `Too fast — wait ${Math.ceil(waitMs / 1000)}s before running again.`,
          retryInMs: waitMs,
        };
      }
    }

    if (recent.length >= maxInWindow) {
      const oldest = recent[0];
      const waitMs = Math.max(0, oldest + windowMs - now);
      return {
        allowed: false,
        message: `Run limit reached (${maxInWindow} per ${Math.round(windowMs / 1000)}s). Try again in ${Math.ceil(waitMs / 1000)}s.`,
        retryInMs: waitMs,
      };
    }

    return { allowed: true, retryInMs: 0 };
  }, [maxInWindow, minIntervalMs, windowMs]);

  const record = useCallback(() => {
    timestamps.current.push(Date.now());
    setCooldownRemaining(Math.ceil(minIntervalMs / 1000));
  }, [minIntervalMs]);

  const reset = useCallback(() => {
    timestamps.current = [];
    setCooldownRemaining(0);
  }, []);

  return { check, record, reset, cooldownRemaining };
}
