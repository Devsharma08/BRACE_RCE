import type { Response } from "express";
import type { AuthRequest } from "../middleware/authentication.js";
import { prisma } from "../lib/prisma.js";

// Prisma client does not expose the Feedback model yet (same caveat as
// controllers/admin.ts): run `npx prisma generate` after schema changes so
// the delegate exists at runtime.
const db = prisma as any;

const MAX_CONTENT_LENGTH = 5000;

export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({ status: "error", message: "Feedback content is required" });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        status: "error",
        message: `Feedback is too long (max ${MAX_CONTENT_LENGTH} characters)`,
      });
    }

    const feedback = await db.feedback.create({ data: { userId, content } });
    return res.status(201).json({ status: "success", message: "Feedback received", feedback });
  } catch (err) {
    console.error("Error in submitFeedback:", err);
    return res.status(500).json({ status: "error", message: "Failed to submit feedback" });
  }
};
