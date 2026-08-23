import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken'
import type { AuthRequest } from "../middleware/authentication.js";
import { OAuth2Client } from "google-auth-library";


export class AuthController {

    setTokenCookie = async (res: any, userId: string) => {
        const token = jwt.sign({ userId }, process.env.JWT_SECRET || "very-strong-secret-key", { expiresIn: '7d', algorithm: "HS256" })
        return res.cookie("token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production"
        })
    }

    signup = async (req: Request, res: Response) => {
        const { username, email, avatarUrl, password } = req.body;

        try {
            // checking for existing user
            const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
            if (existingUser) {
                return res.status(409).json({ message: "Username or email already exists" })
            }
            // hash password
            const salt = await bcrypt.genSalt(10);
            const hashedpassword = await bcrypt.hash(password, salt);
            const userId = uuidv4();
            const newUser = await prisma.user.create({
                data: {
                    id: userId,
                    username,
                    email,
                    avatarUrl,
                    password: hashedpassword,
                    updatedAt: new Date()
                }
            })
            await this.setTokenCookie(res, newUser.id);
            res.status(201).json({ message: "Registered successfully", user: { id: newUser.id, username: newUser.username, avatarUrl: newUser.avatarUrl, email: newUser.email } });
        } catch (error) {
            return res.status(500).json({ message: "Something went wrong" })
        }

    }

    signin = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const user = await prisma.user.findUnique({ where: { email } })
            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }
            const validPassword = await bcrypt.compare(password, user.password || "")
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid password" })
            }
            this.setTokenCookie(res, user.id);

            res.status(200).json({ message: "Logged in successfully", user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, email: user.email } });
        } catch (error) {
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
        if (!google_client_id?.trim()) {
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
                        avatarUrl: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uniqueUsername}`,
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