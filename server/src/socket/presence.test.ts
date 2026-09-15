import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { prisma } from "../lib/prisma.js";

// Assign mocks directly to Prisma delegate methods (project convention).
(prisma.user.findUnique as any) = jest.fn();

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

describe("socket presence helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getFriendIds", () => {
        test("returns the accepted friend ids of the user", async () => {
            (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
                friends: [{ id: "friend-1" }, { id: "friend-2" }],
            });

            await expect(getFriendIds("user-1")).resolves.toEqual(["friend-1", "friend-2"]);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: "user-1" },
                select: { friends: { select: { id: true } } },
            });
        });

        test("returns an empty list when the user is unknown", async () => {
            (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);

            await expect(getFriendIds("ghost")).resolves.toEqual([]);
        });

        test("never throws on a database failure (presence must not break connect/disconnect)", async () => {
            (prisma.user.findUnique as jest.Mock<any>).mockRejectedValue(
                new Error("Can't reach database server")
            );
            const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

            await expect(getFriendIds("user-1")).resolves.toEqual([]);

            errorSpy.mockRestore();
        });
    });

    describe("emitPresenceToFriends", () => {
        test("emits only to the sockets of online friends", () => {
            const sent: SentEvent[] = [];
            const onlineUsers = new Map<string, string>([
                ["friend-1", "socket-f1"], // friend of user-1, online
                ["stranger", "socket-x"],  // online, but NOT in the provided friend list
                // friend-2 is offline -> absent from the map
            ]);

            emitPresenceToFriends(
                makeIo(sent),
                onlineUsers,
                ["friend-1", "friend-2"],
                { userId: "user-1", status: "ONLINE" },
            );

            expect(sent).toHaveLength(1);
            expect(sent[0]).toEqual({
                to: "socket-f1",
                event: "user_online_status",
                payload: { userId: "user-1", status: "ONLINE" },
            });
            // The stranger's socket must never receive user-1's presence.
            expect(sent.some((event) => event.to === "socket-x")).toBe(false);
        });

        test("skips friends who have no live socket", () => {
            const sent: SentEvent[] = [];
            const onlineUsers = new Map<string, string>();

            emitPresenceToFriends(makeIo(sent), onlineUsers, ["offline-1"], {
                userId: "user-1",
                status: "OFFLINE",
            });

            expect(sent).toHaveLength(0);
        });

        test("never emits presence about the user to the user's own socket", () => {
            const sent: SentEvent[] = [];
            const onlineUsers = new Map<string, string>([["user-1", "socket-self"]]);

            emitPresenceToFriends(makeIo(sent), onlineUsers, ["user-1"], {
                userId: "user-1",
                status: "ONLINE",
            });

            expect(sent).toHaveLength(0);
        });

        test("does not broadcast globally when the friend list is empty", () => {
            const sent: SentEvent[] = [];
            const onlineUsers = new Map<string, string>([["anyone", "socket-1"]]);

            emitPresenceToFriends(makeIo(sent), onlineUsers, [], {
                userId: "user-1",
                status: "OFFLINE",
            });

            expect(sent).toHaveLength(0);
        });
    });
});