import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
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
}

export interface CustomLobbyState {
  roomCode: string;
  isHost: boolean;
  currentUsers: number;
  maxUsers: number;
  difficulty: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
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
  const [incomingChallenge, setIncomingChallenge] = useState<{ challengerId: string, challengerUsername?: string } | null>(null);
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

  const navigate = useNavigate();

  useEffect(() => {
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const socketUrl = rawSocketUrl.replace(/\/+$/, "").replace(/\/api$/, "");
    const newSocket = io(socketUrl, { withCredentials: true });
    setSocket(newSocket);

    newSocket.on("custom_room_created", (data: CustomLobbyState) => {
      setCustomLobby(data);
    });

    newSocket.on("incoming_challenge", (data: IncomingChallenge) => {
      setIncomingChallenge(data);
      setIsClicked(false);
      toast.info(`Challenge from ${data.challengerUsername ?? "a friend"}`, {
        description: data.mode === "CUSTOM"
          ? `Custom problem: ${data.problemName ?? data.problemId ?? "arena"}`
          : `Random ${data.difficulty ?? "MEDIUM"} problem`,
      });
    });


    newSocket.on(
      "lobby_updated",
      (data: { currentUsers: number; maxUsers: number }) => {
        setCustomLobby((prev) => (prev ? { ...prev, ...data } : null));
      },
    );

    newSocket.on("lobby_error", (msg: string) => {
      toast.error(msg);
    });

    newSocket.on("lobby_ended", () => {
      setCustomLobby(null);
      toast.info("Lobby has ended.");
    });

    newSocket.on(
      "custom_match_started",
      (data: { roomId: string; problemId: string; timeLimitMs: number }) => {
        setCustomLobby(null);
        navigate(
          `/battle/${data.roomId}?oid=${data.problemId}&timeLimit=${data.timeLimitMs}`,
        );
      },
    );

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server!");
      setIsConnected(true);
      newSocket.emit("check_active_battle");
    });

    newSocket.on("active_battle_found", (data) => {
      setActiveBattleRoom(data);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
    });

    // Both players found, waiting for accept
    newSocket.on("match_found_pending", (data) => {
      console.log("⚔️ MATCH FOUND PENDING!", data);
      setIsClicked(false);
      setPendingOpponent(data.opponent);
      setPendingMatchId(data.matchId);
      setMatchmakingStatus("FOUND_PENDING");
    });

    newSocket.on("matchmaking_search_state", (data) => {
      setWaitingTime(data.waitingSeconds);
    });

    // Both players accepted, match is actually starting!
    newSocket.on("match_starting", (data) => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      setWaitingTime(0);
      navigate(`/battle/${data.roomName}?oid=${data.problemId}`);
    });

    // timed out
    newSocket.on("match_declined", () => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      setIsClicked(false);
      toast.error("Match timed out.");
      setWaitingTime(0);
    });

    newSocket.on("challenge_declined", () => {
      toast.info("Challenge was declined.");
      setIsClicked(false);
    });

    // opponent declined
    newSocket.on("match_opponent_declined",()=>{
      setPendingMatchId(null);
      setMatchmakingStatus("SEARCHING");
      setIsClicked(false);
      newSocket.emit("join_matchmaking",{difficulty:queueDifficultyRef.current,waitingSeconds:waitingTimeRef.current});
    });

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  const sendDirectMessage = (targetUserId: string, content: string) => {
    socket?.emit("send_direct_message", { targetUserId, content });
  };
  const declineChallenge = (targetUserId: string) => {
    socket?.emit("decline_challenge", { targetUserId });
    setIncomingChallenge(null); // later - only removes current challenge, empty all challenges will be done by another handler here from the queue of challenges we'll only be removing the current one  
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
    setIncomingChallenge(null); // later - only removes current challenge, empty all challenges will be done by another handler here from the queue of challenges we'll only be removing the current one  
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
        waitingTime
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
