import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { roadmapController } from "../controllers/roadmap.js";

const roadmapRouter: Router = Router();

roadmapRouter.use(authentication);

roadmapRouter.post("/generate-tests", roadmapController.generateTests);
roadmapRouter.post("/generate-wrappers", roadmapController.generateWrappers);
roadmapRouter.post("/plagiarism-check", roadmapController.plagiarismCheck);
roadmapRouter.post("/focus-report", roadmapController.focusReport);
roadmapRouter.post("/rating-preview", roadmapController.ratingPreview);

export default roadmapRouter;
