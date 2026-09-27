import { prisma } from "../../lib/prisma.js";
import { LOBBY_TTL_MS } from "../gc.js";
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
    
    socket.on("leave_room", (roomId: string) => {
        if (roomId) {
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
                        status: "IN_PROGRESS",
                        startedAt: new Date(),
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

                // route everyone to the battle arena!
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
}