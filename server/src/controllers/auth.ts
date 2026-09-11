import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from "../lib/jwt.js";
import type { AuthRequest } from "../middleware/authentication.js";
import { OAuth2Client } from "google-auth-library";


export class AuthController {

    setTokenCookie = async (res: any, userId: string) => {
        const token = getToken(userId)
        return res.cookie("token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production"
        })
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
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email is invalid");

        if (!password) errors.push("password is required");
        else if (password.length < 8) errors.push("password must be at least 8 characters");
        else if (password.length > 128) errors.push("password must be 128 characters or fewer");

        return { username, email, password, errors };
    }

    signup = async (req: Request, res: Response) => {
        const { username, email, password, errors } = this.validateSignupBody(req.body);

        if (errors.length > 0) {
            return res.status(400).json({ message: errors[0] });
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
            return res.status(500).json({ message: "Something went wrong" })
        }

    }

    signin = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            if (typeof email !== "string" || typeof password !== "string") {
                return res.status(400).json({ message: "Invalid request body" });
            }

            const user = await prisma.user.findUnique({ where: { email } })
            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }
            const validPassword = await bcrypt.compare(password, user.password || "")
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid password" })
            }
            await this.setTokenCookie(res, user.id);

            res.status(200).json({ message: "Logged in successfully", user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, email: user.email } });
        } catch (error) {
            console.error("Error in signin:", error);
            return res.status(500).json({ message: "Something went wrong" })
        }
    }

    signout = async (req: Request, res: Response) => {
        res.clearCookie("token");
        res.status(200).json({ message: "Logged out successfully" })
    }

    me = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.userId;
            const user = await prisma.user.findUnique({ where: { id: userId as string }, select: { id: true, username: true, avatarUrl: true, email: true } })
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(200).json({ message: "User found", user })
        } catch (error) {
            return res.status(500).json({ message: "Something went wrong" });
        }
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

            let user = await prisma.user.findFirst({
                where: { email }
            });

            if (!user) {
                let emailPrefix = email ? email.split('@')[0] : 'user';
                let baseUsername = (name || emailPrefix || 'user').replace(/[^a-zA-Z0-9_]/g, '');
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
                        avatarUrl: picture || `https://api.dicebear.com/9.x/avataaars/svg?seed=${uniqueUsername}`,
                        username: uniqueUsername,
                        updatedAt: new Date()
                    }
                });
            }

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
        }
        catch(error) {
        console.error("error in google auth", error);
        return res.status(500).json({
            message: "Unable to process google auth"
        });
    }
}


}

const authcontroller = new AuthController();

export default authcontroller;