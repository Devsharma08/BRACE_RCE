import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { prisma } from "../../lib/prisma.js";

// Assign mocks directly to the Prisma delegate methods (same pattern as
// submissionEvaluator.test.ts) so no real database is required.
(prisma.event.findUnique as any) = jest.fn();
(prisma.event.findFirst as any) = jest.fn();
(prisma.event.updateMany as any) = jest.fn();
(prisma.userPersonalPerformance.findFirst as any) = jest.fn();
(prisma.userPersonalPerformance.findMany as any) = jest.fn();

import { registerBattleActionHandlers } from "./battle-action.js";

type BattleActionHandler = (data: any) => Promise<void>;

const PROGRESS_ONLY_UPDATE = {
    status: "Passed tests!",
    progress: 100,
    linesWritten: 12,
};

function setup() {
    let handler: BattleActionHandler | null = null;
    const roomEmit = jest.fn(); // socket.to(roomId).emit(...)
    const ioEmit = jest.fn(); // io.to(roomId).emit(...)
    const socket: any = {
        data: { userId: "user-1" },
        on: jest.fn((event: string, cb: BattleActionHandler) => {
            if (event === "battle_action") handler = cb;
        }),
        to: jest.fn(() => ({ emit: roomEmit })),
        emit: jest.fn(),
    };
    const io: any = { to: jest.fn(() => ({ emit: ioEmit })), emit: jest.fn() };

    registerBattleActionHandlers({
        io,
        socket,
        userId: "user-1",
        state: {} as any,
        getActiveBattleForUser: jest.fn(),
    } as any);

    return {
        run: (data: any) => (handler as unknown as BattleActionHandler)(data),
        roomEmit,
        ioEmit,
        io,
        socket,
    };
}

describe("battle_action server-side outcome verification", () => {
    let warnSpy: jest.SpiedFunction<typeof console.warn>;

    beforeEach(() => {
        jest.clearAllMocks();
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    test("ignores a client-claimed OPPONENT_WON when the database has no passing submission", async () => {
        (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({
            id: "evt-1",
            status: "IN_PROGRESS",
        });
        (prisma.userPersonalPerformance.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "perf-1",
            status: "PENDING",
            submissions: [],
        });

        const { run, ioEmit, roomEmit } = setup();
        await run({
            roomId: "room-evt-1",
            ...PROGRESS_ONLY_UPDATE,
            result: "OPPONENT_WON",
        });

        // The forged result must not finish the battle.
        expect(prisma.event.updateMany).not.toHaveBeenCalled();
        expect(ioEmit).not.toHaveBeenCalled();
        // ...and it must not be relayed to the opponent either.
        expect(roomEmit).toHaveBeenCalledTimes(1);
        const [, progressPayload] = roomEmit.mock.calls[0] as [string, any];
        expect(progressPayload).not.toHaveProperty("result");
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("Ignored client-supplied result")
        );
    });

    test("does not finish the battle for a non-participant (no performance row)", async () => {
        (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({
            id: "evt-1",
            status: "IN_PROGRESS",
        });
        (prisma.userPersonalPerformance.findFirst as jest.Mock<any>).mockResolvedValue(null);

        const { run, ioEmit } = setup();
        await run({
            roomId: "room-evt-1",
            ...PROGRESS_ONLY_UPDATE,
            result: "OPPONENT_WON",
        });

        expect(prisma.event.updateMany).not.toHaveBeenCalled();
        expect(ioEmit).not.toHaveBeenCalled();
    });

    test("finishes the battle when the database confirms a PASSED performance", async () => {
        (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({
            id: "evt-1",
            status: "IN_PROGRESS",
        });
        (prisma.userPersonalPerformance.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "perf-1",
            status: "PASSED",
            submissions: [],
        });
        (prisma.event.updateMany as jest.Mock<any>).mockResolvedValue({ count: 1 });
        (prisma.userPersonalPerformance.findMany as jest.Mock<any>).mockResolvedValue([
            { id: "perf-1", userId: "user-1", status: "PASSED", submissions: [] },
            { id: "perf-2", userId: "user-2", status: "PENDING", submissions: [] },
        ]);

        const { run, ioEmit, roomEmit, io } = setup();
        await run({ roomId: "room-evt-1", ...PROGRESS_ONLY_UPDATE });

        // Finish is claimed atomically (only from a non-FINISHED event).
        expect(prisma.event.updateMany).toHaveBeenCalledWith({
            where: { id: "evt-1", status: { not: "FINISHED" } },
            data: { status: "FINISHED", finishedAt: expect.any(Date) },
        });
        expect(io.to).toHaveBeenCalledWith("room-evt-1");
        expect(ioEmit).toHaveBeenCalledWith(
            "battle_finished",
            expect.objectContaining({ status: "FINISHED", winnerId: "user-1" })
        );
        // The opponent is told who really won.
        expect(roomEmit).toHaveBeenCalledWith(
            "battle_update",
            expect.objectContaining({ userId: "user-1", result: "OPPONENT_WON" })
        );
    });

    test("accepts a PASSED CodeSubmission even when the performance status is stale", async () => {
        (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({
            id: "evt-1",
            status: "IN_PROGRESS",
        });
        (prisma.userPersonalPerformance.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "perf-1",
            status: "PENDING",
            submissions: [{ id: "sub-1" }],
        });
        (prisma.event.updateMany as jest.Mock<any>).mockResolvedValue({ count: 1 });
        (prisma.userPersonalPerformance.findMany as jest.Mock<any>).mockResolvedValue([]);

        const { run, ioEmit } = setup();
        await run({ roomId: "room-evt-1", ...PROGRESS_ONLY_UPDATE });

        expect(ioEmit).toHaveBeenCalledWith(
            "battle_finished",
            expect.objectContaining({ winnerId: "user-1" })
        );
    });

    test("emits battle_finished only once for an already finished event", async () => {
        (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({
            id: "evt-1",
            status: "IN_PROGRESS",
        });
        (prisma.userPersonalPerformance.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "perf-1",
            status: "PASSED",
            submissions: [],
        });
        // Another concurrent emission already claimed the finish.
        (prisma.event.updateMany as jest.Mock<any>).mockResolvedValue({ count: 0 });

        const { run, ioEmit, roomEmit } = setup();
        await run({ roomId: "room-evt-1", ...PROGRESS_ONLY_UPDATE });

        expect(ioEmit).not.toHaveBeenCalled();
        expect(roomEmit).toHaveBeenCalledTimes(1);
    });

    test("resolves custom rooms addressed by roomCode", async () => {
        (prisma.event.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "evt-2",
            status: "IN_PROGRESS",
        });
        (prisma.userPersonalPerformance.findFirst as jest.Mock<any>).mockResolvedValue({
            id: "perf-9",
            status: "PASSED",
            submissions: [],
        });
        (prisma.event.updateMany as jest.Mock<any>).mockResolvedValue({ count: 1 });
        (prisma.userPersonalPerformance.findMany as jest.Mock<any>).mockResolvedValue([]);

        const { run, ioEmit } = setup();
        await run({ roomId: "AB12CD", ...PROGRESS_ONLY_UPDATE });

        expect(prisma.event.findFirst).toHaveBeenCalledWith({
            where: { roomCode: "AB12CD" },
        });
        expect(prisma.event.findUnique).not.toHaveBeenCalled();
        expect(ioEmit).toHaveBeenCalledWith(
            "battle_finished",
            expect.objectContaining({ winnerId: "user-1" })
        );
    });
});