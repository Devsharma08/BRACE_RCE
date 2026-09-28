import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

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

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
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
}

export interface CustomLobbyState {
  roomCode: string;
  isHost: boolean;
  currentUsers: number;
  maxUsers: number;
  difficulty: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const RESYNC_GAP_MS = 5000;

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
  socket = io(socketUrl, { auth: { userId }, withCredentials: true });
  socketSingletons.set(userId, socket);
  return socket;
}

// Export for AuthContext to call on logout
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
}

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  // Get userId from auth context - we'll need to read it differently
  // For now, use a placeholder - the socket will be created when needed
  const [isConnected, setIsConnected] = useState(false);
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
  const queryClient = useQueryClient();
  const disconnectedAtRef = useRef(0);

  // We need to get the userId from somewhere - let's use a separate effect
  // that reads from the auth context or a global store
  const userIdRef = useRef<string | null>(null);
  const socketCreatedRef = useRef(false);

  // Get backend URL for auth check
  const getBackendUrl = () => {
    const rawUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
    return rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;
  };

  useEffect(() => {
    // Try to get userId from the auth query cache
    // This is a workaround - ideally we'd get it from context
    const checkUser = async () => {
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/auth/me`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.user?.id) {
            userIdRef.current = data.user.id;
          }
        }
      } catch {
        // Ignore
      }
    };
    checkUser();
  }, []);

  // Create socket when userId becomes available
  useEffect(() => {
    if (!userIdRef.current || socketCreatedRef.current) return;
    
    socketCreatedRef.current = true;
    const newSocket = getOrCreateSocket(userIdRef.current);
    if (!socketRef.current) socketRef.current = newSocket;
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
        navigate(
          `/battle/${data.roomId}?oid=${data.problemId}&timeLimit=${data.timeLimitMs}`,
        );
      },
    );

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
      navigate(`/battle/${data.roomName}?oid=${data.problemId}`);
    });

    bind("match_declined", () => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      toast.error("Match timed out.");
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
    bind("user_online_status", (data: { userId: string; isOnline: boolean }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === data.userId ? { ...f, isOnline: data.isOnline } : f))
      );
    });

    bind("presence_snapshot", (data: { users: Array<{ userId: string; isOnline: boolean }> }) => {
      setFriends((prev) =>
        prev.map((f) => {
          const match = data.users.find((u) => u.userId === f.id);
          return match ? { ...f, isOnline: match.isOnline } : f;
        })
      );
    });

    return () => {
      for (const fn of cleanupFns) fn();
      socketCreatedRef.current = false;
    };
  }, [userIdRef.current, navigate]);

  const sendDirectMessage = (targetUserId: string, content: string) => {
    socketRef.current?.emit("send_direct_message", { targetUserId, content });
  };
  const declineChallenge = (targetUserId: string) => {
    socketRef.current?.emit("decline_challenge", { targetUserId });
    setChallengeQueue((prev) => prev.filter((c) => c.challengerId !== targetUserId));
  };

  const sendChallenge = (targetUserId: string, opts?: ChallengeOpts | string) => {
    if (typeof opts === "string") {
      socketRef.current?.emit("send_challenge", { targetUserId, problemId: opts, mode: "CUSTOM" });
    } else {
      socketRef.current?.emit("send_challenge", { targetUserId, ...(opts ?? { mode: "RANDOM" }) });
    }
  };

  const acceptChallenge = (challengerId: string, opts?: { problemId?: string; mode?: "RANDOM" | "CUSTOM"; difficulty?: string }) => {
    setWaitingTime(0);
    setIsClicked(true);
    socketRef.current?.emit("accept_challenge", { challengerId, ...(opts ?? {}) });
    setChallengeQueue((prev) => prev.filter((c) => c.challengerId !== challengerId));
  };

  const cancelMatch = () => {
    if (socketRef.current) {
      setIsClicked(true);
      setMatchmakingStatus("IDLE");
      setWaitingTime(0);
      socketRef.current.emit("cancel_matchmaking");
    }
  };

  const findMatch = (difficulty: string = "ANY") => {
    if (socketRef.current && isConnected) {
      setWaitingTime(0);
      setQueueDifficulty(difficulty);
      setMatchmakingStatus("SEARCHING");
      socketRef.current.emit("join_matchmaking", { difficulty: difficulty, waitingSeconds: 0 });
    }
  };

  const sendBattleMessage = (roomId: string, content: string) => {
    socketRef.current?.emit("send_battle_message", { roomId, content });
  };

  const createCustomRoom = (
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
  };

  const joinCustomRoom = (roomCode: string, password?: string) => {
    socketRef.current?.emit("join_custom_room", {
      roomCode,
      password,
    });
  };

  const startCustomMatch = () => {
    if (customLobby?.isHost)
      socketRef.current?.emit("start_custom_match", customLobby.roomCode);
  };

  const leaveCustomMatch = () => {
    if (customLobby && !customLobby.isHost)
      socketRef.current?.emit("leave_custom_room", customLobby.roomCode);
    else if (customLobby?.isHost)
      socketRef.current?.emit("delete_custom_room", customLobby.roomCode);
    setCustomLobby(null);
  };

  const terminateGroup = (roomId: string) => {
    socketRef.current?.emit("terminate_group", { roomId });
  };

  const acceptMatch = () => {
    if (socketRef.current && pendingMatchId) {
      setIsClicked(true);
      socketRef.current.emit("accept_match", pendingMatchId);
    }
  };

  const declineMatch = () => {
    if (socketRef.current && pendingMatchId) {
      setIsClicked(true);
      socketRef.current.emit("decline_match", pendingMatchId);
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
    }
  };

  const requestPresence = (userIds: string[]) => {
    socketRef.current?.emit("request_presence", { userIds });
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        activeBattleRoom,
        isConnected,
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