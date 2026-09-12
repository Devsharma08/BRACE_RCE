import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { retentionCutoff } from "../types/notifications.js";

const clampTake = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 20;
  return Math.min(50, Math.max(1, Math.floor(n)));
};

class Notifications {
  listNotifications = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId as string;
      const { unreadOnly, type, cursor, take } = req.query as Record<string, string>;
      const limit = clampTake(take);
      const cutoff = retentionCutoff();
      const items = await (prisma.notification as never as {
        findMany: (a: never) => Promise<never[]>;
      }).findMany({
        where: {
          userId,
          createdAt: { gte: cutoff },
          ...(unreadOnly === "true" ? { status: "UNREAD" } : {}),
          ...(type ? { type: type as never } : {}),
          ...(cursor ? { createdAt: { gte: cutoff, lt: new Date(cursor) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      } as never);
      return res.status(200).json({ status: "success", notifications: items, retentionDays: 3 });
    } catch (e) {
      console.error("listNotifications error:", e);
      return res.status(500).json({ status: "error", message: "Failed to fetch notifications" });
    }
  };

  getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId as string;
      const count = await (prisma.notification as never as {
        count: (a: never) => Promise<number>;
      }).count({
        where: { userId, status: "UNREAD", createdAt: { gte: retentionCutoff() } },
      } as never);
      return res.status(200).json({ status: "success", unreadCount: count });
    } catch (e) {
      console.error("unreadCount error:", e);
      return res.status(500).json({ status: "error", message: "Failed to fetch unread count" });
    }
  };

  markRead = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId as string;
      const { id } = req.params as { id: string };
      const updated = await (prisma.notification as never as {
        updateMany: (a: never) => Promise<unknown>;
      }).updateMany({ where: { id, userId }, data: { status: "READ", readAt: new Date() } } as never);
      return res.status(200).json({ status: "success", updated });
    } catch {
      return res.status(500).json({ status: "error", message: "Failed to mark read" });
    }
  };

  markAllRead = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId as string;
      const updated = await (prisma.notification as never as {
        updateMany: (a: never) => Promise<unknown>;
      }).updateMany({ where: { userId, status: "UNREAD" }, data: { status: "READ", readAt: new Date() } } as never);
      return res.status(200).json({ status: "success", updated });
    } catch {
      return res.status(500).json({ status: "error", message: "Failed to mark all read" });
    }
  };

  deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId as string;
      const { id } = req.params as { id: string };
      await (prisma.notification as never as {
        deleteMany: (a: never) => Promise<unknown>;
      }).deleteMany({ where: { id, userId } } as never);
      return res.status(200).json({ status: "success" });
    } catch {
      return res.status(500).json({ status: "error", message: "Failed to delete notification" });
    }
  };
}

export const notificationsController = new Notifications();
