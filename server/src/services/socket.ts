import { Socket, Server } from "socket.io";
import { prisma } from "../Lib/prisma.js";
import jwt from "jsonwebtoken";

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
            console.log(`User ${userId} joined the matchmaking queue!`);
        });
        
        socket.on("disconnect", () => {
            console.log(`❌ User Disconnected: ${userId}`);
        });
    });
}
