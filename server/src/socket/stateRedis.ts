import type { CustomLobby } from "./types.js";
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

const CACHE_KEY_PREFIX = "brace:socket:";

function cacheKey(suffix: string): string {
  return `${CACHE_KEY_PREFIX}${suffix}`;
}

async function getRedis() {
  try {
    const client = getRedisClient();
    if (client.isOpen) return client;
    return null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (err) {
    logger.error(`Redis SET failed: ${String(err)}`);
    return false;
  }
}

async function redisGet<T>(key: string): Promise<T | undefined> {
  const client = await getRedis();
  if (!client) return undefined;
  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (err) {
    logger.error(`Redis GET failed: ${String(err)}`);
    return undefined;
  }
}

async function redisDel(key: string): Promise<boolean> {
  const client = await getRedis();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.error(`Redis DEL failed: ${String(err)}`);
    return false;
  }
}

async function redisKeysByPattern(pattern: string): Promise<string[]> {
  const client = await getRedis();
  if (!client) return [];
  try {
    const keys = await client.keys(pattern);
    return keys;
  } catch (err) {
    logger.error(`Redis KEYS failed: ${String(err)}`);
    return [];
  }
}

async function redisDelMany(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const client = await getRedis();
  if (!client) return 0;
  try {
    let deleted = 0;
    for (const key of keys) {
      deleted += await client.del(key);
    }
    return deleted;
  } catch (err) {
    logger.error(`Redis DEL MANY failed: ${String(err)}`);
    return 0;
  }
}

// In-memory fallbacks for when Redis is unavailable
const memoryLobbies = new Map<string, CustomLobby>();
// Changed: track a SET of socket ids per user instead of a single one.
const memoryOnlineUsers = new Map<string, Set<string>>();
const memorySearchIntervals = new Map<string, NodeJS.Timeout>();

export const MAX_SOCKETS_PER_USER = 5;

export interface LobbyWithId extends CustomLobby {
  id: string;
}

export async function setLobby(lobbyId: string, lobby: CustomLobby): Promise<void> {
  const key = cacheKey(`lobby:${lobbyId}`);
  const wroteToRedis = await redisSet(key, lobby, 3600);
  memoryLobbies.set(lobbyId, lobby);
  if (!wroteToRedis) {
    logger.warn("Redis unavailable for setLobby, using memory only");
  }
}

export async function getLobby(lobbyId: string): Promise<CustomLobby | undefined> {
  const key = cacheKey(`lobby:${lobbyId}`);
  const cached = await redisGet<CustomLobby>(key);
  if (cached) return cached;
  return memoryLobbies.get(lobbyId);
}

export async function deleteLobby(lobbyId: string): Promise<void> {
  const key = cacheKey(`lobby:${lobbyId}`);
  await redisDel(key);
  memoryLobbies.delete(lobbyId);
}

export async function getAllLobbies(): Promise<LobbyWithId[]> {
  const cached = await redisGet<LobbyWithId[]>(cacheKey("all-lobbies"));
  if (cached) return cached;
  return Array.from(memoryLobbies.entries()).map(([id, lobby]) => ({ ...lobby, id }));
}

/**
 * Register a new socket for this user. Returns false when the connection
 * limit has been reached. Stores ALL socket ids (up to MAX_SOCKETS_PER_USER)
 * so emitToUser can fan out to every live tab.
 */
export async function markOnline(userId: string, socketId: string): Promise<boolean> {
  // Read the authoritative Redis set first so cross-worker sockets are preserved
  const cached = await redisGet<string[]>(cacheKey(`user:${userId}:sockets`));
  const existing = cached && cached.length > 0
    ? new Set<string>(cached)
    : (memoryOnlineUsers.get(userId) ?? new Set<string>());

  if (existing.size >= MAX_SOCKETS_PER_USER) {
    return false;
  }

  existing.add(socketId);
  memoryOnlineUsers.set(userId, existing);

  // Persist the FULL set (local + Redis) so other workers see all sockets.
  // TTL: 5 minutes — short enough to auto-expire stale sockets from crashed
  // browsers/tabs, long enough to survive brief network hiccups.
  const arr = Array.from(existing);
  await redisSet(cacheKey(`user:${userId}:sockets`), arr, 300);

  return true;
}

/**
 * Remove a specific socket for this user. Returns true when the user
 * has NO remaining live sockets (i.e. they went fully offline).
 * Unlike the old implementation, a remaining live socket is always
 * preserved in the set so emitToUser never targets a dead id.
 */
export async function markOffline(userId: string, socketId?: string): Promise<boolean> {
  // Read the authoritative Redis set FIRST — local memory may be empty if the
  // user's other sockets live on a different PM2 worker. Only delete the Redis
  // entry when ALL sockets are gone (truly offline).
  const cached = await redisGet<string[]>(cacheKey(`user:${userId}:sockets`));
  let existing: Set<string>;

  if (cached && cached.length > 0) {
    existing = new Set<string>(cached);
  } else {
    existing = memoryOnlineUsers.get(userId) ?? new Set<string>();
  }

  if (existing.size === 0) {
    // User was not tracked anywhere — nothing to clean up.
    memoryOnlineUsers.delete(userId);
    return true;
  }

  if (socketId) {
    existing.delete(socketId);
  } else {
    // Legacy callers without a socketId: remove one arbitrary entry.
    const first = existing.values().next().value;
    if (first) existing.delete(first);
  }

  if (existing.size === 0) {
    memoryOnlineUsers.delete(userId);
    await redisDel(cacheKey(`user:${userId}:sockets`));
    return true;
  }

  // User still has live sockets — update both in-memory and Redis.
  memoryOnlineUsers.set(userId, existing);
  await redisSet(cacheKey(`user:${userId}:sockets`), Array.from(existing), 300);
  return false;
}

/**
 * Return a Map of userId → one arbitrary socketId for each online user.
 * Checks in-memory first, then falls back to Redis for cross-process users.
 */
export async function getOnlineUsers(): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Collect from in-memory state first
  for (const [userId, sockets] of memoryOnlineUsers) {
    const first = sockets.values().next().value;
    if (first) result.set(userId, first);
  }

  // Also scan Redis for users connected to OTHER worker processes.
  // Each online user has a key: brace:socket:user:<userId>:sockets
  const client = await getRedis();
  if (client) {
    try {
      const keys = await client.keys(`${CACHE_KEY_PREFIX}user:*:sockets`);
      for (const key of keys) {
        // Extract userId from key: "brace:socket:user:<userId>:sockets"
        const parts = key.split(":");
        const userId = parts[3];
        if (!userId || result.has(userId)) continue; // Skip if already in memory
        const socketId = await getSocketId(userId);
        if (socketId) result.set(userId, socketId);
      }
    } catch (err) {
      logger.error(`Redis SCAN for online users failed: ${String(err)}`);
    }
  }

  return result;
}

/**
 * Return ONE socket id for this user (backward compat).
 * Prefers the in-memory set; falls back to Redis.
 */
export async function getSocketId(userId: string): Promise<string | undefined> {
  const mem = memoryOnlineUsers.get(userId);
  if (mem && mem.size > 0) {
    return mem.values().next().value;
  }
  // Fall back to Redis (cross-process).
  const cached = await redisGet<string[]>(cacheKey(`user:${userId}:sockets`));
  if (cached && cached.length > 0) return cached[0];
  return undefined;
}

/**
 * Return ALL socket ids for this user so emitToUser can fan out to
 * every live tab. This is the primary method for cross-tab delivery.
 */
export async function getSocketIds(userId: string): Promise<string[]> {
  const mem = memoryOnlineUsers.get(userId);
  if (mem && mem.size > 0) {
    return Array.from(mem);
  }
  // Fall back to Redis (cross-process).
  const cached = await redisGet<string[]>(cacheKey(`user:${userId}:sockets`));
  return cached ?? [];
}

export const activeSearchIntervals = new Map<string, NodeJS.Timeout>();

export async function getActiveLobbiesMap(): Promise<Map<string, CustomLobby>> {
  const lobbies = await getAllLobbies();
  return new Map(lobbies.map((l) => [l.id, l]));
}

export async function checkSocketStateHealth(): Promise<{ backend: "redis" | "memory"; healthy: boolean }> {
  const client = await getRedis();
  if (client && client.isOpen) {
    return { backend: "redis", healthy: true };
  }
  return { backend: "memory", healthy: true };
}

export async function clearAllSocketState(): Promise<void> {
  const keys = await redisKeysByPattern(`${CACHE_KEY_PREFIX}*`);
  if (keys.length > 0) {
    await redisDelMany(keys);
  }
  memoryLobbies.clear();
  memoryOnlineUsers.clear();
}
