import NodeCache from "node-cache";

/**
 * In-memory cache using node-cache.
 * Fast, local cache with TTL support.
 * For horizontal scaling, consider Redis (but adds network latency).
 */

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
});

/**
 * Read a cached value. Returns undefined on a miss or an expired entry.
 */
export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Store a value. `ttlSeconds` defaults to 300s.
 */
export function setCached<T>(key: string, value: T, ttlSeconds = 300): void {
  cache.set(key, value, ttlSeconds);
}

/** Drop a single entry. */
export function deleteCached(key: string): void {
  cache.del(key);
}

/**
 * Drop every entry whose key starts with `prefix`.
 */
export function deleteCachedByPrefix(prefix: string): number {
  const keys = cache.keys().filter((key) => key.startsWith(prefix));
  if (keys.length > 0) {
    cache.del(keys);
  }
  return keys.length;
}

/** Health check for cache backend */
export function checkCacheHealth(): { backend: "memory"; healthy: boolean } {
  return { backend: "memory", healthy: true };
}

/** Clear all cache */
export function clearCache(): void {
  cache.flushAll();
}

/** Get cache stats */
export function getCacheStats(): NodeCache.Stats {
  return cache.getStats();
}

/** Get all keys matching prefix (for debugging) */
export function getKeysByPrefix(prefix: string): string[] {
  return cache.keys().filter((key) => key.startsWith(prefix));
}

/**
 * Legacy synchronous in-memory cache (for GitHub controllers that need sync API).
 * Use the async functions above for new code.
 */
export const internalCache = {
  get: <T>(key: string): T | undefined => cache.get<T>(key),
  set: <T>(key: string, value: T, ttlSeconds = 300): void => { cache.set(key, value, ttlSeconds); },
  del: (key: string): void => { cache.del(key); },
  flushAll: (): void => cache.flushAll(),
  keys: (): string[] => cache.keys(),
};

/**
 * Placeholder for Redis - not used with node-cache
 * Kept for compatibility with socket state
 */
export function getRedis(): null {
  return null;
}