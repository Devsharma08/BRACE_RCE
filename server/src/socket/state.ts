import type { CustomLobby } from "./types.js";

export const activeLobbies = new Map<string, CustomLobby>();
export const onlineUsers = new Map<string, string>();
export const activeSearchIntervals = new Map<string, NodeJS.Timeout>();

// Presence helpers — keep onlineUsers consistent and avoid broadcasting
// every connect/disconnect to all connected clients.
export function markOnline(userId: string, socketId: string) {
    onlineUsers.set(userId, socketId);
}

export function markOffline(userId: string) {
    onlineUsers.delete(userId);
}

export function getSocketId(userId: string): string | undefined {
    return onlineUsers.get(userId);
}
