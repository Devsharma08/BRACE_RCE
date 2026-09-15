import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerMessagingHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;
    const { onlineUsers } = ctx.state;

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
            const targetSocketId = onlineUsers.get(data.targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("receive_direct_message", message);
                io.to(targetSocketId).emit("notification:new", notif);
            }
        } catch (e) {
            console.error("direct message notify error:", e);
            const targetSocketId = onlineUsers.get(data.targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("receive_direct_message", message);
            }
        }
    });

    socket.on("send_battle_message", (data: {
        roomId: string,
        content: string
    }) => {
        const { roomId, content } = data;
        const message = {
            id: Date.now().toString(),
            socketId: socket.id,
            content,
            createdAt: new Date().toISOString()
        };

        // broadcast strictly to players in this arena
        io.to(roomId).emit("receive_battle_message", message);
    });
}
