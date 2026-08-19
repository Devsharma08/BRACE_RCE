import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { executeCode } from "../services/codeExecution.js";

// LIMIT EXECUTION REQUEST TO 15 PER MINUTE PER IP
const executionRateLimiter =  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // limit each IP to 15 requests per windowMs
    message:{ status:"error",message:"Too many requests from this IP, please try again after a minute"},
});

export const executeRouter: ExpressRouter = Router();

executeRouter.post("/", executionRateLimiter,executeCode);
