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
import { emitToUser } from "./ioRegistry.js";
import type { HandlerCtx } from "./types.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

// Separate Redis clients for pub/sub (Socket.io adapter) vs general use.
// Using the shared singleton for both pub/sub and GET/SET causes "Can't execute
// 'get': only (P|S)SUBSCRIBE allowed in this context" errors.
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
function createPubSubClient() {
  const client = createClient({
    url: REDIS_URL,
    // Auto-reconnect with bounded backoff so the adapter never stays "closed"
    // — the root cause of silent WebSocket event drops observed in prod.
    socket: {
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 100, 5000);
        return delay;
      },
    },
  });
  client.on("error", (err: Error) => logger.error(`Redis pub/sub client error: ${err.message}`));
  client.on("reconnecting", (delay: number) => logger.info(`Redis pub/sub reconnecting in ${delay}ms`));
  client.on("ready", () => logger.info("Redis pub/sub client ready"));
  return client;
}

// Re-attach the Redis adapter if the underlying clients reconnect after a
// network blip. Without this, a dropped Redis connection permanently breaks
// Socket.io broadcasts across PM2 workers.
function attachAdapterWithReconnect(io: Server, pubClient: any, subClient: any) {
  const adapter = createAdapter(pubClient, subClient);
  io.adapter(adapter);

  const onReconnect = () => {
    logger.info("Redis adapter re-attaching after reconnect");
    io.adapter(createAdapter(pubClient, subClient));
  };
  pubClient.on("ready", onReconnect);
  subClient.on("ready", onReconnect);
}
import { registerMessagingHandlers } from "./handlers/messaging.js";
import { registerChallengeHandlers } from "./handlers/challenge.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.js";
import { registerLobbyHandlers } from "./handlers/lobby.js";
import { registerBattleHandlers } from "./handlers/battle.js";
import { registerSpectatorHandlers } from "./handlers/spectator.js";
import { registerHostHandlers } from "./handlers/host.js";
import { registerPresenceHandlers } from "./handlers/presence.js";
import { registerReportHandlers } from "./handlers/report.js";
import { createSocketRateLimiter } from "./rateLimiter.js";
import { registerIO } from "./ioRegistry.js";

export const initSocketServer = async (io: Server) => {
    // Expose io to HTTP controllers (friend events, notifications, ...)
    registerIO(io);

    // Attach Redis adapter for multi-process Socket.io support
    try {
      const pubClient = createPubSubClient();
      const subClient = createPubSubClient();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      attachAdapterWithReconnect(io, pubClient, subClient);
      logger.info("Socket.io Redis adapter attached");
    } catch (err) {
      logger.warn(`Socket.io Redis adapter unavailable, falling back to in-memory adapter: ${String(err)}`);
    }

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

        // Join the user's personal room so cross-process emits via
        // io.to(userId) reach this socket even when it lives on a
        // different PM2 worker. Required by the matchmaking fallback
        // path when getSocketId() returns undefined.
        await socket.join(userId);

        socket.on("disconnect", async () => {
            // False when the user still has another live socket (e.g. second tab).
            const wentOffline = await markOffline(userId, socket.id);

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

            // Notify opponent if the user was in an active 1v1 battle.
            // When a player drops mid-battle, the opponent needs to know so
            // they aren't left waiting for progress updates that will never
            // arrive. Mark the disconnecting user's performance as SURRENDER
            // so the event can be resolved (opponent can submit to win).
            const activeBattle = await getActiveBattleForUser(userId);
            if (activeBattle) {
                const event = await prisma.event.findUnique({
                    where: { id: activeBattle.eventId },
                    select: {
                        id: true,
                        roomCode: true,
                        type: true,
                        hostId: true,
                        performances: {
                            where: { userId: { not: userId } },
                            select: { userId: true }
                        }
                    }
                });
                if (event && event.type === "ONE_VS_ONE") {
                    await prisma.userPersonalPerformance.updateMany({
                        where: { eventId: event.id, userId },
                        data: { status: "SURRENDER" }
                    }).catch(() => {});

                    const targetRooms = [event.id, `room-${event.id}`, event.roomCode ?? ""].filter(Boolean);
                    const payload = { userId, reason: "disconnected" };

                    for (const tr of targetRooms) {
                        io.to(tr).emit("battle_player_left", payload);
                    }

                    for (const perf of event.performances) {
                        await emitToUser(perf.userId, "battle_player_left", payload);
                    }
                }
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
        registerReportHandlers(ctx);

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
