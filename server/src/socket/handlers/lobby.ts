import { prisma } from "../../lib/prisma.js";
import { deriveEventDurationMs } from "../../lib/eventTimeLimit.js";
import { LOBBY_TTL_MS } from "../gc.js";
import { emitRoomForceClosed, emitToUser } from "../ioRegistry.js";
import type { HandlerCtx } from "../types.js";
import { 
  getLobby, 
  setLobby, 
  deleteLobby 
} from "../stateRedis.js";

export function registerLobbyHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;

    // LEAVE A CUSTOM LOBBY (host or guest)
    socket.on("leave_custom_room", async (roomCode: string) => {
        if (!roomCode) return;
        const normalized = String(roomCode).toUpperCase();

        const lobby = await getLobby(normalized);
        if (lobby) {
            lobby.users = lobby.users.filter((u) => u !== userId);
            if (lobby.hostId === userId) {
                // If the host leaves, dissolve the lobby
                await deleteLobby(normalized);
                io.to(`lobby-${normalized}`).emit("lobby_ended");
                return;
            }
            await setLobby(normalized, lobby);
            io.to(`lobby-${normalized}`).emit("lobby_updated", {
                currentUsers: lobby.users.length,
                maxUsers: lobby.maxUsers
            });
        }

        socket.leave(`lobby-${normalized}`);
    });

    // DELETE A CUSTOM LOBBY (host only)
    socket.on("delete_custom_room", async (roomCode: string) => {
        if (!roomCode) return;
        const normalized = String(roomCode).toUpperCase();

        const lobby = await getLobby(normalized);
        if (!lobby) return;
        if (lobby.hostId !== userId) {
            return socket.emit("lobby_error", "Only the host can delete this lobby!");
        }

        await deleteLobby(normalized);
        io.to(`lobby-${normalized}`).emit("lobby_ended");
        console.log(`[LOBBY] Room ${normalized} deleted by host ${userId}`);
    });
    
    socket.on("leave_room", async (roomId: string, options?: { notify?: boolean; notifyParticipants?: boolean }) => {
        if (!roomId) return;
        // Leave ALL room aliases so state is consistent on rejoin.
        // Previously only the single supplied roomId was left, causing
        // partial leave and inconsistent rejoin state.
        try {
            const eventId = roomId.replace("room-", "");
            const event = await prisma.event.findFirst({
                where: { OR: [{ id: eventId }, { roomCode: roomId }] },
                select: { id: true, roomCode: true, hostId: true },
            });
            const aliases = event
                ? [event.roomCode ?? "", `room-${event.id}`, roomId].filter(Boolean)
                : [roomId];
            const unique = [...new Set(aliases)];
            for (const alias of unique) {
                socket.leave(alias);
            }
            console.log(`user ${userId} left rooms [${unique.join(", ")}]`);

            // Emit participant_left to remaining room members if notified.
            // This alerts the moderator and other participants about
            // pre-start departures in real-time.
            const shouldNotify = options?.notifyParticipants === true || options?.notify === true;
            if (shouldNotify && event) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true, avatarUrl: true },
                }).catch(() => null);

                const leavePayload = {
                    userId,
                    username: user?.username,
                    reason: "voluntary",
                };

                // Broadcast to all other participants still in the room
                const targetRooms = [event.roomCode, `room-${event.id}`, roomId].filter(Boolean) as string[];
                const uniqueRooms = [...new Set(targetRooms)];
                for (const tr of uniqueRooms) {
                    io.to(tr).emit("participant_left", leavePayload);
                }

                // Targeted delivery to remaining participants on ALL their sockets
                // so they learn of the departure even if their socket is not
                // currently joined to any battle alias (reconnect / new tab /
                // previously left the room). Room-scoped io.to() emits alone
                // cannot reach those sockets.
                const remaining = await prisma.userPersonalPerformance.findMany({
                    where: { eventId: event.id, userId: { not: userId } },
                    select: { userId: true },
                });
                await Promise.all(
                    remaining.map((p) => emitToUser(p.userId, "participant_left", leavePayload))
                );

                // Also send targeted notification to host in case they're not in socket room
                if (event.hostId && event.hostId !== userId) {
                    await emitToUser(event.hostId, "participant_left", leavePayload);
                }

                console.log(`[leave_room] notified room members of user ${userId} leaving ${event.id}`);
            }
        } catch {
            // Fallback: leave at least the provided room
            socket.leave(roomId);
            console.log(`user ${userId} left the room ${roomId}`);
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
        const lobby = {
            hostId: userId,
            users: [userId],
            maxUsers: data.maxUsers || 2,
            password: data.password,
            targetDifficulty: data.difficulty || 'ANY',
            problemsIds: [],
            expiresAt: Date.now() + LOBBY_TTL_MS
        };
        
        await setLobby(roomCode, lobby);

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
    socket.on('join_custom_room', async (data: {
        roomCode: string, password?: string
    }) => {
        const normalizedCode = data.roomCode.toUpperCase();
        const lobby = await getLobby(normalizedCode);

        if (!lobby) return socket.emit(`lobby_error`, `Lobby not found!`)

        if (lobby.password && lobby.password !== data.password) return socket.emit('lobby_error', "Incorrect Password!");

        if (lobby.users.length >= lobby.maxUsers) return socket.emit('lobby_error', "Lobby is full!");

        if (lobby.users.includes(userId)) return socket.emit('lobby_error', "You are already in this lobby!");

        lobby.users.push(userId);
        await setLobby(normalizedCode, lobby);
        socket.join(`lobby-${normalizedCode}`);

        io.to(`lobby-${normalizedCode}`).emit('lobby_updated', {
            currentUsers: lobby.users.length,
            maxUsers: lobby.maxUsers
        })

    })

    // HOST STARTS THE MATCH
    socket.on('start_custom_match', async (roomCode: string) => {
        const normalizedCode = roomCode.toUpperCase();
        const lobby = await getLobby(normalizedCode);
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
                        status: "WAITING",
                        hostId: userId,
                        roomCode: normalizedCode,
                        maxUsers: lobby.maxUsers,
                        password: lobby.password || null,
                        problems: {
                            connect: selectedProblemIds.map((id: string) => ({ id })),
                        },
                        performances: {
                            create: lobby.users.map((uId: string) => ({
                                userId: uId,
                                status: "PENDING"
                            }))
                        }
                    },
                    include: { problems: true }
                });

                const firstProblem = event.problems?.[0];

                // Route everyone to the battle arena. The room starts in WAITING
                // status — only the host can begin the battle by clicking START,
                // which emits `start_event` and unlocks problems for everyone.
                io.to(`lobby-${normalizedCode}`).emit('custom_match_started', {
                    roomId: `room-${event.id}`,
                    problemId: firstProblem?.github_oid || "local-battle",
                    timeLimitMs: firstProblem?.timeLimitMs || 600000
                });
                await deleteLobby(normalizedCode);

            } catch (error) {
                console.error("Failed to start custom match:", error);
            }
        }
    })


    socket.on('start_event', async (roomCode: string, ack?: (response: { success: boolean; error?: string }) => void) => {
        const rawId = (roomCode || "").replace("room-", "");
        try {
            const event = await prisma.event.findFirst({
                where: { OR: [{ roomCode }, { id: rawId }] },
                include: {
                    problems: { include: { test_cases: true, code_snippets: true } },
                    commonProblem: { include: { test_cases: true, code_snippets: true } }
                }
            });
            if (!event) {
                ack?.({ success: false, error: 'Event not found' });
                return;
            }
            if (event.hostId !== userId) {
                ack?.({ success: false, error: 'Only the host can start the event' });
                return;
            }

            const startedAt = new Date();
            const finishedAt = event.totalTimeLimitMs
                ? new Date(startedAt.getTime() + event.totalTimeLimitMs)
                : null;

            await prisma.event.update({
                where: { id: event.id },
                data: { status: 'IN_PROGRESS', startedAt, finishedAt }
            });

            // Collect ALL socket room aliases clients may have joined.
            // Clients joining via a "room-<uuid>" URL join that room name directly;
            // clients joining via a 6-char roomCode join that code. Including the
            // raw roomCode param (which is whatever the client put in the URL) ensures
            // battle_starting and battle_started reach every participant.
            const targetRooms = [
              event.roomCode,
              `room-${event.id}`,
              roomCode,          // raw param from client — may equal one of the above
            ].filter(Boolean) as string[];

            // Dedupe in case roomCode equals room-${event.id} or event.roomCode
            const uniqueRooms = [...new Set(targetRooms)];

            // Acknowledge start immediately so the host gets feedback
            ack?.({ success: true });

            // Emit countdown events: 3, 2, 1
            for (let i = 3; i >= 1; i--) {
                for (const tr of uniqueRooms) {
                    io.to(tr).emit('battle_starting', { countdownSeconds: i });
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // After countdown, emit battle_started to unlock editor with unmasked problem details
            const totalDurationMs = deriveEventDurationMs(event);
            for (const tr of uniqueRooms) {
                io.to(tr).emit('battle_started', {
                    startedAt,
                    problems: event.problems,
                    commonProblem: event.commonProblem,
                    totalDurationMs
                });
                io.to(tr).emit('battle_state', {
                    startedAt,
                    status: 'IN_PROGRESS',
                    finishedAt,
                    totalDurationMs
                });
            }
        } catch (error) {
            console.log('Error starting event:', error);
            // Notify all participants that the start failed so the UI doesn't stay
            // stuck in the countdown overlay forever.
            try {
                const errEvent = await prisma.event.findFirst({
                    where: { OR: [{ id: rawId }, { roomCode }] },
                    select: { id: true, roomCode: true },
                });
                if (errEvent) {
                    emitRoomForceClosed(errEvent, "Failed to start the operation. Please try again.");
                }
            } catch {
                socket.emit("start_failed", { error: "Failed to start the operation" });
            }
        }
    });
}