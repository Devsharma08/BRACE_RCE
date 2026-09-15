import { prisma } from "../../lib/prisma.js";
import { Level } from "../../generated/prisma/client.js";
import { getAllowedDifficulties } from "../matchmakingUtils.js";
import type { HandlerCtx } from "../types.js";

export function registerMatchmakingHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;
    const { onlineUsers, activeSearchIntervals } = ctx.state;

    // PVP matching events
    socket.on("join_matchmaking", async (payload: { difficulty: Level | string, waitingSeconds?: number } | Level | string) => {
        try {

            if (activeSearchIntervals.has(socket.id)) {
                clearInterval(activeSearchIntervals.get(socket.id) as NodeJS.Timeout);
                activeSearchIntervals.delete(socket.id);
            }
            // Compatibility for both old format and new format with waitingSeconds
            const rawDifficulty = typeof payload === "string" ? payload : (payload?.difficulty || "MEDIUM");
            const difficulty: Level = (rawDifficulty === "ANY" || !["EASY", "MEDIUM", "HARD"].includes(rawDifficulty))
                ? "MEDIUM"
                : (rawDifficulty as Level);

            console.log("MATCHMAKING JOINED - USER:", userId, "DIFFICULTY:", difficulty);
            const initialWaitingSeconds = typeof payload === "object" && payload.waitingSeconds ? payload.waitingSeconds : 0;

            // cancel any existing waiting queue entries for this user before queueing
            await prisma.matchmakingQueue.updateMany({
                where: {
                    userId,
                    status: "WAITING"
                },
                data: {
                    status: "CANCELLED"
                }
            });

            // Create the Queue Entry
            const queueEntry = await prisma.matchmakingQueue.create({
                data: {
                    userId,
                    preferredDifficulty: difficulty,
                    status: "WAITING"
                }
            });

            // Start a polling interval to dynamically check for opponents every 3 seconds
            let currentWaitingSeconds = initialWaitingSeconds;
            const searchInterval = setInterval(async () => {
                try {
                    currentWaitingSeconds += 3;

                    // Prevent race condition: stop polling if we got passively matched
                    const selfQueue = await prisma.matchmakingQueue.findUnique({ where: { id: queueEntry.id } });
                    if (!selfQueue || selfQueue.status !== "WAITING") {
                        clearInterval(searchInterval);
                        activeSearchIntervals.delete(socket.id);
                        return;
                    }

                    // auto-cancel after 90 seconds timeout
                    if (currentWaitingSeconds >= 90) {
                        clearInterval(searchInterval);
                        activeSearchIntervals.delete(socket.id);
                        await prisma.matchmakingQueue.update({
                            where: { id: queueEntry.id },
                            data: { status: "CANCELLED" }
                        })

                        socket.emit("matchmaking_timeout", {
                            message: "No match found in queue limit. Please try again. "
                        });
                        return;
                    }


                    const allowedDifficulties = getAllowedDifficulties(difficulty, currentWaitingSeconds);

                    // Notify frontend of expanding search state
                    socket.emit("matchmaking_search_state", { waitingSeconds: currentWaitingSeconds, allowedDifficulties });

                    // Find compatible opponent
                    const opponentQueue = await prisma.matchmakingQueue.findFirst({
                        where: {
                            status: "WAITING",
                            userId: { not: userId },
                            preferredDifficulty: { in: allowedDifficulties }
                        },
                        orderBy: { joinedAt: "asc" }
                    });
                    if (opponentQueue) {
                        clearInterval(searchInterval);

                        // Lock both queues
                        await prisma.matchmakingQueue.updateMany({
                            where: { id: { in: [queueEntry.id, opponentQueue.id] } },
                            data: { status: "MATCHED", matchedAt: new Date() }
                        });
                        // Fetch a problem matching the opponent's requested difficulty
                        const matchedProblems = await prisma.problem.findMany({
                            where: { difficulty_level: opponentQueue.preferredDifficulty },
                            select: { id: true, github_oid: true }
                        });
                        const randomProblem = matchedProblems.length > 0
                            ? matchedProblems[Math.floor(Math.random() * matchedProblems.length)]
                            : null;

                        // Create the Match Event
                        const event = await prisma.event.create({
                            data: {
                                type: 'ONE_VS_ONE',
                                status: 'WAITING',
                                commonProblemId: randomProblem?.id || null,
                                performances: {
                                    create: [
                                        { userId: userId, status: 'PENDING' },
                                        { userId: opponentQueue.userId, status: 'PENDING' }
                                    ]
                                }
                            },
                            include: { commonProblem: true }
                        });
                        const roomName = `room-${event.id}`;
                        const problemId = event.commonProblem?.github_oid || "local-battle";

                        // Join both players to the socket room instantly
                        socket.join(roomName);
                        const opponentSocketId = onlineUsers.get(opponentQueue.userId);
                        if (opponentSocketId) {
                            const oppSocket = io.sockets.sockets.get(opponentSocketId);
                            oppSocket?.join(roomName);
                        }

                        // Fetch users for profile exchange
                        const [user1, user2] = await Promise.all([
                            prisma.user.findUnique({ where: { id: userId }, select: { username: true, bio: true, avatarUrl: true } }),
                            prisma.user.findUnique({ where: { id: opponentQueue.userId }, select: { username: true, bio: true, avatarUrl: true } })
                        ]);

                        // Notify both players to ACCEPT individually with opponent data
                        socket.emit("match_found_pending", { matchId: roomName, problemId, opponent: user2 });

                        const oppSocket = io.sockets.sockets.get(opponentSocketId || "");
                        if (oppSocket) {
                            oppSocket.emit("match_found_pending", { matchId: roomName, problemId, opponent: user1 });
                        }

                    }
                } catch (e) {
                    console.error("Matchmaking interval error:", e);
                }
            }, 3000);

            activeSearchIntervals.set(socket.id, searchInterval);

        } catch (error) {
            console.error("Matchmaking error:", error);
        }
    });

    // CANCEL MATCHMAKING SEARCH
    socket.on("cancel_matchmaking", async () => {
        try {
            await prisma.matchmakingQueue.updateMany({
                where: { userId, status: "WAITING" },
                data: { status: "CANCELLED" }
            });
        } catch (error) {
            console.error("cancel_matchmaking error:", error);
        }

        if (activeSearchIntervals.has(socket.id)) {
            clearInterval(activeSearchIntervals.get(socket.id) as NodeJS.Timeout);
            activeSearchIntervals.delete(socket.id);
        }
    });
}
