import type { QueryClient } from "@tanstack/react-query";
import { api } from "../config/api";
import { queryKeys } from "../lib/queryKeys";

/**
 * Fetch the full system catalog through the paginated GET /problems/* endpoints.
 * Several pages only requested page 1 (default limit 25), so Problems / Battle /
 * CreateRoom could show a different subset — and different titles/descriptions —
 * than the Terminal sidebar, which pages through everything.
 */
export async function fetchAllProblems<T = any>(
  path: "/problems/system" | "/problems/custom",
  pageSize = 100,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  for (;;) {
    const res = await api.get(path, { params: { page, limit: pageSize } });
    const batch: T[] = res.data?.problems ?? [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }
  return all;
}

/**
 * Query-key roots for every endpoint whose payload embeds the current user's
 * own problem progress (`isSolved`, `attempts`, `lastCode`, ...).
 *
 * Problem *definitions* never change during a session, so these queries are
 * cached with `staleTime: Infinity`. The progress fields DO change, which is
 * why every write to progress must call `invalidateProblemQueries`.
 */

/**
 * Bump when the SHAPE of a problem payload changes, not just when its content
 * does.
 *
 * This matters because the problem queries use `staleTime: Infinity`: a tab that
 * mounted before a shape change keeps the old payload for its whole session and
 * never re-fetches, so users see blanks (or missing fields) with no way to
 * recover short of a hard reload. Including this version in every problems
 * query key makes each such change produce a different cache entry, so a new
 * payload is fetched instead of replaying a stale one.
 *
 * v2: test cases are shipped in full, including the ones that used to arrive
 * with an empty input/expectedOutput.
 */
export const PROBLEM_PAYLOAD_VERSION = 2;

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
 *
 * Now uses the centralized query key factory - invalidates ALL problems.* queries
 * including parameterized variants like problems.system({ userId }) etc.
 */
export function invalidateProblemQueries(queryClient: QueryClient): void {
  // Invalidate all problems queries (system, detail, search, etc.)
  queryClient.invalidateQueries({ queryKey: ['problems'] });
  
  // Also invalidate legacy roots for backward compatibility during transition
  for (const root of PROBLEM_QUERY_ROOTS) {
    queryClient.invalidateQueries({ queryKey: [root] });
  }
}

/**
 * Invalidate only system problems queries (more targeted)
 */
export function invalidateSystemProblems(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.problems.system() });
}