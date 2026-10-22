import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { logger } from "../lib/logger.js";

const matchmakingRouter: Router = Router();

matchmakingRouter.post("/cancel", authentication, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId as string;
        await prisma.matchmakingQueue.updateMany({
            where: { userId, status: "WAITING" },
            data: { status: "CANCELLED" },
        });
        logger.info(`Matchmaking cancelled via HTTP fallback for user ${userId}`);
        res.json({ status: "success", message: "Matchmaking cancelled" });
    } catch (error) {
        logger.error(`Matchmaking cancel error: ${String(error)}`);
        res.status(500).json({ status: "error", message: "Failed to cancel matchmaking" });
    }
});

matchmakingRouter.post("/decline", authentication, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId as string;
        const { matchId } = req.body;
        if (!matchId) {
            return res.status(400).json({ status: "error", message: "matchId is required" });
        }
        const eventId = matchId.replace("room-", "");
        await prisma.event.update({
            where: { id: eventId },
            data: { status: "CANCELLED" },
        });
        logger.info(`Match declined via HTTP fallback for user ${userId}, match ${matchId}`);
        res.json({ status: "success", message: "Match declined" });
    } catch (error) {
        logger.error(`Match decline error: ${String(error)}`);
        res.status(500).json({ status: "error", message: "Failed to decline match" });
    }
});

export { matchmakingRouter };
