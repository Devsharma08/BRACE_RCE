import { prisma } from "../../lib/prisma.js";
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

            // If 1v1, mark opponent as PASSED and finish event
            if (event.type === 'ONE_VS_ONE') {
                await prisma.event.update({
                    where: { id: event.id },
                    data: { status: 'FINISHED', finishedAt: new Date() }
                });

                await prisma.userPersonalPerformance.updateMany({
                    where: { eventId: event.id, userId: { not: userId } },
                    data: { status: 'PASSED' }
                });

                for (const tr of targetRooms) {
                    socket.to(tr).emit('battle_update', {
                        status: 'Opponent Surrendered! \n You Win 🏆',
                        progress: 0,
                        result: "OPPONENT_SURRENDERED"
                    });
                }
            }

            // Fetch and broadcast updated performances to the room
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

            for (const tr of targetRooms) {
                io.to(tr).emit('participants_updated', { performances: updatedPerformances });
            }
        } catch (err) {
            console.error('Surrender handling error:', err);
        }
    };

    socket.on('surrender_battle', handleSurrender);
    socket.on('surrender_match', handleSurrender);
}
