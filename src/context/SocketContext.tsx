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
  /** Escape hatch for logout (AuthContext): tear down the app socket so the
   *  next login re-handshakes with a fresh identity. Prefer `socket` for
   *  everything else — this ref is intentionally low-level. */
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

// How long the socket may be down before its cached pages are considered
// stale: sub-5s blips replayed every missed server emit is overkill — the
// per-page invalidations already cover them.
const RESYNC_GAP_MS = 5000;

// App-lifetime socket singleton — one connection per browser session, created
// lazily on the provider's first render so consumers never see a null socket
// frame, and reused across remounts (React StrictMode double-mount safe).
let socketSingleton: Socket | null = null;

function getOrCreateSocket(): Socket {
  if (socketSingleton) return socketSingleton;
  const rawSocketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:3000";
  const socketUrl = rawSocketUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  socketSingleton = io(socketUrl, { withCredentials: true });
  return socketSingleton;
}

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  if (!socketRef.current) socketRef.current = getOrCreateSocket();
  const socket = socketRef.current;
  const [isConnected, setIsConnected] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<
    "IDLE" | "SEARCHING" | "FOUND_PENDING"
  >("IDLE");
  const [pendingOpponent, setPendingOpponent] = useState<{username:string,id:string,avatarUrl:string,bio:string} | null>(null);
  const [queueDifficulty, setQueueDifficulty] = useState<string>("MEDIUM");
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [activeBattleRoom, setActiveBattleRoom] = useState<{
    roomId: string;
    problemId: string;
  } | null>(null);
  const [customLobby, setCustomLobby] = useState<CustomLobbyState | null>(null);
  // Challenge queue: a second challenge arriving while one is open is queued,
  // not silently overwritten. Consumers render the head of the queue; accept or
  // decline removes exactly that challenger's entry.
  const [challengeQueue, setChallengeQueue] = useState<IncomingChallenge[]>([]);
  const incomingChallenge = challengeQueue[0] ?? null;
  const [isClicked,setIsClicked] = useState<boolean>(false);
  const [waitingTime,setWaitingTime] = useState<number>(0);
  
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

  useEffect(() => {
    const newSocket = getOrCreateSocket();
    // Every listener this effect registers is tracked so a remount (React
    // StrictMode double-invoke) removes exactly its own handlers instead of
    // duplicating them on the shared singleton.
    const cleanupFns: Array<() => void> = [];
    const bind = (event: string, handler: (...args: any[]) => void) => {
      newSocket.on(event, handler);
      cleanupFns.push(() => newSocket.off(event, handler));
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
      newSocket.emit("check_active_battle");

      // Full resync after a meaningful outage: per-page invalidations only
      // cover events the client was actually connected for, so after a long
      // gap every socket-driven query (leaderboard, analytics, notifications,
      // friends) is refetched at once. The auth-me cache survives on purpose —
      // a network blip is not a logout.
      if (disconnectedAtRef.current && Date.now() - disconnectedAtRef.current > RESYNC_GAP_MS) {
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] !== "auth-me",
        });
      }
      disconnectedAtRef.current = 0;

      // A drop longer than a heartbeat cancels our server-side queue row (the
      // server clears it in its own disconnect handler). If we were searching
      // before the drop, re-enqueue from the seconds already waited instead of
      // silently kicking the user out of matchmaking.
      if (reconnectStatusRef.current === "SEARCHING") {
        reconnectStatusRef.current = "IDLE";
        setMatchmakingStatus("SEARCHING");
        newSocket.emit("join_matchmaking", {
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
      // A pending match cannot survive the drop (the offer was one-shot), but an
      // in-progress search can be re-enqueued on reconnect.
      const prev = matchmakingStatusRef.current;
      reconnectStatusRef.current = prev === "SEARCHING" ? "SEARCHING" : "IDLE";
      if (prev !== "SEARCHING") setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
    });

    // Both players found, waiting for accept
    bind("match_found_pending", (data) => {
      setIsClicked(false);
      setPendingOpponent(data.opponent);
      setPendingMatchId(data.matchId);
      setMatchmakingStatus("FOUND_PENDING");
    });

    bind("matchmaking_search_state", (data) => {
      // Authoritative value from the server's 3s polling loop; the 1s client
      // ticker only interpolates between these events.
      setWaitingTime(data.waitingSeconds);
    });

    // Both players accepted, match is actually starting!
    bind("match_starting", (data) => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      setWaitingTime(0);
      navigate(`/battle/${data.roomName}?oid=${data.problemId}`);
    });

    // timed out
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

    // opponent declined
    bind("match_opponent_declined", () => {
      setPendingMatchId(null);
      setMatchmakingStatus("SEARCHING");
      setIsClicked(false);
      newSocket.emit("join_matchmaking", { difficulty: queueDifficultyRef.current, waitingSeconds: waitingTimeRef.current });
    });

    // The singleton is app-lifetime: never disconnect it on unmount (a
    // StrictMode remount would otherwise kill the connection for the whole
    // app). Only the listeners registered by THIS mount are removed.
    return () => {
      for (const fn of cleanupFns) fn();
    };
  }, [navigate]);

  const sendDirectMessage = (targetUserId: string, content: string) => {
    socket?.emit("send_direct_message", { targetUserId, content });
  };
  const declineChallenge = (targetUserId: string) => {
    socket?.emit("decline_challenge", { targetUserId });
    // Remove exactly this challenger's entry — any other queued challenges stay.
    setChallengeQueue((prev) => prev.filter((c) => c.challengerId !== targetUserId));
  };

  const sendChallenge = (targetUserId: string, opts?: ChallengeOpts | string) => {
    if (typeof opts === "string") {
      socket?.emit("send_challenge", { targetUserId, problemId: opts, mode: "CUSTOM" });
    } else {
      socket?.emit("send_challenge", { targetUserId, ...(opts ?? { mode: "RANDOM" }) });
    }
  };

  const acceptChallenge = (challengerId: string, opts?: { problemId?: string; mode?: "RANDOM" | "CUSTOM"; difficulty?: string }) => {
    setWaitingTime(0);
    setIsClicked(true);
    socket?.emit("accept_challenge", { challengerId, ...(opts ?? {}) });
    // Remove exactly this challenger's entry — any other queued challenges stay.
    setChallengeQueue((prev) => prev.filter((c) => c.challengerId !== challengerId));
  };

  const cancelMatch = () => {
    if (socket) {
      setIsClicked(true);
      setMatchmakingStatus("IDLE");
      setWaitingTime(0);
      socket.emit("cancel_matchmaking");
    }
  };

  const findMatch = (difficulty: string = "ANY") => {
    if (socket) {
      setWaitingTime(0);
      setQueueDifficulty(difficulty);
      setMatchmakingStatus("SEARCHING");
      socket.emit("join_matchmaking", {difficulty:difficulty,waitingSeconds:0});
    }
  };

  const sendBattleMessage = (roomId:string,content:string) => {
    socket?.emit("send_battle_message",{roomId,content});
  }

  const createCustomRoom = (
    maxUsers = 2,
    password?: string,
    difficulty = "ANY",
    problemIds?: string[],
  ) => {
    socket?.emit("create_custom_room", {
      maxUsers,
      password,
      difficulty,
      problemsIds: problemIds,
    });
  };

  const joinCustomRoom = (roomCode: string, password?: string) => {
    socket?.emit("join_custom_room", {
      roomCode,
      password,
    });
  };

  const startCustomMatch = () => {
    if (customLobby?.isHost)
      socket?.emit("start_custom_match", customLobby.roomCode);
  };

  const leaveCustomMatch = () => {
    if (customLobby && !customLobby.isHost)
      socket?.emit("leave_custom_room", customLobby.roomCode);
    else if (customLobby?.isHost)
      socket?.emit("delete_custom_room", customLobby.roomCode);
    setCustomLobby(null);
  };

  const terminateGroup = (roomId: string) => {
    socket?.emit("terminate_group", { roomId });
  };

  const acceptMatch = () => {
    if (socket && pendingMatchId) {
      setIsClicked(true);
      socket.emit("accept_match", pendingMatchId);
    }
  };

  const declineMatch = () => {
    if (socket && pendingMatchId) {
      setIsClicked(true);
      socket.emit("decline_match", pendingMatchId);
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
    }
  };

  const requestPresence = (userIds: string[]) => {
    socket?.emit("request_presence", { userIds });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
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
