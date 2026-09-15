import { describe, test, expect, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { invalidateProblemQueries, PROBLEM_QUERY_ROOTS } from "./problemCache";

function makeQueryClient() {
  const invalidateQueries = vi.fn();
  return { client: { invalidateQueries } as unknown as QueryClient, invalidateQueries };
}

describe("invalidateProblemQueries", () => {
  test("invalidates every problem query root", () => {
    const { client, invalidateQueries } = makeQueryClient();

    invalidateProblemQueries(client);

    expect(invalidateQueries).toHaveBeenCalledTimes(PROBLEM_QUERY_ROOTS.length);
    for (const root of PROBLEM_QUERY_ROOTS) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [root] });
    }
  });

  test("covers the query keys actually used by the problem pages", () => {
    expect(PROBLEM_QUERY_ROOTS).toContain("system-problems"); // Problems.tsx
    expect(PROBLEM_QUERY_ROOTS).toContain("all-available-problems"); // CreateRoom.tsx
    expect(PROBLEM_QUERY_ROOTS).toContain("challenge-system-problems"); // ChallengeModal.tsx
    expect(PROBLEM_QUERY_ROOTS).toContain("challenge-custom-problems"); // ChallengeModal.tsx
  });
});