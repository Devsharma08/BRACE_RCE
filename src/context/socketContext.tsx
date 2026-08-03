import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  matchmakingStatus: "IDLE" | "SEARCHING" | "FOUND";
  findMatch: () => void;
  cancelMatch:() => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<"IDLE" | "SEARCHING" | "FOUND">("IDLE");
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🟢 Connected to PvP Server");
      setIsConnected(true);
    });

    newSocket.on("connect_error", (err) => {
      console.error("🔴 Socket Connection Error:", err.message);
    });


    newSocket.on("disconnect", () => {
      console.log("🔴 Disconnected from PvP Server");
      setIsConnected(false);
      setMatchmakingStatus("IDLE");
    });

    // --- PVP MATCHMAKING EVENTS ---
    newSocket.on("match_found", (data) => {
      console.log("⚔️ MATCH FOUND!", data);
      setMatchmakingStatus("FOUND");
      
      // We will redirect to the battle arena here soon!
      const res = confirm(`MATCH FOUND! Room: ${data.roomName}`);
      if(res){
        navigate(`/battle/${data.roomName}?oid=${data.problemId}`);
      }

    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const cancelMatch = () => {
    if(socket){
      setMatchmakingStatus("IDLE");
      socket.emit("leave_matchmaking");
    }
  }

  const findMatch = () => {
    if (socket) {
      setMatchmakingStatus("SEARCHING");
      socket.emit("join_matchmaking");
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, matchmakingStatus, findMatch, cancelMatch }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
