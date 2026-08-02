import type { Request, Response } from "express";
import { prisma } from "../Lib/prisma.js";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken'
import type { AuthRequest } from "../middleware/authentication.js";



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
            this.setTokenCookie(res, newUser.id);
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
            console.log("user id:" ,userId);
            const user = await prisma.user.findUnique({ where: { id: userId as string }, select: { id: true, username: true, avatarUrl: true, email: true } })
            console.log("user : ",user)
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(200).json({ message: "User found", user })
        } catch (error) {
            return res.status(500).json({ message: "Something went wrong" });
        }
    }

    googleAuth = async (req: Request, res: Response) => {
        const { credential } = req.body;
        // TODO: We will implement Google Auth Library verification here in the next step!
        res.status(501).json({ error: "Not implemented yet" });
    }
}

const authcontroller = new AuthController();

export default authcontroller;