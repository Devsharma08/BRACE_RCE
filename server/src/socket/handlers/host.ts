import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";
import { getSocketIds } from "../stateRedis.js";
import { emitRoomForceClosed, emitRoomsInvalidate, emitToUser, emitUserBlocked } from "../ioRegistry.js";

/**
 * Resolve all Socket.IO room aliases for an event so broadcasts reach
 * every client regardless of how they joined (roomCode, room-{id}, or raw roomId).
 */
function eventRoomAliases(event: { id: string; roomCode: string | null }, rawRoomId: string): string[] {
    const rooms = [event.roomCode ?? "", `room-${event.id}`, rawRoomId].filter(Boolean);
    return [...new Set(rooms)];
}

export function registerHostHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;

    // HOST KICKS A PLAYER
    socket.on('host_kick_user', async (data: { roomId: string, targetUserId: string }) => {
        try {
            const { roomId, targetUserId } = data;
            const eventId = roomId.replace('room-', '');
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] }
            });
            if (!event || event.hostId !== userId) {
                return socket.emit('host_error', 'Only the host can kick players.');
            }
             await prisma.userPersonalPerformance.updateMany({
                where: { eventId: event.id, userId: targetUserId },
                data: { status: 'FAILED' }
            });

            // Also create an EventBlock so the kicked user cannot rejoin this event
            try {
                await prisma.eventBlock.upsert({
                    where: { eventId_blockedUserId: { eventId: event.id, blockedUserId: targetUserId } },
                    update: { reason: 'Kicked by host', blockedById: userId },
                    create: {
                        eventId: event.id,
                        blockedUserId: targetUserId,
                        blockedById: userId,
                        reason: 'Kicked by host',
                    },
                });
            } catch (blockErr) {
                console.error('[host_kick_user] block record error:', blockErr);
            }

            // Emit to ALL sockets of the kicked user (cross-tab).
            const kickedSocketIds = await getSocketIds(targetUserId);
            for (const sid of kickedSocketIds) {
                io.to(sid).emit('you_were_kicked', { roomId });
            }
            await emitUserBlocked(targetUserId, roomId, "You were kicked and blocked from this event by the host.");

            // Broadcast to ALL room aliases so every client sees the roster change.
            const aliases = eventRoomAliases(event, roomId);
            for (const tr of aliases) {
                io.to(tr).emit('player_kicked', { userId: targetUserId, blocked: true });
            }

            try {
                const performances = await prisma.userPersonalPerformance.findMany({
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
                for (const tr of aliases) {
                    io.to(tr).emit('participants_updated', { performances });
                }
                // Guaranteed delivery to remaining participants on ALL their sockets
                // (kicked user already receives the targeted you_were_kicked emit).
                const remainingUserIds = performances
                    .map((p) => p.user?.id)
                    .filter((id): id is string => Boolean(id) && id !== targetUserId);
                await Promise.all(
                    remainingUserIds.map((id) => emitToUser(id, 'participants_updated', { performances }))
                );
            } catch (e) {
                console.error('[host_kick_user] participants refresh error:', e);
            }
            console.log(`[HOST] User ${targetUserId} kicked from room ${roomId} by host ${userId}`);
        } catch (e) {
            console.error('[host_kick_user] error:', e);
        }
    });

    // HOST FORCE-ENDS THE MATCH
    socket.on('host_end_match', async (data: { roomId: string }) => {
        try {
            const { roomId } = data;
            const eventId = roomId.replace('room-', '');
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] }
            });
            if (!event || event.hostId !== userId) {
                return socket.emit('host_error', 'Only the host can end the match.');
            }
            await prisma.event.update({
                where: { id: event.id },
                data: { status: 'FINISHED', finishedAt: new Date() }
            });
            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: event.id, status: "PENDING" },
                data: { status: 'TIMEOUT' }
            });
            const eventWithSubs = await prisma.userPersonalPerformance.findMany({
                where: { eventId: event.id },
                include: {
                    user: { select: { id: true, username: true, avatarUrl: true } },
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

            // Broadcast to ALL socket room variants so every client
            // (joined via roomCode, room-{id}, or raw roomId) receives the
            // termination notice. Broadcasting to only io.to(roomId) silently
            // misses clients that joined under a different identifier.
            const aliases = eventRoomAliases(event, roomId);
            const finishedPayload = {
                status: 'FINISHED',
                reason: 'HOST_ENDED',
                finishedAt: new Date(),
                performances: eventWithSubs,
            };
            for (const tr of aliases) {
                io.to(tr).emit('match_completed', { ...finishedPayload, roomId: event.id, roomCode: event.roomCode });
                io.to(tr).emit('participants_updated', { performances: eventWithSubs });
                io.to(tr).emit('battle_state', {
                    status: 'FINISHED',
                    finishedAt: finishedPayload.finishedAt,
                });
            }

            // Guaranteed delivery to every participant on ALL their sockets.
            const endMatchUserIds = eventWithSubs
                .map((p) => p.user?.id)
                .filter((id): id is string => Boolean(id));
            await Promise.all(
                endMatchUserIds.map((id) =>
                    emitToUser(id, 'participants_updated', { performances: eventWithSubs })
                )
            );

            // Unified force-close with a human-readable reason + lobby refresh.
            emitRoomForceClosed(event, "The host ended this battle.");
            emitRoomsInvalidate();
            console.log(`[HOST] Match ${roomId} force-ended by host ${userId}`);
        } catch (e) {
            console.error('[host_end_match] error:', e);
        }
    });

    // GROUP TERMINATION — host OR global ADMIN may terminate
    socket.on("terminate_group", async (data: { roomId: string }) => {
        try {
            const { roomId } = data;
            const eventId = roomId.replace("room-", "");
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] }
            });
            if (!event) {
                return socket.emit("host_error", "Event not found.");
            }
            const caller = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });
            const isAdmin = (caller?.role || "").toUpperCase() === "ADMIN";
            if (event.hostId !== userId && !isAdmin) {
                return socket.emit("host_error", "Only the host or an admin can terminate this group.");
            }
            await prisma.event.update({
                where: { id: event.id },
                data: { status: "FINISHED", finishedAt: new Date() }
            });
             await prisma.userPersonalPerformance.updateMany({
                where: { eventId: event.id, status: "PENDING" },
                data: { status: "TIMEOUT" }
            });
            const aliases = eventRoomAliases(event, roomId);
            for (const tr of aliases) {
                io.to(tr).emit("group_terminated", { roomId: event.id, roomCode: event.roomCode, reason: isAdmin ? "ADMIN_TERMINATED" : "HOST_TERMINATED" });
            }
            // Unified force-close with a human-readable reason + lobby refresh.
            emitRoomForceClosed(event, isAdmin ? "An admin terminated this group." : "The host terminated this group.");
            emitRoomsInvalidate();
            console.log(`[HOST] Group ${roomId} terminated by ${userId} (admin=${isAdmin})`);
        } catch (e) {
            console.error("[terminate_group] error:", e);
        }
    })

    // HOST BLOCKS A PARTICIPANT (for the current event only)
    socket.on("host_block_user", async (data: { roomId: string, targetUserId: string, reason?: string }) => {
        try {
            const { roomId, targetUserId, reason } = data;
            const eventId = roomId.replace('room-', '');
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] }
            });
            if (!event || event.hostId !== userId) {
                return socket.emit('host_error', 'Only the host can block players.');
            }
            if (targetUserId === userId) {
                return socket.emit('host_error', 'You cannot block yourself.');
            }

            // Set performance to FAILED and create the block record
            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: event.id, userId: targetUserId },
                data: { status: 'FAILED' }
            });
            await prisma.eventBlock.upsert({
                where: { eventId_blockedUserId: { eventId: event.id, blockedUserId: targetUserId } },
                update: { reason: reason || 'Blocked by host', blockedById: userId },
                create: {
                    eventId: event.id,
                    blockedUserId: targetUserId,
                    blockedById: userId,
                    reason: reason || 'Blocked by host',
                },
            });

            // Emit to ALL sockets of the blocked user (cross-tab).
            const blockedSocketIds = await getSocketIds(targetUserId);
            for (const sid of blockedSocketIds) {
                io.to(sid).emit('you_are_blocked', { roomId, reason });
            }

            // Broadcast to ALL room aliases.
            const aliases = eventRoomAliases(event, roomId);
            for (const tr of aliases) {
                io.to(tr).emit('player_blocked', { userId: targetUserId, blocked: true });
            }
            console.log(`[HOST] User ${targetUserId} blocked from room ${roomId} by host ${userId}`);
        } catch (e) {
            console.error('[host_block_user] error:', e);
        }
    })

    // HOST UNBLOCKS A PARTICIPANT
    socket.on("host_unblock_user", async (data: { roomId: string, targetUserId: string }) => {
        try {
            const { roomId, targetUserId } = data;
            const eventId = roomId.replace('room-', '');
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] }
            });
            if (!event || event.hostId !== userId) {
                return socket.emit('host_error', 'Only the host can unblock players.');
            }

            await prisma.eventBlock.deleteMany({
                where: { eventId: event.id, blockedUserId: targetUserId }
            });

            // Broadcast to ALL room aliases.
            const aliases = eventRoomAliases(event, roomId);
            for (const tr of aliases) {
                io.to(tr).emit('player_unblocked', { userId: targetUserId });
            }
            console.log(`[HOST] User ${targetUserId} unblocked from room ${roomId} by host ${userId}`);
        } catch (e) {
            console.error('[host_unblock_user] error:', e);
        }
    })

    // HOST REJECTS A PARTICIPANT (participant redirected back to lobby)
    socket.on("host_reject_participant", async (data: { roomId: string, targetUserId: string }) => {
        try {
            const { roomId, targetUserId } = data;
            const eventId = roomId.replace('room-', '');
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] }
            });
            if (!event || event.hostId !== userId) {
                return socket.emit('host_error', 'Only the host can reject participants.');
            }

            // Remove or mark performance as REJECTED
            await prisma.userPersonalPerformance.deleteMany({
                where: { eventId: event.id, userId: targetUserId }
            });

            // Emit to ALL sockets of the rejected user (cross-tab).
            const targetSocketIds = await getSocketIds(targetUserId);
            for (const sid of targetSocketIds) {
                io.to(sid).emit('participant_rejected', {
                    roomId,
                    reason: 'Your request to enter this operation was declined by the host.'
                });
            }

            const updatedPerformances = await prisma.userPersonalPerformance.findMany({
                where: { eventId: event.id },
                include: {
                    user: { select: { id: true, username: true, avatarUrl: true, bio: true } }
                }
            });

            // Broadcast to ALL room aliases.
            const aliases = eventRoomAliases(event, roomId);
            for (const tr of aliases) {
                io.to(tr).emit('participants_updated', { performances: updatedPerformances });
            }
            // Guaranteed delivery to remaining participants on ALL their sockets
            // (the rejected user already receives the targeted participant_rejected emit).
            const rejectRemainingUserIds = updatedPerformances
                .map((p) => p.user?.id)
                .filter((id): id is string => Boolean(id));
            await Promise.all(
                rejectRemainingUserIds.map((id) =>
                    emitToUser(id, 'participants_updated', { performances: updatedPerformances })
                )
            );
            emitRoomsInvalidate();
            console.log(`[HOST] User ${targetUserId} rejected from room ${roomId} by host ${userId}`);
        } catch (e) {
            console.error('[host_reject_participant] error:', e);
        }
    });
}
