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