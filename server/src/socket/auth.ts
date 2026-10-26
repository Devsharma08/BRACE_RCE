import type { Server } from "socket.io";
import { verifyToken } from "../lib/jwt.js";

// Authenticate every socket connection
export function registerSocketAuth(io: Server) {
    io.use((socket: any, next: any) => {
        // First try the auth parameter (socket.io v4 handshake auth), then cookies.
        // This supports cross-origin WebSocket connections where cookies may not
        // be sent (e.g., frontend on Vercel, socket.io on backend EC2 domain).
        const authToken = socket.handshake.auth?.token;

        if (authToken) {
            const decoded = verifyToken(authToken);
            if (!decoded) return next(new Error("Token verification failed"));
            socket.data.userId = (decoded as any).userId;
            return next();
        }

        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return next(new Error("No auth credentials provided"));

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
}
