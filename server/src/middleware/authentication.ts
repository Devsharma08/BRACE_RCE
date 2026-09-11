import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { JWT_SECRET, verifyTokenResult } from '../lib/jwt.js';

const SECRET_KEY = JWT_SECRET;

// Extend Express Request
export interface AuthRequest extends Request {
    userId?: string;
}

// Define the expected JWT payload structure
export interface CustomJwtPayload extends jwt.JwtPayload {
    userId: string;
}

export const authentication = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token as string | undefined;

    if (!token) {
        return res.status(401).json({ status: "error", message: "Token is not present" });
    }

    const result = verifyTokenResult(token);

    if (result.ok) {
        (req as AuthRequest).userId = result.payload.userId as string;
        return next();
    }

    // Preserve distinct status codes: expired → 401, invalid signature → 403.
    if (result.error === "EXPIRED") {
        return res.status(401).json({ status: "error", message: "Token has expired" });
    }

    if (result.error === "INVALID") {
        return res.status(403).json({ status: "error", message: "Invalid token" });
    }

    return res.status(500).json({ status: "error", message: "Internal server error" });
};