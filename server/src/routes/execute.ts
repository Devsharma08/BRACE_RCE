import { Router, type Router as ExpressRouter } from "express";
import { executeCode } from "../services/codeExecution.js";

export const executeRouter: ExpressRouter = Router();

executeRouter.post("/", executeCode);
