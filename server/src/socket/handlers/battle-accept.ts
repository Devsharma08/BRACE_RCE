import { prisma } from "../../lib/prisma.js";
import { emitToUser } from "../ioRegistry.js";
import { getSocketIds } from "../stateRedis.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleAcceptHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;

    socket.on('accept_match', async (matchId: string) => {
        try {
            // matchId is "room-UUID"
            const eventId = matchId.replace("room-", "");

            // Update this user's performance to ACCEPTED
            await prisma.userPersonalPerformance.updateMany({
                where: { eventId, userId },
                data: { status: 'ACCEPTED' }
            });

            // Check if all players have accepted
            const performances = await prisma.userPersonalPerformance.findMany({
                where: { eventId }
            });

            const allAccepted = performances.length === 2 && performances.every(p => p.status === 'ACCEPTED');

            if (allAccepted) {
                const futureStartTime = new Date(Date.now() + 5000);
                // Update event to IN_PROGRESS
                const event = await prisma.event.update({
                    where: { id: eventId },
                    data: {
                        status: 'IN_PROGRESS',
                        startedAt: futureStartTime,
                    },
                    include: { commonProblem: true }
                });

                // Notify both players to start the battle.
                // Use emitToUser for guaranteed cross-process delivery —
                // the Redis adapter routes via socket IDs directly, which
                // works regardless of which PM2 worker each socket is on.
                // (io.to(matchId) alone fails if room joins via the adapter
                // addSocketsToRoom/join don't propagate correctly.)
                for (const perf of performances) {
                    await emitToUser(perf.userId, "match_starting", {
                        eventId: eventId,
                        roomName: matchId,
                        problemId: event.commonProblem?.github_oid || "local-battle",
                    });
                }
            }
        } catch (error) {
            console.error("Accept match error:", error);
        }
    })

    socket.on("decline_match", async (matchId: string) => {
        try {
            const eventId = matchId.replace("room-", "");

            await prisma.event.update({
                where: { id: eventId },
                data: { status: 'CANCELLED' }
            });

            // find both players in the event
            const performances = await prisma.userPersonalPerformance.findMany({
                where: { eventId }
            });

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
