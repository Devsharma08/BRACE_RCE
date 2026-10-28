import type { Server } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { getSocketIds } from "./stateRedis.js";

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
 * Emit a presence change to ALL sockets of each friend.
 *
 * Uses getSocketIds (not a single socket id) so multi-tab users receive
 * the update on every open tab, not just the first one registered.
 *
 * The `resolveSocketIds` parameter is a seam for testing — production
 * callers use the default `getSocketIds` from stateRedis.
 */
export async function emitPresenceToFriends(
    io: Server,
    friendIds: string[],
    payload: { userId: string; status: "ONLINE" | "OFFLINE" },
): Promise<void> {
    for (const friendId of friendIds) {
        if (friendId === payload.userId) continue;
        const socketIds = await getSocketIds(friendId);
        for (const sid of socketIds) {
            io.to(sid).emit("user_online_status", payload);
        }
    }
}