import { prisma } from "../../lib/prisma.js";
import { deleteCachedByPrefix } from "../../lib/cache.js";
import type { HandlerCtx } from "../types.js";

interface BattleActionPayload {
    roomId?: string;
    userId?: string;
    /** Display-only progress label (e.g. "Passed tests!"). Never authoritative. */
    status?: string;
    progress?: number;
    /**
     * Legacy client-supplied outcome. Kept only so we can log/ignore it —
     * outcomes are derived from the database on the server.
     */
    result?: string;
    linesWritten?: number;
}

/**
 * Resolve the event row backing a battle room. Rooms are addressed either as
 * `room-<eventId>` (matchmaking) or directly by their roomCode (custom rooms).
 */
async function resolveEvent(roomId: string) {
    if (roomId.startsWith("room-")) {
        return prisma.event.findUnique({ where: { id: roomId.replace("room-", "") } }).catch(() => null);
    }
    return prisma.event.findFirst({ where: { roomCode: roomId } }).catch(() => null);
}

/**
 * Authoritative win check. A player has only genuinely solved the room when a
 * PASSED submission exists in the database for their own performance record.
 * Client-claimed results are never consulted.
 */
async function hasPassedSubmission(eventId: string, userId: string): Promise<boolean> {
    const performance = await prisma.userPersonalPerformance.findFirst({
        where: { eventId, userId },
        select: {
            id: true,
            status: true,
            submissions: { where: { status: "PASSED" }, select: { id: true }, take: 1 },
        },
    }).catch(() => null);

    if (!performance) return false;
    if (performance.status === "PASSED") return true;
    return performance.submissions.length > 0;
}

export function registerBattleActionHandlers(ctx: HandlerCtx): void {
    const { io, socket } = ctx;

    socket.on('battle_action', async (data: BattleActionPayload) => {
        const payload = data ?? {};
        const { roomId, progress, status, result, linesWritten } = payload;
        if (!roomId) return;
        const currentUserId = socket.data.userId || payload.userId;
        if (!currentUserId) return;

        // SECURITY: never trust a client-supplied outcome. Any client can send
        // `result: "OPPONENT_WON"`, so we log it and derive the winner from the
        // database instead.
        if (result) {
            console.warn(
                `[battle_action] Ignored client-supplied result "${result}" from user ${currentUserId} in ${roomId}`
            );
        }

        // Broadcast live progress to the rest of the room. `result` is
        // deliberately omitted so a peer cannot spoof an outcome banner.
        socket.to(roomId).emit('battle_update', {
            userId: currentUserId,
            status,
            progress,
            linesWritten
        });

        const event = await resolveEvent(roomId);
        if (!event) return;

        const passed = await hasPassedSubmission(event.id, currentUserId);
        if (!passed) return;

        // Atomically claim the finish so concurrent emissions (double submits,
        // both players finishing at once) emit `battle_finished` exactly once.
        const claim = await prisma.event.updateMany({
            where: { id: event.id, status: { not: "FINISHED" } },
            data: { status: "FINISHED", finishedAt: new Date() }
        }).catch(() => ({ count: 0 }));

        if (claim.count === 0) return;

        const performances = await prisma.userPersonalPerformance.findMany({
            where: { eventId: event.id },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true } },
                submissions: {
                    orderBy: { attemptNumber: "asc" }
                }
            }
        });

        io.to(roomId).emit("battle_finished", {
            status: "FINISHED",
            winnerId: currentUserId,
            performances
        });

        // Every rating on the leaderboard is a fold over match history, so this
        // battle just invalidated the cached copies. Drop them and tell all
        // clients to re-fetch — the new ELO can only be derived server-side.
        deleteCachedByPrefix("leaderboard:");
        deleteCachedByPrefix("my-rating:");
        io.emit("leaderboard:invalidate");

        // Tell the rest of the room who actually won, derived from the database.
        socket.to(roomId).emit("battle_update", {
            userId: currentUserId,
            status,
            progress,
            result: "OPPONENT_WON",
            linesWritten
        });
    });
}

