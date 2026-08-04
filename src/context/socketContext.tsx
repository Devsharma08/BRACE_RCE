import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  matchmakingStatus: "IDLE" | "SEARCHING" | "FOUND_PENDING";
  pendingMatchId: string | null;
  findMatch: (difficulty?:string) => void;
  cancelMatch: () => void;
  acceptMatch: () => void;
  declineMatch: () => void;
  activeBattleRoom:{roomId:string,problemId:string} | null ;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<"IDLE" | "SEARCHING" | "FOUND_PENDING">("IDLE");
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [activeBattleRoom, setActiveBattleRoom] = useState<{ roomId: string, problemId: string } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io("http://localhost:5000", { withCredentials: true });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server!");
      setIsConnected(true);
      newSocket.emit("check_active_battle");
    });

    newSocket.on("active_battle_found",(data)=>{
      setActiveBattleRoom(data);
    })

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

  const cancelMatch = () => {
    if (socket) {
      setMatchmakingStatus("IDLE");
      socket.emit("leave_matchmaking");
    }
  };

  const findMatch = (difficulty:string = "ANY") => {
    if (socket) {
      setMatchmakingStatus("SEARCHING");
      socket.emit("join_matchmaking",difficulty);
    }
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
    <SocketContext.Provider value={{ socket, activeBattleRoom, isConnected , matchmakingStatus, pendingMatchId, findMatch, cancelMatch, acceptMatch, declineMatch }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within a SocketProvider");
  return context;
};
