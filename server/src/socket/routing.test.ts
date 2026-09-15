import { describe, test, expect, jest } from "@jest/globals";
import { initSocketServer } from "./index.js";

const EXPECTED_SOCKET_EVENTS = [
    "send_direct_message",
    "send_battle_message",
    "send_challenge",
    "accept_challenge",
    "decline_challenge",
    "join_matchmaking",
    "cancel_matchmaking",
    "leave_custom_room",
    "delete_custom_room",
    "leave_room",
    "create_custom_room",
    "join_custom_room",
    "start_custom_match",
    "start_event",
    "join_battle",
    "check_active_battle",
    "accept_match",
    "decline_match",
    "surrender_battle",
    "surrender_match",
    "battle_action",
    "host_kick_user",
    "host_end_match",
    "request_player_code",
    "provide_player_code",
    "broadcast_player_code",
    "terminate_group",
    "request_presence",
];

describe("Socket routing (refactor lock)", () => {
    test("registers all 29 domain events plus central disconnect", () => {
        const socketOn = jest.fn();
        const fakeSocket: any = {
            id: "socket-1",
            data: { userId: "user-1" },
            on: socketOn,
            join: jest.fn(),
            emit: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() })),
        };
        let connectionHandler: ((socket: any) => void) | null = null;
        const useCalls: any[] = [];
        const fakeIo: any = {
            use: jest.fn((fn: any) => { useCalls.push(fn); }),
            on: jest.fn((event: string, handler: any) => {
                if (event === "connection") connectionHandler = handler;
            }),
            to: jest.fn(() => ({ emit: jest.fn() })),
            emit: jest.fn(),
            sockets: { sockets: new Map() },
        };

        // initModuleGC uses setInterval — mock timers so jest doesn't keep handles open
        jest.useFakeTimers();
        try {
            initSocketServer(fakeIo as never);
        } finally {
            jest.useRealTimers();
        }

        expect(fakeIo.on).toHaveBeenCalledWith("connection", expect.any(Function));
        expect(connectionHandler).not.toBeNull();
        (connectionHandler as any)(fakeSocket);

        const registered = socketOn.mock.calls.map((c: any[]) => c[0] as string);
        expect(registered).toContain("disconnect");
        for (const event of EXPECTED_SOCKET_EVENTS) {
            expect(registered).toContain(event);
        }
        expect(registered.filter((e: string) => e === "disconnect")).toHaveLength(1);
        expect(registered.filter((e: string) => e === "battle_action")).toHaveLength(1);
    });
});
