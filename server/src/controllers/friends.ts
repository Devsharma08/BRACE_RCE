import { type AuthRequest } from '../middleware/authentication.js'
import { prisma } from '../lib/prisma.js';
import { type Response } from 'express';
import { notifyFriendAccept, notifyFriendRequest } from '../services/notificationService.js';
import { emitFriendsUpdate, emitNotification } from '../socket/ioRegistry.js';

class Friends {
    // ALL FRIENDS
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

    // ALL MESSAGES
    async getMessages(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const friendId = req.params.friendId as string;

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
            const query = (req.query.q as string)?.trim();
            const userId = (req as AuthRequest).userId;
            if (!query) return res.json({ users: [] });

            const users = await prisma.user.findMany({
                where: { username: { contains: query, mode: "insensitive" }, id: { not: userId } },
                select: { id: true, username: true, avatarUrl: true },
                take: 20,
                orderBy: { username: 'asc' }
            });

            const candidateIds = users.map((u: any) => u.id);

            // Anyone already connected is not a discovery target — returning them
            // just filled the panel with rows the client can only label "Friend".
            const existingFriends = candidateIds.length
                ? await prisma.user.findUnique({
                    where: { id: userId as string },
                    select: { friends: { select: { id: true } } },
                })
                : null;
            const friendIds = new Set((existingFriends?.friends ?? []).map((f: any) => f.id));

            // Same for blocked accounts: sending them a request would only 403.
            const blocks = candidateIds.length
                ? await prisma.friendRequest.findMany({
                    where: {
                        status: "BLOCK",
                        OR: [
                            { senderId: userId as string, receiverId: { in: candidateIds } },
                            { receiverId: userId as string, senderId: { in: candidateIds } },
                        ],
                    },
                    select: { senderId: true, receiverId: true },
                })
                : [];
            const blockedIds = new Set(
                blocks.flatMap((b: any) => [b.senderId, b.receiverId]) as string[],
            );

            const searchable = users.filter(
                (u: any) => !friendIds.has(u.id) && !blockedIds.has(u.id),
            );

            // Pending requests already sent BY this user, so the panel can show
            // "Requested" instead of a second, server-rejected send.
            const requests = searchable.length
                ? await prisma.friendRequest.findMany({
                    where: {
                        senderId: userId as string,
                        receiverId: { in: searchable.map((u: any) => u.id) },
                        status: "PENDING",
                    },
                })
                : [];

            const userWithReqs = searchable.map((u: any) => ({
                ...u,
                requestSent: requests.some((r: any) => r.receiverId === u.id),
            }));

            return res.json({ users: userWithReqs, user: userWithReqs });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // BLOCK USER
    async blockUser(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const { targetUserId } = req.body;

            // WIPE OUT any pending requests from the target user to us
            await prisma.friendRequest.deleteMany({
                where: { senderId: targetUserId, receiverId: userId as string, status: "PENDING" }
            });

            await prisma.friendRequest.upsert({
                where: { senderId_receiverId: { senderId: userId as string, receiverId: targetUserId } },
                update: { status: "BLOCK" },
                create: { senderId: userId as string, receiverId: targetUserId, status: "BLOCK" }
            });

            // Pending-requests lists changed on both sides.
            await emitFriendsUpdate([userId, targetUserId]);

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

            // Check if they already sent US a request (Auto-accept scenario)
            const reverseReq = await prisma.friendRequest.findFirst({
                where: { senderId: targetUserId, receiverId: userId as string, status: "PENDING" }
            });

            if (reverseReq) {
                // Auto-accept it!
                await prisma.friendRequest.update({
                    where: { id: reverseReq.id },
                    data: { status: "ACCEPTED" }
                });
                await prisma.user.update({
                    where: { id: userId as string },
                    data: { friends: { connect: { id: targetUserId } } }
                });
                await prisma.user.update({
                    where: { id: targetUserId },
                    data: { friends: { connect: { id: userId as string } } }
                });

                // Real-time: the original requester gets the accept notification
                // + both sides refresh their friend state without a refetch.
                try {
                    const accepter = await prisma.user.findUnique({
                        where: { id: userId as string },
                        select: { username: true }
                    });
                    const notif = await notifyFriendAccept(targetUserId, accepter?.username ?? "Someone");
                    await emitNotification(targetUserId, notif);
                } catch { /* best-effort */ }
                await emitFriendsUpdate([userId, targetUserId]);

                return res.json({ message: "Request accepted! You are now friends." });
            }

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
            const request = await prisma.friendRequest.upsert({
                where: { senderId_receiverId: { senderId: userId as string, receiverId: targetUserId } },
                update: { status: "PENDING" },
                create: {
                    senderId: userId as string,
                    receiverId: targetUserId,
                    status: "PENDING"
                }
            })

            // queue notification for receiver (best-effort, never blocks the request)
            try {
                const sender = await prisma.user.findUnique({
                    where: { id: userId as string },
                    select: { username: true }
                });
                const notif = await notifyFriendRequest(targetUserId, sender?.username ?? "Someone", {
                    requestId: request.id,
                    senderId: userId as string,
                });
                await emitNotification(targetUserId, notif);
            } catch { /* notification queue is best-effort */ }

            // Live badge + request-list refresh on the receiver (and sender).
            await emitFriendsUpdate([targetUserId, userId]);

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

    // PENDING REQUESTS
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
            const { requestId } = req.body;

            // Ownership + state checks: only the receiver of a still-pending
            // request may accept it (body senderId is never trusted).
            const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
            if (!request) return res.status(404).json({ message: "Friend request not found" });
            if (request.receiverId !== userId) {
                return res.status(403).json({ message: "Not your request to accept" });
            }
            if (request.status !== "PENDING") {
                return res.status(400).json({ message: "Request is no longer pending" });
            }

            const otherId = request.senderId;

            await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
            // Connect both users in the friends array
            await prisma.user.update({
                where: { id: userId },
                data: { friends: { connect: { id: otherId } } }
            });
            await prisma.user.update({
                where: { id: otherId },
                data: { friends: { connect: { id: userId as string } } }
            });
            try {
                const accepter = await prisma.user.findUnique({
                    where: { id: userId as string },
                    select: { username: true }
                });
                const notif = await notifyFriendAccept(otherId, accepter?.username ?? "Someone");
                await emitNotification(otherId, notif);
            } catch { /* best-effort */ }

            // Both sides refetch friend lists / requests live.
            await emitFriendsUpdate([userId, otherId]);

            return res.json({ message: "Friend added!" });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // DELETE FRIEND
    async deleteFriend(req: AuthRequest, res: Response) {
        try {
            const userId = (req as AuthRequest).userId;
            const targetId = req.params.id as string; 
            
            // Wipe out their entire chat history
            await prisma.message.deleteMany({
                where: {
                    OR: [
                        { senderId: userId as string, receiverId: targetId },
                        { senderId: targetId, receiverId: userId as string }
                    ]
                }
            });

            // Disconnect both ways
            await prisma.user.update({ where: { id: userId }, data: { friends: { disconnect: { id: targetId } } } });
            await prisma.user.update({ where: { id: targetId }, data: { friends: { disconnect: { id: userId as string } } } });

            await emitFriendsUpdate([userId, targetId]);

            return res.json({ message: "Friend and chat history removed!" });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET ALL BLOCK USERS
    async getBlockedUsers(req:AuthRequest,res:Response){
        try {
            const userId = (req as AuthRequest).userId;
            const blocked = await prisma.friendRequest.findMany({
                where: { senderId: userId, status: "BLOCK" },
                include: { receiver: { select: { id: true, username: true } } }
            });
            return res.json({ totalBlocked:blocked.length , users : blocked });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // POST UNBLOCK USER
    async unblockUser(req:AuthRequest,res:Response){
        try {
            const userId = (req as AuthRequest).userId;
            const {targetUserId} = req.body;
            // Best practice: Delete the block record completely so they start fresh
            await prisma.friendRequest.delete({
                where: { 
                    senderId_receiverId: { 
                        senderId: userId as string, 
                        receiverId: targetUserId 
                    } 
                }
            });

            await emitFriendsUpdate([userId, targetUserId]);

            return res.json({ message: "User unblocked successfully" });
        } catch (error) {
            return res.status(500).json({ message: "Server error" });
        }
    }

    // REJECT REQUEST
    async rejectFriendRequest(req:AuthRequest,res:Response) {
        try {
            const {requestId} = req.body;
            if (!requestId || typeof requestId !== "string") {
                return res.status(400).json({ message: "requestId is required" });
            }

            // Ownership + state checks: only the receiver of a still-pending
            // request may reject it.
            const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
            if (!request) {
                return res.status(404).json({ message: "Friend request not found" });
            }
            if (request.receiverId !== (req as AuthRequest).userId) {
                return res.status(403).json({ message: "Not your request to reject" });
            }
            if (request.status !== "PENDING") {
                return res.status(400).json({ message: "Request is no longer pending" });
            }

            await prisma.friendRequest.delete({
                where:{
                    id:requestId
                }
            })

            // Sender's outgoing-request badge/list refreshes immediately too.
            await emitFriendsUpdate([(req as AuthRequest).userId, request.senderId]);

            return res.json({
                message:"Request rejected!"
            })
        } catch (error) {
            console.log("Error rejecting request",error);
            return res.status(500).json({
                message:"Server error"
            })
        }
    }

}

export const FriendController = new Friends();