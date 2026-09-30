import { Router } from "express";
import { profileController } from "../controllers/profile.js";
import { authentication } from "../middleware/authentication.js";
import { validate, updateProfileSchema } from "../middleware/validation.js";

const profileRouter: Router = Router();

profileRouter.use(authentication);

// GET PROFILE DETAILS
profileRouter.get("/", profileController.getProfileDetails);

// GET PROFILE STATISTICS
profileRouter.get("/stats", profileController.getProfileStatistics);

// GET SINGLE MATCH DETAIL (analysis page — must be declared before "/:id"-style
// routes are considered; profileRouter has no conflicting params otherwise)
profileRouter.get("/matches/:id", profileController.getMatchDetail);

// POST UPDATE PROFILE
profileRouter.put("/", validate(updateProfileSchema), profileController.updateProfile);

// DELETE PROFILE
profileRouter.delete("/", profileController.deleteProfile);


export default profileRouter;