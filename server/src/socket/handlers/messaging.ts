import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";
import { getSocketId } from "../stateRedis.js";

export function registerMessagingHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;

    socket.on("send_direct_message", async (data: { targetUserId: string, content: string }) => {
        // save to DB
        const message = await prisma.message.create({
            data: {
                senderId: userId,
                receiverId: data.targetUserId,
                content: data.content
            }
        });

        // best-effort queue entry for offline/3-day history
        try {
            const { notifyDirectMessage } = await import("../../services/notificationService.js");
            const sender = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });
            const notif = await notifyDirectMessage(
                data.targetUserId,
                sender?.username ?? "Friend",
                userId,
                data.content
            );
            const targetSocketId = await getSocketId(data.targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("receive_direct_message", message);
                io.to(targetSocketId).emit("notification:new", notif);
            }
        } catch (e) {
            console.error("direct message notify error:", e);
            const targetSocketId = await getSocketId(data.targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("receive_direct_message", message);
            }
        }
    });

    socket.on("send_battle_message", async (data: {
        roomId: string,
        content: string
    }) => {
        const { roomId, content } = data;
        if (!content || !content.trim()) return;
        const trimmed = content.trim().slice(0, 2000);

        // Enrich with sender identity + role so clients can render name/role
        // badges in the chat bubble AND in the toast for the same message.
        const sender = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, role: true },
        }).catch(() => null);

        // Resolve whether the sender is THIS room's host (they moderate it).
        let isHost = false;
        try {
            const event = roomId.startsWith("room-")
                ? await prisma.event.findUnique({ where: { id: roomId.replace("room-", "") }, select: { hostId: true } })
                : await prisma.event.findFirst({ where: { roomCode: roomId }, select: { hostId: true } });
            isHost = !!event && event.hostId === userId;
        } catch {
            isHost = false;
        }

        const role = (sender?.role || "USER").toUpperCase();
        const badge = isHost ? "MODERATOR" : (role === "ADMIN" || role === "MODERATOR" ? role : "USER");

        const message = {
            id: Date.now().toString(),
            socketId: socket.id,
            senderId: userId,
            username: sender?.username || "Operative",
            role: badge,
            isHost,
            content: trimmed,
            createdAt: new Date().toISOString()
        };

        // broadcast strictly to players in this arena
        io.to(roomId).emit("receive_battle_message", message);
    });
}
