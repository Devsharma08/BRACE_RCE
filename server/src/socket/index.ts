import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { initModuleGC } from "./gc.js";
import { registerSocketAuth } from "./auth.js";
import { getActiveBattleForUser } from "./activeBattle.js";
import { activeLobbies, activeSearchIntervals, markOffline, markOnline, onlineUsers } from "./state.js";
import { emitPresenceToFriends, getFriendIds } from "./presence.js";
import type { HandlerCtx } from "./types.js";
import { registerMessagingHandlers } from "./handlers/messaging.js";
import { registerChallengeHandlers } from "./handlers/challenge.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.js";
import { registerLobbyHandlers } from "./handlers/lobby.js";
import { registerBattleHandlers } from "./handlers/battle.js";
import { registerSpectatorHandlers } from "./handlers/spectator.js";
import { registerHostHandlers } from "./handlers/host.js";
import { registerPresenceHandlers } from "./handlers/presence.js";

export const initSocketServer = (io: Server) => {
    // Start module-level GC once
    initModuleGC(io);

    // Authenticate every socket connection
    registerSocketAuth(io);

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        const socketId = socket.id;
        markOnline(userId, socketId);

        socket.on("disconnect", async () => {
            // False when the user still has another live socket (e.g. second tab).
            const wentOffline = markOffline(userId);

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

            // Presence is only relevant to friends — broadcasting to every
            // connected user on every disconnect is noisy and leaks presence.
            // Skip entirely while the user still has another live socket.
            if (wentOffline) {
                emitPresenceToFriends(io, onlineUsers, await getFriendIds(userId), {
                    userId,
                    status: "OFFLINE"
                });
            }
        });

        const ctx: HandlerCtx = {
            io,
            socket,
            userId,
            state: { activeLobbies, onlineUsers, activeSearchIntervals },
            getActiveBattleForUser,
        };

        registerMessagingHandlers(ctx);
        registerChallengeHandlers(ctx);
        registerMatchmakingHandlers(ctx);
        registerLobbyHandlers(ctx);
        registerBattleHandlers(ctx);
        registerSpectatorHandlers(ctx);
        registerHostHandlers(ctx);
        registerPresenceHandlers(ctx);

        // Tell this user's friends (and only them) that they came online.
        // Fire-and-forget: handler registration above must never wait on the DB,
        // and `getFriendIds` never throws.
        void getFriendIds(userId).then((friendIds) =>
            emitPresenceToFriends(io, onlineUsers, friendIds, {
                userId,
                status: "ONLINE"
            })
        );
    });
};
