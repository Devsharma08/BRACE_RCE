import { type AuthRequest } from '../middleware/authentication.js'
import { prisma } from '../Lib/prisma.js';
import { type Response } from 'express';

class Friends {
    async getFriends(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { friends: { select: { id: true, username: true } } }
            });
            return res.json({ friends: user?.friends || [] });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    async addFriendByUsername(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const { targetUsername } = req.body;

            const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } });
            if (!targetUser) return res.status(404).json({ message: "User not found!" });
            if (targetUser.id === userId) return res.status(400).json({ message: "Cannot add yourself!" });
            await prisma.user.update({
                where: { id: userId },
                data: { friends: { connect: { id: targetUser.id } } }
            });

            return res.json({ message: "Friend added successfully!" });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }

    }

    async deleteFriend(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const { targetUserId } = req.body;
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { friends: { select: { id: true, username: true } } }
            });
            if (!user) return res.status(404).json({ message: "User not found!" });
            return res.json({ friends: user?.friends || [] });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }
}

export const FriendController = new Friends();