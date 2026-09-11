import { Socket, Server } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";
import { Level } from "../generated/prisma/client.js";



interface CustomLobby {
    hostId: string;
    users: string[];
    maxUsers: number;
    password?: string | undefined;
    targetDifficulty: string;
    problemsIds: string[];
    expiresAt: number;
}

const LOBBY_TTL_MS = 15 * 60 * 1000; // 15 min constraint
const ROOM_DISSOLVE_AFTER_MS = 30 * 60 * 1000; // 30 min — WAITING DB rooms dissolve

const activeLobbies = new Map<string, CustomLobby>();
const onlineUsers = new Map<string, string>();
const activeSearchIntervals = new Map<string, NodeJS.Timeout>();

// Presence helpers — keep onlineUsers consistent and avoid broadcasting
// every connect/disconnect to all connected clients.
function markOnline(userId: string, socketId: string) {
  onlineUsers.set(userId, socketId);
}

function markOffline(userId: string) {
  onlineUsers.delete(userId);
}

// ──────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL GARBAGE COLLECTORS (run once regardless of active connections)
// ──────────────────────────────────────────────────────────────────────────────

// In-memory lobby GC — runs every 60 s
let _gcInitialized = false;
let _dbDissolveInterval: NodeJS.Timeout | null = null;

function initModuleGC(io: import('socket.io').Server) {
    if (_gcInitialized) return;
    _gcInitialized = true;

    // In-memory lobby cleanup
    setInterval(() => {
        const now = Date.now();
        for (const [code, lobby] of activeLobbies.entries()) {
            if (now > lobby.expiresAt) {
                io.to(`lobby-${code}`).emit('lobby_error', 'Lobby expired due to inactivity!');
                activeLobbies.delete(code);
                console.log(`[GC] Cleaned stale in-memory lobby: ${code}`);
            }
        }
    }, 60_000);

    // DB room dissolve — runs every 5 minutes
    // Sets status=DISSOLVED for WAITING Event rows older than ROOM_DISSOLVE_AFTER_MS
    _dbDissolveInterval = setInterval(async () => {
        try {
            const threshold = new Date(Date.now() - ROOM_DISSOLVE_AFTER_MS);
            const dissolved = await prisma.event.updateMany({
                where: { status: 'WAITING', createdAt: { lt: threshold } },
                data: { status: 'DISSOLVED' }
            });
            if (dissolved.count > 0) {
                console.log(`[GC] Auto-dissolved ${dissolved.count} stale WAITING room(s)`);
            }
        } catch (e) {
            console.error('[GC] DB dissolve error:', e);
        }
    }, 5 * 60_000);
}


// quick helper function to generate a 6-digit code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}


// The Progressive Expansion Logic
function getAllowedDifficulties(preferred: Level, waitingSeconds: number): Level[] {
    if (waitingSeconds < 10) return [preferred];
    if (waitingSeconds < 20) {
        if (preferred === "EASY") return ["EASY", "MEDIUM"];
        if (preferred === "MEDIUM") return ["EASY", "MEDIUM"];
        if (preferred === "HARD") return ["MEDIUM", "HARD"];
    }
    return ["EASY", "MEDIUM", "HARD"];
}


export const initSocketServer = (io: Server) => {
    // Start module-level GC once
    initModuleGC(io);

    // Build the "in battle?" lookup once per connection so it can be reused
    // by reconnect recovery logic without re-registering room handlers.
    const getActiveBattleForUser = async (userId: string) => {
        const now = new Date();
        const activeEvent = await prisma.event.findFirst({
            where: {
                status: "IN_PROGRESS",
                performances: {
                    some: { userId }
                }
            },
            select: {
                id: true,
                roomCode: true,
                totalTimeLimitMs: true,
                startedAt: true,
                commonProblem: { select: { github_oid: true } }
            }
        });

        if (!activeEvent) return null;

        const startedAt = activeEvent.startedAt ? new Date(activeEvent.startedAt) : null;
        const elapsedMs = startedAt ? now.getTime() - startedAt.getTime() : 0;
        const totalTimeLimitMs = activeEvent.totalTimeLimitMs || 600_000;

        if (startedAt && elapsedMs >= totalTimeLimitMs) {
            await prisma.event.update({
                where: { id: activeEvent.id },
                data: { status: "FINISHED", finishedAt: now }
            });
            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: activeEvent.id, status: "PENDING" },
                data: { status: "TIMEOUT" }
            });
            return null;
        }

        return {
            eventId: activeEvent.id,
            roomId: `room-${activeEvent.id}`,
            roomCode: activeEvent.roomCode || null,
            problemId: activeEvent.commonProblem?.github_oid || "local-battle",
            totalTimeLimitMs,
            startedAt: activeEvent.startedAt,
            elapsedMs,
        };
    };

    // Authenticate every socket connection
    io.use((socket: any, next: any) => {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return next(new Error("No cookies found"));

        // Parse the token
        const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);

        if (!tokenMatch) return next(new Error("Token missing"));

        // URL Decode the string in case the browser encoded it
        let rawToken = decodeURIComponent(tokenMatch[1]);

        // Remove surrounding quotes if Express added them
        if (rawToken.startsWith('"') && rawToken.endsWith('"')) {
            rawToken = rawToken.slice(1, -1);
        }

        // Remove "Bearer " prefix if it somehow got saved in the cookie
        if (rawToken.startsWith('Bearer ')) {
            rawToken = rawToken.slice(7);
        }

        // Verify cleaned cookie
        const decoded = verifyToken(rawToken);
        if (!decoded) return next(new Error("Cookie verification failed"));

        // Attach the authenticated userid to the socket session
        socket.data.userId = (decoded as any).userId;

        // Pass the connection to the next middleware
        next();
    });


    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        const socketId = socket.id;
        markOnline(userId, socketId);

        socket.on("disconnect", async () => {
            markOffline(userId);

            // Clear any active matchmaking search interval for this socket
            if (activeSearchIntervals.has(socket.id)) {
                clearInterval(activeSearchIntervals.get(socket.id) as NodeJS.Timeout);
                activeSearchIntervals.delete(socket.id);
            }

            await prisma.matchmakingQueue.updateMany({
                where: { userId, status: "WAITING" },
                data: { status: "CANCELLED" }
            }).catch(() => {
                // User may not have been in the queue
            });

            // Only emit presence changes to clients that may care.
            // Broadcasting to everyone on every connect/disconnect is noisy and
            // leaks presence to unrelated users.
            io.emit("user_online_status", {
                userId,
                status: "OFFLINE"
            });
        });

        // DIRECT CHAT AND CHALLENGES
        socket.on("send_direct_message", async (data: { targetUserId: string, content: string }) => {
            // save to DB
            const message = await prisma.message.create({
                data: {
                    senderId: userId,
                    receiverId: data.targetUserId,
                    content: data.content
                }
            });

            const targetSocketId = onlineUsers.get(data.targetUserId);

            if (targetSocketId) {
                io.to(targetSocketId).emit("receive_direct_message", message);
            }
        })

        //DIRECT CHALLENGE PING
        socket.on("send_challenge", (data: { targetUserId: string, username: string, difficulty: string }) => {
            const targetSocketId = onlineUsers.get(data.targetUserId);

            if (targetSocketId) {
                io.to(targetSocketId).emit("incoming_challenge", {
                    challengerId: userId,
                    challengerUsername: data.username,
                    difficulty: data.difficulty
                })
            } else {
                socket.emit("lobby_error", "User is offline!");
            }
        })

        // CHALLENGE ACCEPT
        socket.on("accept_challenge", async (data: { challengerId: string }) => {
            const challengerSocketId = onlineUsers.get(data.challengerId);

            if (!challengerSocketId) {
                                return socket.emit('lobby_error', "Challenger went offline!")
            }

            // Pick a real random problem for the battle instead of hardcoded "local-battle"
            const problems = await prisma.problem.findMany({
                where: {
                    isCustom: false,
                    github_oid: { not: null },
                },
                select: { id: true, github_oid: true, timeLimitMs: true }
            });
            let randomProblemId: string | null = null;
            let problemId = "local-battle";
            let timeLimitMs = 600000;
            if (problems.length > 0) {
                const randomProblem = problems[Math.floor(Math.random() * problems.length)];
                randomProblemId = randomProblem.id;
                problemId = randomProblem.github_oid || randomProblem.id || "local-battle";
                timeLimitMs = randomProblem.timeLimitMs || 600000;
            }

            // create a brand new custom event behind the scenes
            const event = await prisma.event.create({
                data: {
                    type: "FRIENDS",
                    status: "IN_PROGRESS",
                    startedAt: new Date(),
                    maxUsers: 2,
                    commonProblemId: randomProblemId,
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

        })


        // PVP matching events
        socket.on("join_matchmaking", async (payload: { difficulty: Level | string, waitingSeconds?: number } | Level | string) => {
            try {

                if(activeSearchIntervals.has(socket.id)){
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
                        if(currentWaitingSeconds >= 90){
                            clearInterval(searchInterval);
                            activeSearchIntervals.delete(socket.id);
                            await prisma.matchmakingQueue.update({
                                where: { id: queueEntry.id },
                                data: { status: "CANCELLED" }
                            })

                            socket.emit("matchmaking_timeout",{
                                message:"No match found in queue limit. Please try again. "
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

                activeSearchIntervals.set(socket.id,searchInterval);

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

        // LEAVE A CUSTOM LOBBY (host or guest)
        socket.on("leave_custom_room", (roomCode: string) => {
            if (!roomCode) return;
            const normalized = String(roomCode).toUpperCase();

            const lobby = activeLobbies.get(normalized);
            if (lobby) {
                lobby.users = lobby.users.filter((u) => u !== userId);
                if (lobby.hostId === userId) {
                    // If the host leaves, dissolve the lobby
                    activeLobbies.delete(normalized);
                    io.to(`lobby-${normalized}`).emit("lobby_ended");
                    return;
                }
                io.to(`lobby-${normalized}`).emit("lobby_updated", {
                    currentUsers: lobby.users.length,
                    maxUsers: lobby.maxUsers
                });
            }

            socket.leave(`lobby-${normalized}`);
        });

        // DELETE A CUSTOM LOBBY (host only)
        socket.on("delete_custom_room", (roomCode: string) => {
            if (!roomCode) return;
            const normalized = String(roomCode).toUpperCase();

            const lobby = activeLobbies.get(normalized);
            if (!lobby) return;
            if (lobby.hostId !== userId) {
                return socket.emit("lobby_error", "Only the host can delete this lobby!");
            }

            activeLobbies.delete(normalized);
            io.to(`lobby-${normalized}`).emit("lobby_ended");
            console.log(`[LOBBY] Room ${normalized} deleted by host ${userId}`);
        });
        socket.on("leave_room",(roomId:string)=>{
            if(roomId){
                socket.leave(roomId);
                console.log(`user ${userId} left the room ${roomId}`);
            }
        })


        // ------------------------------------
        // CUSTOM MULTIPLAYER LOOBIES
        // ------------------------------------

        // HOST CREATES A ROOM
        socket.on('create_custom_room', async (data: {
            maxUsers: number,
            password?: string,
            difficulty: string,
            problemsIds?: string[],
        }) => {
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            activeLobbies.set(roomCode, {
                hostId: userId,
                users: [userId],
                maxUsers: data.maxUsers || 2,
                password: data.password,
                targetDifficulty: data.difficulty || 'ANY',
                problemsIds: [],
                expiresAt: Date.now() + LOBBY_TTL_MS // assign connection constraint
            })

            socket.join(`lobby-${roomCode}`);

            socket.emit('custom_room_created', {
                roomCode,
                isHost: true,
                currentUsers: 1,
                maxUsers: data.maxUsers || 2,
                difficulty: data.difficulty || 'ANY',
            })
        })

        // PLAYERS JOIN VIA CODE
        socket.on('join_custom_room', (data: {
            roomCode: string, password?: string
        }) => {
            const lobby = activeLobbies.get(data.roomCode.toUpperCase());

            if (!lobby) return socket.emit(`lobby_error`, `Lobby not found!`)

            if (lobby.password && lobby.password !== data.password) return socket.emit('lobby_error', "Incorrect Password!");

            if (lobby.users.length >= lobby.maxUsers) return socket.emit('lobby_error', "Lobby is full!");

            if (lobby.users.includes(userId)) return socket.emit('lobby_error', "You are already in this lobby!");

            lobby.users.push(userId);
            socket.join(`lobby-${data.roomCode}`);

            io.to(`lobby-${data.roomCode}`).emit('lobby_updated', {
                currentUsers: lobby.users.length,
                maxUsers: lobby.maxUsers
            })

        })

        // HOST STARTS THE MATCH
        socket.on('start_custom_match', async (roomCode: string) => {
            const lobby = activeLobbies.get(roomCode);
            if (!lobby || lobby.hostId !== userId) return;


            let selectedProblemIds = lobby.problemsIds;

            // if no custom questions were provided,pick a random as a fallback 
            if (!selectedProblemIds || selectedProblemIds.length === 0) {
                const problems = await prisma.problem.findMany({
                    where: lobby.targetDifficulty === 'ANY' ? {} : {
                        difficulty_level: lobby.targetDifficulty as any
                    },
                    select: { id: true }
                });

                if (problems.length > 0) {
                    selectedProblemIds = [problems[Math.floor(Math.random() * problems.length)]?.id || ""];
                }
            }

            // create event and connect the playlist
            if (selectedProblemIds.length > 0) {
                lobby.problemsIds = selectedProblemIds;

                try {
                    const event = await prisma.event.create({
                        data: {
                            type: "FRIENDS",
                            status: "IN_PROGRESS",
                            startedAt: new Date(),
                            roomCode: roomCode,
                            maxUsers: lobby.maxUsers,
                            password: lobby.password || null,
                            problems: {
                                connect: selectedProblemIds.map((id) => ({ id })),
                            },
                            performances: {
                                create: lobby.users.map(uId => ({
                                    userId: uId,
                                    status: "PENDING"
                                }))
                            }
                        },
                        include: { problems: true }
                    });

                    const firstProblem = event.problems?.[0];

                    // route everyone to the battle arena!
                    io.to(`lobby-${roomCode}`).emit('custom_match_started', {
                        roomId: `room-${event.id}`,
                        problemId: firstProblem?.github_oid || "local-battle",
                        timeLimitMs: firstProblem?.timeLimitMs || 600000
                    });
                    activeLobbies.delete(roomCode);

                    // clean up the lobby after 5 minutes
                    setTimeout(() => {
                        activeLobbies.delete(roomCode);
                        io.to(`lobby-${roomCode}`).emit('lobby_ended');
                    }, LOBBY_TTL_MS);
                } catch (error) {
                    console.error("Failed to start custom match:", error);
                }
            }
        })


        socket.on('start_event', async (roomCode: string) => {
            try {
                const event = await prisma.event.findFirst({ where: { roomCode } });
                if (!event || event.hostId !== userId) return;

                const startedAt = new Date();
                const finishedAt = event.totalTimeLimitMs
                    ? new Date(startedAt.getTime() + event.totalTimeLimitMs)
                    : null;

                await prisma.event.update({
                    where: { id: event.id },
                    data: { status: 'IN_PROGRESS', startedAt, finishedAt }
                });

                io.to(roomCode).emit('battle_starting', { countdownSeconds: 3 });

                io.to(roomCode).emit('battle_state', {
                    startedAt,
                    status: 'IN_PROGRESS',
                    finishedAt
                });
            } catch (error) {
                console.log('Error starting event:', error);
            }
        });

        socket.on('join_battle', async (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${userId} joined room ${roomId}`)
            try {
                // Determine if roomId is a UUID (from matchmaking) or a 6-char roomCode
                let event;
                if (roomId.startsWith('room-')) {
                    const eventId = roomId.replace('room-', '');
                    event = await prisma.event.findUnique({
                        where: { id: eventId }, include: {
                            problems: { select: { timeLimitMs: true } }
                        }
                    });
                } else {
                    event = await prisma.event.findFirst({
                        where: { roomCode: roomId }, include: {
                            problems: { select: { timeLimitMs: true } }
                        }
                    });
                }

                if (!event) return;

                if (event && event.startedAt && event.status === 'IN_PROGRESS') {
                    const totalDurationMs = event.totalTimeLimitMs || event.problems?.[0]?.timeLimitMs || 600000;
                    const elapsedMs = Date.now() - new Date(event.startedAt).getTime();
                    const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
                    const remainingSeconds = Math.floor(remainingMs / 1000);
                    // Expiration Check
                    if (remainingSeconds <= 0) {
                        await prisma.event.update({
                            where: { id: event.id },
                            data: {
                                status: 'FINISHED',
                                finishedAt:new Date(),
                                performances: { updateMany: { where: { eventId: event.id }, data: { status: 'TIMEOUT' } } }
                            }
                        }).catch(e => console.error(e));

                        socket.emit("battle_state", { status: 'FINISHED',remainingSeconds:0 });
                        return;
                    }
                    socket.emit("battle_state", {
                        startedAt: event.startedAt,
                        totalDurationMs,
                        remainingSeconds,
                        status: event.status,
                        finishedAt: event.finishedAt
                    })
                }

            } catch (error) {
                console.log('Error fetching event for battle state:', error);
            }
        })

        socket.on("check_active_battle", async () => {
            try {
                const active = await getActiveBattleForUser(userId);
                if (active) {
                    console.log('Active battle found for user:', userId);
                    socket.emit('active_battle_found', {
                        roomId: active.roomId,
                        problemId: active.problemId
                    });
                }
            } catch (error) {
                console.log('Error fetching active battle:', error);
            }
        });

        socket.on('accept_match', async (matchId: string) => {
            try {
                // matchId is "room-UUID"
                const eventId = matchId.replace("room-", "");

                // Update this user's performance to ACCEPTED
                await prisma.userPersonalPerformance.updateMany({
                    where: { eventId, userId },
                    data: { status: 'ACCEPTED' }
                });

                // Check if all players have accepted
                const performances = await prisma.userPersonalPerformance.findMany({
                    where: { eventId }
                });

                const allAccepted = performances.length === 2 && performances.every(p => p.status === 'ACCEPTED');

                if (allAccepted) {
                    const futureStartTime = new Date(Date.now() + 5000);
                    // Update event to IN_PROGRESS
                    const event = await prisma.event.update({
                        where: { id: eventId },
                        data: {
                            status: 'IN_PROGRESS',
                            startedAt: futureStartTime,
                        },
                        include: { commonProblem: true }
                    });

                    // Join socket rooms and notify
                    for (const perf of performances) {
                        const socketId = onlineUsers.get(perf.userId);
                        if (socketId) {
                            const pSocket = io.sockets.sockets.get(socketId);
                            pSocket?.join(matchId);
                        }
                    }

                    io.to(matchId).emit("match_starting", {
                        eventId: eventId,
                        roomName: matchId,
                        problemId: event.commonProblem?.github_oid || "local-battle"
                    });
                }
            } catch (error) {
                console.error("Accept match error:", error);
            }
        })

        socket.on("decline_match", async (matchId: string) => {
            try {
                const eventId = matchId.replace("room-", "");

                await prisma.event.update({
                    where: { id: eventId },
                    data: { status: 'CANCELLED' }
                });

                // find both players in the event
                const performances = await prisma.userPersonalPerformance.findMany({
                    where: { eventId }
                });

                // identify the innocent player - userId comes from the context of the socket
                const innocentPlayer = performances.find((p: any) => p.userId !== userId);

                // send standard decline to the person who declined
                socket.emit("match_declined");

                // send auto - requeue command to innocent player
                if (innocentPlayer) {
                    const innocentSocketId = onlineUsers.get(innocentPlayer.userId);
                    if (innocentSocketId) {
                        io.to(innocentSocketId).emit(
                            "match_opponent_declined");
                    }
                }
            } catch (error) {
                console.error("Decline match error:", error);
            }
        });

        socket.on('surrender_battle', async (data: any) => {
            const roomId = typeof data === "string" ? data : data?.roomId;
            if (!roomId) return;
            const eventId = roomId.replace("room-", "");
            await prisma.event.update({
                where: { id: eventId },
                data: { status: 'FINISHED', finishedAt: new Date() }
            }).catch(e => console.error(e));

            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: eventId, userId: userId },
                data: { status: 'SURRENDER' }
            }).catch(e => console.error(e));

            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: eventId, userId: { not: userId } },
                data: { status: 'PASSED' }
            }).catch(e => console.error(e));

            socket.to(roomId).emit('battle_update', {
                status: 'Opponent Surrendered! \n You Win 🏆',
                progress: 0,
                result: "OPPONENT_SURRENDERED"
            });
        });

        socket.on('surrender_match', async (data: any) => {
            const roomId = typeof data === "string" ? data : data?.roomId;
            if (!roomId) return;
            const eventId = roomId.replace("room-", "");
            await prisma.event.update({
                where: { id: eventId },
                data: { status: 'FINISHED', finishedAt: new Date() }
            }).catch(e => console.error(e));

            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: eventId, userId: userId },
                data: { status: 'SURRENDER' }
            }).catch(e => console.error(e));

            await prisma.userPersonalPerformance.updateMany({
                where: { eventId: eventId, userId: { not: userId } },
                data: { status: 'PASSED' }
            }).catch(e => console.error(e));

            socket.to(roomId).emit('battle_update', {
                status: 'Opponent Surrendered! \n You Win 🏆',
                progress: 0,
                result: "OPPONENT_SURRENDERED"
            });
        });

        socket.on('battle_action', async (data: { roomId: string, userId: string, status: string, progress: number, result?: string, linesWritten?: number }) => {
            const { roomId, progress, status, result, linesWritten } = data;
            if (!roomId) return;
            const currentUserId = socket.data.userId || data.userId;

            // Broadcast progress update (including lines written) to all others in room
            socket.to(roomId).emit('battle_update', {
                userId: currentUserId,
                status,
                progress,
                result,
                linesWritten
            });

            if (result === 'OPPONENT_WON' || result === 'OPPONENT_COMPLETED' || status === "Passed tests!") {
                const eventId = roomId.replace("room-", "");

                const event = await prisma.event.findUnique({
                    where: { id: eventId },
                    include: { performances: true }
                }).catch(() => null);

                if (event) {
                    const performances = await prisma.userPersonalPerformance.findMany({
                        where: { eventId: event.id },
                        include: {
                            user: { select: { id: true, username: true, avatarUrl: true } },
                            submissions: {
                                orderBy: { attemptNumber: "asc" }
                            }
                        }
                    });

                    io.to(roomId).emit("battle_finished", {
                        status: "FINISHED",
                        performances
                    });
                }
            }
        });

        // ──────────────────────────────────────────────────────────────
        // HOST POWERS
        // ──────────────────────────────────────────────────────────────

        // HOST KICKS A PLAYER
        socket.on('host_kick_user', async (data: { roomId: string, targetUserId: string }) => {
            try {
                const { roomId, targetUserId } = data;
                const eventId = roomId.replace('room-', '');
                const event = await prisma.event.findFirst({
                    where: { OR: [{ id: eventId }, { roomCode: roomId }] }
                });
                if (!event || event.hostId !== userId) {
                    return socket.emit('host_error', 'Only the host can kick players.');
                }
                // Mark their performance as FAILED
                await prisma.userPersonalPerformance.updateMany({
                    where: { eventId: event.id, userId: targetUserId },
                    data: { status: 'FAILED' }
                });
                // Notify the kicked user
                const kickedSocketId = onlineUsers.get(targetUserId);
                if (kickedSocketId) {
                    io.to(kickedSocketId).emit('you_were_kicked', { roomId });
                }
                // Notify the room
                io.to(roomId).emit('player_kicked', { userId: targetUserId });
                // Push refreshed participant analytics to everyone in the room
                try {
                    const performances = await prisma.userPersonalPerformance.findMany({
                        where: { eventId: event.id },
                        include: {
                            user: { select: { id: true, username: true, avatarUrl: true, bio: true } },
                            submissions: {
                                select: {
                                    id: true, problemId: true, status: true,
                                    passedCase: true, totalCases: true,
                                    runtimeMs: true, memoryKb: true,
                                    language: true, attemptNumber: true,
                                    isBestSubmission: true, createdAt: true
                                },
                                orderBy: { attemptNumber: "asc" }
                            }
                        }
                    });
                    io.to(roomId).emit('participants_updated', { performances });
                } catch (e) {
                    console.error('[host_kick_user] participants refresh error:', e);
                }
                console.log(`[HOST] User ${targetUserId} kicked from room ${roomId} by host ${userId}`);
            } catch (e) {
                console.error('[host_kick_user] error:', e);
            }
        });

        // HOST FORCE-ENDS THE MATCH
        socket.on('host_end_match', async (data: { roomId: string }) => {
            try {
                const { roomId } = data;
                const eventId = roomId.replace('room-', '');
                const event = await prisma.event.findFirst({
                    where: { OR: [{ id: eventId }, { roomCode: roomId }] }
                });
                if (!event || event.hostId !== userId) {
                    return socket.emit('host_error', 'Only the host can end the match.');
                }
                await prisma.event.update({
                    where: { id: event.id },
                    data: { status: 'FINISHED', finishedAt: new Date() }
                });
                await prisma.userPersonalPerformance.updateMany({
                    where: { eventId: event.id, status: 'PENDING' },
                    data: { status: 'TIMEOUT' }
                });
                const eventWithSubs = await prisma.userPersonalPerformance.findMany({
                    where: { eventId: event.id },
                    include: {
                        user: { select: { id: true, username: true, avatarUrl: true } },
                        submissions: {
                            select: {
                                id: true, problemId: true, status: true,
                                passedCase: true, totalCases: true,
                                runtimeMs: true, memoryKb: true,
                                language: true, attemptNumber: true,
                                isBestSubmission: true, createdAt: true
                            },
                            orderBy: { attemptNumber: "asc" }
                        }
                    }
                });
                io.to(roomId).emit('match_completed', {
                    status: 'FINISHED',
                    reason: 'HOST_ENDED',
                    performances: eventWithSubs
                });
                io.to(roomId).emit('participants_updated', { performances: eventWithSubs });
                console.log(`[HOST] Match ${roomId} force-ended by host ${userId}`);
            } catch (e) {
                console.error('[host_end_match] error:', e);
            }
        });

        // LIVE SPECTATOR CODE REQUEST
        socket.on('request_player_code', (data: { roomId: string, targetUserId: string }) => {
            const { roomId, targetUserId } = data;
            const targetSocketId = onlineUsers.get(targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('fetch_live_code_request', { requesterSocketId: socket.id, roomId });
            }
        });

        // TARGET PLAYER SENDS CODE BACK TO SPECTATOR
        socket.on('provide_player_code', (data: { requesterSocketId: string, code: string, language: string, problemId?: string }) => {
            io.to(data.requesterSocketId).emit('live_code_update', {
                userId: userId,
                code: data.code,
                language: data.language,
                problemId: data.problemId,
                updatedAt: new Date().toISOString()
            });
        });

        // BROADCAST CODE UPDATE IN ROOM (debounced or on test run)
        socket.on('broadcast_player_code', (data: { roomId: string, code: string, language: string, problemId?: string, linesWritten?: number }) => {
            socket.to(data.roomId).emit('live_code_update', {
                userId: userId,
                code: data.code,
                language: data.language,
                problemId: data.problemId,
                linesWritten: data.linesWritten,
                updatedAt: new Date().toISOString()
            });
        });
        
        socket.on("send_battle_message", (data: {
            roomId: string,
            content: string
        }) => {
            const { roomId, content } = data;
            const message = {
                id: Date.now().toString(),
                socketId: socket.id,
                content,
                createdAt: new Date().toISOString()
            }

            // broadcast strictly to players in this arena
            io.to(roomId).emit("receive_battle_message", message);
        })

        // GROUP TERMINATION — host OR global ADMIN may terminate; everyone
        // in the room is notified so they can leave the battle arena.
        socket.on("terminate_group", async (data: { roomId: string }) => {
            try {
                const { roomId } = data;
                const eventId = roomId.replace("room-", "");
                const event = await prisma.event.findFirst({
                    where: { OR: [{ id: eventId }, { roomCode: roomId }] }
                });
                if (!event) {
                    return socket.emit("host_error", "Event not found.");
                }

                const caller = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { role: true }
                });
                const isAdmin = (caller?.role || "").toUpperCase() === "ADMIN";
                if (event.hostId !== userId && !isAdmin) {
                    return socket.emit("host_error", "Only the host or an admin can terminate this group.");
                }

                await prisma.event.update({
                    where: { id: event.id },
                    data: { status: "FINISHED", finishedAt: new Date() }
                });
                await prisma.userPersonalPerformance.updateMany({
                    where: { eventId: event.id, status: "PENDING" },
                    data: { status: "TIMEOUT" }
                });
                io.to(roomId).emit("group_terminated", { roomId, reason: "ADMIN_TERMINATED" });
                console.log(`[HOST] Group ${roomId} terminated by ${userId} (admin=${isAdmin})`);
            } catch (e) {
                console.error("[terminate_group] error:", e);
            }
        })

    }
    )
}