import { prisma } from "../../lib/prisma.js";
import { emitToUser } from "../ioRegistry.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleSurrenderHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;

    const handleSurrender = async (data: any) => {
        try {
            const rawRoomId = typeof data === "string" ? data : data?.roomId;
            if (!rawRoomId) return;
            const cleanId = rawRoomId.replace("room-", "");

            const event = await prisma.event.findFirst({
                where: { OR: [{ id: cleanId }, { roomCode: rawRoomId }] }
            });
            if (!event) return;

            const targetRooms = [event.roomCode, `room-${event.id}`, event.id].filter(Boolean) as string[];

            // Mark this user's performance as SURRENDER
            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: event.id, userId: userId },
                data: { status: 'SURRENDER' }
            });

            // Fetch updated performances once — used both for the room broadcast
            // and for guaranteed targeted delivery below.
            const updatedPerformances = await prisma.userPersonalPerformance.findMany({
                where: { eventId: event.id },
                include: {
                    user: { select: { id: true, username: true, avatarUrl: true, bio: true } },
                    submissions: {
                        select: {
                            id: true, problemId: true, status: true,
                            passedCase: true, totalCases: true,
                            runtimeMs: true, memoryKb: true,
                            language: true, attemptNumber: true,
                            isBestSubmission: true, createdAt: true
                        },
                        orderBy: { attemptNumber: "asc" }
                    }
                }
            });
            const affectedUserIds = updatedPerformances.map((p) => p.userId).filter((id): id is string => Boolean(id));

            // If 1v1, notify the opponent but DO NOT award them the win — they
            // must still solve the problem themselves. The event stays
            // IN_PROGRESS so the survivor can keep coding; the normal pass flow
            // (battle-action.ts) claims the finish and declares them winner only
            // once they submit a passing solution. The surrenderer's own perf is
            // SURRENDER above, so they won't be pulled back into an active battle.
            if (event.type === 'ONE_VS_ONE') {
                const opponentPayload = {
                    status: 'Opponent surrendered — solve the problem to claim victory.',
                    progress: 0,
                    result: "OPPONENT_SURRENDERED",
                };
                for (const tr of targetRooms) {
                    socket.to(tr).emit('battle_update', opponentPayload);
                }
                // Targeted delivery to opponent(s) on ALL their sockets so the
                // update is not lost if they left the room, reconnected, or are
                // on another tab/worker.
                await Promise.all(
                    affectedUserIds
                        .filter((id) => id !== userId)
                        .map((id) => emitToUser(id, 'battle_update', opponentPayload))
                );
            }

            // Broadcast to everyone currently in the room.
            for (const tr of targetRooms) {
                io.to(tr).emit('participants_updated', { performances: updatedPerformances });
            }

            // Guaranteed delivery to every affected participant on ALL their live
            // sockets (covers users who left the room, reconnected to a new
            // socket, opened a second tab, or are on a different PM2 worker).
            // Room-scoped io.to() emits alone cannot reach a socket that is no
            // longer joined to the room at emit time.
            await Promise.all(
                affectedUserIds.map((id) => emitToUser(id, 'participants_updated', { performances: updatedPerformances }))
            );
        } catch (err) {
            console.error('Surrender handling error:', err);
        }
    };

    socket.on('surrender_battle', handleSurrender);
    socket.on('surrender_match', handleSurrender);
}
