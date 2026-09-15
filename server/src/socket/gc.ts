import type { Server } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { activeLobbies } from "./state.js";

export const LOBBY_TTL_MS = 15 * 60 * 1000; // 15 min constraint
export const ROOM_DISSOLVE_AFTER_MS = 30 * 60 * 1000; // 30 min — WAITING DB rooms dissolve

// ──────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL GARBAGE COLLECTORS (run once regardless of active connections)
// ──────────────────────────────────────────────────────────────────────────────

// In-memory lobby GC — runs every 60 s
let _gcInitialized = false;
let _dbDissolveInterval: NodeJS.Timeout | null = null;

export function initModuleGC(io: Server) {
    if (_gcInitialized) return;
    _gcInitialized = true;

    // In-memory lobby cleanup
    setInterval(() => {
        const now = Date.now();
        for (const [code, lobby] of activeLobbies.entries()) {
            if (now > lobby.expiresAt) {
                io.to(`lobby-${code}`).emit('lobby_error', 'Lobby expired due to inactivity!');
                activeLobbies.delete(code);
                console.log(`[GC] Cleaned stale in-memory lobby: ${code}`);
            }
        }
    }, 60_000);

    // DB room dissolve — runs every 5 minutes
    // Sets status=DISSOLVED for WAITING Event rows older than ROOM_DISSOLVE_AFTER_MS
    _dbDissolveInterval = setInterval(async () => {
        try {
            const threshold = new Date(Date.now() - ROOM_DISSOLVE_AFTER_MS);
            const dissolved = await prisma.event.updateMany({
                where: { status: 'WAITING', createdAt: { lt: threshold } },
                data: { status: 'DISSOLVED' }
            });
            if (dissolved.count > 0) {
                console.log(`[GC] Auto-dissolved ${dissolved.count} stale WAITING room(s)`);
            }
        } catch (e) {
            console.error('[GC] DB dissolve error:', e);
        }
    }, 5 * 60_000);
}
