import { Router } from "express";
const profileRouter: Router = Router();
import { profileController } from "../controllers/profile";
import { authentication } from "../middleware/authentication";

profileRouter.use(authentication);

// GET PROFILE DETAILS
profileRouter.get("/" ,profileController.getProfileDetails);

// GET PROFILE STATISTICS
profileRouter.get("/stats", profileController.getProfileStatistics);

// POST UPDATE PROFILE
profileRouter.put("/" , profileController.updateProfile);

// DELETE PROFILE
profileRouter.delete("/" , profileController.deleteProfile);


export default profileRouter;