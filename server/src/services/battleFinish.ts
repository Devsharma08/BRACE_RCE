import { prisma } from "../lib/prisma.js";

/**
 * Shared "finish an event with per-participant verdicts" logic.
 *
 * Used by both the REST expire endpoint (manual host/admin close)
 * and the room scheduler (scheduled close) so a manual and a
 * scheduled close stamp identical state: every performance is
 * marked COMPLETED (has a PASSED submission) or TIMEOUT, and the
 * event flips to FINISHED with a finishedAt timestamp.
 *
 * Accepts either the raw event id or a roomCode.
 */
export async function finishEventWithVerdicts(eventRef: string) {
  const event = await prisma.event.findFirst({
    where: { OR: [{ id: eventRef.replace("room-", "") }, { roomCode: eventRef }] },
    include: { performances: { include: { submissions: true } } },
  });
  if (!event) return null;
  if (event.status === "FINISHED") return event;

  const performances = (event as any).performances ?? [];
  for (const perf of performances) {
    const passed = (perf.submissions ?? []).some((s: any) => s.status === "PASSED");
    const verdict = passed ? "COMPLETED" : "TIMEOUT";
    await prisma.userPersonalPerformance
      .update({
        where: { id: perf.id },
        data: {
          status: verdict,
          timeTakenMs: perf.timeTakenMs ?? event.totalTimeLimitMs ?? undefined,
          finishedAt: (perf as any).finishedAt ?? undefined,
        } as any,
      })
      .catch(() =>
        prisma.userPersonalPerformance.update({
          where: { id: perf.id },
          data: { status: verdict },
        }),
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
