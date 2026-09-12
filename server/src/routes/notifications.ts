import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { notificationsController } from "../controllers/notifications.js";

export const notificationsRouter: Router = Router();

notificationsRouter.use(authentication);

notificationsRouter.get("/", notificationsController.listNotifications);
notificationsRouter.get("/unread-count", notificationsController.getUnreadCount);
notificationsRouter.patch("/read-all", notificationsController.markAllRead);
notificationsRouter.patch("/:id/read", notificationsController.markRead);
notificationsRouter.delete("/:id", notificationsController.deleteNotification);
