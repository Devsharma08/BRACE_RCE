import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerHostHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;
    const { onlineUsers } = ctx.state;

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
            const kickedSocketId = onlineUsers.get(targetUserId);
            if (kickedSocketId) {
                io.to(kickedSocketId).emit('you_were_kicked', { roomId });
            }
            io.to(roomId).emit('player_kicked', { userId: targetUserId });
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
                where: { eventId: event.id, status: 'PENDING' },
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
            console.log(`[HOST] Group ${roomId} terminated by ${userId} (admin=${isAdmin})`);
        } catch (e) {
            console.error("[terminate_group] error:", e);
        }
    })
}
