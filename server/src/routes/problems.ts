import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { problemController } from "../controllers/problems.js";
import { validate, validateQuery, createCustomProblemSchema, seedSystemProblemsSchema, paginationSchema } from "../middleware/validation.js";

const problemsRouter: Router = Router();

problemsRouter.use(authentication);

// Fetching Problems
problemsRouter.get("/system", validateQuery(paginationSchema), problemController.getSystemProblems);
problemsRouter.get("/custom", validateQuery(paginationSchema), problemController.getMyCustomProblems);
problemsRouter.get("/:id", problemController.getProblemById);

// Creating Problems
problemsRouter.post("/create", validate(createCustomProblemSchema), problemController.createCustomProblem);
problemsRouter.post("/seed", validate(seedSystemProblemsSchema), problemController.seedSystemProblems);

export { problemsRouter };
