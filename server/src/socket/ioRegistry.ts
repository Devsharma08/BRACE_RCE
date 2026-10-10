import type { Server } from "socket.io";
import { getSocketId } from "./stateRedis.js";

/**
 * Registry exposing the live Socket.IO server to HTTP controllers.
 *
 * REST handlers (friends, profile, ...) run outside the socket layer, so they
 * cannot reach `io` through the per-connection HandlerCtx. `initSocketServer`
 * registers the instance once at boot; until then (unit tests, isolated
 * controllers) every helper degrades to a guarded no-op.
 */
let ioRef: Server | null = null;

export function registerIO(io: Server): void {
  ioRef = io;
}

export function getIO(): Server | null {
  return ioRef;
}

/**
 * Emit `event` to every socket belonging to `userId`.
 * Returns true when the event reached at least one live socket.
 */
export async function emitToUser(
  userId: string | undefined | null,
  event: string,
  payload?: unknown
): Promise<boolean> {
  if (!ioRef || !userId) return false;
  try {
    const socketId = await getSocketId(userId);
    if (!socketId) return false;
    ioRef.to(socketId).emit(event, payload);
    return true;
  } catch (error) {
    console.error(`emitToUser(${event}) failed:`, error);
    return false;
  }
}

/**
 * Tell every affected user their friend graph changed (lists, incoming
 * requests, blocks). Clients respond by invalidating the friends query keys.
 */
export async function emitFriendsUpdate(
  userIds: Array<string | undefined | null>
): Promise<void> {
  const unique = new Set(userIds.filter((id): id is string => Boolean(id)));
  for (const id of unique) {
    await emitToUser(id, "friends:update", {});
  }
}

/** Push a freshly created notification to the user's live sockets. */
export async function emitNotification(
  userId: string,
  notification: unknown
): Promise<void> {
  await emitToUser(userId, "notification:new", notification);
}

/**
 * Tell every connected client the public room list changed (create / delete /
 * expire / lock / visibility-change / terminate). Clients refetch lobby data in
 * one wave instead of relying on window-focus or a stale timer. No-op before the
 * socket server boots (unit tests / isolated controllers).
 */
export function emitRoomsInvalidate(): void {
  if (!ioRef) return;
  ioRef.emit("rooms:invalidate", { at: Date.now() });
}

/**
 * Force everyone out of a room with a human-readable reason. Emitted on delete,
 * host end, admin terminate, and scheduled close so participants see WHY the
 * room closed and are routed back to the lobby.
 *
 * Rooms are addressed by both the roomCode and the `room-<id>` socket room name,
 * since clients join under whichever the URL carried.
 */
export function emitRoomForceClosed(
  event: { id: string; roomCode: string | null },
  reason: string,
): void {
  if (!ioRef) return;
  const payload = { roomId: event.id, roomCode: event.roomCode, reason };
  if (event.roomCode) ioRef.to(event.roomCode).emit("room_force_closed", payload);
  ioRef.to(`room-${event.id}`).emit("room_force_closed", payload);
}
