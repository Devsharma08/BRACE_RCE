import type { HandlerCtx } from "../types.js";
import { getFriendIds } from "../presence.js";

/**
 * `request_presence` → `presence_snapshot`.
 *
 * The client has always emitted this event and listened for `presence_snapshot`
 * (SocketContext + FriendDashboard), but no server handler existed — so online
 * dots could only ever turn OFF and never light up.
 *
 * Only accepted friends are answered, so this cannot be used to probe the
 * presence of arbitrary users.
 */
export function registerPresenceHandlers(ctx: HandlerCtx): void {
    const { socket, userId, state } = ctx;

    socket.on("request_presence", async (data: { userIds?: string[] } | undefined) => {
        const requested = Array.isArray(data?.userIds)
            ? data.userIds.filter((id): id is string => typeof id === "string")
            : [];
        if (requested.length === 0) return;

        const friendIds = new Set(await getFriendIds(userId));

        const snapshot = requested
            .filter((id) => friendIds.has(id))
            .map((id) => ({
                userId: id,
                status: state.onlineUsers.has(id) ? "ONLINE" : "OFFLINE",
            }));

        socket.emit("presence_snapshot", snapshot);
    });
}