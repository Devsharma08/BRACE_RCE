import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { problemController } from "../controllers/problems.js";

const problemsRouter = Router();

problemsRouter.use(authentication);

// Fetching Problems
problemsRouter.get("/system", problemController.getSystemProblems);
problemsRouter.get("/custom", problemController.getMyCustomProblems);

// Creating Problems
problemsRouter.post("/create", problemController.createCustomProblem);

export { problemsRouter };
