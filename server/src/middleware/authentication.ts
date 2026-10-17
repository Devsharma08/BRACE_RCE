import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { JWT_SECRET, verifyTokenResult } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

const SECRET_KEY = JWT_SECRET;

// Extend Express Request
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

// Define the expected JWT payload structure
export interface CustomJwtPayload extends jwt.JwtPayload {
    userId: string;
    role?: string;
}

/**
 * Strict authentication — rejects the request unless a valid session cookie is
 * present. Use for any endpoint that acts on behalf of a specific user.
 *
 * Status codes are kept distinct on purpose: expired → 401 (the client should
 * try refreshing), invalid signature → 403 (the token is forged or malformed,
 * and a retry will not help).
 */
export const authentication = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token as string | undefined;

    if (!token) {
        return res.status(401).json({ status: "error", message: "Token is not present" });
    }

    const result = verifyTokenResult(token);

    if (result.ok) {
        (req as AuthRequest).userId = result.payload.userId as string;
        (req as AuthRequest).userRole = result.payload.role as string | undefined;
        return next();
    }

    if (result.error === "EXPIRED") {
        return res.status(401).json({ status: "error", message: "Token has expired" });
    }

    if (result.error === "INVALID") {
        return res.status(403).json({ status: "error", message: "Invalid token" });
    }

    return res.status(500).json({ status: "error", message: "Internal server error" });
};

/**
 * Optional authentication — identifies the caller when they ARE signed in, and
 * stays silent when they are not.
 *
 * For routes that serve public content but get better when personalised: the
 * problem catalog is the case in point. Guests may read every system problem,
 * but a signed-in caller also gets their own solved status and saved draft.
 *
 * The distinction the controllers must respect is `req.userId === undefined`
 * meaning "guest" rather than "unknown user". Any database join keyed on the
 * user — problem progress, saved code — has to be omitted entirely for a guest,
 * because Prisma treats an `undefined` value in a `where` clause as "no filter"
 * and would happily return every user's row.
 *
 * This is deliberately NOT a security boundary: an endpoint that needs a user
 * must keep using the strict `authentication` middleware, not infer identity
 * from an optional one.
 */
export const optionalAuthentication = (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.token as string | undefined;

    // No cookie at all → anonymous visitor, continue unauthenticated.
    if (!token) {
        return next();
    }

    const result = verifyTokenResult(token);

    // A present-but-bad token is also just "not authenticated" here. Returning
    // 401 from an optional path would break the public read for a visitor who
    // happens to be carrying a stale cookie — the opposite of what we want.
    if (result.ok) {
        (req as AuthRequest).userId = result.payload.userId as string;
        (req as AuthRequest).userRole = result.payload.role as string | undefined;
    }

    return next();
};

/**
 * Admin role guard — must be stacked AFTER `authentication` so that `req.userId`
 * is populated. The JWT intentionally omits `role` (it is not a claim the
 * frontend should cache), so the authoritative check re-reads the role from the
 * database on every request. Returns 403 for non-admins, never 401 — a missing
 * role is an authorization failure, not an authentication one.
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthRequest).userId;
    if (!userId) {
        return res.status(403).json({ status: "error", message: "Admin access required" });
    }

    const caller = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if ((caller?.role || "").toUpperCase() !== "ADMIN") {
        return res.status(403).json({ status: "error", message: "Admin access required" });
    }

    next();
};