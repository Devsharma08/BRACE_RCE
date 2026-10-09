import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { roomController } from "../controllers/room.js";
import { validate, validateParams, createRoomSchema, cloneTemplateSchema, lockRoomSchema, toggleVisibilitySchema, expireBattleSchema, deleteEventSchema } from "../middleware/validation.js";

const roomsRouter: Router = Router();

roomsRouter.use(authentication);

roomsRouter.get("/my-events", roomController.getMyEvents);


// Get available rooms, templates and battle remaining time
roomsRouter.get("/time-left", roomController.getBattleTimeLeft);
roomsRouter.get("/lobby", roomController.getLobbyRooms);
roomsRouter.get("/templates", roomController.getTemplates);
roomsRouter.get("/live/:roomId", roomController.getLiveRoom);

// Create or clone
roomsRouter.post("/create", validate(createRoomSchema), roomController.createRoom);
roomsRouter.post("/clone", validate(cloneTemplateSchema), roomController.cloneTemplate);

// Locking and unlocking
// Room state management
roomsRouter.put("/lock", validate(lockRoomSchema), roomController.lockRoom);
roomsRouter.put("/unlock", validate(lockRoomSchema), roomController.unlockRoom);

// Event management (Delete / Toggle Visibility / Expire)
roomsRouter.delete("/:eventId", validateParams(deleteEventSchema), roomController.deleteEvent);
roomsRouter.put("/visibility", validate(toggleVisibilitySchema), roomController.toggleEventVisibility);
roomsRouter.post("/expire", validate(expireBattleSchema), roomController.expireBattle);


export { roomsRouter };
