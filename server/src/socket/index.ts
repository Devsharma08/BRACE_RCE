import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { initModuleGC } from "./gc.js";
import { registerSocketAuth } from "./auth.js";
import { getActiveBattleForUser } from "./activeBattle.js";
import { activeLobbies, activeSearchIntervals, markOffline, markOnline, onlineUsers } from "./state.js";
import type { HandlerCtx } from "./types.js";
import { registerMessagingHandlers } from "./handlers/messaging.js";
import { registerChallengeHandlers } from "./handlers/challenge.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.js";
import { registerLobbyHandlers } from "./handlers/lobby.js";
import { registerBattleHandlers } from "./handlers/battle.js";
import { registerSpectatorHandlers } from "./handlers/spectator.js";
import { registerHostHandlers } from "./handlers/host.js";

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
    });
};
