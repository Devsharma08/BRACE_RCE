import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleSurrenderHandlers(ctx: HandlerCtx): void {
    const { socket, userId } = ctx;

    socket.on('surrender_battle', async (data: any) => {
        const roomId = typeof data === "string" ? data : data?.roomId;
        if (!roomId) return;
        const eventId = roomId.replace("room-", "");
        await prisma.event.update({
            where: { id: eventId },
            data: { status: 'FINISHED', finishedAt: new Date() }
        }).catch(e => console.error(e));

        await prisma.userPersonalPerformance.updateMany({
            where: { eventId: eventId, userId: userId },
            data: { status: 'SURRENDER' }
        }).catch(e => console.error(e));

        await prisma.userPersonalPerformance.updateMany({
            where: { eventId: eventId, userId: { not: userId } },
            data: { status: 'PASSED' }
        }).catch(e => console.error(e));

        socket.to(roomId).emit('battle_update', {
            status: 'Opponent Surrendered! \n You Win 🏆',
            progress: 0,
            result: "OPPONENT_SURRENDERED"
        });
    });

    socket.on('surrender_match', async (data: any) => {
        const roomId = typeof data === "string" ? data : data?.roomId;
        if (!roomId) return;
        const eventId = roomId.replace("room-", "");
        await prisma.event.update({
            where: { id: eventId },
            data: { status: 'FINISHED', finishedAt: new Date() }
        }).catch(e => console.error(e));

        await prisma.userPersonalPerformance.updateMany({
            where: { eventId: eventId, userId: userId },
            data: { status: 'SURRENDER' }
        }).catch(e => console.error(e));

        await prisma.userPersonalPerformance.updateMany({
            where: { eventId: eventId, userId: { not: userId } },
            data: { status: 'PASSED' }
        }).catch(e => console.error(e));

        socket.to(roomId).emit('battle_update', {
            status: 'Opponent Surrendered! \n You Win 🏆',
            progress: 0,
            result: "OPPONENT_SURRENDERED"
        });
    });
}
