import NodeCache from "node-cache";

/**
 * The single shared in-process cache. Every controller that caches MUST go
 * through the typed helpers below rather than keeping its own Map.
 *
 * NOTE: node-cache is per Node process. Running multiple server instances
 * duplicates (and independently stales) this cache — that is acceptable at the
 * current single-instance scale, but horizontal scaling requires Redis.
 */
export const internalCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

/** Read a cached value. Returns undefined on a miss or an expired entry. */
export function getCached<T>(key: string): T | undefined {
  return internalCache.get<T>(key);
}

/**
 * Store a value. `ttlSeconds` defaults to the cache-wide stdTTL (300s).
 */
export function setCached<T>(key: string, value: T, ttlSeconds?: number): void {
  if (ttlSeconds === undefined) {
    internalCache.set<T>(key, value);
  } else {
    internalCache.set<T>(key, value, ttlSeconds);
  }
}

/** Drop a single entry. */
export function deleteCached(key: string): void {
  internalCache.del(key);
}

/**
 * Drop every entry whose key starts with `prefix`. Prefixes act as lightweight
 * cache tags so one write can invalidate a whole namespace
 * (e.g. `deleteCachedByPrefix("analytics:")`).
 */
export function deleteCachedByPrefix(prefix: string): number {
  const keys = internalCache.keys().filter((key) => key.startsWith(prefix));
  return keys.length > 0 ? internalCache.del(keys) : 0;
}
