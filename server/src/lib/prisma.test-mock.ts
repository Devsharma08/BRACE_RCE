/**
 * Jest mock for lib/prisma.ts.
 *
 * The real prisma.ts imports the generated Prisma client which uses
 * import.meta.url — not parseable by Jest's CommonJS runtime. This mock
 * provides a Proxy-based prisma object that supports the delegate-assignment
 * pattern used across the test suite:
 *   (prisma.event.findUnique as any) = jest.fn();
 *   (prisma.event.findUnique as jest.Mock).mockResolvedValue(...);
 *
 * Delegates and methods are cached so reassignment persists across accesses.
 */

function makeMockDelegate() {
  const localCache = new Map();
  return new Proxy(jest.fn(), {
    get: (_target, prop) => {
      if (typeof prop === "symbol") return undefined;
      if (prop === "then" || prop === "toJSON" || prop === "catch") return undefined;
      const key = String(prop);
      if (!localCache.has(key)) localCache.set(key, jest.fn());
      return localCache.get(key);
    },
    set: (_target, prop, value) => {
      if (typeof prop === "symbol") return true;
      localCache.set(String(prop), value);
      return true;
    },
    has: (_target, prop) => prop !== "then",
  });
}

const cache = new Map();

const mockPrisma = new Proxy({} as any, {
  get: (_target, prop) => {
    if (typeof prop === "symbol") return undefined;
    if (prop === "then" || prop === "toJSON" || prop === "catch") return undefined;
    const key = String(prop);
    if (!cache.has(key)) cache.set(key, makeMockDelegate());
    return cache.get(key);
  },
  set: () => true,
  has: (_target, prop) => prop !== "then",
});

export { mockPrisma };
export const prisma = mockPrisma;

export function resetMockCache() {
  cache.clear();
}
