import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";
import { getSocketIds } from "../stateRedis.js";

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

        // Echo back to the sender so their own UI can upsert the confirmed
        // message (replacing the optimistic local copy) and persist it in the
        // client-side DM store — otherwise sent messages vanish from the
        // sender's view if the local state is ever reset.
        socket.emit("receive_direct_message", message);

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
            // Fan out to ALL sockets of the target user (cross-tab).
            const targetSocketIds = await getSocketIds(data.targetUserId);
            for (const sid of targetSocketIds) {
                io.to(sid).emit("receive_direct_message", message);
                io.to(sid).emit("notification:new", notif);
            }
        } catch (e) {
            console.error("direct message notify error:", e);
            const targetSocketIds = await getSocketIds(data.targetUserId);
            for (const sid of targetSocketIds) {
                io.to(sid).emit("receive_direct_message", message);
            }
        }
    });
}
