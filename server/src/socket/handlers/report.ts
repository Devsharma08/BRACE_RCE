import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";
import { getSocketId } from "../stateRedis.js";

export type ReportCategory = "QUESTION" | "DOUBT" | "TESTCASE" | "OTHER";

/**
 * Room-scoped 1:1 report threads (participant <-> room moderator).
 *
 * A participant files a report against their room; the message goes to the
 * room's host (the moderator). The moderator (host or global admin) can reply.
 * Auth: the caller must be the host, a participant of the room, or a global
 * admin. Falls back to `notification:new` when the other side is offline.
 */
export function registerReportHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;

    async function isThreadVisible(eventId: string, uid: string): Promise<{ event: any; isMod: boolean } | null> {
        const event = await prisma.event.findUnique({ where: { id: eventId } }).catch(() => null);
        if (!event) return null;
        const caller = await prisma.user
            .findUnique({ where: { id: uid }, select: { role: true } })
            .catch(() => null);
        const moderator = event.hostId === uid || ((caller?.role || "").toUpperCase() === "ADMIN");
        const isParticipant = await prisma.userPersonalPerformance
            .findFirst({ where: { eventId, userId: uid }, select: { id: true } })
            .catch(() => null);
        if (!moderator && !isParticipant) return null;
        return { event, isMod: moderator };
    }

    async function deliverReports(participantId: string, eventId: string): Promise<void> {
        const messages = await prisma.reportMessage.findMany({
            where: { eventId, OR: [{ senderId: participantId }, { recipientId: participantId }] },
            include: {
                sender: { select: { id: true, username: true, avatarUrl: true } },
                recipient: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "asc" },
        }).catch(() => []);
        socket.emit("report:thread", { eventId, participantId, messages });
    }

    // Send a report message (participant -> host, or host/admin -> participant).
    socket.on("report:send", async (data: {
        eventId: string;
        recipientId?: string;
        category?: ReportCategory | string;
        content: string;
    }) => {
        try {
            const { eventId, content } = data ?? ({} as any);
            if (!eventId || !content || !content.trim()) return;
            const visible = await isThreadVisible(eventId, userId);
            if (!visible) return;
            const { event, isMod } = visible;
            // Recipient is always the OTHER side: participants write UP to the
            // host; moderators answer a chosen participant.
            const recipientId = isMod
                ? ((data as any).recipientId as string) || event.hostId
                : event.hostId;
            if (!recipientId || recipientId === userId) return;
            const rawCat = String((data as any).category || "").toUpperCase();
            const category = ["QUESTION", "DOUBT", "TESTCASE", "OTHER"].includes(rawCat) ? rawCat : "OTHER";
            const message = await prisma.reportMessage.create({
                data: {
                    eventId,
                    category,
                    content: content.trim().slice(0, 2000),
                    senderId: userId,
                    recipientId,
                },
                include: {
                    sender: { select: { id: true, username: true, avatarUrl: true } },
                    recipient: { select: { id: true, username: true, avatarUrl: true } },
                },
            });
            const targetSocketId = await getSocketId(recipientId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("report:new", message);
            }
            // Echo back to the sender so either side's thread view updates.
            socket.emit("report:new", message);
        } catch (e) {
            console.error("[report:send] error:", e);
        }
    });

    // Fetch the 1:1 thread. Participants always get their own thread with the
    // host; moderators pass participantId to pick a thread.
    socket.on("report:list", async (data: { eventId: string; participantId?: string }) => {
        try {
            const { eventId } = data ?? ({} as any);
            if (!eventId) return;
            const visible = await isThreadVisible(eventId, userId);
            if (!visible) return;
            const pid = visible.isMod ? ((data as any).participantId as string) || visible.event.hostId : userId;
            await deliverReports(pid, eventId);
        } catch (e) {
            console.error("[report:list] error:", e);
        }
    });

    // Moderator marks a participant's thread resolved.
    socket.on("report:resolve", async (data: { eventId: string; participantId: string }) => {
        try {
            const { eventId, participantId } = data ?? ({} as any);
            if (!eventId || !participantId) return;
            const visible = await isThreadVisible(eventId, userId);
            if (!visible || !visible.isMod) return;
            await prisma.reportMessage
                .updateMany({ where: { eventId, senderId: participantId }, data: { status: "RESOLVED" } })
                .catch(() => null);
            await deliverReports(participantId, eventId);
            const targetSocketId = await getSocketId(participantId);
            if (targetSocketId) {
                io.to(targetSocketId).emit("report:status", { eventId, participantId, status: "RESOLVED" });
            }
        } catch (e) {
            console.error("[report:resolve] error:", e);
        }
    });
}
