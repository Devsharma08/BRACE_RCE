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
const memoryOnlineUsers = new Map<string, string>();
const memoryUserSocketCounts = new Map<string, number>();
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

export async function markOnline(userId: string, socketId: string): Promise<boolean> {
  const currentCount = memoryUserSocketCounts.get(userId) ?? 0;

  if (currentCount >= MAX_SOCKETS_PER_USER) {
    return false;
  }

  memoryOnlineUsers.set(userId, socketId);
  memoryUserSocketCounts.set(userId, currentCount + 1);

  await redisSet(cacheKey(`user:${userId}:socket`), socketId, 86400);
  await redisSet(cacheKey(`user:${userId}:sockets`), currentCount + 1, 86400);

  return true;
}

export async function markOffline(userId: string): Promise<boolean> {
  const remaining = (memoryUserSocketCounts.get(userId) ?? 1) - 1;

  if (remaining > 0) {
    memoryUserSocketCounts.set(userId, remaining);
    return false;
  }

  memoryUserSocketCounts.delete(userId);
  memoryOnlineUsers.delete(userId);

  await redisDel(cacheKey(`user:${userId}:socket`));
  await redisDel(cacheKey(`user:${userId}:sockets`));

  return true;
}

export async function getOnlineUsers(): Promise<Map<string, string>> {
  const cached = await redisGet<Map<string, string>>(cacheKey("user:online"));
  if (cached) return new Map(cached);
  return new Map(memoryOnlineUsers);
}

export async function getSocketId(userId: string): Promise<string | undefined> {
  const cached = await redisGet<string>(cacheKey(`user:${userId}:socket`));
  if (cached) return cached;
  return memoryOnlineUsers.get(userId);
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
  memoryUserSocketCounts.clear();
}
