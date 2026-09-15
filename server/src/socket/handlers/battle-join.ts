import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleJoinHandlers(ctx: HandlerCtx): void {
    const { socket, userId, getActiveBattleForUser } = ctx;

    socket.on('join_battle', async (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`)
        try {
            // Determine if roomId is a UUID (from matchmaking) or a 6-char roomCode
            let event;
            if (roomId.startsWith('room-')) {
                const eventId = roomId.replace('room-', '');
                event = await prisma.event.findUnique({
                    where: { id: eventId }, include: {
                        problems: { select: { timeLimitMs: true } }
                    }
                });
            } else {
                event = await prisma.event.findFirst({
                    where: { roomCode: roomId }, include: {
                        problems: { select: { timeLimitMs: true } }
                    }
                });
            }

            if (!event) return;

            if (event && event.startedAt && event.status === 'IN_PROGRESS') {
                const totalDurationMs = event.totalTimeLimitMs || event.problems?.[0]?.timeLimitMs || 600000;
                const elapsedMs = Date.now() - new Date(event.startedAt).getTime();
                const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
                const remainingSeconds = Math.floor(remainingMs / 1000);
                // Expiration Check
                if (remainingSeconds <= 0) {
                    await prisma.event.update({
                        where: { id: event.id },
                        data: {
                            status: 'FINISHED',
                            finishedAt: new Date(),
                            performances: { updateMany: { where: { eventId: event.id }, data: { status: 'TIMEOUT' } } }
                        }
                    }).catch(e => console.error(e));

                    socket.emit("battle_state", { status: 'FINISHED', remainingSeconds: 0 });
                    return;
                }
                socket.emit("battle_state", {
                    startedAt: event.startedAt,
                    totalDurationMs,
                    remainingSeconds,
                    status: event.status,
                    finishedAt: event.finishedAt
                })
            }

        } catch (error) {
            console.log('Error fetching event for battle state:', error);
        }
    })

    socket.on("check_active_battle", async () => {
        try {
            const active = await getActiveBattleForUser(userId);
            if (active) {
                console.log('Active battle found for user:', userId);
                socket.emit('active_battle_found', {
                    roomId: active.roomId,
                    problemId: active.problemId
                });
            }
        } catch (error) {
            console.log('Error fetching active battle:', error);
        }
    });
}
