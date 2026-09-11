import { Router, type Router as ExpressRouter } from "express";
import { authentication } from "../middleware/authentication";
import {
  listUsers,
  updateUser,
  deleteUser,
  listFeedback,
  resolveFeedback,
  listReports,
  actOnReport,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getSettings,
  updateSetting,
} from "../controllers/admin.js";

const router: ExpressRouter = Router();

// All admin routes require authentication + ADMIN role
router.use(authentication);

// ── User Management ──
router.get("/users", listUsers);
router.get("/users/online", listUsers);          // alias — online via socket presence
router.patch("/users/:userId", updateUser);
router.delete("/users/:userId", deleteUser);

// ── Feedback ──
router.get("/feedback", listFeedback);
router.patch("/feedback/:id", resolveFeedback);

// ── Question Reports ──
router.get("/reports", listReports);
router.patch("/reports/:reportId", actOnReport);

// ── Question Management ──
router.get("/questions", listQuestions);
router.post("/questions", createQuestion);
router.patch("/questions/:questionId", updateQuestion);
router.delete("/questions/:questionId", deleteQuestion);

// ── Settings ──
router.get("/settings", getSettings);
router.patch("/settings/:key", updateSetting);

export { router as adminRouter };