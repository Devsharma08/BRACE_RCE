import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleActionHandlers(ctx: HandlerCtx): void {
    const { io, socket } = ctx;

    socket.on('battle_action', async (data: { roomId: string, userId: string, status: string, progress: number, result?: string, linesWritten?: number }) => {
        const { roomId, progress, status, result, linesWritten } = data;
        if (!roomId) return;
        const currentUserId = socket.data.userId || data.userId;

        // Broadcast progress update (including lines written) to all others in room
        socket.to(roomId).emit('battle_update', {
            userId: currentUserId,
            status,
            progress,
            result,
            linesWritten
        });

        if (result === 'OPPONENT_WON' || result === 'OPPONENT_COMPLETED' || status === "Passed tests!") {
            const eventId = roomId.replace("room-", "");

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: { performances: true }
            }).catch(() => null);

            if (event) {
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
                    performances
                });
            }
        }
    });
}
