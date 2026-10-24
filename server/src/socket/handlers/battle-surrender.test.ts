import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { prisma } from "../../lib/prisma.js";
import { registerIO } from "../ioRegistry.js";
import { markOnline, markOffline } from "../stateRedis.js";
import { registerBattleSurrenderHandlers } from "./battle-surrender.js";

// Force Redis connections to fail fast (nothing listening) so markOnline's
// background redis-client connect handle doesn't keep Jest from exiting in
// this environment (Redis is docker-only, REDIS_URL=redis://redis:6379).
process.env.REDIS_URL = "redis://127.0.0.1:9";

// Assign mocks directly to the Prisma delegate methods — no real DB required.
(prisma.event.findFirst as any) = jest.fn();
(prisma.userPersonalPerformance.updateMany as any) = jest.fn();
(prisma.userPersonalPerformance.findMany as any) = jest.fn();

type SurrenderHandler = (data: any) => Promise<void>;

function setup() {
    let handler: SurrenderHandler | null = null;
    const ioEmit = jest.fn(); // io.to(room).emit(...) — receives both room broadcasts
                              // AND targeted emitToUser fan-out (real emitToUser calls
                              // ioRef.to(socketId).emit(...)).
    const io: any = {
        to: jest.fn((room: string) => ({ emit: ioEmit })),
        emit: jest.fn(),
    };
    const socket: any = {
        data: { userId: "user-1" },
        on: jest.fn((event: string, cb: SurrenderHandler) => {
            if (event === "surrender_battle") handler = cb;
        }),
        to: jest.fn(() => ({ emit: jest.fn() })),
        emit: jest.fn(),
    };

    registerIO(io);
    registerBattleSurrenderHandlers({
        io,
        socket,
        userId: "user-1",
        state: {} as any,
        getActiveBattleForUser: jest.fn(),
    } as any);

    return {
        run: (data: any) => (handler as unknown as SurrenderHandler)(data),
        ioEmit,
        io,
        socket,
    };
}

describe("battle_surrender server-side delivery guarantees", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        // Register live sockets for both participants so emitToUser's fan-out
        // (getSocketIds → memoryOnlineUsers) reaches them without Redis.
        await markOnline("user-1", "sid-user-1");
        await markOnline("user-2", "sid-user-2");
    });

    afterEach(async () => {
        await markOffline("user-1").catch(() => {});
        await markOffline("user-2").catch(() => {});
    });

    test("broadcasts participants_updated to the room AND targets every affected user's sockets", async () => {
        (prisma.event.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "evt-1",
            roomCode: "800X7R",
            type: "ONE_VS_ONE",
        });
        (prisma.userPersonalPerformance.updateMany as jest.Mock<any>).mockResolvedValue({ count: 1 });
        (prisma.userPersonalPerformance.findMany as jest.Mock<any>).mockResolvedValue([
            {
                id: "perf-1", userId: "user-1", eventId: "evt-1", status: "SURRENDER",
                user: { id: "user-1", username: "dev1", avatarUrl: null, bio: null },
                submissions: [],
            },
            {
                id: "perf-2", userId: "user-2", eventId: "evt-1", status: "PENDING",
                user: { id: "user-2", username: "dev2", avatarUrl: null, bio: null },
                submissions: [],
            },
        ]);

        const { run, ioEmit, io } = setup();
        await run({ roomId: "800X7R" });

        // Room-scoped broadcast still happens for everyone currently in the room.
        expect(ioEmit).toHaveBeenCalledWith(
            "participants_updated",
            expect.objectContaining({ performances: expect.arrayContaining([expect.any(Object)]) })
        );
        expect(io.to).toHaveBeenCalledWith("800X7R");
        expect(io.to).toHaveBeenCalledWith("room-evt-1");

        // Targeted delivery to the opponent (user-2) on ALL their sockets — this is
        // what reaches the participant even if they left the room or are on another
        // tab/worker at emit time.
        expect(io.to).toHaveBeenCalledWith("sid-user-2");
        expect(ioEmit).toHaveBeenCalledWith(
            "battle_update",
            expect.objectContaining({ result: "OPPONENT_SURRENDERED" })
        );

        // Targeted delivery of participants_updated to BOTH participants (the
        // surrenderer + opponent) on ALL their sockets.
        expect(io.to).toHaveBeenCalledWith("sid-user-1");
        expect(io.to).toHaveBeenCalledWith("sid-user-2");
        const rosterCalls = ioEmit.mock.calls.filter(([ev]) => ev === "participants_updated");
        expect(rosterCalls.length).toBeGreaterThanOrEqual(2);
    });

    test("does not crash when emitToUser targets users with no live sockets", async () => {
        (prisma.event.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "evt-1", roomCode: "800X7R", type: "ONE_VS_ONE",
        });
        (prisma.userPersonalPerformance.updateMany as jest.Mock<any>).mockResolvedValue({ count: 1 });
        (prisma.userPersonalPerformance.findMany as jest.Mock<any>).mockResolvedValue([
            {
                id: "perf-1", userId: "user-1", eventId: "evt-1", status: "SURRENDER",
                user: { id: "user-1", username: "dev1", avatarUrl: null, bio: null },
                submissions: [],
            },
        ]);

        // Clear the sockets registered in beforeEach so targeted delivery targets
        // nobody — the handler must still not crash.
        await markOffline("user-1").catch(() => {});
        await markOffline("user-2").catch(() => {});

        const { run } = setup();
        await expect(run({ roomId: "800X7R" })).resolves.toBeUndefined();
        expect(prisma.event.findFirst).toHaveBeenCalled();
    });
});
