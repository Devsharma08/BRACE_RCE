import { prisma } from "../lib/prisma.js";
import { deriveEventDurationMs } from "../lib/eventTimeLimit.js";
import type { ActiveBattleInfo } from "./types.js";

// The "in battle?" lookup so it can be reused
// by reconnect recovery logic without re-registering room handlers.
export const getActiveBattleForUser = async (userId: string): Promise<ActiveBattleInfo | null> => {
    const now = new Date();
    const activeEvent = await prisma.event.findFirst({
        where: {
            status: "IN_PROGRESS",
            performances: {
                some: { userId, status: "ACCEPTED" }
            }
        },
        select: {
            id: true,
            roomCode: true,
            totalTimeLimitMs: true,
            startedAt: true,
            commonProblem: { select: { github_oid: true, timeLimitMs: true } },
            problems: { select: { timeLimitMs: true } }
        }
    });

    if (!activeEvent) return null;

    const startedAt = activeEvent.startedAt ? new Date(activeEvent.startedAt) : null;
    const elapsedMs = startedAt ? now.getTime() - startedAt.getTime() : 0;
    // Same derivation as battle_state /time-left: global budget, else the sum
    // of problem limits, else the 1v1 commonProblem's local limit, else 10 min.
    const totalTimeLimitMs = deriveEventDurationMs(activeEvent);

    if (startedAt && elapsedMs >= totalTimeLimitMs) {
        await prisma.event.update({
            where: { id: activeEvent.id },
            data: { status: "FINISHED", finishedAt: now }
        });
         await prisma.userPersonalPerformance.updateMany({
            where: { eventId: activeEvent.id, status: "PENDING" },
            data: { status: "TIMEOUT" }
        });
        return null;
    }

    return {
        eventId: activeEvent.id,
        roomId: `room-${activeEvent.id}`,
        roomCode: activeEvent.roomCode || null,
        problemId: activeEvent.commonProblem?.github_oid || "local-battle",
        totalTimeLimitMs,
        startedAt: activeEvent.startedAt,
        elapsedMs,
    };
};
