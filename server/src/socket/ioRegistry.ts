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
