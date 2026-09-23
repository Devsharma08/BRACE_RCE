import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { learningItemsController } from "../controllers/learning-items.js";

const learningItemsRouter: Router = Router();

learningItemsRouter.use(authentication);

// List / search / filter learning items
learningItemsRouter.get("/", learningItemsController.listLearningItems);

// Get one learning item (with progress for the current user)
learningItemsRouter.get("/:id", learningItemsController.getLearningItemById);

// Create a learning item
learningItemsRouter.post("/", learningItemsController.createLearningItem);

// Update a learning item
learningItemsRouter.put("/:id", learningItemsController.updateLearningItem);

// Delete a learning item
learningItemsRouter.delete("/:id", learningItemsController.deleteLearningItem);

// User progress: upsert progress status for a learning item
learningItemsRouter.post("/:id/progress", learningItemsController.upsertUserProgress);

export { learningItemsRouter };
