import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET as string;
if(!JWT_SECRET && process.env.NODE_ENV==="production"){
    throw new Error("JWT_SECRET is not defined in production mode");
}

const SECRET_KEY = JWT_SECRET || "development-only-secret-key";

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

    try {
        // Synchronous verification works cleanly inside try/catch
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as CustomJwtPayload;

        // Attach userId to custom request
        (req as AuthRequest).userId = decoded.userId;
        
        return next();
    } catch (err: unknown) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ status: "error", message: "Token has expired" });
        }
        
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ status: "error", message: err.message });
        }

        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};