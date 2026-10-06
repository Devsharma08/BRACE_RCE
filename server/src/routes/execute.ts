import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { executeCode } from "../services/codeExecution.js";
import { validate, executeCodeSchema } from "../middleware/validation.js";
import { executionGuard } from "../middleware/executionGuard.js";

// Reject oversized submissions before they reach the execution service.
const MAX_CODE_BYTES = 100 * 1024; // 100 KB

// LIMIT EXECUTION REQUEST TO 15 PER MINUTE PER IP
// EXECUTE_RATE_MAX raises the ceiling for test suites / staged load checks
// without editing code; production default stays at 15.
const configuredRateMax = Number(process.env.EXECUTE_RATE_MAX);
const EXECUTE_RATE_MAX = Number.isFinite(configuredRateMax) && configuredRateMax > 0 ? Math.floor(configuredRateMax) : 15;
const executionRateLimiter =  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: EXECUTE_RATE_MAX, // limit each IP to EXECUTE_RATE_MAX requests per windowMs
    message:{ status:"error",message:"Too many requests from this IP, please try again after a minute"},
});

export const executeRouter: ExpressRouter = Router();

// Middleware guard: reject code payloads that exceed the size limit early.
const codeSizeGuard = (req: any, res: any, next: any) => {
    const code = req.body?.code;
    if (typeof code === "string" && Buffer.byteLength(code, "utf-8") > MAX_CODE_BYTES) {
        return res.status(413).json({
            status: "error",
            message: "Code exceeds the size limit (100 KB)."
        });
    }
    next();
};

executeRouter.post("/", executionRateLimiter, validate(executeCodeSchema), executionGuard(), codeSizeGuard, executeCode);
