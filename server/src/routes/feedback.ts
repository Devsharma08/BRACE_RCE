import { Router, type Router as ExpressRouter } from "express";
import { authentication } from "../middleware/authentication.js";
import { submitFeedback } from "../controllers/feedback.js";

const router: ExpressRouter = Router();

// Feedback rows are tied to a user (Feedback.userId is required), so
// submission requires an authenticated session.
router.use(authentication);
router.post("/", submitFeedback);

export { router as feedbackRouter };
