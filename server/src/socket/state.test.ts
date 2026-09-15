import { describe, test, expect } from "@jest/globals";
import { markOnline, markOffline, getSocketId, onlineUsers } from "./state.js";

describe("socket presence state (multi-tab aware)", () => {
    test("tracks the user's socket id for targeted emits", () => {
        markOnline("state-user-a", "socket-a1");

        expect(getSocketId("state-user-a")).toBe("socket-a1");
        expect(onlineUsers.has("state-user-a")).toBe(true);

        markOffline("state-user-a");
    });

    test("closing one of two tabs does NOT mark the user offline", () => {
        markOnline("state-user-b", "socket-b1");
        markOnline("state-user-b", "socket-b2");

        expect(markOffline("state-user-b")).toBe(false);
        expect(onlineUsers.has("state-user-b")).toBe(true);

        // Closing the last tab is what actually reports them offline.
        expect(markOffline("state-user-b")).toBe(true);
        expect(onlineUsers.has("state-user-b")).toBe(false);
        expect(getSocketId("state-user-b")).toBeUndefined();
    });

    test("routing entry points at the most recent socket", () => {
        markOnline("state-user-c", "socket-c1");
        markOnline("state-user-c", "socket-c2");

        expect(getSocketId("state-user-c")).toBe("socket-c2");

        markOffline("state-user-c");
        markOffline("state-user-c");
    });

    test("a user who was never seen online still reports offline", () => {
        expect(markOffline("state-user-never-seen")).toBe(true);
        expect(getSocketId("state-user-never-seen")).toBeUndefined();
    });
});