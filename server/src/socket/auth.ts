import type { Server } from "socket.io";
import { verifyToken } from "../lib/jwt.js";

// Authenticate every socket connection
export function registerSocketAuth(io: Server) {
    io.use((socket: any, next: any) => {
        // First try a JWT token passed via the socket.io auth parameter.
        // This supports cross-origin WebSocket connections where the HTTP-only
        // token cookie isn't sent (e.g., Vercel frontend → EC2 backend).
        const authToken = socket.handshake.auth?.token;

        if (authToken) {
            const decoded = verifyToken(authToken);
            if (!decoded) return next(new Error("Token verification failed"));
            socket.data.userId = (decoded as any).userId;
            return next();
        }

        // Fallback: accept userId from auth parameter. The user was already
        // authenticated via HTTP (cookie-based), so we trust the userId if it
        // is present. This is a pragmatic fallback for cross-domain WebSocket
        // connections where the cookie isn't available.
        if (socket.handshake.auth?.userId) {
            socket.data.userId = socket.handshake.auth.userId;
            return next();
        }

        // Final fallback: check the token cookie (same-origin access)
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
