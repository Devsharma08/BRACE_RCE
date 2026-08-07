import { Router } from "express";
import { prisma } from "../Lib/prisma.js";
import { authentication } from "../middleware/authentication.js";
import { FriendController } from "../controllers/friends.js"; 

export const friendsRouter = Router();

// GET current user's friends list
friendsRouter.get("/", authentication,FriendController.getFriends);

// GET Search users
friendsRouter.get("/search", authentication, FriendController.searchUsers);

// POST Send friend request
friendsRouter.post("/request", authentication, FriendController.sendFriendRequest);

// GET get all friend requests
friendsRouter.get("/requests", authentication, FriendController.getPendingRequests);

// POST Accept friend request
friendsRouter.post("/accept", authentication, FriendController.acceptFriendRequest);

// GET messages between two users
friendsRouter.get('/messages/:friendId', authentication,FriendController.getMessages);

// DELETE remove a friend
friendsRouter.delete("/remove/:id", authentication,FriendController.deleteFriend);

// POST block user
friendsRouter.post("/block", authentication, FriendController.blockUser);

// GET block users
friendsRouter.get("/blocked", authentication, FriendController.getBlockedUsers);

// POST unblock user
friendsRouter.post("/unblock", authentication, FriendController.unblockUser);

