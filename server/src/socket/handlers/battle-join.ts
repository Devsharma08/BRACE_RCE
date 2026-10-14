import { prisma } from "../../lib/prisma.js";
import { deriveEventDurationMs } from "../../lib/eventTimeLimit.js";
import type { HandlerCtx } from "../types.js";

export function registerBattleJoinHandlers(ctx: HandlerCtx): void {
    const { socket, userId, io, getActiveBattleForUser } = ctx;

    socket.on('join_battle', async (roomId: string, ack?: (response: { success: boolean; error?: string }) => void) => {
        console.log(`User ${userId} requested to join room ${roomId}`)
        try {
            // Determine if roomId is a UUID (from matchmaking) or a 6-char roomCode
            let event;
            let eventId: string;
            if (roomId.startsWith('room-')) {
                eventId = roomId.replace('room-', '');
                event = await prisma.event.findUnique({
                    where: { id: eventId }, include: {
                        problems: { select: { timeLimitMs: true } },
                        commonProblem: { select: { timeLimitMs: true } }
                    }
                });
            } else {
                event = await prisma.event.findFirst({
                    where: { roomCode: roomId }, include: {
                        problems: { select: { timeLimitMs: true } },
                        commonProblem: { select: { timeLimitMs: true } }
                    }
                });
                eventId = event?.id || '';
            }

            if (!event) {
                ack?.({ success: false, error: 'Event not found' });
                return;
            }

            // Block check: blocked users cannot join
            const blockCheck = await prisma.eventBlock.findFirst({
                where: { eventId: event.id, blockedUserId: userId },
            });
            if (blockCheck) {
                ack?.({ success: false, error: 'You are blocked from this event' });
                return;
            }

            // Join the socket room
            socket.join(roomId);
            if (event.roomCode && event.roomCode !== roomId) {
                socket.join(event.roomCode);
            }
            if (`room-${event.id}` !== roomId) {
                socket.join(`room-${event.id}`);
            }
            ack?.({ success: true });

            // Broadcast current participant roster to everyone in the room
            const currentPerformances = await prisma.userPersonalPerformance.findMany({
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

            const targetRooms = [event.roomCode, `room-${event.id}`, roomId].filter(Boolean) as string[];
            for (const tr of targetRooms) {
                io.to(tr).emit('participants_updated', { performances: currentPerformances });
            }

            if (event && event.startedAt && event.status === 'IN_PROGRESS') {
                // Global budget if the host set one; otherwise the sum of the
                // per-problem local limits; for 1v1 FRIENDS events the local
                // limit of the single commonProblem.
                const totalDurationMs = deriveEventDurationMs(event);
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
