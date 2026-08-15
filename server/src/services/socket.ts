import { Socket, Server } from "socket.io";
import { prisma } from "../Lib/prisma.js";
import jwt from "jsonwebtoken";
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

const activeLobbies = new Map<string, CustomLobby>();
const onlineUsers = new Map<string, string>();


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


// Verify the jwt token
const verifyToken = (token: string) => {
    try {
        console.log("🔍 ATTEMPTING TO VERIFY TOKEN:", token);
        const secret = process.env.JWT_SECRET || "very-strong-secret-key";
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
    } catch (error) {
        console.log("❌ JWT ERROR:", error);
        return null;
    }
}


export const initSocketServer = (io: Server) => {
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
        console.log(`🔌 User Connected: ${userId} (Socket ID: ${socket.id})`);

        // register user as online
        onlineUsers.set(userId, socket.id);

        // let everyone know this user just came online - later to only frineds
        io.emit("user_online_status", {
            userId, status: "ONLINE"
        })

        // garbage collector to cleanup the abandoned connection lobbies
        setInterval(() => {
            const now = Date.now();
            for (const [code, lobby] of activeLobbies.entries()) {
                if (now > lobby.expiresAt) {
                    io.to(`lobby-${code}`).emit('lobby_error', "Lobby expired due to inactivity!");
                    activeLobbies.delete(code);
                    console.log(`Cleaned up stale lobby ${code} due to inactivity`);
                }
            }
        }, 60000); // checks every 60 seconds

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
                return socket.emit('lobby_error', "Chanllenger went offline!")
            }

            // create a brand new custom event behind the scenes
            const event = await prisma.event.create({
                data: {
                    type: "FRIENDS",
                    status: "IN_PROGRESS",
                    startedAt: new Date(),
                    maxUsers: 2,
                    performances: {
                        create: [{ userId: userId, status: "PENDING" }, {
                            userId: data.challengerId,
                            status: "PENDING"
                        }]
                    }
                }
            })

            const roomId = `room-${event.id}`;
            const problemId = "local-battle" // or fetch a random battle here

            // Instantly wrap both players to arena 
            io.to(socket.id).emit("custom_match_started", {
                roomId, problemId, timeLimitMs: 600000
            })

            io.to(challengerSocketId).emit("custom_match_started", { roomId, problemId, timeLimitMs: 600000 });

        })


        // PVP matching events
        socket.on("join_matchmaking", async (payload: { difficulty: Level, waitingSeconds?: number } | Level) => {
            try {
                console.log("JOIN MATCHMAKING RAW PAYLOAD:", JSON.stringify(payload));
                // Compatibility for both old format and new format with waitingSeconds
                const difficulty = typeof payload === "string" ? payload : payload.difficulty;
                console.log("PARSED DIFFICULTY:", JSON.stringify(difficulty));
                const initialWaitingSeconds = typeof payload === "object" && payload.waitingSeconds ? payload.waitingSeconds : 0;

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

                            // 15-SECOND ACCEPTANCE TIMEOUT
                            setTimeout(async () => {
                                try {
                                    const currentEvent = await prisma.event.findUnique({
                                        where: { id: event.id },
                                        include: { performances: true }
                                    });

                                    // If the event is still WAITING after 15s, someone didn't accept in time
                                    if (currentEvent && currentEvent.status === 'WAITING') {
                                        await prisma.event.update({ where: { id: event.id }, data: { status: 'CANCELLED' } });

                                        currentEvent.performances.forEach(p => {
                                            const playerSocketId = onlineUsers.get(p.userId);
                                            if (playerSocketId) {
                                                if (p.status === 'ACCEPTED') {
                                                    // They accepted, but opponent timed out. Auto-requeue!
                                                    io.to(playerSocketId).emit("match_opponent_declined");
                                                } else {
                                                    // They timed out, kick them back to lobby
                                                    io.to(playerSocketId).emit("match_declined");
                                                }
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.error("Match timeout check error", e);
                                }
                            }, 15000);

                        }
                    } catch (e) {
                        console.error("Matchmaking interval error:", e);
                    }
                }, 3000);

                // Handle disconnect/cancel
                const cleanupQueue = async () => {
                    clearInterval(searchInterval);
                    try {
                        await prisma.matchmakingQueue.update({
                            where: { id: queueEntry.id },
                            data: { status: "CANCELLED" }
                        });
                    } catch (e) {
                        console.error("Failed to cancel queue", e);
                    }
                };

                socket.on("disconnect", cleanupQueue);
                socket.on("cancel_matchmaking", cleanupQueue);
            } catch (error) {
                console.error("Matchmaking error:", error);
            }
        });

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
                const activePerformance = await prisma.userPersonalPerformance.findFirst({
                    where: {
                        userId: userId,
                        status: 'PENDING',
                        event: {
                            status: 'IN_PROGRESS'
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        event: {
                            include: { commonProblem: true }
                        }
                    }
                })
                if (activePerformance && activePerformance.event.status === 'IN_PROGRESS') {
                    // Lazy Expiration Check: Auto-cleanup zombie matches!
                    const startedAt = activePerformance.event.startedAt;
                    if (startedAt && (Date.now() - new Date(startedAt).getTime() >= 600 * 1000)) {
                        console.log(`Auto-expiring zombie match ${activePerformance.eventId} for user ${userId}`);
                        await prisma.event.update({
                            where: { id: activePerformance.eventId },
                            data: {
                                status: 'FINISHED',
                                finishedAt: new Date(),
                                performances: { updateMany: { where: { eventId: activePerformance.eventId }, data: { status: 'TIMEOUT' } } }
                            }
                        }).catch(e => console.error(e));
                        return; // Do NOT emit active_battle_found, let them start a new one!
                    }

                    console.log('Active battle found for user:', userId)
                    socket.emit('active_battle_found', {
                        roomId: `room-${activePerformance.eventId}`,
                        problemId: activePerformance.event.commonProblem?.github_oid || "local-battle"
                    })
                }
            } catch (error) {
                console.log('Error fetching active battle:', error);
            }
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

            socket.on('surrender_battle', async (roomId: string) => {
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
                })
            });

            socket.on('battle_action', async (data: { roomId: string, userId: string, status: string, progress: number, result?: string }) => {
                const { roomId, progress, status, result } = data;
                if (!roomId) return;
                const userId = socket.data.userId || data.userId;

                // Broadcast progress update to opponent in room
                socket.to(roomId).emit('battle_update', {
                    userId,
                    status,
                    progress,
                    result
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

            // IN BATTLE CHAT
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

            socket.on("disconnect", () => {
                onlineUsers.delete(userId);
                io.emit("user_online_status", {
                    userId, status: "OFFLINE"
                })
                console.log(`❌ User Disconnected: ${userId}`);
            });
        });
    }
    )
}