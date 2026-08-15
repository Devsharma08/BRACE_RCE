import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { roomController } from "../controllers/room.js";

const roomsRouter: Router = Router();

roomsRouter.use(authentication);

roomsRouter.get("/my-events", roomController.getMyEvents);


// Get available rooms, templates and battle remaining time
roomsRouter.get("/time-left", roomController.getBattleTimeLeft);
roomsRouter.get("/lobby", roomController.getLobbyRooms);
roomsRouter.get("/templates", roomController.getTemplates);
roomsRouter.get("/live/:roomId", roomController.getLiveRoom);

// Create or clone
roomsRouter.post("/create", roomController.createRoom);
roomsRouter.post("/clone", roomController.cloneTemplate);

// Locking and unlocking
// Room state management
roomsRouter.put("/lock", roomController.lockRoom);
roomsRouter.put("/unlock", roomController.unlockRoom);

// Event management (Delete / Toggle Visibility)
roomsRouter.delete("/:eventId", roomController.deleteEvent);
roomsRouter.put("/visibility", roomController.toggleEventVisibility);



export { roomsRouter };
