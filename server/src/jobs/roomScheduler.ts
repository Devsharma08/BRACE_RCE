import type { Server } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { finishEventWithVerdicts } from "../services/battleFinish.js";
import { notifyEventReport } from "../services/notificationService.js";
import { emitRoomsInvalidate } from "../socket/ioRegistry.js";

const TICK_MS = 30_000;
const WARNING_WINDOW_MS = 5 * 60 * 1000;

// Room ids already warned about the upcoming scheduled close for
// this process lifetime. In-memory on purpose: a restart may
// re-warn, which only re-shows a dismissible banner.
const warnedRoomIds = new Set<string>();

/**
 * Clients join the socket room under whichever identifier the
 * URL carried (roomCode or `room-<uuid>`), so scheduler events
 * are emitted to both names.
 */
const emitToRoom = (
  io: Server,
  event: { id: string; roomCode: string | null },
  eventName: string,
  payload: unknown,
) => {
  if (event.roomCode) {
    io.to(event.roomCode).emit(eventName, payload);
  }
  io.to(`room-${event.id}`).emit(eventName, payload);
};

/**
 * Room scheduling worker — runs every 30s and drives three
 * transitions:
 *   1. WAITING rooms whose `opensAt` has arrived → IN_PROGRESS
 *      (emits `room_opening`).
 *   2. IN_PROGRESS rooms within 5 minutes of `closesAt` →
 *      emits `room_closing` once (warning banner).
 *   3. IN_PROGRESS rooms past `closesAt` → finished with
 *      per-participant verdicts (emits `room_closed` and
 *      delivers EVENT_RESULT notifications).
 */
export function startRoomScheduler(io: Server): void {
  setInterval(async () => {
    const now = new Date();
    const warningHorizon = new Date(now.getTime() + WARNING_WINDOW_MS);

    try {
      // 1. Scheduled openings
      const opening = await prisma.event.findMany({
        where: { status: "WAITING", opensAt: { lte: now } },
      });
      for (const event of opening) {
        try {
          await prisma.event.update({
            where: { id: event.id },
            data: { status: "IN_PROGRESS", startedAt: now },
          });
          emitToRoom(io, event, "room_opening", {
            roomId: event.id,
            roomCode: event.roomCode,
            startedAt: now,
          });
          console.log(`[scheduler] room ${event.roomCode || event.id} opened on schedule`);
        } catch (e) {
          console.error("[scheduler] room_opening error:", e);
        }
      }

      // 2. Closing warnings (T-5 minutes, once per room)
      const warning = await prisma.event.findMany({
        where: {
          status: "IN_PROGRESS",
          closesAt: { gt: now, lte: warningHorizon },
        },
      });
      for (const event of warning) {
        if (warnedRoomIds.has(event.id)) continue;
        warnedRoomIds.add(event.id);
        try {
          emitToRoom(io, event, "room_closing", {
            roomId: event.id,
            roomCode: event.roomCode,
            closesAt: event.closesAt,
          });
        } catch (e) {
          console.error("[scheduler] room_closing error:", e);
        }
      }

      // 3. Scheduled closes
      const closing = await prisma.event.findMany({
        where: { status: "IN_PROGRESS", closesAt: { lte: now } },
      });
      for (const event of closing) {
        try {
          const finished = await finishEventWithVerdicts(event.id);
          emitToRoom(io, event, "room_closed", {
            roomId: event.id,
            roomCode: event.roomCode,
            reason: "SCHEDULE",
          });
          // Unified force-close with a human-readable reason, then refresh lobbies.
          emitToRoom(io, event, "room_force_closed", {
            roomId: event.id,
            roomCode: event.roomCode,
            reason: "This room reached its scheduled close time.",
          });
          emitRoomsInvalidate();
          if (finished) {
            await notifyEventReport(event.id).catch((e) =>
              console.error("[scheduler] event report error:", e),
            );
          }
          console.log(`[scheduler] room ${event.roomCode || event.id} closed on schedule`);
        } catch (e) {
          console.error("[scheduler] room_closed error:", e);
        }
      }
    } catch (e) {
      console.error("[scheduler] tick error:", e);
    }
  }, TICK_MS);
}
