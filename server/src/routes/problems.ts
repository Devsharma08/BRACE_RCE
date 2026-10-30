import { Router } from "express";
import { authentication, optionalAuthentication, isAdmin } from "../middleware/authentication.js";
import { problemController } from "../controllers/problems.js";
import { validate, validateQuery, seedSystemProblemsSchema, paginationSchema } from "../middleware/validation.js";

const problemsRouter: Router = Router();

/**
 * Problem catalog routes.
 *
 * Reads of system problems are PUBLIC. The practice terminal at /terminal is
 * reachable without an account, so the catalog it loads cannot sit behind a
 * session check — that is what produced a wall of 401s on an anonymous visit.
 * `optionalAuthentication` still runs here: it is free when there is no cookie,
 * and a signed-in visitor gets their solved status, attempts and saved draft
 * merged into the same response.
 *
 * Route AUTH is per-route, not a router-level `.use()`. Two reasons, both of
 * which the obvious refactor gets wrong:
 *
 *   1. A `.use(authentication)` in front of these routes would block the
 *      public reads it is meant to leave open.
 *   2. Registration ORDER decides matches. `/custom` is a single segment, so an
 *      earlier `GET /:id` would swallow it before the custom handler — silent
 *      wrong data instead of an error. Keeping `/system` and `/custom`
 *      registered ahead of `/:id` preserves the original behaviour.
 *
 * Everything that acts on behalf of a specific user stays behind the strict
 * `authentication` middleware.
 */

// ── Public reads ───────────────────────────────────────────────────────────
// Register the literal paths before /:id so they are not shadowed by it.
problemsRouter.get("/system", optionalAuthentication, validateQuery(paginationSchema), problemController.getSystemProblems);

// ── Public read by identifier (runs last: its `:id` matches one segment) ───
problemsRouter.get("/:id", optionalAuthentication, problemController.getProblemById);

// ── Admin writes ───────────────────────────────────────────────────────────
problemsRouter.post("/seed", authentication, isAdmin, validate(seedSystemProblemsSchema), problemController.seedSystemProblems);

export { problemsRouter };
