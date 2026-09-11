import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { executeCode } from "../services/codeExecution.js";

// Reject oversized submissions before they reach the execution service.
const MAX_CODE_BYTES = 100 * 1024; // 100 KB

// LIMIT EXECUTION REQUEST TO 15 PER MINUTE PER IP
const executionRateLimiter =  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // limit each IP to 15 requests per windowMs
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

executeRouter.post("/", executionRateLimiter, codeSizeGuard, executeCode);
