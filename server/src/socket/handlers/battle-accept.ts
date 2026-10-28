import { prisma } from "../../lib/prisma.js";
import { emitToUser } from "../ioRegistry.js";
import { deriveEventDurationMs } from "../../lib/eventTimeLimit.js";
import type { HandlerCtx } from "../types.js";

// Retry helper for transient DB errors (EAI_AGAIN, ETIMEDOUT, ECONNRESET)
async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 100): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const msg = error instanceof Error ? error.message : String(error);
            const isTransient = msg.includes("EAI_AGAIN") || msg.includes("ETIMEDOUT") ||
                msg.includes("ECONNRESET") || msg.includes("getaddrinfo") || msg.includes("ECONNREFUSED");
            if (!isTransient || i === retries) throw error;
            await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
        }
    }
    throw lastError;
}

export function registerBattleAcceptHandlers(ctx: HandlerCtx): void {
    const { socket, userId } = ctx;

    socket.on('accept_match', async (matchId: string) => {
        try {
            // matchId is "room-UUID"
            const eventId = matchId.replace("room-", "");

            // Update this user's performance to ACCEPTED
            await withDbRetry(() => prisma.userPersonalPerformance.updateMany({
                where: { eventId, userId },
                data: { status: 'ACCEPTED' }
            }));

            // Check if all players have accepted
            const performances = await withDbRetry(() => prisma.userPersonalPerformance.findMany({
                where: { eventId }
            }));

            const allAccepted = performances.length === 2 && performances.every(p => p.status === 'ACCEPTED');

            if (allAccepted) {
                const COUNTDOWN_MS = 5000;
                const futureStartTime = new Date(Date.now() + COUNTDOWN_MS);
                // Update event to IN_PROGRESS — include commonProblem so we can
                // derive the time limit from the problem's difficulty-based setting.
                const event = await withDbRetry(() => prisma.event.update({
                    where: { id: eventId },
                    data: {
                        status: 'IN_PROGRESS',
                        startedAt: futureStartTime,
                    },
                    include: { commonProblem: true, problems: true }
                }));

                // Derive the battle duration from the problem difficulty setting.
                // Priority: global totalTimeLimitMs → sum of problem limits → commonProblem limit → default.
                const totalDurationMs = deriveEventDurationMs(event);

                // Notify both players to start the battle.
                // Use emitToUser for guaranteed cross-process delivery —
                // the Redis adapter routes via socket IDs directly, which
                // works regardless of which PM2 worker each socket is on.
                // (io.to(matchId) alone fails if room joins via the adapter
                // addSocketsToRoom/join don't propagate correctly.)
                for (const perf of performances) {
                    await emitToUser(perf.userId, "battle_starting", {
                        eventId: eventId,
                        roomName: matchId,
                        problemId: event.commonProblem?.github_oid || "local-battle",
                        countdownSeconds: Math.round(COUNTDOWN_MS / 1000),
                    });
                }

                // After the countdown, emit battle_started to unlock the editor.
                setTimeout(async () => {
                    for (const perf of performances) {
                        await emitToUser(perf.userId, "battle_started", {
                            startedAt: futureStartTime,
                            problemId: event.commonProblem?.github_oid || "local-battle",
                            totalDurationMs,
                            commonProblem: event.commonProblem,
                            problems: event.problems,
                        });
                    }
                }, COUNTDOWN_MS);
            }
        } catch (error) {
            console.error("Accept match error:", error);
        }
    })

    socket.on("decline_match", async (matchId: string) => {
        try {
            const eventId = matchId.replace("room-", "");

            await withDbRetry(() => prisma.event.update({
                where: { id: eventId },
                data: { status: 'CANCELLED' }
            }));

            // find both players in the event
            const performances = await withDbRetry(() => prisma.userPersonalPerformance.findMany({
                where: { eventId }
            }));

            // identify the innocent player - userId comes from the context of the socket
            const innocentPlayer = performances.find((p: any) => p.userId !== userId);

            // send standard decline to the person who declined
            socket.emit("match_declined");

            // send auto-requeue command to innocent player — use emitToUser
            // for cross-process delivery instead of io.to(socketId) which
            // may not reach sockets on other PM2 workers.
            if (innocentPlayer) {
                await emitToUser(innocentPlayer.userId, "match_opponent_declined");
            }
        } catch (error) {
            console.error("Decline match error:", error);
        }
    });
}
