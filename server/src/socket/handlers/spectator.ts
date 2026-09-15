import type { HandlerCtx } from "../types.js";

export function registerSpectatorHandlers(ctx: HandlerCtx): void {
    const { io, socket, userId } = ctx;
    const { onlineUsers } = ctx.state;

    // LIVE SPECTATOR CODE REQUEST
    socket.on('request_player_code', (data: { roomId: string, targetUserId: string }) => {
        const { roomId, targetUserId } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('fetch_live_code_request', { requesterSocketId: socket.id, roomId });
        }
    });

    // TARGET PLAYER SENDS CODE BACK TO SPECTATOR
    socket.on('provide_player_code', (data: { requesterSocketId: string, code: string, language: string, problemId?: string }) => {
        io.to(data.requesterSocketId).emit('live_code_update', {
            userId: userId,
            code: data.code,
            language: data.language,
            problemId: data.problemId,
            updatedAt: new Date().toISOString()
        });
    });

    // BROADCAST CODE UPDATE IN ROOM (debounced or on test run)
    socket.on('broadcast_player_code', (data: { roomId: string, code: string, language: string, problemId?: string, linesWritten?: number }) => {
        socket.to(data.roomId).emit('live_code_update', {
            userId: userId,
            code: data.code,
            language: data.language,
            problemId: data.problemId,
            linesWritten: data.linesWritten,
            updatedAt: new Date().toISOString()
        });
    });
}
