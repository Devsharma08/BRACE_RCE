import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { WrapperGenerator } from "../utils/wrapperGenerator.js";
import { generateTestCases, validateSignaturePayload } from "../utils/testCaseGenerator.js";
import { compareCodeStructure, evaluateFocusTelemetry } from "../utils/antiCheat.js";
import { getTierForRating, computeRatingFromHistory } from "../utils/elo.js";

/**
 * Roadmap feature endpoints (no schema changes):
 *  - POST /api/roadmap/generate-tests  (ROADMAP §2 — Automated Test Case Generator)
 *  - POST /api/roadmap/generate-wrappers (ROADMAP §2 — signature → 5-language snippets)
 *  - POST /api/roadmap/plagiarism-check  (ROADMAP §3 — AST structure comparison)
 *  - POST /api/roadmap/focus-report      (ROADMAP §3 — focus-loss telemetry)
 *  - GET  /api/roadmap/rating-preview    (ROADMAP §1 — rating + tier from history)
 */
class Roadmap {
  generateTests(req: AuthRequest, res: Response) {
    try {
      const { signature, count, seed } = req.body ?? {};
      const check = validateSignaturePayload(signature);
      if (!check.valid) return res.status(400).json({ status: "error", message: check.error });
      const cases = generateTestCases(signature, Number(count) || 6, Number(seed) || 42);
      return res.status(200).json({ status: "success", testCases: cases });
    } catch (e) {
      console.error("generate-tests error:", e);
      return res.status(500).json({ status: "error", message: "Failed to generate test cases" });
    }
  }

  generateWrappers(req: AuthRequest, res: Response) {
    try {
      const { signature } = req.body ?? {};
      const check = validateSignaturePayload(signature);
      if (!check.valid) return res.status(400).json({ status: "error", message: check.error });
      const snippets = WrapperGenerator.generateAll(signature);
      return res.status(200).json({ status: "success", snippets });
    } catch (e) {
      console.error("generate-wrappers error:", e);
      return res.status(500).json({ status: "error", message: "Failed to generate wrappers" });
    }
  }

  plagiarismCheck(req: AuthRequest, res: Response) {
    try {
      const { codeA, codeB, threshold } = req.body ?? {};
      if (typeof codeA !== "string" || typeof codeB !== "string") {
        return res.status(400).json({ status: "error", message: "codeA and codeB strings are required" });
      }
      const result = compareCodeStructure(codeA, codeB, typeof threshold === "number" ? threshold : 0.85);
      return res.status(200).json({ status: "success", ...result });
    } catch (e) {
      console.error("plagiarism-check error:", e);
      return res.status(500).json({ status: "error", message: "Failed to compare code" });
    }
  }

  focusReport(req: AuthRequest, res: Response) {
    try {
      const { events, startMs, endMs } = req.body ?? {};
      if (!Array.isArray(events) || typeof startMs !== "number" || typeof endMs !== "number") {
        return res.status(400).json({ status: "error", message: "events[], startMs and endMs are required" });
      }
      const result = evaluateFocusTelemetry(events, startMs, endMs);
      return res.status(200).json({ status: "success", ...result });
    } catch (e) {
      console.error("focus-report error:", e);
      return res.status(500).json({ status: "error", message: "Failed to evaluate telemetry" });
    }
  }

  ratingPreview(req: AuthRequest, res: Response) {
    try {
      const history = Array.isArray(req.body?.history) ? req.body.history : [];
      const rating = computeRatingFromHistory(history);
      return res.status(200).json({ status: "success", rating, tier: getTierForRating(rating) });
    } catch (e) {
      console.error("rating-preview error:", e);
      return res.status(500).json({ status: "error", message: "Failed to preview rating" });
    }
  }
}

export const roadmapController = new Roadmap();
