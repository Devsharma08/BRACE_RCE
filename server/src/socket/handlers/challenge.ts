import { prisma } from "../../lib/prisma.js";
import type { HandlerCtx } from "../types.js";

export function registerChallengeHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;
    const { onlineUsers } = ctx.state;

    //DIRECT CHALLENGE PING — supports RANDOM (difficulty) and CUSTOM (problemId)
    socket.on("send_challenge", async (data: {
        targetUserId: string,
        username?: string,
        difficulty?: string,
        mode?: "RANDOM" | "CUSTOM",
        problemId?: string,
        problemName?: string,
    }) => {
        const targetSocketId = onlineUsers.get(data.targetUserId);

        const mode = data.mode ?? "RANDOM";
        const difficulty = (data.difficulty ?? "MEDIUM").toUpperCase();
        let problemId = data.problemId;
        let problemName = data.problemName;

        // Resolve CUSTOM problem snapshot for the overlay + notification
        if (mode === "CUSTOM" && problemId) {
            try {
                const prob = await prisma.problem.findUnique({
                    where: { id: problemId },
                    select: { id: true, name: true, github_oid: true, difficulty_level: true }
                });
                if (prob) {
                    problemName = problemName ?? prob.name;
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
                    select: { id: true, name: true }
                });
                if (pool.length > 0) {
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    problemId = pick.id;
                    problemName = pick.name;
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

        // queue notification even if target is offline
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
            if (targetSocketId) {
                io.to(targetSocketId).emit("incoming_challenge", payload);
                io.to(targetSocketId).emit("notification:new", notif);
            } else {
                socket.emit("lobby_error", "User is offline! Challenge saved to their notifications.");
            }
        } catch (e) {
            console.error("challenge notify error:", e);
            if (targetSocketId) {
                io.to(targetSocketId).emit("incoming_challenge", payload);
            } else {
                socket.emit("lobby_error", "User is offline!");
            }
        }
    });

    // CHALLENGE ACCEPT — honors CUSTOM problemId or RANDOM by difficulty
    socket.on("accept_challenge", async (data: {
        challengerId: string;
        problemId?: string;
        mode?: "RANDOM" | "CUSTOM";
        difficulty?: string;
    }) => {
        const challengerSocketId = onlineUsers.get(data.challengerId);

        if (!challengerSocketId) {
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
                performances: {
                    create: [{ userId: userId, status: "PENDING" }, {
                        userId: data.challengerId,
                        status: "PENDING"
                    }]
                }
            }
        })

        const roomId = `room-${event.id}`;

        // Instantly wrap both players to arena, using the fetched problemId + timeLimitMs
        io.to(socket.id).emit("custom_match_started", {
            roomId, problemId, timeLimitMs
        })

        io.to(challengerSocketId).emit("custom_match_started", { roomId, problemId, timeLimitMs });

        // challenge-accepted queue entries for both players
        try {
            const { notifyChallengeResult } = await import("../../services/notificationService.js");
            const [me, other] = await Promise.all([
                prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
                prisma.user.findUnique({ where: { id: data.challengerId }, select: { username: true } }),
            ]);
            const n1 = await notifyChallengeResult(userId, true, other?.username ?? "Friend");
            const n2 = await notifyChallengeResult(data.challengerId, true, me?.username ?? "Friend");
            io.to(socket.id).emit("notification:new", n1);
            io.to(challengerSocketId).emit("notification:new", n2);
        } catch (e) {
            console.error("challenge accept notify error:", e);
        }

    })

    // CHALLENGE DECLINE — notify the challenger + queue the result
    socket.on("decline_challenge", async (data: { challengerId: string }) => {
        try {
            const challengerSocketId = onlineUsers.get(data.challengerId);
            const { notifyChallengeResult } = await import("../../services/notificationService.js");
            const me = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });
            if (challengerSocketId) {
                const n = await notifyChallengeResult(
                    data.challengerId,
                    false,
                    me?.username ?? "Friend"
                );
                io.to(challengerSocketId).emit("notification:new", n);
                io.to(challengerSocketId).emit("challenge_declined", { byUserId: userId });
            } else {
                // challenger offline — still queue the decline
                await notifyChallengeResult(data.challengerId, false, me?.username ?? "Friend");
            }
        } catch (e) {
            console.error("challenge decline notify error:", e);
        }
    })
}
