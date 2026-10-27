import { prisma } from "../../lib/prisma.js";
import { Level } from "../../generated/prisma/client.js";
import { getAllowedDifficulties } from "../matchmakingUtils.js";
import { emitToUser } from "../ioRegistry.js";
import { pendingMatchTimeouts } from "../state.js";
import type { HandlerCtx } from "../types.js";

export function registerMatchmakingHandlers(ctx: HandlerCtx): void {
    const { socket, userId } = ctx;
    const { activeSearchIntervals } = ctx.state;

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

                        // Lock both queues — only if both are still WAITING
                        // to prevent the dual-interval race condition
                        const lockResult = await prisma.matchmakingQueue.updateMany({
                            where: {
                                id: { in: [queueEntry.id, opponentQueue.id] },
                                status: "WAITING" // conditional: only lock if still waiting
                            },
                            data: { status: "MATCHED", matchedAt: new Date() }
                        });

                        // If another worker already locked these queues, abort — don't create a duplicate event
                        if (lockResult.count !== 2) {
                            console.log(`Queue lock contention: only ${lockResult.count}/2 rows updated, aborting match`);
                            return;
                        }
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

                        // Join socket rooms for this battle
                        socket.join(roomName);

                        // Fetch users for profile exchange
                        const [user1, user2] = await Promise.all([
                            prisma.user.findUnique({ where: { id: userId }, select: { username: true, bio: true, avatarUrl: true } }),
                            prisma.user.findUnique({ where: { id: opponentQueue.userId }, select: { username: true, bio: true, avatarUrl: true } })
                        ]);

                         // Notify both players to ACCEPT with opponent data.
                         // Use emitToUser for guaranteed cross-process delivery to ALL
                         // sockets (tabs/devices) — socket.emit only reaches the current
                         // socket, which causes the cross-platform search discrepancy
                         // when the user's active tab is on a different PM2 worker.
                         await emitToUser(userId, "match_found_pending", {
                             matchId: roomName, problemId, opponent: user2, opponentUserId: opponentQueue.userId
                         });

                         await emitToUser(opponentQueue.userId, "match_found_pending", {
                             matchId: roomName, problemId, opponent: user1, opponentUserId: userId
                         });

                         // Acceptance timeout — if neither player accepts within 15s,
                         // cancel the event and notify both players so they can re-queue.
                         // Tracked by socket id so it can be cleared on disconnect,
                         // preventing zombie timers from firing after the socket dies.
                         const acceptTimeout = setTimeout(async () => {
                             pendingMatchTimeouts.delete(socket.id);
                             const checkEvent = await prisma.event.findUnique({
                                 where: { id: event.id },
                                 select: { status: true },
                             });
                             if (checkEvent?.status === "WAITING") {
                                 await prisma.event.update({
                                     where: { id: event.id },
                                     data: { status: "CANCELLED" },
                                 });
                                 // Notify both players of timeout — use emitToUser
                                 // for guaranteed cross-process delivery
                                 socket.emit("match_timeout");
                                 await emitToUser(opponentQueue.userId, "match_timeout");
                             }
                         }, 15000);
                         pendingMatchTimeouts.set(socket.id, acceptTimeout);
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
