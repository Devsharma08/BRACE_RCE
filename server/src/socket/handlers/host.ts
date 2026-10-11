import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";
import { getSocketId } from "../stateRedis.js";
import { emitRoomForceClosed, emitRoomsInvalidate, emitUserBlocked } from "../ioRegistry.js";

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

            const kickedSocketId = await getSocketId(targetUserId);
            if (kickedSocketId) {
                io.to(kickedSocketId).emit('you_were_kicked', { roomId });
                await emitUserBlocked(targetUserId, roomId, "You were kicked and blocked from this event by the host.");
            }
            io.to(roomId).emit('player_kicked', { userId: targetUserId, blocked: true });
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
                io.to(roomId).emit('participants_updated', { performances });
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
            io.to(roomId).emit('match_completed', {
                status: 'FINISHED',
                reason: 'HOST_ENDED',
                performances: eventWithSubs
            });
            io.to(roomId).emit('participants_updated', { performances: eventWithSubs });
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
            io.to(roomId).emit("group_terminated", { roomId, reason: "ADMIN_TERMINATED" });
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

            const blockedSocketId = await getSocketId(targetUserId);
            if (blockedSocketId) {
                io.to(blockedSocketId).emit('you_are_blocked', { roomId, reason });
            }
            io.to(roomId).emit('player_blocked', { userId: targetUserId, blocked: true });
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
            io.to(roomId).emit('player_unblocked', { userId: targetUserId });
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

            const targetSocketId = await getSocketId(targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('participant_rejected', {
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
            io.to(roomId).emit('participants_updated', { performances: updatedPerformances });
            emitRoomsInvalidate();
            console.log(`[HOST] User ${targetUserId} rejected from room ${roomId} by host ${userId}`);
        } catch (e) {
            console.error('[host_reject_participant] error:', e);
        }
    });
}
