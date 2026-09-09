import { Router } from "express";
import { authentication } from "../middleware/authentication.js";
import { leaderboardController } from "../controllers/leaderboard.js";

const leaderboardRouter: Router = Router();

leaderboardRouter.use(authentication);

leaderboardRouter.get("/", leaderboardController.getGlobalLeaderboard);
leaderboardRouter.get("/me", leaderboardController.getMyRating);

export default leaderboardRouter;
