import { prisma } from "../../lib/prisma.js";
import { displayProblemName } from "../../utils/problemName.js";
import type { HandlerCtx } from "../types.js";
import { getSocketIds } from "../stateRedis.js";
import { emitToUser } from "../ioRegistry.js";

export function registerChallengeHandlers(ctx: HandlerCtx): void {
    const { socket, userId } = ctx;

    //DIRECT CHALLENGE PING — supports RANDOM (difficulty) and CUSTOM (problemId)
    socket.on("send_challenge", async (data: {
        targetUserId: string,
        username?: string,
        difficulty?: string,
        mode?: "RANDOM" | "CUSTOM",
        problemId?: string,
        problemName?: string,
    }) => {
        const mode = data.mode ?? "RANDOM";
        const difficulty = (data.difficulty ?? "MEDIUM").toUpperCase();
        let problemId = data.problemId;
        let problemName = data.problemName;

        // Resolve CUSTOM problem snapshot for the overlay + notification
        if (mode === "CUSTOM" && problemId) {
            try {
                const prob = await prisma.problem.findUnique({
                    where: { id: problemId },
                    select: { id: true, name: true, problem_number: true, github_oid: true, difficulty_level: true }
                });
                if (prob) {
                    problemName = displayProblemName(prob.name, prob.problem_number);
                }
            } catch { /* best-effort */ }
        }

        // RANDOM mode: pre-pick a real problem by difficulty so accept is instant
        if (mode === "RANDOM") {
            try {
                const pool = await prisma.problem.findMany({
                    where: {
                        isCustom: false,
                        ...(difficulty === "ANY" ? {} : { difficulty_level: difficulty as never }),
                    },
                    select: { id: true, name: true, problem_number: true }
                });
                if (pool.length > 0) {
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    problemId = pick.id;
                    problemName = displayProblemName(pick.name, pick.problem_number);
                }
            } catch { /* best-effort */ }
        }

        const payload = {
            challengerId: userId,
            challengerUsername: data.username,
            mode,
            difficulty,
            problemId,
            problemName,
        };

        // Queue notification even if target is offline
        try {
            const { notifyChallenge } = await import("../../services/notificationService.js");
            const challenger = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });
            const notif = await notifyChallenge(data.targetUserId, {
                challengerId: userId,
                challengerName: data.username ?? challenger?.username ?? "Friend",
                mode,
                difficulty,
                problemId,
                problemName,
            });
            // Use emitToUser for guaranteed cross-process delivery — reaches ALL
            // sockets (tabs/devices) of the target, not just the current worker.
            // io.to(userId) only works within one PM2 worker's socket rooms,
            // causing mobile↔desktop delivery failures.
            await emitToUser(data.targetUserId, "incoming_challenge", payload);
            await emitToUser(data.targetUserId, "notification:new", notif);
        } catch (e) {
            console.error("challenge notify error:", e);
            await emitToUser(data.targetUserId, "incoming_challenge", payload);
        }
    });

    // CHALLENGE ACCEPT — honors CUSTOM problemId or RANDOM by difficulty
    socket.on("accept_challenge", async (data: {
        challengerId: string;
        problemId?: string;
        mode?: "RANDOM" | "CUSTOM";
        difficulty?: string;
    }) => {
        // Use emitToUser for guaranteed cross-process delivery to ALL sockets
        // (tabs/devices). The old getSocketId approach returned a single socket
        // id and could miss sockets on other PM2 workers, causing "Challenger
        // went offline" even when the challenger was online on another tab.
        const challengerSocketIds = await getSocketIds(data.challengerId);

        if (challengerSocketIds.length === 0) {
            return socket.emit('lobby_error', "Challenger went offline!")
        }

        let battleProblemId: string | null = null;
        let problemId = "local-battle";
        let timeLimitMs = 600000;

        // CUSTOM: use the exact problem the challenger picked
        if (data.problemId) {
            const custom = await prisma.problem.findUnique({
                where: { id: data.problemId },
                select: { id: true, github_oid: true, timeLimitMs: true }
            }).catch(() => null);
            if (custom) {
                battleProblemId = custom.id;
                problemId = custom.github_oid || custom.id;
                timeLimitMs = custom.timeLimitMs || 600000;
            }
        }

        // RANDOM (or CUSTOM fallback): pick by difficulty
        if (!battleProblemId) {
            const diff = (data.difficulty ?? "MEDIUM").toUpperCase();
            const problems = await prisma.problem.findMany({
                where: {
                    isCustom: false,
                    ...(diff === "ANY" ? {} : { difficulty_level: diff as never }),
                },
                select: { id: true, github_oid: true, timeLimitMs: true }
            });
            if (problems.length > 0) {
                const randomProblem = problems[Math.floor(Math.random() * problems.length)];
                battleProblemId = randomProblem.id;
                problemId = randomProblem.github_oid || randomProblem.id || "local-battle";
                timeLimitMs = randomProblem.timeLimitMs || 600000;
            }
        }

        // create a brand new custom event behind the scenes
        const event = await prisma.event.create({
            data: {
                type: "FRIENDS",
                status: "IN_PROGRESS",
                startedAt: new Date(),
                maxUsers: 2,
                commonProblemId: battleProblemId,
                totalTimeLimitMs: timeLimitMs,
                performances: {
                    create: [{ userId: userId, status: "PENDING" }, {
                        userId: data.challengerId,
                        status: "PENDING"
                    }]
                }
            }
        })

        const roomId = `room-${event.id}`;

         // Instantly wrap both players to arena, using the fetched problemId + timeLimitMs.
         // Use emitToUser for guaranteed cross-process delivery — reaches ALL sockets
         // (tabs/devices), fixing the desktop UI not updating after accept when the
         // active tab is on a different PM2 worker.
         await emitToUser(userId, "custom_match_started", {
             roomId, problemId, timeLimitMs
         });

         await emitToUser(data.challengerId, "custom_match_started", { roomId, problemId, timeLimitMs });

         // challenge-accepted queue entries for both players
         try {
             const { notifyChallengeResult } = await import("../../services/notificationService.js");
             const [me, other] = await Promise.all([
                 prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
                 prisma.user.findUnique({ where: { id: data.challengerId }, select: { username: true } }),
             ]);
             const n1 = await notifyChallengeResult(userId, true, other?.username ?? "Friend");
             const n2 = await notifyChallengeResult(data.challengerId, true, me?.username ?? "Friend");
             await emitToUser(userId, "notification:new", n1);
             await emitToUser(data.challengerId, "notification:new", n2);
         } catch (e) {
             console.error("challenge accept notify error:", e);
         }

    })

    // CHALLENGE DECLINE — notify the challenger + queue the result
    socket.on("decline_challenge", async (data: { challengerId: string }) => {
        try {
            const { notifyChallengeResult } = await import("../../services/notificationService.js");
            const me = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });
            // Use emitToUser to reach all sockets for the challenger across all PM2 workers
            const n = await notifyChallengeResult(data.challengerId, false, me?.username ?? "Friend");
            await emitToUser(data.challengerId, "notification:new", n);
            await emitToUser(data.challengerId, "challenge_declined", { byUserId: userId });
        } catch (e) {
            console.error("challenge decline notify error:", e);
        }
    })
}