/**
 * Single source of truth for "how long does this competitive event last?".
 *
 * Priority order (matches the intent agreed for competitive events):
 *   1. The host-configured GLOBAL limit (`totalTimeLimitMs`) — room events
 *      with any number of problems.
 *   2. The SUM of the per-problem LOCAL limits — multi-problem events that
 *      were created without an explicit global budget.
 *   3. The single problem's LOCAL limit — 1v1 FRIENDS challenges carry their
 *      problem as `commonProblem`, not in `problems[]`, so the relation must
 *      be checked too (this was the bug that made every 1v1 run 10 minutes
 *      regardless of the problem's own limit).
 *   4. A 10-minute default for legacy/local-battle events with no limits
 *      anywhere.
 */
export const DEFAULT_EVENT_DURATION_MS = 600_000;

type TimeLimitSource = {
  totalTimeLimitMs?: number | null;
  problems?: Array<{ timeLimitMs?: number | null }> | null;
  commonProblem?: { timeLimitMs?: number | null } | null;
};

export function deriveEventDurationMs(event: TimeLimitSource): number {
  if (event.totalTimeLimitMs && event.totalTimeLimitMs > 0) {
    return event.totalTimeLimitMs;
  }

  const problemSum = (event.problems ?? []).reduce(
    (sum, problem) => sum + (problem.timeLimitMs || 0),
    0,
  );
  if (problemSum > 0) return problemSum;

  if (event.commonProblem?.timeLimitMs && event.commonProblem.timeLimitMs > 0) {
    return event.commonProblem.timeLimitMs;
  }

  return DEFAULT_EVENT_DURATION_MS;
}

