import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getToken, JWT_SECRET } from "../lib/jwt.js";
import type { AuthRequest } from "../middleware/authentication.js";
import { OAuth2Client } from "google-auth-library";
import { generateOtp } from "../lib/otp.js";
import { sendGmailEmail, sendQueuedEmail } from "../lib/gmail.js";
import { isFirebaseConfigured, getFirebaseAuth } from "../lib/firebase.js";
import { setCached, getCached, deleteCached } from "../lib/cache.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset } from "firebase/auth";

export class AuthController {

    private tokenCookieOptions = () => {
        const isProd = process.env.NODE_ENV === "production";
        // In production the API hostname differs from the WebSocket host
        // (Vercel-proxied api vs wss://bracerce.server...), so the token cookie
        // is scoped to ".devsharma.dev" to ride both. In dev the frontend lives
        // on localhost and Vite proxies /api to localhost:3000 — pinning the
        // cookie to ".devsharma.dev" there makes it invisible to localhost, which
        // is exactly why /auth/me returns "Token is not present" right after a
        // successful 200 login. So in dev we OMIT domain, yielding a host-only
        // cookie that the Vite proxy will attach to follow-up requests.
        const domain = process.env.COOKIE_DOMAIN ?? (isProd ? ".devsharma.dev" : undefined);
        return {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: isProd ? "none" as const : "lax" as const,
            secure: isProd,
            ...(domain ? { domain } : {}),
        };
    };

    setTokenCookie = async (res: any, userId: string) => {
        const token = getToken(userId)
        return res.cookie("token", token, this.tokenCookieOptions())
    }

    private validateSignupBody(body: any) {
        const username = typeof body.username === "string" ? body.username.trim() : "";
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const password = typeof body.password === "string" ? body.password : "";

        const errors: string[] = [];

        if (!username) errors.push("username is required");
        else if (username.length < 3) errors.push("username must be at least 3 characters");
        else if (username.length > 64) errors.push("username must be 64 characters or fewer");

        if (!email) errors.push("email is required");
        else if (!/^[^\s@]+@[^\s@]+\..+$/.test(email)) errors.push("email is invalid");

        if (!password) errors.push("password is required");
        else if (password.length < 8) errors.push("password must be at least 8 characters");
        else if (password.length > 128) errors.push("password must be 128 characters or fewer");

        return { username, email, password, errors };
    }

    /**
     * Send a single-use verification code to the user's email. The code is
     * generated locally, stored in the in-memory cache with a 10-minute TTL, and
     * delivered through Gmail's SMTP server.
     */
    otpSend = async (req: Request, res: Response) => {
        const { email } = req.body;
        if (typeof email !== "string") return res.status(400).json({ message: "Email is required" });

        const normalized = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: normalized } });
        if (!user) return res.status(404).json({ message: "No account found with this email address" });

        let otp: string;
        let storedOtp: { otp: string; expiresAt: number };
        try {
            otp = generateOtp();
            const key = `otp:${normalized}`;
            deleteCached(key);
            storedOtp = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
            setCached(key, storedOtp, 600);
        } catch (err) {
            console.error("Error generating OTP:", err);
            return res.status(500).json({ message: "Could not generate a verification code" });
        }

        try {
            await sendQueuedEmail({
                to: normalized,
                subject: "Your BRACE RCE login code",
                text: `Your BRACE RCE verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
            });
        } catch (err) {
            console.error("Error queueing OTP email:", err);
            deleteCached(`otp:${normalized}`);
            return res.status(500).json({ message: "Could not queue the verification code. Please try again." });
        }

        res.status(200).json({ message: "Verification code sent to your email" });
    }

    /**
     * Verify an OTP that was previously emailed via /otp/send. On success the
     * user is authenticated and issued the same session cookie + JWT used by the
     * legacy /signin route, so OTP login is a drop-in replacement.
     */
    otpVerify = async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        if (typeof email !== "string" || typeof otp !== "string") {
            return res.status(400).json({ message: "Email and OTP are required" });
        }
        const normalized = email.trim().toLowerCase();

        const stored: { otp: string; expiresAt: number } | undefined = getCached(`otp:${normalized}`);
        if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
            deleteCached(`otp:${normalized}`);
            return res.status(401).json({ message: "Invalid or expired verification code" });
        }
        deleteCached(`otp:${normalized}`);

        try {
            // The OTP proves mailbox ownership for this email, so we issue our own
            // session directly instead of attempting a Firebase password sign-in
            // (the OTP is not a Firebase password).
            const prismaUser = await prisma.user.findUnique({ where: { email: normalized } });
            if (!prismaUser) {
                return res.status(401).json({ message: "Invalid or expired verification code" });
            }
            return this.sendAuthResponse(res, prismaUser, { uid: prismaUser.id }, normalized);
        } catch (err: any) {
            console.error("OTP sign-in error:", err);
            return res.status(401).json({ message: "Invalid or expired verification code" });
        }
    }

    /** Request a Firebase password reset email (sent to the user's registered email). */
    passwordResetRequest = async (req: Request, res: Response) => {
        if (!isFirebaseConfigured()) return res.status(503).json({ message: "Password reset is not configured on the server" });
        const { email } = req.body;
        if (typeof email !== "string") return res.status(400).json({ message: "Email is required" });
        const normalized = email.trim().toLowerCase();

        try {
            await sendPasswordResetEmail(getFirebaseAuth(), normalized);
        } catch (err: any) {
            // Deliberately swallowed: reporting failures here would let an attacker
            // distinguish registered from unregistered emails (account enumeration).
            // The failure is visible server-side for operators to diagnose.
            console.error("Password reset email error:", err);
        }

        // Always return the same response so the existence of the account cannot be inferred from this endpoint.
        res.status(200).json({ message: "If an account with this email exists, a password reset link has been sent." });
    }

    /** Confirm the reset using the oobCode from the Firebase reset email. */
    passwordResetConfirm = async (req: Request, res: Response) => {
        if (!isFirebaseConfigured()) return res.status(503).json({ message: "Password reset is not configured on the server" });
        const { oobCode, newPassword } = req.body;
        if (typeof oobCode !== "string" || typeof newPassword !== "string") {
            return res.status(400).json({ message: "Oob code and new password are required" });
        }

        try {
            await confirmPasswordReset(getFirebaseAuth(), oobCode, newPassword);
        } catch (err: any) {
            console.error("Password reset confirm error:", err);
            if (err.code === "auth/weak-password") return res.status(400).json({ message: "The new password is invalid" });
            if (["auth/expired-action-code", "auth/invalid-action-code", "auth/user-not-found"].includes(err.code)) {
                return res.status(400).json({ message: "The reset link is invalid or has expired" });
            }
            return res.status(400).json({ message: "Could not reset the password" });
        }

        res.status(200).json({ message: "Password reset successful. You can now sign in with your new password." });
    }

    /**
     * Firebase-backed account creation. Registers the user with Firebase Auth
     * and synchronises a local Prisma record by email (so existing databases
     * keep their user rows and the two systems stay "perfectly compatible").
     */
    firebaseSignup = async (req: Request, res: Response) => {
        if (!isFirebaseConfigured()) return res.status(503).json({ message: "Email registration is not configured on the server" });
        const { username, email, password, avatarUrl } = req.body;
        const { errors } = this.validateSignupBody(req.body);
        if (errors.length > 0) return res.status(400).json({ message: errors.join(", ") });

        const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

        // Existing records (created with the legacy bcrypt flow) must not be duplicated. Reject with a friendly "sign in" prompt.
        const existing = await prisma.user.findUnique({ where: { email: normalized } });
        if (existing) {
            return res.status(409).json({ message: "An account with this email already exists. Sign in instead." });
        }

        try {
            await createUserWithEmailAndPassword(getFirebaseAuth(), normalized, password);
        } catch (err: any) {
            if (err.code === "auth/email-already-in-use") {
                return res.status(409).json({ message: "An account with this email already exists. Sign in instead." });
            }
            const fbMsg = this.firebaseErrorMessage(err);
            console.error("Firebase signup error:", err);
            return res.status(400).json({ message: fbMsg });
        }

        try {
            const userId = uuidv4();
            await prisma.user.create({
                data: {
                    id: userId,
                    username: typeof username === "string" ? username.trim() : "",
                    email: normalized,
                    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
                    role: "USER",
                    updatedAt: new Date(),
                },
            });
            await this.setTokenCookie(res, userId);
            res.status(201).json({ message: "Registered successfully", user: { id: userId, username, avatarUrl: avatarUrl || undefined, email: normalized } });
        } catch (err: any) {
            console.error("Error creating local user record:", err);
            // If the Prisma create fails due to a unique constraint violation
            // (e.g., username taken but email wasn't), report it clearly.
            if (err.code === "P2002") {
                const field = (err.meta?.target as string[])?.[0] ?? "field";
                return res.status(409).json({ message: `That ${field} is already taken. Try a different one.` });
            }
            return res.status(500).json({ message: "Something went wrong" });
        }
    }

    /**
     * Firebase-first sign-in. Existing email/password accounts that predate this
     * integration keep working via the bcrypt fallback.
     */
    firebaseSignin = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Invalid request body" });
        }
        const normalized = email.trim().toLowerCase();

        if (isFirebaseConfigured()) {
            try {
                const result = await signInWithEmailAndPassword(getFirebaseAuth(), normalized, password);
                const { user } = result;
                const prismaUser = await prisma.user.findUnique({ where: { email: normalized } });
                if (!prismaUser) {
                    // Firebase has the account but no local row — sync it.
                    return res.status(404).json({ message: "Account exists in Firebase but local record is missing. Contact support." });
                }
                return this.sendAuthResponse(res, prismaUser, user, normalized);
            } catch (err: any) {
                // Firebase rejected the credentials — fall through to the legacy
                // bcrypt check so pre-existing accounts that predate the Firebase
                // migration keep working.
                if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                    // These are the expected "try the bcrypt fallback" cases; don't surface to user.
                    console.error("Firebase sign-in rejected, trying local credentials:", err.code);
                } else {
                    console.error("Unexpected Firebase sign-in error:", err);
                }
            }
        }

        try {
            const user = await prisma.user.findUnique({ where: { email: normalized } });
            if (!user) return res.status(401).json({ message: "Invalid email or password" });
            const validPassword = await bcrypt.compare(password, user.password || "");
            if (!validPassword) return res.status(401).json({ message: "Invalid email or password" });
            await this.setTokenCookie(res, user.id);
            return res.status(200).json({ message: "Logged in successfully", user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, email: user.email } });
        } catch (bcryptErr) {
            console.error("Local sign-in fallback failed:", bcryptErr);
            return res.status(500).json({ message: "Something went wrong during sign-in" });
        }
    }

    signin = async (req: Request, res: Response) => {
        try {
            // Prefer Firebase for users created by this controller; fall back to bcrypt so the pre-existing account pool is unaffected.
            const response = await this.firebaseSignin(req, res);
            return response;
        } catch (error) {
            console.error("Error in signin:", error);
            return res.status(500).json({ message: "Something went wrong" });
        }
    }

    signup = async (req: Request, res: Response) => {
        const { username, email, password, errors } = this.validateSignupBody(req.body);

        if (errors.length > 0) {
            return res.status(400).json({ message: errors.join(", ") });
        }

        // Prefer Firebase so all new accounts live in Firebase Auth. When Firebase
        // is not configured (self-hosted/dev setups) fall back to the legacy bcrypt
        // path so signup keeps working exactly as before.
        if (isFirebaseConfigured()) {
            return this.firebaseSignup({ ...req.body, username, email, password }, res);
        }

        try {
            const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
            if (existingUser) {
                return res.status(409).json({ message: "Username or email already exists" })
            }

            const salt = await bcrypt.genSalt(10);
            const hashedpassword = await bcrypt.hash(password, salt);
            const userId = uuidv4();
            const newUser = await prisma.user.create({
                data: {
                    id: userId,
                    username,
                    email,
                    avatarUrl: typeof req.body.avatarUrl === "string" ? req.body.avatarUrl : undefined,
                    password: hashedpassword,
                    updatedAt: new Date()
                }
            })
            await this.setTokenCookie(res, newUser.id);
            res.status(201).json({ message: "Registered successfully", user: { id: newUser.id, username: newUser.username, avatarUrl: newUser.avatarUrl, email: newUser.email } });
        } catch (error) {
            console.error("Error in signup:", error);
            return res.status(500).json({ message: "Something went wrong during registration" })
        }
    }

    signout = async (req: Request, res: Response) => {
        // Reuse the same option shape (esp. `domain` + `sameSite` + `secure`) so
        // the clear matches the cookie set by setTokenCookie — otherwise a
        // domain-pinned token cookie survives logout. maxAge is irrelevant for
        // clearCookie and is dropped so the cookie is expired immediately.
        const { maxAge: _maxAge, ...clearOpts } = this.tokenCookieOptions();
        res.clearCookie("token", clearOpts);
        res.clearCookie("csrf_token", {
            httpOnly: false,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
        });
        res.status(200).json({ message: "Logged out successfully" })
    }

    me = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.userId;
            const user = await prisma.user.findUnique({ where: { id: userId as string }, select: { id: true, username: true, avatarUrl: true, email: true, role: true } })
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(200).json({ message: "User found", user })
        } catch {
            return res.status(500).json({ message: "Something went wrong" });
        }
    }

     /**
     * Shared helper that issues the session cookie + JWT and returns the user payload.
     */
    private firebaseErrorMessage(err: any): string {
        const code = err?.code ?? "";
        const map: Record<string, string> = {
            "auth/invalid-email": "The email address is not valid.",
            "auth/user-disabled": "This account has been disabled. Contact support.",
            "auth/user-not-found": "No account found with that email.",
            "auth/wrong-password": "Incorrect password. Please try again.",
            "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
            "auth/invalid-credential": "The email or password is incorrect.",
            "auth/weak-password": "Password should be at least 6 characters.",
            "auth/email-already-in-use": "An account with this email already exists.",
            "auth/missing-android-pkg-name": "Missing Android package name.",
            "auth/missing-continue-uri": "Missing continue URL.",
            "auth/invalid-continue-uri": "The continue URL is invalid.",
            "auth/unauthorized-continue-uri": "The continue URL is not authorized.",
            "auth/misconfigured": "Server is not properly configured for authentication.",
        };
        return map[code] ?? err?.message ?? "An authentication error occurred.";
    }

    private async sendAuthResponse(res: Response, prismaUser: any, firebaseUser: any, email: string) {
        const userId = prismaUser?.id ?? firebaseUser.uid;
        await this.setTokenCookie(res, userId);
        const userPayload = prismaUser
            ? { id: prismaUser.id, username: prismaUser.username, avatarUrl: prismaUser.avatarUrl, email }
            : { id: firebaseUser.uid, username: firebaseUser.displayName ?? null, avatarUrl: firebaseUser.photoURL ?? null, email };
        return res.status(200).json({
            message: "Logged in successfully",
            user: userPayload,
        });
    }

    private async findOrCreateGoogleUser(payload: { email?: string | null; name?: string | null; picture?: string | null }) {
        const email = payload.email as string;

        let user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            const emailPrefix = email ? email.split('@')[0] : 'user';
            let baseUsername = (payload.name || emailPrefix || 'user').replace(/[^a-zA-Z0-9_]/g, '');
            if (!baseUsername) baseUsername = "user";
            let count = 0;
            let uniqueUsername = baseUsername;
            while (await prisma.user.findFirst({
                where: { username: uniqueUsername }
            })) {
                uniqueUsername = `${baseUsername}${count}`;
                count++;
            }

            user = await prisma.user.create({
                data: {
                    id: uuidv4(),
                    email,
                    avatarUrl: payload.picture || `https://api.dicebear.com/9.x/avataaars/svg?seed=${uniqueUsername}`,
                    username: uniqueUsername,
                    updatedAt: new Date()
                }
            });
        }

        return user;
    }

    googleAuth = async (req: Request, res: Response) => {
        const google_client_id = process.env.GOOGLE_CLIENT_ID;
        if (!google_client_id || !google_client_id.trim() || google_client_id.trim() === "not-configured") {
            return res.status(500).json({
                message: "Server is not configured with GOOGLE_CLIENT_ID"
            });
        }
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({
                message: "Missing Google credential token"
            });
        }

        try {
            const client = new OAuth2Client(google_client_id);

            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: google_client_id
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return res.status(400).json({ message: "Invalid google token payload" });
            }

            const { email, picture, name } = payload;

            const user = await this.findOrCreateGoogleUser({ email, picture, name });

            await this.setTokenCookie(res, user.id);

            return res.status(200).json({
                message: "Google auth successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatarUrl: user.avatarUrl
                }
            });
        } catch (error) {
            console.error("error in google auth", error);
            return res.status(500).json({
                message: "Unable to process google auth"
            });
        }
    }

    googleCallback = async (req: Request, res: Response) => {
        const google_client_id = process.env.GOOGLE_CLIENT_ID;
        if (!google_client_id || !google_client_id.trim() || google_client_id.trim() === "not-configured") {
            return res.status(500).json({
                message: "Server is not configured with GOOGLE_CLIENT_ID"
            });
        }

        const { code, code_verifier, redirect_uri } = req.body;

        try {
            const client = new OAuth2Client(google_client_id, process.env.GOOGLE_CLIENT_SECRET);

            const { tokens } = await client.getToken({
                code,
                codeVerifier: code_verifier,
                redirect_uri,
            });
            if (!tokens.id_token) {
                return res.status(400).json({ message: "Google did not return an ID token" });
            }

            const ticket = await client.verifyIdToken({
                idToken: tokens.id_token,
                audience: google_client_id
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return res.status(400).json({ message: "Invalid google token payload" });
            }

            const user = await this.findOrCreateGoogleUser(payload);

            await this.setTokenCookie(res, user.id);

            return res.status(200).json({
                message: "Google auth successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatarUrl: user.avatarUrl
                }
            });
        } catch (error) {
            console.error("error in google callback", error);
            return res.status(401).json({
                message: "Google authorization failed"
            });
        }
    };
}

const authcontroller = new AuthController();

// Endpoint to get a socket.io auth token (short-lived JWT).
// Used by the frontend when the token cookie may not be sent
// (e.g., cross-origin WebSocket from Vercel-hosted frontend to
// backend EC2 domain).
export const socketToken = async (req: any, res: any) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    if (!JWT_SECRET) return res.status(500).json({ message: "JWT secret not configured" });
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h", algorithm: "HS256" });
    res.json({ token });
};

export default authcontroller;