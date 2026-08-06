import { type AuthRequest } from '../middleware/authentication.js'
import { prisma } from '../Lib/prisma.js';
import { type Response } from 'express';
import { request } from 'node:http';

class Friends {
    // GET ALL FRIENDS
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

    // GET ALL MESSAGES
    async getMessages(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const friendId = req.params.friendId;

            const messages = await prisma.message.findMany({
                where: {
                    OR: [
                        { senderId: userId, receiverId: friendId },
                        { senderId: friendId, receiverId: userId }
                    ]
                },
                orderBy: { createdAt: 'asc' },
                // Limit to last 50 messages for performance, can add pagination later
                take: 50
            });

            return res.json({ messages });
        } catch (error) {
            return res.status(500).json({ message: "Server error fetching messages" });
        }
    }

    // SEARCH USER
    async searchUsers(req: AuthRequest, res: Response) {
        try {
            const query = req.query.q as string;
            const userId = (req as AuthRequest).userId;
            if (!query) return res.json({ users: [] });

            const users = await prisma.user.findMany({
                where: { username: { contains: query, mode: "insensitive" }, id: { not: userId } },
                select: { id: true, username: true }
            });

            // Find all pending requests sent by this user to the searched users
            const requests = await prisma.friendRequest.findMany({
                where: { senderId: userId as string, receiverId: { in: users.map((u: any) => u.id) }, status: "PENDING" }
            });

            // Map over results to inject a "requestSent" flag
            const userWithReqs = users.map((u: any) => ({
                ...u,
                requestSent: requests.some((r: any) => r.receiverId === u.id)
            }));

            return res.json({ user: userWithReqs });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // BLOCK USER
    async blockUser(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const { targetUserId } = req.body;

            await prisma.friendRequest.upsert({
                where: { senderId_receiverId: { senderId: userId as string, receiverId: targetUserId } },
                update: { status: "BLOCK" },
                create: { senderId: userId as string, receiverId: targetUserId, status: "BLOCK" }
            });

            return res.json({ message: "User blocked successfully" });
        } catch (error) {
            return res.status(500).json({ message: "Server Error" });
        }
    }

    // SEND FRIEND REQUEST
    async sendFriendRequest(req: AuthRequest, res: Response) {
        try {

            const userId = (req as AuthRequest).userId;
            const { targetUserId } = req.body;
            // check if already friends
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    friends: true
                }
            });

            if (user?.friends.some((f: any) => f.id === targetUserId)) return res.json({ message: "Already Friends" });

            // Check if request already sent
            const existingReq = await prisma.friendRequest.findFirst({
                where: { senderId: userId as string, receiverId: targetUserId, status: "PENDING" }
            });
            if (existingReq) return res.status(400).json({ message: "Request already sent!" });


            // checking for block in EITHER direction
            const blockCheck = await prisma.friendRequest.findFirst({
                where: {
                    OR: [
                        { senderId: userId, receiverId: targetUserId, status: "BLOCK" },
                        { senderId: targetUserId, receiverId: userId, status: "BLOCK" }
                    ]
                }
            });

            if (blockCheck) {
                return res.status(403).json({ message: "Action not permitted. You have been blocked by this user." });
            }


            // create request
            await prisma.friendRequest.upsert({
                where: { senderId_receiverId: { senderId: userId as string, receiverId: targetUserId } },
                update: { status: "PENDING" },
                create: {
                    senderId: userId as string,
                    receiverId: targetUserId,
                    status: "PENDING"
                }
            })

            return res.json({
                message: "Request sent successfully"
            })
        } catch (error) {
            console.log("Error in send Friend Request", error)
            return res.status(500).json({
                message: "Server Error"
            })

        }
    }

    // GET PENDING REQUESTS
    async getPendingRequests(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const requests = await prisma.friendRequest.findMany({
                where: { receiverId: userId, status: "PENDING" },
                include: { sender: { select: { id: true, username: true } } }
            });
            return res.json({ requests });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // ACCEPT REQUEST
    async acceptFriendRequest(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const { requestId, senderId } = req.body;
            await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
            // Connect both users in the friends array
            await prisma.user.update({
                where: { id: userId },
                data: { friends: { connect: { id: senderId } } }
            });
            await prisma.user.update({
                where: { id: senderId },
                data: { friends: { connect: { id: userId as string } } }
            });
            return res.json({ message: "Friend added!" });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // DELETE FRIEND
    async deleteFriend(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const targetId = req.params.id; // Changed to match your routes parameter!
            // Disconnect both ways
            await prisma.user.update({ where: { id: userId }, data: { friends: { disconnect: { id: targetId } } } });
            await prisma.user.update({ where: { id: targetId }, data: { friends: { disconnect: { id: userId as string } } } });
            return res.json({ message: "Friend removed!" });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }
}

export const FriendController = new Friends();