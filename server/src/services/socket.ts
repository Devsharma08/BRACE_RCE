import { Socket, Server } from "socket.io";
import { prisma } from "../Lib/prisma.js";
import jwt from "jsonwebtoken";
import { log } from "node:console";
import { captureRejectionSymbol } from "node:events";

// IN-MEMORY QUEUE
interface WaitingPlayer {
    userId: string;
    socketId: string;
}

const waitingQueue: WaitingPlayer[] = [];


// Verify the jwt token
const verifyToken = (token: string) => {
    try {
        console.log("🔍 ATTEMPTING TO VERIFY TOKEN:", token);
        const secret = process.env.JWT_SECRET || "very-strong-secret-key";
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
    } catch (error) {
        console.log("❌ JWT ERROR:", error);
        return null;
    }
}


export const initSocketServer = (io: Server) => {
    // Authenticate every socket connection
    io.use((socket: any, next: any) => {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return next(new Error("No cookies found"));

        // Parse the token
        const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);

        if (!tokenMatch) return next(new Error("Token missing"));

        // URL Decode the string in case the browser encoded it
        let rawToken = decodeURIComponent(tokenMatch[1]);

        // Remove surrounding quotes if Express added them
        if (rawToken.startsWith('"') && rawToken.endsWith('"')) {
            rawToken = rawToken.slice(1, -1);
        }

        // Remove "Bearer " prefix if it somehow got saved in the cookie
        if (rawToken.startsWith('Bearer ')) {
            rawToken = rawToken.slice(7);
        }

        // Verify cleaned cookie
        const decoded = verifyToken(rawToken);
        if (!decoded) return next(new Error("Cookie verification failed"));

        // Attach the authenticated userid to the socket session
        socket.data.userId = (decoded as any).userId;

        // Pass the connection to the next middleware
        next();
    });


    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        console.log(`🔌 User Connected: ${userId} (Socket ID: ${socket.id})`);

        // PVP matching events
        socket.on("join_matchmaking", async () => {
            console.log(`User ${userId} joined the match making queue`)

            // prevent users from joining multiple times
            if (waitingQueue.some(p => p.userId == userId)) {
                return;
            }

            // add to queue
            waitingQueue.push({ userId, socketId: socket.id });

            // check if we have enough players from the queue
            if (waitingQueue.length >= 2) {
                const player1 = waitingQueue.shift()!;
                const player2 = waitingQueue.shift()!;
                console.log('Match found : ', player1.userId, " ", player2.userId);

                // create a event in db
                const event = await prisma.event.create({
                    data: {
                        type: 'PUBLIC',
                        status: 'IN_PROGRESS',
                        startedAt: new Date()
                    }
                })

                // create performance record for both players
                await prisma.userPersonalPerformance.createMany({
                    data: [
                        { userId: player1.userId, eventId: event.id, status: 'PENDING' },
                        { userId: player2.userId, eventId: event.id, status: 'PENDING' }
                    ]
                })

                const roomName = `room-${event.id}`;

                // both players join the same room
                const socket1 = io.sockets.sockets.get(player1.socketId);
                const socket2 = io.sockets.sockets.get(player2.socketId);

                if (!socket1 || !socket2) {
                    console.log("One of the sockets is missing. Starting new match making queue...");
                    // @TODO: Implement retry logic or notify users.
                    return;
                }

                // add them to the room
                socket1.join(roomName);
                socket2.join(roomName);

                // notify them of match
                io.to(roomName).emit("match_found", { eventId: event.id, roomName, message: "Match Found" });





            }

        });

        socket.on('join_battle', (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${userId} joined room ${roomId}`)
        })

        socket.on('battle_action', (data: { roomId: string, userId: string, status: string, progress: number }) => {
            if (data.roomId) {
                // Broadcast the action to the other player in the room
                socket.to(data.roomId).emit('battle_update', {
                    status: data.status,
                    progress: data.progress
                });
            }
        });

        socket.on("disconnect", () => {
            console.log(`❌ User Disconnected: ${userId}`);
        });
    });
}
