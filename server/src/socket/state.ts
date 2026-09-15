import type { CustomLobby } from "./types.js";

export const activeLobbies = new Map<string, CustomLobby>();
export const onlineUsers = new Map<string, string>();
export const activeSearchIntervals = new Map<string, NodeJS.Timeout>();

/**
 * userId -> number of live sockets. `onlineUsers` keeps a single socket id per
 * user (last connection wins) because every targeted emit needs exactly one
 * destination, but a user can legitimately have several tabs open — this count
 * is what decides whether they are truly offline.
 */
const userSocketCounts = new Map<string, number>();

// Presence helpers — keep onlineUsers consistent and avoid broadcasting
// every connect/disconnect to all connected clients.
export function markOnline(userId: string, socketId: string) {
    onlineUsers.set(userId, socketId);
    userSocketCounts.set(userId, (userSocketCounts.get(userId) ?? 0) + 1);
}

/**
 * Drop one socket for a user.
 *
 * @returns true only when this was the user's LAST live socket, i.e. they are
 * genuinely offline now. Closing one of two tabs must not tell friends the user
 * went offline.
 */
export function markOffline(userId: string): boolean {
    const remaining = (userSocketCounts.get(userId) ?? 1) - 1;

    if (remaining > 0) {
        userSocketCounts.set(userId, remaining);
        return false;
    }

    userSocketCounts.delete(userId);
    onlineUsers.delete(userId);
    return true;
}

export function getSocketId(userId: string): string | undefined {
    return onlineUsers.get(userId);
}
