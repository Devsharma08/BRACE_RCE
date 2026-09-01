import { Router } from "express";
import { analyticsController } from "../controllers/analytics.js";
import { authentication } from "../middleware/authentication.js";

const analyticsRouter: Router = Router();

analyticsRouter.use(authentication);

// GET user analytics
analyticsRouter.get("/", analyticsController.getUserAnalytics);

export default analyticsRouter;
