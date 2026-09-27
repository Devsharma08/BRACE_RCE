import jwt from "jsonwebtoken";

// Centralized JWT secret handling so signing and verification always use one fallback.
// NOTE: In production, this must be set via environment. The fallback below is only for
// local development/CI where JWT_SECRET is intentionally not configured.
export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error('JWT_SECRET must be set in production');
}

// TypeScript doesn't narrow the type after the runtime check above,
// so we assert non-null for the functions that use it.
const secret: string = JWT_SECRET!;

export function getToken(userId: string): string {
  return jwt.sign({ userId }, secret, { expiresIn: "7d", algorithm: "HS256" });
}

export type TokenVerifyResult =
  | { ok: true; payload: jwt.JwtPayload }
  | { ok: false; error: "EXPIRED" | "INVALID" | "MALFORMED" | "UNKNOWN" };

// Like verifyToken but reports WHY a token failed, so callers can return
// distinct status codes (401 for expired, 403 for invalid signature, ...).
export function verifyTokenResult(token: string): TokenVerifyResult {
  try {
    return { ok: true, payload: jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return { ok: false, error: "EXPIRED" };
    if (err instanceof jwt.JsonWebTokenError) return { ok: false, error: "INVALID" };
    return { ok: false, error: "UNKNOWN" };
  }
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  const result = verifyTokenResult(token);
  return result.ok ? result.payload : null;
}