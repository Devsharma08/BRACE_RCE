import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

// Module-level singleton to ensure the context is the SAME instance across all
// imports — including duplicate module copies emitted alongside sources (the
// stray *.js files; see docs/CONTEXT_WINDOW_RECENT_CHANGES.md §4). A plain
// module-level `let` would not dedupe across those copies, so the context is
// stashed on globalThis and reused.
function getSocketContext(): React.Context<SocketContextType | undefined> {
  const bag = globalThis as typeof globalThis & {
    __brace_rce_socket_context__?: React.Context<SocketContextType | undefined>;
  };
  if (!bag.__brace_rce_socket_context__) {
    bag.__brace_rce_socket_context__ = createContext<SocketContextType | undefined>(undefined);
  }
  return bag.__brace_rce_socket_context__;
}

const SocketContext = getSocketContext();

export interface IncomingChallenge {
  challengerId: string;
  challengerUsername?: string;
  mode?: "RANDOM" | "CUSTOM";
  difficulty?: string;
  problemId?: string;
  problemName?: string;
}

export interface ChallengeOpts {
  mode?: "RANDOM" | "CUSTOM";
  difficulty?: string;
  problemId?: string;
  problemName?: string;
  username?: string;
}

/**
 * Room status tracked by the centralized SocketContext.
 * - "NONE": Not in any battle room
 * - "JOINING": join_battle has been emitted, awaiting ack
 * - "JOINED": Successfully joined the battle room
 * - "LEAVING": leave_room has been emitted
 */
export type BattleRoomStatus = "NONE" | "JOINING" | "JOINED" | "LEAVING";

/**
 * Payload for participant_left events (pre-start leave scenario).
 * The server emits this when a participant leaves before the battle starts.
 */
export interface ParticipantLeftPayload {
  userId: string;
  username?: string;
  roomId?: string;
  roomCode?: string;
  reason?: "USER_LEFT" | "REJECTED" | "KICKED" | "BLOCKED";
}

export interface SocketContextType {
  socket: Socket | null;
  socketTick: number;
  isConnected: boolean;
  battleRoomStatus: BattleRoomStatus;
  currentBattleRoomId: string | null;
  matchmakingStatus: "IDLE" | "SEARCHING" | "FOUND_PENDING";
  pendingMatchId: string | null;
  findMatch: (difficulty?: string) => void;
  cancelMatch: () => void;
  acceptMatch: () => void;
  declineMatch: () => void;
  activeBattleRoom: { roomId: string; problemId: string } | null;
  customLobby: CustomLobbyState | null;
  createCustomRoom: (
    maxUsers: number,
    password?: string,
    difficulty?: string,
    problemIds?: string[],
  ) => void;
  joinCustomRoom: (roomCode: string, password?: string) => void;
  startCustomMatch: () => void;
  leaveCustomMatch: () => void;
  terminateGroup: (roomId: string) => void;
  pendingOpponent: { username: string; id: string; avatarUrl: string; bio: string } | null;
  incomingChallenge: IncomingChallenge | null;
  sendDirectMessage: (targetUserId: string, content: string) => void;
  sendChallenge: (targetUserId: string, opts?: ChallengeOpts | string) => void;
  acceptChallenge: (challengerId: string, opts?: { problemId?: string; mode?: "RANDOM" | "CUSTOM"; difficulty?: string }) => void;
  declineChallenge: (targetUserId: string) => void;
  sendBattleMessage: (roomId: string, content: string) => void;
  isClicked: boolean;
  waitingTime: number;
  requestPresence: (userIds: string[]) => void;
  // Friends presence
  friends: Array<{ id: string; username: string; avatarUrl: string | null; isOnline: boolean }>;
  setFriends: React.Dispatch<React.SetStateAction<Array<{ id: string; username: string; avatarUrl: string | null; isOnline: boolean }>>>;
  rawSocketRef: React.MutableRefObject<Socket | null>;
  /**
   * Centralized battle room management.
   * joinBattleRoom emits join_battle and tracks room status.
   * leaveBattleRoom emits leave_room with proper notification handling.
   * Both are idempotent and deduplicated.
   */
  joinBattleRoom: (roomId: string, ack?: (response: { success: boolean; error?: string }) => void) => void;
  leaveBattleRoom: (roomId: string, options?: { notifyParticipants?: boolean }) => void;
}

export interface CustomLobbyState {
  roomCode: string;
  isHost: boolean;
  currentUsers: number;
  maxUsers: number;
  difficulty: string;
}

const RESYNC_GAP_MS = 5000;

/**
 * Centralized battle room state manager.
 * This ref persists across socket recreations and provides a single source
 * of truth for room membership status.
 */
let battleRoomManager: {
  roomId: string | null;
  status: BattleRoomStatus;
  participantCount: number;
  userId: string | null;
  pendingAcks: Set<string>;
  joinCallbacks: Map<string, (resp: { success: boolean; error?: string }) => void>;
} = {
  roomId: null,
  status: "NONE",
  participantCount: 0,
  userId: null,
  pendingAcks: new Set(),
  joinCallbacks: new Map(),
};

// Map of userId -> socket instance (allows multi-user scenarios in dev)
const socketSingletons = new Map<string, Socket | null>();

// Track current authenticated user for this socket
let currentSocketUserId: string | null = null;

function getOrCreateSocket(userId: string): Socket {
  // If user changed, dispose old socket
  if (currentSocketUserId && currentSocketUserId !== userId) {
    const oldSocket = socketSingletons.get(currentSocketUserId);
    oldSocket?.disconnect();
    socketSingletons.set(currentSocketUserId, null);
  }

  currentSocketUserId = userId;
  let socket = socketSingletons.get(userId);
  if (socket) return socket;

  const rawSocketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:3000";
  const socketUrl = rawSocketUrl.replace(/\/+$/, "").replace(/\/api$/, "");

  // Pass user identity in auth handshake (server must support this)
  // Prefer WebSocket transport, fall back to polling only if WS unavailable.
  socket = io(socketUrl, {
    auth: { userId },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  socketSingletons.set(userId, socket);
  return socket;
}

/**
 * Export for AuthContext to call on logout.
 * Resets the battleRoomManager state.
 */
export function clearSocketSingleton(userId?: string): void {
  if (userId) {
    const socket = socketSingletons.get(userId);
    socket?.disconnect();
    socketSingletons.set(userId, null);
    if (currentSocketUserId === userId) {
      currentSocketUserId = null;
    }
  } else {
    // Clear all (nuclear option)
    socketSingletons.forEach((socket) => socket?.disconnect());
    socketSingletons.clear();
    currentSocketUserId = null;
  }
  // Reset battle room state on logout
  battleRoomManager = {
    roomId: null,
    status: "NONE",
    participantCount: 0,
    userId: null,
    pendingAcks: new Set(),
    joinCallbacks: new Map(),
  };
}

/**
 * Emit join_battle with deduplication. If already joined to the same room,
 * resolves immediately. If a join is in flight, queues the callback.
 */
function emitJoinBattle(
  socket: Socket | null,
  roomId: string,
  userId: string | null,
  ack?: (response: { success: boolean; error?: string }) => void,
): void {
  // Deduplicate: if already joined or joining, don't emit again
  if (battleRoomManager.roomId === roomId && battleRoomManager.status === "JOINED") {
    ack?.({ success: true });
    return;
  }
  if (battleRoomManager.status === "JOINING") {
    // Queue this callback — it will be resolved when the pending ack arrives
    if (ack) {
      battleRoomManager.joinCallbacks.set(roomId, ack);
    }
    return;
  }

  battleRoomManager.status = "JOINING";
  battleRoomManager.roomId = roomId;
  battleRoomManager.userId = userId;

  socket?.emit("join_battle", roomId, (ackResp: { success: boolean; error?: string; participantCount?: number }) => {
    // Resolve all queued callbacks for this room
    const callback = battleRoomManager.joinCallbacks.get(roomId);
    battleRoomManager.joinCallbacks.delete(roomId);

    if (ackResp?.success) {
      battleRoomManager.status = "JOINED";
      battleRoomManager.roomId = roomId;
      battleRoomManager.participantCount = ackResp.participantCount ?? 0;

      ack?.(ackResp);
      callback?.(ackResp);
    } else {
      battleRoomManager.status = "NONE";
      battleRoomManager.roomId = null;
      ack?.(ackResp);
      callback?.(ackResp);
    }
  });
}

/**
 * Emit leave_room with proper notification handling.
 * When notifyParticipants is true, the server will broadcast a participant_left
 * event to the moderator and other participants so they see the departure in real-time.
 * This is used for pre-start leave scenarios.
 */
function emitLeaveRoom(
  socket: Socket | null,
  roomId: string,
  options?: { notifyParticipants?: boolean },
): void {
  // Deduplicate: if not in a room or already leaving, skip
  if (battleRoomManager.roomId !== roomId || battleRoomManager.status === "LEAVING") {
    return;
  }

  battleRoomManager.status = "LEAVING";

  if (options?.notifyParticipants) {
    // Emit leave with notification flag so server broadcasts participant_left
    socket?.emit("leave_room", roomId, { notify: true });
  } else {
    socket?.emit("leave_room", roomId);
  }

  // Reset state immediately — the server will handle cleanup on disconnect
  battleRoomManager.status = "NONE";
  battleRoomManager.roomId = null;
}

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  // Tick counter — incremented each time the socket is (re)created so React
  // always detects a change and re-renders consumers. Previously we stored
  // the Socket object in state, but React's Object.is() comparison saw the same
  // singleton instance on StrictMode's second mount and skipped the re-render,
  // meaning Battle.tsx's socket effect never re-ran after cleanup removed all
  // handlers and left the room (the core "nothing updates until refresh" bug).
  const [socketTick, setSocketTick] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Centralized battle room state — replaces the scattered joinedRoomRef /
  // socketJoinedRef pattern across Battle.tsx and AdminSpectateView.tsx.
  const [battleRoomStatus, setBattleRoomStatus] = useState<BattleRoomStatus>("NONE");
  const [currentBattleRoomId, setCurrentBattleRoomId] = useState<string | null>(null);

  const [matchmakingStatus, setMatchmakingStatus] = useState<
    "IDLE" | "SEARCHING" | "FOUND_PENDING"
  >("IDLE");
  const [pendingOpponent, setPendingOpponent] = useState<{ username: string; id: string; avatarUrl: string; bio: string } | null>(null);
  const [queueDifficulty, setQueueDifficulty] = useState<string>("MEDIUM");
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [activeBattleRoom, setActiveBattleRoom] = useState<{
    roomId: string;
    problemId: string;
  } | null>(null);
  const [customLobby, setCustomLobby] = useState<CustomLobbyState | null>(null);
  const [challengeQueue, setChallengeQueue] = useState<IncomingChallenge[]>([]);
  const incomingChallenge = challengeQueue[0] ?? null;
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const [waitingTime, setWaitingTime] = useState<number>(0);
  // Friends presence state
  const [friends, setFriends] = useState<Array<{ id: string; username: string; avatarUrl: string | null; isOnline: boolean }>>([]);

  // Auth observation — SocketProvider now lives INSIDE AuthProvider, so it can
  // read the authenticated user directly via useAuth(). The previous impl read
  // the shared ["auth-me"] query cache with enabled: false because SocketProvider
  // was the PARENT of AuthProvider and could not call useAuth(). That mirroring
  // workaround is no longer needed.

  const { user } = useAuth();
  const userId: string | null = user?.id ?? null;

  // Task 6 — seed + reconcile presence.
  const { data: presenceFriends } = useQuery<{ friends: Array<{ id: string; username: string; avatarUrl: string | null }> }>({
    queryKey: ["friends-list"],
    queryFn: async () => (await api.get("/friends")).data,
    staleTime: 60_000,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    const list = presenceFriends?.friends;
    if (!Array.isArray(list)) return;
    setFriends((prev) => {
      const liveById = new Map((Array.isArray(prev) ? prev : []).map((f) => [f.id, f.isOnline] as const));
      return list.map((f) => ({
        id: f.id,
        username: f.username,
        avatarUrl: f.avatarUrl ?? null,
        isOnline: liveById.get(f.id) ?? false,
      }));
    });
    socketRef.current?.emit("request_presence", { userIds: list.map((f) => f.id) });
  }, [presenceFriends]);

  // Reconcile presence whenever the socket (re)connects — the snapshot
  // answer only covers ids present in `friends`, so refresh the question
  // rather than trusting flags from before the drop.
  useEffect(() => {
    if (!isConnected) return;
    const ids = presenceFriends?.friends?.map((f) => f.id);
    if (ids && ids.length > 0) socketRef.current?.emit("request_presence", { userIds: ids });
  }, [isConnected, presenceFriends]);

  // Local ticker to increment waiting seconds smoothly by 1 every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (matchmakingStatus === "SEARCHING") {
      interval = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchmakingStatus]);

  const waitingTimeRef = useRef(waitingTime);
  const queueDifficultyRef = useRef(queueDifficulty);

  useEffect(() => {
    waitingTimeRef.current = waitingTime;
  }, [waitingTime]);

  useEffect(() => {
    queueDifficultyRef.current = queueDifficulty;
  }, [queueDifficulty]);

  // Reconnect recovery: remember what matchmaking was doing so a reconnect can
  // re-enqueue instead of silently dropping the user out of the queue.
  const matchmakingStatusRef = useRef(matchmakingStatus);
  useEffect(() => {
    matchmakingStatusRef.current = matchmakingStatus;
  }, [matchmakingStatus]);
  const reconnectStatusRef = useRef<"IDLE" | "SEARCHING">("IDLE");

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const queryClient = useQueryClient();
  const disconnectedAtRef = useRef(0);

  const socketCreatedRef = useRef(false);

  /**
   * Synchronize battleRoomManager state to React state.
   * This allows UI components to reactively respond to room status changes.
   */
  const syncBattleRoomState = useCallback(() => {
    setBattleRoomStatus(battleRoomManager.status);
    setCurrentBattleRoomId(battleRoomManager.roomId);
  }, []);

  useEffect(() => {
    if (!userId || socketCreatedRef.current) return;

    socketCreatedRef.current = true;
    const newSocket = getOrCreateSocket(userId);
    socketRef.current = newSocket;
    // Increment the tick so React always detects a change and re-renders
    // consumers — even when the singleton returns the same Socket instance.
    setSocketTick((t) => t + 1);
    const socket = newSocket;

    const cleanupFns: Array<() => void> = [];
    const bind = (event: string, handler: (...args: any[]) => void) => {
      socket.on(event, handler);
      cleanupFns.push(() => socket.off(event, handler));
    };

    bind("custom_room_created", (data: CustomLobbyState) => {
      setCustomLobby(data);
    });

    bind("incoming_challenge", (data: IncomingChallenge) => {
      setChallengeQueue((prev) =>
        prev.some((c) => c.challengerId === data.challengerId) ? prev : [...prev, data],
      );
      setIsClicked(false);
      toast.info(`Challenge from ${data.challengerUsername ?? "a friend"}`, {
        description: data.mode === "CUSTOM"
          ? `Custom problem: ${data.problemName ?? data.problemId ?? "arena"}`
          : `Random ${data.difficulty ?? "MEDIUM"} problem`,
      });
    });

    bind(
      "lobby_updated",
      (data: { currentUsers: number; maxUsers: number }) => {
        setCustomLobby((prev) => (prev ? { ...prev, ...data } : null));
      },
    );

    bind("lobby_error", (msg: string) => {
      toast.error(msg);
    });

    bind("lobby_ended", () => {
      setCustomLobby(null);
      toast.info("Lobby has ended.");
    });

    bind(
      "custom_match_started",
      (data: { roomId: string; problemId: string; timeLimitMs: number }) => {
        setCustomLobby(null);
        navigateRef.current(
           `/battle/${data.roomId}?oid=${data.problemId}&timeLimit=${data.timeLimitMs}`,
         );
      },
    );

    // ─────────────────────────────────────────────────────────────────────
    // CENTRALIZED CONNECT HANDLER
    // ─────────────────────────────────────────────────────────────────────
    bind("connect", () => {
      setIsConnected(true);
      socket.emit("check_active_battle");

      if (disconnectedAtRef.current && Date.now() - disconnectedAtRef.current > RESYNC_GAP_MS) {
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] !== "auth-me",
        });
      }
      disconnectedAtRef.current = 0;

      if (reconnectStatusRef.current === "SEARCHING") {
        reconnectStatusRef.current = "IDLE";
        setMatchmakingStatus("SEARCHING");
        socket.emit("join_matchmaking", {
          difficulty: queueDifficultyRef.current,
          waitingSeconds: waitingTimeRef.current,
        });
      }

      // Auto-rejoin the battle room on reconnect. After a transport drop
      // Socket.IO server-side rooms are gone, so events stop until the
      // client explicitly re-joins. This was the root cause of "nothing
      // updates until I refresh."
      //
      // Uses the centralized battleRoomManager — no more double join from
      // Battle.tsx and AdminSpectateView.tsx.
      if (battleRoomManager.roomId && battleRoomManager.status === "JOINED") {
        socket.emit("join_battle", battleRoomManager.roomId, (ack: { success: boolean }) => {
          if (ack?.success) {
            console.log("[SocketContext] Reconnected to battle room:", battleRoomManager.roomId);
          } else {
            console.warn("[SocketContext] reconnect rejoin failed for", battleRoomManager.roomId);
            battleRoomManager.status = "NONE";
            battleRoomManager.roomId = null;
            syncBattleRoomState();
          }
        });
      }
    });

    bind("active_battle_found", (data) => {
      setActiveBattleRoom(data);
    });

    bind("disconnect", () => {
      setIsConnected(false);
      disconnectedAtRef.current = Date.now();
      const prev = matchmakingStatusRef.current;
      reconnectStatusRef.current = prev === "SEARCHING" ? "SEARCHING" : "IDLE";
      if (prev !== "SEARCHING") setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
    });

    bind("match_found_pending", (data) => {
      setIsClicked(false);
      setPendingOpponent(data.opponent);
      setPendingMatchId(data.matchId);
      setMatchmakingStatus("FOUND_PENDING");
    });

    bind("matchmaking_search_state", (data) => {
      setWaitingTime(data.waitingSeconds);
    });

    bind("match_starting", (data) => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      setWaitingTime(0);
      navigateRef.current(`/battle/${data.roomName}?oid=${data.problemId}`);
    });

    bind("match_declined", () => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      toast.error("Match declined.");
      setWaitingTime(0);
    });

    bind("match_timeout", () => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      toast.error("Match timed out — no response received.");
      setWaitingTime(0);
    });

    bind("challenge_declined", () => {
      toast.info("Challenge was declined.");
      setIsClicked(false);
    });

    bind("match_opponent_declined", () => {
      setPendingMatchId(null);
      setMatchmakingStatus("SEARCHING");
      setIsClicked(false);
      socket.emit("join_matchmaking", { difficulty: queueDifficultyRef.current, waitingSeconds: waitingTimeRef.current });
    });

    // Friend presence events
    bind("user_online_status", (data: { userId: string; status?: string; isOnline?: boolean }) => {
      const isOnline = data.isOnline ?? data.status === "ONLINE";
      setFriends((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (!list.some((f) => f.id === data.userId)) {
          return [...list, { id: data.userId, username: data.userId, avatarUrl: null, isOnline }];
        }
        return list.map((f) => (f.id === data.userId ? { ...f, isOnline } : f));
      });
    });

    bind("presence_snapshot", (data: Array<{ userId: string; status?: string; isOnline?: boolean }> | { users: Array<{ userId: string; status?: string; isOnline?: boolean }> }) => {
       const list = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
       const statusById = new Map(list.map((u) => [u.userId, u.isOnline ?? u.status === "ONLINE"] as const));
       setFriends((prev) => {
         const current = Array.isArray(prev) ? prev : [];
         let changed = false;
         const next = current.map((f) => {
           if (!statusById.has(f.id)) return f;
           const nextOnline = statusById.get(f.id) as boolean;
           if (f.isOnline !== nextOnline) {
             changed = true;
             return { ...f, isOnline: nextOnline };
           }
           return f;
         });
         return changed ? next : prev;
       });
    });

    // ─────────────────────────────────────────────────────────────────────
    // PARTICIPANT_LEFT EVENT HANDLER (Pre-start leave notification)
    // ─────────────────────────────────────────────────────────────────────
    // When a participant leaves a room that hasn't started yet, the server emits
    // participant_left to all remaining participants (including the moderator).
    // This is distinct from "you_were_kicked" or "player_kicked" — it's a
    // voluntary or timed leave that occurs during the WAITING phase.
    bind("participant_left", (data: ParticipantLeftPayload) => {
      const username = data.username || "A fellow operative";

      // Show a toast notification for all remaining participants
      toast.info(`${username} left the operation.`, {
        id: `participant-left-${data.userId}`,
        duration: 5000,
      });

      // Sync state to React
      syncBattleRoomState();
    });

    // ─────────────────────────────────────────────────────────────────────
    // PARTICIPANT_JOINED EVENT HANDLER (Join notification)
    // ─────────────────────────────────────────────────────────────────────
    // When a new participant successfully joins a room, the server emits
    // participant_joined to all OTHER participants in the room (not the
    // joining user themselves — they already know they joined).
    // This provides real-time visibility into roster changes as they happen.
    bind("participant_joined", (data: {
      userId: string;
      username?: string;
      performance?: any;
      user?: any;
      roomId?: string;
      roomCode?: string;
    }) => {
      const username = data.username || data.user?.username || "A new operative";

      // Conditional check: only show notification if this isn't for the
      // current user (we don't want to notify ourselves about our own join)
      if (data.userId === userId) return;

      // Update participant count tracking
      battleRoomManager.participantCount = (battleRoomManager.participantCount || 0) + 1;

      // Show a toast notification for all remaining participants
      toast.info(`${username} has joined the operation.`, {
        id: `participant-joined-${data.userId}-${Date.now()}`,
        duration: 5000,
      });

      // Sync state to React
      syncBattleRoomState();
    });

    // If the socket is already connected when we bind handlers (StrictMode
    // remount, or effect ran after a transport reconnect), the "connect"
    // event will never re-fire. Manually run the connect logic now so
    // join_battle, check_active_battle, and presence are all current.
    if (socket.connected) {
      setIsConnected(true);
      socket.emit("check_active_battle");
      if (battleRoomManager.roomId && battleRoomManager.status === "JOINED") {
        socket.emit("join_battle", battleRoomManager.roomId, (ack: { success: boolean }) => {
          if (!ack?.success) {
            console.warn("[SocketContext] already-connected rejoin failed for", battleRoomManager.roomId);
          }
        });
      }
      const ids = presenceFriends?.friends?.map((f) => f.id);
      if (ids && ids.length > 0) socket.emit("request_presence", { userIds: ids });
    }

    return () => {
      for (const fn of cleanupFns) fn();
      socketCreatedRef.current = false;
      // Do NOT null out socketState here — the socket singleton survives
      // the effect teardown (StrictMode remount). Only clear on userId change.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, presenceFriends]);

  // ─────────────────────────────────────────────────────────────────────
  // STABLE joinBattleRoom / leaveBattleRoom with useCallback + refs
  // ─────────────────────────────────────────────────────────────────────
  const joinBattleRoom = useCallback((
    roomId: string,
    ack?: (response: { success: boolean; error?: string }) => void,
  ) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      ack?.({ success: false, error: "Socket not connected" });
      return;
    }

    emitJoinBattle(socket, roomId, userId, (resp) => {
      if (resp?.success) {
        battleRoomManager.status = "JOINED";
        battleRoomManager.roomId = roomId;
        setBattleRoomStatus("JOINED");
        setCurrentBattleRoomId(roomId);
      } else {
        battleRoomManager.status = "NONE";
        battleRoomManager.roomId = null;
        setBattleRoomStatus("NONE");
        setCurrentBattleRoomId(null);
      }
      ack?.(resp);
    });
  }, [userId]);

  const leaveBattleRoom = useCallback((
    roomId: string,
    options?: { notifyParticipants?: boolean },
  ) => {
    const socket = socketRef.current;
    if (!socket) return;

    emitLeaveRoom(socket, roomId, options);
    syncBattleRoomState();
  }, [syncBattleRoomState]);

  const sendDirectMessage = useCallback((targetUserId: string, content: string) => {
    socketRef.current?.emit("send_direct_message", { targetUserId, content });
  }, []);

  const declineChallenge = useCallback((targetUserId: string) => {
    socketRef.current?.emit("decline_challenge", { targetUserId });
    setChallengeQueue((prev) => prev.filter((c) => c.challengerId !== targetUserId));
  }, []);

  const sendChallenge = useCallback((targetUserId: string, opts?: ChallengeOpts | string) => {
    if (typeof opts === "string") {
      socketRef.current?.emit("send_challenge", { targetUserId, problemId: opts, mode: "CUSTOM" });
    } else {
      socketRef.current?.emit("send_challenge", { targetUserId, ...(opts ?? { mode: "RANDOM" }) });
    }
  }, []);

  const acceptChallenge = useCallback((challengerId: string, opts?: { problemId?: string; mode?: "RANDOM" | "CUSTOM"; difficulty?: string }) => {
    setWaitingTime(0);
    setIsClicked(true);
    socketRef.current?.emit("accept_challenge", { challengerId, ...(opts ?? {}) });
    setChallengeQueue((prev) => prev.filter((c) => c.challengerId !== challengerId));
  }, []);

  const cancelMatch = useCallback(() => {
    if (socketRef.current && isConnected) {
      setIsClicked(true);
      setMatchmakingStatus("IDLE");
      setWaitingTime(0);
      socketRef.current.emit("cancel_matchmaking");
    } else {
      // Socket disconnected or not connected — use HTTP fallback so the
      // matchmaking queue is cleaned up on the server even when WebSocket
      // events can't propagate (e.g., through proxies without WS support).
      setMatchmakingStatus("IDLE");
      setWaitingTime(0);
      setIsClicked(false);
      api.post("/matchmaking/cancel").catch((err) => {
        console.error("Matchmaking cancel (HTTP fallback) failed:", err);
      });
    }
  }, [isConnected]);

  const findMatch = useCallback((difficulty: string = "ANY") => {
    if (socketRef.current && isConnected) {
      setWaitingTime(0);
      setQueueDifficulty(difficulty);
      setMatchmakingStatus("SEARCHING");
      socketRef.current.emit("join_matchmaking", { difficulty: difficulty, waitingSeconds: 0 });
    }
  }, [isConnected]);

  const sendBattleMessage = useCallback((roomId: string, content: string) => {
    socketRef.current?.emit("send_battle_message", { roomId, content });
  }, []);

  const createCustomRoom = useCallback((
    maxUsers = 2,
    password?: string,
    difficulty = "ANY",
    problemIds?: string[],
  ) => {
    socketRef.current?.emit("create_custom_room", {
      maxUsers,
      password,
      difficulty,
      problemsIds: problemIds,
    });
  }, []);

  const joinCustomRoom = useCallback((roomCode: string, password?: string) => {
    socketRef.current?.emit("join_custom_room", {
      roomCode,
      password,
    });
  }, []);

  const startCustomMatch = useCallback(() => {
    if (customLobby?.isHost)
      socketRef.current?.emit("start_custom_match", customLobby.roomCode);
  }, [customLobby]);

  const leaveCustomMatch = useCallback(() => {
    if (customLobby && !customLobby.isHost)
      socketRef.current?.emit("leave_custom_room", customLobby.roomCode);
    else if (customLobby?.isHost)
      socketRef.current?.emit("delete_custom_room", customLobby.roomCode);
    setCustomLobby(null);
  }, [customLobby]);

  const terminateGroup = useCallback((roomId: string) => {
    socketRef.current?.emit("terminate_group", { roomId });
  }, []);

  const acceptMatch = useCallback(() => {
    if (socketRef.current && pendingMatchId) {
      setIsClicked(true);
      socketRef.current.emit("accept_match", pendingMatchId);
    }
  }, [pendingMatchId]);

  const declineMatch = useCallback(() => {
    if (socketRef.current && isConnected && pendingMatchId) {
      setIsClicked(true);
      socketRef.current.emit("decline_match", pendingMatchId);
    } else {
      // HTTP fallback when WebSocket is unavailable
      setIsClicked(true);
      api.post("/matchmaking/decline", { matchId: pendingMatchId })
        .catch((err) => console.error("Match decline (HTTP fallback) failed:", err));
    }
  }, [isConnected, pendingMatchId]);

  const requestPresence = useCallback((userIds: string[]) => {
    socketRef.current?.emit("request_presence", { userIds });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        // socket is read from socketRef so it's always the live instance.
        // socketTick forces a re-render whenever the socket singleton is
        // (re)created — even when the Socket object reference is identical.
        // void prevents the "unused variable" lint warning while keeping it
        // tracked in the closure so React schedules the re-render correctly.
        socket: (void socketTick, socketRef.current),
        socketTick,
        isConnected,
        battleRoomStatus,
        currentBattleRoomId,
        activeBattleRoom,
        matchmakingStatus,
        pendingMatchId,
        findMatch,
        cancelMatch,
        acceptMatch,
        joinCustomRoom,
        incomingChallenge,
        pendingOpponent,
        leaveCustomMatch,
        terminateGroup,
        createCustomRoom,
        startCustomMatch,
        declineMatch,
        customLobby,
        sendChallenge,
        sendDirectMessage,
        acceptChallenge,
        declineChallenge,
        sendBattleMessage,
        joinBattleRoom,
        leaveBattleRoom,
        isClicked,
        waitingTime,
        requestPresence,
        friends,
        setFriends,
        rawSocketRef: socketRef,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useSocket must be used within a SocketProvider");
  return context;
};