import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";

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
  sendDirectMessage: (targetUserId: string, content: string) => void;
  sendChallenge: (targetUserId: string, problemId?: string) => void;
  acceptChallenge: (challengerId: string) => void;
  declineChallenge: (targetUserId: string) => void;
  sendBattleMessage: (roomId:string,content:string) => void;
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
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [activeBattleRoom, setActiveBattleRoom] = useState<{
    roomId: string;
    problemId: string;
  } | null>(null);
  const [customLobby, setCustomLobby] = useState<CustomLobbyState | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{ challengerId: string, challengerUsername?: string } | null>(null);


  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io("http://localhost:5000", { withCredentials: true });
    setSocket(newSocket);

    newSocket.on("custom_room_created", (data: CustomLobbyState) => {
      setCustomLobby(data);
    });

    newSocket.on("incoming_challenge", (data: { challengerId: string, challengerUsername?: string }) => {
      setIncomingChallenge(data);
    });


    newSocket.on(
      "lobby_updated",
      (data: { currentUsers: number; maxUsers: number }) => {
        setCustomLobby((prev) => (prev ? { ...prev, ...data } : null));
      },
    );

    newSocket.on("lobby_error", (msg: string) => {
      alert(msg);
    });

    newSocket.on("lobby_ended", () => {
      setCustomLobby(null);
      alert("Lobby has ended.");
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
      setPendingMatchId(data.matchId);
      setMatchmakingStatus("FOUND_PENDING");
    });

    // Both players accepted, match is actually starting!
    newSocket.on("match_starting", (data) => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      navigate(`/battle/${data.roomName}?oid=${data.problemId}`);
    });

    // Someone declined or timed out
    newSocket.on("match_declined", () => {
      setMatchmakingStatus("IDLE");
      setPendingMatchId(null);
      alert("Match was declined or timed out.");
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

  const sendChallenge = (targetUserId: string, problemId?: string) => {
    socket?.emit("send_challenge", { targetUserId, problemId });
  };

  const acceptChallenge = (challengerId: string) => {
    socket?.emit("accept_challenge", { challengerId });
    setIncomingChallenge(null); // later - only removes current challenge, empty all challenges will be done by another handler here from the queue of challenges we'll only be removing the current one  
  };

  const cancelMatch = () => {
    if (socket) {
      setMatchmakingStatus("IDLE");
      socket.emit("leave_matchmaking");
    }
  };

  const findMatch = (difficulty: string = "ANY") => {
    if (socket) {
      setMatchmakingStatus("SEARCHING");
      socket.emit("join_matchmaking", difficulty);
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
    if (!customLobby?.isHost)
      socket?.emit("leave_custom_room", customLobby.roomCode);
    else if (customLobby?.isHost)
      socket?.emit("delete_custom_room", customLobby.roomCode);
    setCustomLobby(null);
  };

  const acceptMatch = () => {
    if (socket && pendingMatchId) {
      socket.emit("accept_match", pendingMatchId);
    }
  };

  const declineMatch = () => {
    if (socket && pendingMatchId) {
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
        leaveCustomMatch,
        createCustomRoom,
        startCustomMatch,
        declineMatch,
        customLobby,
        sendChallenge,
        sendDirectMessage,
        acceptChallenge,
        declineChallenge,
        sendBattleMessage
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
