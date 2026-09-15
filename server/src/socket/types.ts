import type { Server, Socket } from "socket.io";

export interface CustomLobby {
    hostId: string;
    users: string[];
    maxUsers: number;
    password?: string | undefined;
    targetDifficulty: string;
    problemsIds: string[];
    expiresAt: number;
}

export interface ActiveBattleInfo {
    eventId: string;
    roomId: string;
    roomCode: string | null;
    problemId: string;
    totalTimeLimitMs: number;
    startedAt: Date | null;
    elapsedMs: number;
}

export interface SocketState {
    activeLobbies: Map<string, CustomLobby>;
    onlineUsers: Map<string, string>;
    activeSearchIntervals: Map<string, NodeJS.Timeout>;
}

export interface HandlerCtx {
    io: Server;
    socket: Socket;
    userId: string;
    state: SocketState;
    getActiveBattleForUser: (userId: string) => Promise<ActiveBattleInfo | null>;
}
