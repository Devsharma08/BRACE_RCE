import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleAcceptHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;
    const { onlineUsers } = ctx.state;

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

                // Join socket rooms and notify
                for (const perf of performances) {
                    const socketId = onlineUsers.get(perf.userId);
                    if (socketId) {
                        const pSocket = io.sockets.sockets.get(socketId);
                        pSocket?.join(matchId);
                    }
                }

                io.to(matchId).emit("match_starting", {
                    eventId: eventId,
                    roomName: matchId,
                    problemId: event.commonProblem?.github_oid || "local-battle"
                });
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

            // send auto - requeue command to innocent player
            if (innocentPlayer) {
                const innocentSocketId = onlineUsers.get(innocentPlayer.userId);
                if (innocentSocketId) {
                    io.to(innocentSocketId).emit(
                        "match_opponent_declined");
                }
            }
        } catch (error) {
            console.error("Decline match error:", error);
        }
    });
}
