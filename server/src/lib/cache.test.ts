import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
    internalCache,
    getCached,
    setCached,
    deleteCached,
    deleteCachedByPrefix,
} from "./cache.js";

describe("lib/cache helpers", () => {
    beforeEach(() => {
        internalCache.flushAll();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("stores and reads a value with its original type", () => {
        const value = { userId: "u1", rating: 1420, tier: "Gold" };
        setCached("leaderboard:global", value);

        expect(getCached<typeof value>("leaderboard:global")).toEqual(value);
    });

    test("returns undefined for a key that was never cached", () => {
        expect(getCached("missing:key")).toBeUndefined();
    });

    test("expires an entry after its explicit ttl (seconds)", () => {
        jest.useFakeTimers();

        setCached("analytics:u1", { streak: 3 }, 1); // 1 second
        expect(getCached("analytics:u1")).toEqual({ streak: 3 });

        jest.advanceTimersByTime(1500);
        expect(getCached("analytics:u1")).toBeUndefined();
    });

    test("deleteCached drops a single key", () => {
        setCached("my-rating:u1", { rating: 1200 });
        deleteCached("my-rating:u1");

        expect(getCached("my-rating:u1")).toBeUndefined();
    });

    test("deleteCachedByPrefix drops only the matching namespace", () => {
        setCached("analytics:u1", { a: 1 });
        setCached("analytics:u2", { a: 2 });
        setCached("leaderboard:global", [{ rank: 1 }]);

        const removed = deleteCachedByPrefix("analytics:");

        expect(removed).toBe(2);
        expect(getCached("analytics:u1")).toBeUndefined();
        expect(getCached("analytics:u2")).toBeUndefined();
        expect(getCached("leaderboard:global")).toEqual([{ rank: 1 }]);
    });

    test("deleteCachedByPrefix reports zero when nothing matches", () => {
        setCached("leaderboard:global", []);

        expect(deleteCachedByPrefix("problems:")).toBe(0);
    });

    test("problem caches are namespaced per user so they cannot leak across users", () => {
        setCached("problems:u1:system", [{ isSolved: true }]);
        setCached("problems:u2:system", [{ isSolved: false }]);

        deleteCachedByPrefix("problems:u1:");

        expect(getCached("problems:u1:system")).toBeUndefined();
        expect(getCached("problems:u2:system")).toEqual([{ isSolved: false }]);
    });
});