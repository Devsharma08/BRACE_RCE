import type { Server } from "socket.io";
import { prisma } from "../lib/prisma.js";

/**
 * Resolve the accepted-friend ids of a user (the `User.friends` self-relation).
 *
 * Returns an empty array on any failure so a database hiccup can never break
 * connect/disconnect handling.
 */
export async function getFriendIds(userId: string): Promise<string[]> {
    try {
        const friendRequests = await prisma.friendRequest.findMany({
            where: {
                status: "ACCEPTED",
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            select: { senderId: true, receiverId: true }
        });
        return friendRequests.map((fr) =>
            fr.senderId === userId ? fr.receiverId : fr.senderId
        );
    } catch {
        return [];
    }
}

/**
 * Emit a presence change to the sockets of `friendIds` only.
 *
 * Presence used to be sent with `io.emit(...)` on every connect/disconnect,
 * which pushed a message to every connected user, leaked the presence of
 * unrelated users, and got O(users²) noisy at scale.
 */
export function emitPresenceToFriends(
    io: Server,
    onlineUsers: Map<string, string>,
    friendIds: string[],
    payload: { userId: string; status: "ONLINE" | "OFFLINE" },
): void {
    for (const friendId of friendIds) {
        if (friendId === payload.userId) continue;
        const socketId = onlineUsers.get(friendId);
        if (socketId) io.to(socketId).emit("user_online_status", payload);
    }
}