import NodeCache from "node-cache";
import { getRedisClient } from "./redis.js";

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

let redisAvailable = false;

async function tryRedis(): Promise<boolean> {
  if (redisAvailable) return true;
  try {
    const client = getRedisClient();
    if (client.isOpen) {
      await client.ping();
      redisAvailable = true;
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function getCachedAsync<T>(key: string): Promise<T | undefined> {
  if (await tryRedis()) {
    const client = getRedisClient();
    try {
      const raw = await client.get(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      // Fall through to memory cache
    }
  }
  return cache.get<T>(key);
}

export async function setCachedAsync<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  if (await tryRedis()) {
    const client = getRedisClient();
    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    } catch {
      // Fall through to memory cache
    }
  }
  cache.set(key, value, ttlSeconds);
}

export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCached<T>(key: string, value: T, ttlSeconds = 300): void {
  cache.set(key, value, ttlSeconds);
}

export function deleteCached(key: string): void {
  cache.del(key);
}

export function deleteCachedByPrefix(prefix: string): number {
  const keys = cache.keys().filter((key) => key.startsWith(prefix));
  if (keys.length > 0) {
    cache.del(keys);
  }
  return keys.length;
}

export async function deleteCachedByPrefixAsync(prefix: string): Promise<number> {
  if (await tryRedis()) {
    const client = getRedisClient();
    try {
      const keys = await client.keys(prefix + "*");
      if (keys.length > 0) {
        for (const k of keys) await client.del(k);
      }
      return keys.length;
    } catch {
      // Fall through to memory cache
    }
  }
  return deleteCachedByPrefix(prefix);
}

export async function checkCacheHealth(): Promise<{ backend: "redis" | "memory"; healthy: boolean; latencyMs?: number }> {
  try {
    const client = getRedisClient();
    if (client.isOpen) {
      const start = Date.now();
      await client.ping();
      return { backend: "redis", healthy: true, latencyMs: Date.now() - start };
    }
  } catch {
    // Fall through
  }
  return { backend: "memory", healthy: true };
}

export function clearCache(): void {
  cache.flushAll();
}

export function getCacheStats(): NodeCache.Stats {
  return cache.getStats();
}

export function getKeysByPrefix(prefix: string): string[] {
  return cache.keys().filter((key) => key.startsWith(prefix));
}

export const internalCache = {
  get: <T>(key: string): T | undefined => cache.get<T>(key),
  set: <T>(key: string, value: T, ttlSeconds = 300): void => { cache.set(key, value, ttlSeconds); },
  del: (key: string): void => { cache.del(key); },
  flushAll: (): void => cache.flushAll(),
  keys: (): string[] => cache.keys(),
};

export async function getRedis(): Promise<ReturnType<typeof getRedisClient>> {
  return getRedisClient();
}
