import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { initModuleGC } from "./gc.js";
import { registerSocketAuth } from "./auth.js";
import { getActiveBattleForUser } from "./activeBattle.js";
import { activeSearchIntervals } from "./state.js";
import { 
  markOnline, 
  markOffline, 
  getSocketId, 
  getOnlineUsers, 
  getActiveLobbiesMap 
} from "./stateRedis.js";
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
import { createSocketRateLimiter } from "./rateLimiter.js";
import { registerIO } from "./ioRegistry.js";

export const initSocketServer = (io: Server) => {
    // Expose io to HTTP controllers (friend events, notifications, ...)
    registerIO(io);

    // Start module-level GC once
    initModuleGC(io);

    // Authenticate every socket connection
    registerSocketAuth(io);

    // Apply rate limiting to all socket connections
    io.use(createSocketRateLimiter({
      maxEvents: 50,        // 50 events per second per socket
      windowMs: 1000,
      exemptEvents: ["disconnect", "connect", "connect_error", "battle_action"], // battle_action has its own validation
    }));

    io.on("connection", async (socket: Socket) => {
        const userId = socket.data.userId;
        const socketId = socket.id;
        const connected = await markOnline(userId, socketId);
        
        if (!connected) {
          // Connection limit exceeded
          socket.emit("connection_limit_exceeded", {
            message: "Too many concurrent connections. Please close other tabs.",
            maxConnections: 5,
          });
          socket.disconnect(true);
          return;
        }

        socket.on("disconnect", async () => {
            // False when the user still has another live socket (e.g. second tab).
            const wentOffline = await markOffline(userId);

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
                const onlineUsersMap = await getOnlineUsers();
                emitPresenceToFriends(io, onlineUsersMap, await getFriendIds(userId), {
                    userId,
                    status: "OFFLINE"
                });
            }
        });

        const activeLobbiesMap = await getActiveLobbiesMap();
        const onlineUsersMap = await getOnlineUsers();

        const ctx: HandlerCtx = {
            io,
            socket,
            userId,
            state: { activeLobbies: activeLobbiesMap, onlineUsers: onlineUsersMap, activeSearchIntervals },
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
        void getFriendIds(userId).then(async (friendIds) => {
            const onlineUsersMap = await getOnlineUsers();
            emitPresenceToFriends(io, onlineUsersMap, friendIds, {
                userId,
                status: "ONLINE"
            });
        });
    });
};
