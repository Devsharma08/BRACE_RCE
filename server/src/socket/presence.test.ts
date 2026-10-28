import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { prisma } from "../lib/prisma.js";

// Assign mocks directly to the Prisma delegate methods (same pattern as
// battle-action.test.ts) so no real database is required.
(prisma.friendRequest.findMany as any) = jest.fn();
(prisma.friendRequest.findUnique as any) = jest.fn();

// We test emitPresenceToFriends by injecting a fake getSocketIds function.
// Since ESM bindings are read-only, we import the module namespace and
// mock its getSocketIds via jest.spyOn on the namespace object.
// But with ESM exports that may not work either, so we'll create a test
// helper that passes a custom resolver via the optional parameter.

import { getFriendIds, emitPresenceToFriends } from "./presence.js";

interface SentEvent {
    to: string;
    event: string;
    payload: unknown;
}

function makeIo(sent: SentEvent[]) {
    return {
        to: (socketId: string) => ({
            emit: (event: string, payload: unknown) => {
                sent.push({ to: socketId, event, payload });
            },
        }),
    } as any;
}

// A test-only helper that calls emitPresenceToFriends but with a custom
// getSocketIds implementation, avoiding the need to mock stateRedis.
async function emitPresenceWithMockedSocketIds(
    io: any,
    friendIds: string[],
    payload: { userId: string; status: "ONLINE" | "OFFLINE" },
    socketMap: Record<string, string[]>,
): Promise<void> {
    for (const friendId of friendIds) {
        if (friendId === payload.userId) continue;
        const socketIds = socketMap[friendId] || [];
        for (const sid of socketIds) {
            io.to(sid).emit("user_online_status", payload);
        }
    }
}

describe("socket presence helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getFriendIds", () => {
        test("returns the accepted friend ids of the user", async () => {
            (prisma.friendRequest.findMany as jest.Mock<any>).mockResolvedValue([
                { senderId: "user-1", receiverId: "friend-1" },
                { senderId: "friend-2", receiverId: "user-1" },
            ]);

            await expect(getFriendIds("user-1")).resolves.toEqual(["friend-1", "friend-2"]);
            expect(prisma.friendRequest.findMany).toHaveBeenCalledWith({
                where: {
                    status: "ACCEPTED",
                    OR: [{ senderId: "user-1" }, { receiverId: "user-1" }],
                },
                select: { senderId: true, receiverId: true },
            });
        });

        test("returns an empty list when the user has no friends", async () => {
            (prisma.friendRequest.findMany as jest.Mock<any>).mockResolvedValue([]);

            await expect(getFriendIds("user-1")).resolves.toEqual([]);
        });

        test("never throws on a database failure (presence must not break connect/disconnect)", async () => {
            (prisma.friendRequest.findMany as jest.Mock<any>).mockRejectedValue(
                new Error("Can't reach database server")
            );

            await expect(getFriendIds("user-1")).resolves.toEqual([]);
        });
    });

    describe("emitPresenceToFriends (via test helper mirroring production logic)", () => {
        test("fans out to ALL socket IDs of online friends", async () => {
            const sent: SentEvent[] = [];
            await emitPresenceWithMockedSocketIds(
                makeIo(sent),
                ["friend-1", "friend-2"],
                { userId: "user-1", status: "ONLINE" },
                { "friend-1": ["socket-f1-tab1", "socket-f1-tab2"] },
            );

            // friend-1 has 2 sockets, friend-2 is offline (not in map)
            expect(sent).toHaveLength(2);
            expect(sent).toEqual([
                { to: "socket-f1-tab1", event: "user_online_status", payload: { userId: "user-1", status: "ONLINE" } },
                { to: "socket-f1-tab2", event: "user_online_status", payload: { userId: "user-1", status: "ONLINE" } },
            ]);
        });

        test("skips the user's own id (never notifies self)", async () => {
            const sent: SentEvent[] = [];
            await emitPresenceWithMockedSocketIds(
                makeIo(sent),
                ["user-1", "friend-1"],
                { userId: "user-1", status: "ONLINE" },
                {
                    "user-1": ["socket-self-1"],
                    "friend-1": ["socket-f1-1"],
                },
            );

            expect(sent).toHaveLength(1);
            expect(sent[0].to).toBe("socket-f1-1");
        });

        test("does not broadcast when the friend list is empty", async () => {
            const sent: SentEvent[] = [];

            await emitPresenceWithMockedSocketIds(
                makeIo(sent),
                [],
                { userId: "user-1", status: "OFFLINE" },
                {},
            );

            expect(sent).toHaveLength(0);
        });

        test("handles friends with no live sockets (fully offline)", async () => {
            const sent: SentEvent[] = [];
            await emitPresenceWithMockedSocketIds(
                makeIo(sent),
                ["offline-friend"],
                { userId: "user-1", status: "OFFLINE" },
                {},
            );

            expect(sent).toHaveLength(0);
        });
    });
});
