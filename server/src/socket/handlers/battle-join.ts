import { prisma } from "../../lib/prisma.js";
import { deriveEventDurationMs } from "../../lib/eventTimeLimit.js";
import type { HandlerCtx } from "../types.js";
import { emitToUser, emitNotification } from "../ioRegistry.js";

export function registerBattleJoinHandlers(ctx: HandlerCtx): void {
    const { socket, userId, io, getActiveBattleForUser } = ctx;

    socket.on('join_battle', async (roomId: string, ack?: (response: { success: boolean; error?: string; blockReason?: string }) => void) => {
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
                select: { reason: true },
            });
            if (blockCheck) {
                ack?.({ success: false, error: 'You are blocked from this event', blockReason: blockCheck.reason ?? undefined });
                return;
            }

            // Block re-join if user already participated (surrendered, finished, or has a final verdict)
            const existingPerf = await prisma.userPersonalPerformance.findFirst({
                where: { eventId: event.id, userId },
                select: { status: true },
            });
            if (existingPerf?.status === 'SURRENDER' || existingPerf?.status === 'FINISHED') {
                ack?.({ success: false, error: 'You have already participated in this event and cannot rejoin', blockReason: 'already_participated' });
                return;
            }

            // If no performance record exists, create a PENDING one so the user
            // appears in the participant roster for the moderator's UI.
            if (!existingPerf && event.status === "WAITING") {
                const currentCount = (await prisma.userPersonalPerformance.count({
                    where: { eventId: event.id },
                })) || 0;
                if (currentCount < (event.maxUsers || 2)) {
                    try {
                        await prisma.userPersonalPerformance.create({
                            data: {
                                userId,
                                eventId: event.id,
                                status: "PENDING",
                            },
                        });
                    } catch (perfErr) {
                        console.error('[join_battle] performance creation error:', perfErr);
                    }
                }
            }

            // Join the socket room
            socket.join(roomId);
            if (event.roomCode && event.roomCode !== roomId) {
                socket.join(event.roomCode);
            }
            if (`room-${event.id}` !== roomId) {
                socket.join(`room-${event.id}`);
            }

            // Fetch the full performance record for this user so we can
            // broadcast it to existing participants in the room.
            const joiningPerf = await prisma.userPersonalPerformance.findFirst({
                where: { eventId: event.id, userId },
                include: {
                    user: { select: { id: true, username: true, avatarUrl: true, bio: true } },
                }
            });

            // Fetch the joining user's info (needed even without a performance row,
            // e.g. when the socket join races the HTTP enroll).
            const joiningUser = joiningPerf?.user ?? await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, username: true, avatarUrl: true, bio: true },
            });

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
            const uniqueRooms = [...new Set(targetRooms)];

            console.log(`[join_battle] broadcasting to rooms: [${uniqueRooms.join(', ')}] for user ${userId}`);

            for (const tr of uniqueRooms) {
                io.to(tr).emit('participants_updated', { performances: currentPerformances });
                socket.to(tr).emit('participant_joined', {
                    userId,
                    performance: joiningPerf,
                    user: joiningUser,
                    roomId: event.id,
                    roomCode: event.roomCode,
                });
            }

            // ── Host notification ────────────────────────────────────────────
            // The host only sees participant_joined if they're in the room.
            // Also push a persistent notification so the bell lights up,
            // matching how friend requests / challenges already work.
            if (event.hostId && event.hostId !== userId) {
                const username = joiningUser?.username ?? "A player";
                try {
                    const { createNotification } = await import("../../services/notificationService.js");
                    const notif = await createNotification({
                        userId: event.hostId,
                        type: "SYSTEM" as any,
                        title: "Participant joined",
                        body: `${username} joined your battle (${event.roomCode || event.id}).`,
                        data: { eventId: event.id, joinedUserId: userId },
                    });
                    await emitNotification(event.hostId, notif);
                } catch (notifErr) {
                    console.error("[join_battle] host notification error:", notifErr);
                }
                // Also send a targeted emitToUser in case the host is not in
                // the socket room yet (e.g. navigating to the battle page).
                await emitToUser(event.hostId, "participant_joined", {
                    userId,
                    performance: joiningPerf,
                    user: joiningUser,
                    roomId: event.id,
                    roomCode: event.roomCode,
                });
            }

            // Now that all broadcasts are queued, acknowledge the join to this client
            ack?.({ success: true });

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
