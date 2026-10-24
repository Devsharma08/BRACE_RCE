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

    socket.on("send_battle_message", async (data: {
        roomId: string,
        content: string
    }) => {
        const { roomId, content } = data;
        if (!content || !content.trim()) return;
        const trimmed = content.trim().slice(0, 2000);

        try {
            // Enrich with sender identity + role so clients can render name/role
            // badges in the chat bubble AND in the toast for the same message.
            const sender = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true, role: true },
            }).catch(() => null);

            // Resolve the event — roomId from the client can be:
            //   "room-<uuid>"  → matchmaking / direct-link rooms (roomCode may be null)
            //   "<ROOMCODE>"   → custom/public rooms addressed by their 6-char code
            // Using findFirst({ roomCode }) alone silently drops messages for
            // ONE_VS_ONE matchmaking events where roomCode is null in the DB.
            let event: { id: string; roomCode: string | null; hostId: string | null } | null = null;
            if (roomId.startsWith("room-")) {
                event = await prisma.event.findUnique({
                    where: { id: roomId.replace("room-", "") },
                    select: { id: true, roomCode: true, hostId: true },
                });
            } else {
                event = await prisma.event.findFirst({
                    where: { roomCode: roomId },
                    select: { id: true, roomCode: true, hostId: true },
                });
            }

            if (!event) {
                return socket.emit("battle_message_error", "Event not found — cannot send message.");
            }

            const isHost = !!event.hostId && event.hostId === userId;
            const role = (sender?.role || "USER").toUpperCase();
            const badge = isHost ? "MODERATOR" : (role === "ADMIN" || role === "MODERATOR" ? role : "USER");

            // Persist the battle message as a room-scoped thread by storing the
            // eventId. Previously messages were stored as 1:1 DMs to the host,
            // which meant battle chat history was never loaded on Battle mount.
            // For matchmaking rooms (hostId = null), store sender as receiverId.
            const saved = await prisma.message.create({
                data: {
                    senderId: userId,
                    receiverId: event.hostId ?? userId,
                    content: trimmed,
                    data: { eventId: event.id, battleChat: true } as any,
                },
            }).catch(() => null);

            const message = {
                id: saved?.id ?? `${socket.id}-${Date.now()}`,
                socketId: socket.id,
                senderId: userId,
                username: sender?.username || "Operative",
                role: badge,
                isHost,
                content: trimmed,
                createdAt: (saved?.createdAt ?? new Date()).toISOString(),
            };

            // Broadcast to all room aliases so every client sees the message
            // regardless of which room identifier they joined with.
            const targetRooms = [roomId, `room-${event.id}`, event.roomCode].filter(Boolean) as string[];
            const uniqueRooms = [...new Set(targetRooms)];
            for (const tr of uniqueRooms) {
                io.to(tr).emit("receive_battle_message", message);
            }
        } catch (err) {
            console.error("[send_battle_message] error:", err);
            socket.emit("battle_message_error", "Failed to send message — please try again.");
        }
    });
}
