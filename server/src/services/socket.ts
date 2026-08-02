import { Socket, Server } from "socket.io";
import { prisma } from "../Lib/prisma.js";
import jwt from "jsonwebtoken";

// IN-MEMORY QUEUE
interface WaitingPlayer{
    userId:string;
    socketId:string;
}

const waitingQueue:WaitingPlayer[] = [];


// Verify the jwt token
const verifyToken = (token: string) => {
    try {
        // FIXED: Using JWT_SECRET to match your auth controllers
        const secret = process.env.JWT_SECRET || "very-strong-secret-key"; 
        return jwt.verify(token, secret, { algorithms: ["HS256"] });        
    } catch (error) {
        return null;
    }
}

export const initSocketServer = (io: Server) => {
    // Authenticate every socket connection
    io.use((socket: any, next: any) => {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return next(new Error("No cookies found"));
        
        // Parse the token
        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        if (!tokenMatch) return next(new Error("Token missing"));

        // Verify cookie
        const decoded = verifyToken(tokenMatch[1]);
        if (!decoded) return next(new Error("Cookie verification failed")); // FIXED: `decoded` instead of `decode`

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
            if(waitingQueue.some(p => p.userId == userId)){
                return ;
            }
            
            // add to queue
            waitingQueue.push({userId, socketId: socket.id});
            
            // check if we have enough players from the queue
            if(waitingQueue.length >= 2){
                const player1 = waitingQueue.shift()!; 
                const player2 = waitingQueue.shift()!;
                console.log('Match found : ',player1.userId," ",player2.userId);

                // create a event in db
                const event  = await prisma.event.create({
                    data:{
                        type:'PUBLIC',
                        status:'IN_PROGRESS',
                        startedAt:new Date()
                    }
                })

                // create performance record for both players
                await prisma.userPersonalPerformance.createMany({
                    data:[
                        {userId:player1.userId,eventId:event.id,status:'PENDING'},
                        {userId:player2.userId,eventId:event.id,status:'PENDING'}
                    ]
                })

                const roomName = `room-${event.id}`;

                // both players join the same room
                const socket1 = io.sockets.sockets.get(player1.socketId);
                const socket2 = io.sockets.sockets.get(player2.socketId);

                if(!socket1 || !socket2){
                    console.log("One of the sockets is missing. Starting new match making queue...");
                    // @TODO: Implement retry logic or notify users.
                    return; 
                }
                
                // add them to the room
                socket1.join(roomName);
                socket2.join(roomName);

                // notify them of match
                io.to(roomName).emit("match_found", { eventId: event.id, roomName,message:"Match Found" });

                

                

            }

        });
        
        socket.on("disconnect", () => {
            console.log(`❌ User Disconnected: ${userId}`);
        });
    });
}
