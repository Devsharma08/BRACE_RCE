import type { QueryClient } from "@tanstack/react-query";

/**
 * Query-key roots for every endpoint whose payload embeds the current user's
 * own problem progress (`isSolved`, `attempts`, `lastCode`, ...).
 *
 * Problem *definitions* never change during a session, so these queries are
 * cached with `staleTime: Infinity`. The progress fields DO change, which is
 * why every write to progress must call `invalidateProblemQueries`.
 */
export const PROBLEM_QUERY_ROOTS = [
  "system-problems",
  "all-available-problems",
  "challenge-system-problems",
  "challenge-custom-problems",
] as const;

/**
 * Mark every problem cache stale. React Query will re-fetch the queries that are
 * currently mounted and refresh the rest on their next mount.
 *
 * Call after anything that can change the user's solved status or attempt count
 * (a practice SUBMIT, a battle SUBMIT, creating a custom problem).
 */
export function invalidateProblemQueries(queryClient: QueryClient): void {
  for (const root of PROBLEM_QUERY_ROOTS) {
    queryClient.invalidateQueries({ queryKey: [root] });
  }
}