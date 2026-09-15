import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { prisma } from "../lib/prisma.js";

// Assign mocks directly to Prisma delegate methods (project convention).
(prisma.user.findMany as any) = jest.fn();
(prisma.user.findUnique as any) = jest.fn();

import { leaderboardController } from "./leaderboard.js";
import { internalCache, getCached, deleteCachedByPrefix } from "../lib/cache.js";

interface FakeRes {
    statusCode?: number;
    body?: any;
    status: (code: number) => FakeRes;
    json: (payload: any) => FakeRes;
}

function makeRes(): FakeRes {
    const res: FakeRes = {
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(payload: any) {
            res.body = payload;
            return res;
        },
    };
    return res;
}

const rankedUsers = [
    {
        id: "u1",
        username: "alpha",
        avatarUrl: null,
        performances: [
            { status: "WON", timeTakenMs: 1000, score: 1000 },
            { status: "LOST", timeTakenMs: 2000, score: 0 },
        ],
    },
    {
        id: "u2",
        username: "bravo",
        avatarUrl: null,
        performances: [{ status: "LOST", timeTakenMs: 3000, score: 0 }],
    },
];

describe("Leaderboard caching", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        internalCache.flushAll();
    });

    test("computes the ranking once and serves the next request from cache", async () => {
        (prisma.user.findMany as jest.Mock<any>).mockResolvedValue(rankedUsers);

        const first = makeRes();
        await leaderboardController.getGlobalLeaderboard({ query: {} } as any, first as any);

        expect(first.body.cached).toBe(false);
        expect(first.body.leaderboard).toHaveLength(2);
        expect(prisma.user.findMany).toHaveBeenCalledTimes(1);

        const second = makeRes();
        await leaderboardController.getGlobalLeaderboard({ query: {} } as any, second as any);

        expect(second.body.cached).toBe(true);
        expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
        expect(second.body.leaderboard[0].username).toBe("alpha");
    });

    test("serves every limit from one cached ranking", async () => {
        (prisma.user.findMany as jest.Mock<any>).mockResolvedValue(rankedUsers);

        const limited = makeRes();
        await leaderboardController.getGlobalLeaderboard({ query: { limit: "1" } } as any, limited as any);
        expect(limited.body.leaderboard).toHaveLength(1);

        const wider = makeRes();
        await leaderboardController.getGlobalLeaderboard({ query: { limit: "2" } } as any, wider as any);

        expect(wider.body.leaderboard).toHaveLength(2);
        expect(wider.body.cached).toBe(true);
        expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    test("ranks by rating and marks ranks from 1", async () => {
        (prisma.user.findMany as jest.Mock<any>).mockResolvedValue(rankedUsers);

        const res = makeRes();
        await leaderboardController.getGlobalLeaderboard({ query: {} } as any, res as any);

        const rows = res.body.leaderboard;
        expect(rows[0].rank).toBe(1);
        expect(rows[1].rank).toBe(2);
        expect(rows[0].rating).toBeGreaterThanOrEqual(rows[1].rating);
    });

    test("invalidating the leaderboard namespace forces a recompute", async () => {
        (prisma.user.findMany as jest.Mock<any>).mockResolvedValue(rankedUsers);

        await leaderboardController.getGlobalLeaderboard({ query: {} } as any, makeRes() as any);
        expect(getCached("leaderboard:global")).toBeDefined();

        // What battle-action does after emitting battle_finished.
        deleteCachedByPrefix("leaderboard:");
        expect(getCached("leaderboard:global")).toBeUndefined();

        const after = makeRes();
        await leaderboardController.getGlobalLeaderboard({ query: {} } as any, after as any);

        expect(after.body.cached).toBe(false);
        expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    });

    test("caches my-rating per user", async () => {
        (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
            id: "u1",
            username: "alpha",
            performances: [{ status: "WON", timeTakenMs: 1000 }],
        });

        const first = makeRes();
        await leaderboardController.getMyRating({ userId: "u1" } as any, first as any);
        expect(first.body.cached).toBe(false);

        const second = makeRes();
        await leaderboardController.getMyRating({ userId: "u1" } as any, second as any);

        expect(second.body.cached).toBe(true);
        expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);

        // A different user must not receive the cached row.
        const other = makeRes();
        await leaderboardController.getMyRating({ userId: "u2" } as any, other as any);
        expect(other.body.cached).toBe(false);
        expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    });

    test("does not cache a missing user", async () => {
        (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);

        const res = makeRes();
        await leaderboardController.getMyRating({ userId: "ghost" } as any, res as any);

        expect(res.statusCode).toBe(404);
        expect(getCached("my-rating:ghost")).toBeUndefined();
    });
});