import { Router, type Router as ExpressRouter } from "express";
import { authentication } from "../middleware/authentication.js";
import { submitFeedback } from "../controllers/feedback.js";
import { validate, feedbackSchema } from "../middleware/validation.js";

const router: ExpressRouter = Router();

// Feedback rows are tied to a user (Feedback.userId is required), so
// submission requires an authenticated session.
router.use(authentication);
router.post("/", validate(feedbackSchema), submitFeedback);

export { router as feedbackRouter };
