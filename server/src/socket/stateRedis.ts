import type { CustomLobby } from "./types.js";
import { getCached, setCached, deleteCached, deleteCachedByPrefix, checkCacheHealth } from "../lib/cache.js";

/**
 * Lobby with its ID
 */
export interface LobbyWithId extends CustomLobby {
  id: string;
}

/**
 * Socket state using node-cache (in-memory) for low latency.
 * Falls back to in-memory Maps when cache unavailable.
 */

// In-memory fallbacks
const memoryLobbies = new Map<string, CustomLobby>();
const memoryOnlineUsers = new Map<string, string>();
const memorySearchIntervals = new Map<string, NodeJS.Timeout>();
const memoryUserSocketCounts = new Map<string, number>();

const CACHE_KEY_PREFIX = "brace:socket:";

/**
 * Maximum concurrent socket connections per user.
 * Prevents connection exhaustion from a single user.
 */
export const MAX_SOCKETS_PER_USER = 5;

function cacheKey(suffix: string): string {
  return `${CACHE_KEY_PREFIX}${suffix}`;
}

// --- Lobby Management ---

export async function setLobby(lobbyId: string, lobby: CustomLobby): Promise<void> {
  const key = cacheKey(`lobby:${lobbyId}`);
  setCached(key, lobby, 3600); // 1 hour TTL
  memoryLobbies.set(lobbyId, lobby);
}

export async function getLobby(lobbyId: string): Promise<CustomLobby | undefined> {
  const key = cacheKey(`lobby:${lobbyId}`);
  const cached = getCached<CustomLobby>(key);
  if (cached) return cached;
  return memoryLobbies.get(lobbyId);
}

export async function deleteLobby(lobbyId: string): Promise<void> {
  const key = cacheKey(`lobby:${lobbyId}`);
  deleteCached(key);
  memoryLobbies.delete(lobbyId);
}

export async function getAllLobbies(): Promise<LobbyWithId[]> {
  const cached = getCached<LobbyWithId[]>(cacheKey("all-lobbies"));
  if (cached) return cached;
  return Array.from(memoryLobbies.entries()).map(([id, lobby]) => ({ ...lobby, id }));
}

// --- Online Users Management ---

export async function markOnline(userId: string, socketId: string): Promise<boolean> {
  const currentCount = memoryUserSocketCounts.get(userId) ?? 0;
  
  // Enforce connection limit
  if (currentCount >= MAX_SOCKETS_PER_USER) {
    return false;
  }
  
  memoryOnlineUsers.set(userId, socketId);
  memoryUserSocketCounts.set(userId, currentCount + 1);
  
  // Also store in cache
  setCached(cacheKey(`user:${userId}:socket`), socketId, 86400); // 24h
  setCached(cacheKey(`user:${userId}:sockets`), currentCount + 1, 86400);
  
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
  
  deleteCached(cacheKey(`user:${userId}:socket`));
  deleteCached(cacheKey(`user:${userId}:sockets`));
  
return true;
}

export async function getOnlineUsers(): Promise<Map<string, string>> {
  // Get from memory (primary source)
  return new Map(memoryOnlineUsers);
}

export async function getSocketId(userId: string): Promise<string | undefined> {
  const cached = getCached<string>(cacheKey(`user:${userId}:socket`));
  if (cached) return cached;
  return memoryOnlineUsers.get(userId);
}

// --- Search Intervals (keep in memory - process-specific) ---

export const activeSearchIntervals = new Map<string, NodeJS.Timeout>();

// --- Active Lobbies (computed from cache + memory) ---

export async function getActiveLobbiesMap(): Promise<Map<string, CustomLobby>> {
  const lobbies = await getAllLobbies();
  return new Map(lobbies.map((l) => [l.id, l]));
}

// --- Health Check ---

export async function checkSocketStateHealth(): Promise<{ backend: "memory"; healthy: boolean }> {
  const health = checkCacheHealth();
  return { backend: "memory", healthy: health.healthy };
}

// --- Cleanup ---

export async function clearAllSocketState(): Promise<void> {
  deleteCachedByPrefix(CACHE_KEY_PREFIX);
  memoryLobbies.clear();
  memoryOnlineUsers.clear();
  memoryUserSocketCounts.clear();
}