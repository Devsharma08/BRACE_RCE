import { prisma } from "../lib/prisma.js";
import { calculateBattlePoints, resolveBattleOutcome } from "../utils/elo.js";
import { invalidateUserAnalyticsCache } from "../controllers/analytics.js";

/**
 * Shared "finish an event with per-participant verdicts" logic.
 *
 * Used by both the REST expire endpoint (manual host/admin close)
 * and the room scheduler (scheduled close) so a manual and a
 * scheduled close stamp identical state: every performance is
 * marked COMPLETED (has a PASSED submission) or TIMEOUT, and the
 * event flips to FINISHED with a finishedAt timestamp.
 *
 * Task 3 — explicit win / tie / loss outcome on top of the verdict:
 * each performance also records `outcome` (WIN/DRAW/LOSS, resolved from
 * pass flags) and `battlePoints` (+max / 0 / -max scaled by difficulty,
 * minus penalty% of the max award, floored at 0). ELO stays a secondary
 * derived value (see utils/elo.ts) so existing rating displays keep working.
 *
 * Accepts either the raw event id or a roomCode.
 */
export async function finishEventWithVerdicts(
  eventRef: string,
  opts: {
    difficulty?: string | null;
    focusPenaltyByUser?: Record<string, number>;
  } = {},
) {
  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventRef.replace("room-", "") }, { roomCode: eventRef }],
    },
    include: {
      performances: { include: { submissions: true } },
      commonProblem: { select: { difficulty_level: true } },
    },
  });
  if (!event) return null;
  if (event.status === "FINISHED") return event;

  const performances = (event as any).performances ?? [];
  const difficulty = (event as any).commonProblem?.difficulty_level ?? "MEDIUM";
  const eventProblemIds = ((event as any).problems ?? []).map((p: any) => p.id);

  // Pass flags first so win / tie / loss is resolved against the opponent's
  // actual result (not each player in isolation).
  // For multi-problem events, a participant is only "passed" if ALL problems
  // in the event have at least one PASSED submission.
  const passedById = new Map<string, boolean>(
    performances.map((perf: any) => {
      const solvedProblemIds = new Set(
        (perf.submissions ?? [])
          .filter((s: any) => s.status === "PASSED")
          .map((s: any) => s.problemId),
      );
      const allPassed =
        eventProblemIds.length <= 1
          ? (perf.submissions ?? []).some((s: any) => s.status === "PASSED")
          : eventProblemIds.length > 0 &&
            eventProblemIds.every((pid: string) => solvedProblemIds.has(pid));
      return [perf.userId as string, allPassed];
    }),
  );
  /**
   * Group-aware outcome: all-pass / all-fail is a tie (DRAW); a pass with
   * any failed opponent is a win; anything else is a loss. Delegates to
   * resolveBattleOutcome for the 1v1 / solo cases.
   */
  const outcomeFor = (userId: string, passed: boolean) => {
    const opponentIds = [...passedById.keys()].filter((id) => id !== userId);
    if (opponentIds.length <= 1) {
      return resolveBattleOutcome(
        passed,
        opponentIds.length === 0
          ? null
          : (passedById.get(opponentIds[0]) ?? false),
      );
    }
    const results = opponentIds.map((id) => passedById.get(id) ?? false);
    if (results.every((r) => r === passed)) return "DRAW" as const;
    return passed && results.some((r) => !r)
      ? ("WIN" as const)
      : ("LOSS" as const);
  };
  for (const perf of performances) {
    const passed = passedById.get(perf.userId) ?? false;
    const verdict = passed ? "COMPLETED" : "TIMEOUT";
    // Focus penalty is cut from the max award inside calculateBattlePoints,
    // and the result never drops below 0.
    const outcome = outcomeFor(perf.userId, passed);
    const { finalPoints } = calculateBattlePoints(
      outcome,
      difficulty,
      opts.focusPenaltyByUser?.[perf.userId] ?? 0,
    );
    await prisma.userPersonalPerformance
      .update({
        where: { id: perf.id },
        data: {
          status: verdict,
          timeTakenMs: perf.timeTakenMs ?? event.totalTimeLimitMs ?? undefined,
          finishedAt: (perf as any).finishedAt ?? undefined,
          score: finalPoints,
        } as any,
      })
      .catch(() =>
        prisma.userPersonalPerformance.update({
          where: { id: perf.id },
          data: { status: verdict },
        }),
      );

    // Invalidate the analytics Redis cache so the dashboard/profile
    // reflects fresh data instead of serving a stale cached snapshot.
    void invalidateUserAnalyticsCache(perf.userId).catch((e) =>
      console.error(
        `Failed to invalidate analytics cache for user ${perf.userId}:`,
        e,
      ),
    );
  }

  return prisma.event.update({
    where: { id: event.id },
    data: { status: "FINISHED", finishedAt: new Date() },
    include: {
      performances: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          submissions: {
            select: {
              id: true,
              problemId: true,
              status: true,
              passedCase: true,
              totalCases: true,
              runtimeMs: true,
              memoryKb: true,
              language: true,
              attemptNumber: true,
              isBestSubmission: true,
              createdAt: true,
            },
            orderBy: { attemptNumber: "asc" },
          },
        },
      },
    },
  });
}
