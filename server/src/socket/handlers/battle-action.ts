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
    const include = {
        problems: { select: { id: true } },
        commonProblem: { select: { id: true } },
    };
    if (roomId.startsWith("room-")) {
        return prisma.event.findUnique({ where: { id: roomId.replace("room-", "") }, include }).catch(() => null);
    }
    return prisma.event.findFirst({ where: { roomCode: roomId }, include }).catch(() => null);
}

/**
 * Authoritative win check. A player has only genuinely solved the room when a
 * PASSED submission exists in the database for their own performance record.
 * Client-claimed results are never consulted.
 */
async function hasPassedSubmission(eventId: string, userId: string): Promise<boolean> {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            problems: { select: { id: true } },
            commonProblem: { select: { id: true } },
        },
    }).catch(() => null);

    const problemIds = [
        ...(event?.problems ?? []).map((p: any) => p.id),
        ...(event?.commonProblem ? [event.commonProblem.id] : []),
    ];

    const performance = await prisma.userPersonalPerformance.findFirst({
        where: { eventId, userId },
        select: {
            id: true,
            status: true,
            submissions: { where: { status: "PASSED" }, select: { problemId: true } },
        },
    }).catch(() => null);

    if (!performance) return false;
    if (performance.status === "PASSED" && problemIds.length <= 1) return true;

    // For multi-problem events, require ALL problems to have a PASSED submission
    if (problemIds.length > 1) {
        const solvedProblemIds = new Set(
            (performance.submissions ?? []).map((s: any) => s.problemId),
        );
        return problemIds.every((pid: string) => solvedProblemIds.has(pid));
    }

    // Single-problem event: any PASSED submission suffices
    return (performance.submissions ?? []).length > 0;
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

        const event = await resolveEvent(roomId);
        if (!event) return;

        // Broadcast live progress to the rest of the room — cover all room
        // variants so clients that joined via a different identifier receive it.
        const targetRooms = [roomId, `room-${event.id}`, event.roomCode ?? ""].filter(Boolean) as string[];
        const uniqueRooms = [...new Set(targetRooms)];
        for (const tr of uniqueRooms) {
            socket.to(tr).emit('battle_update', {
                userId: currentUserId,
                status,
                progress,
                linesWritten
            });
        }

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

        // Broadcast to ALL socket room variants so every client (joined via
        // roomCode, room-{id}, or raw roomId) receives the result.
        const finalTargetRooms = [roomId, `room-${event.id}`, event.roomCode ?? ""].filter(Boolean) as string[];
        const finalUniqueRooms = [...new Set(finalTargetRooms)];
        for (const tr of finalUniqueRooms) {
            io.to(tr).emit("battle_finished", {
                status: "FINISHED",
                winnerId: currentUserId,
                performances,
                roomId: event.id,
                roomCode: event.roomCode,
            });
            socket.to(tr).emit("battle_update", {
                userId: currentUserId,
                status,
                progress,
                linesWritten
            });
        }

        // Every rating on the leaderboard is a fold over match history, so this
        await deleteCachedByPrefix("leaderboard:");
        await deleteCachedByPrefix("my-rating:");
        io.emit("leaderboard:invalidate");

        // Notify clients that a battle ended so they can remove it from
        // their dashboard/active list and refresh the lobby room list
        io.emit("rooms:invalidate", { type: "battle_ended", roomId: roomName });
    });
}

