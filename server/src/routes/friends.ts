import { Router } from "express";
import { prisma } from "../Lib/prisma.js";
import { authentication } from "../middleware/authentication.js";
import { FriendController } from "../controllers/friends.js"; 

export const friendsRouter = Router();

// GET current user's friends list
friendsRouter.get("/", authentication,FriendController.getFriends);

// POST add a friend by username
friendsRouter.post("/add", authentication,FriendController.addFriendByUsername);

// DELETE remove a friend
friendsRouter.delete("/remove/:id", authentication,FriendController.deleteFriend);