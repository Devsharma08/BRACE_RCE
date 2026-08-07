import type { AuthRequest } from "../middleware/authentication";
import type { Response } from "express";
import { prisma } from "../Lib/prisma.js";
import { Level } from "../generated/prisma/client.js";

class Problems {
    // GET ALL SYSTEM PROBLEMS
    async getSystemProblems(req: AuthRequest, res: Response) {
        try {
            const problems = await prisma.problem.findMany({
                where: { isCustom: false },
                orderBy: { problem_number: 'asc' }
            });
            return res.json({ status: "success", problems });
        } catch (error) {
            console.error("Fetch system problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET USER'S CUSTOM PROBLEMS
    async getMyCustomProblems(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const problems = await prisma.problem.findMany({
                where: { creatorId: userId, isCustom: true },
                include: { test_cases: true, code_snippets: true },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ status: "success", problems });
        } catch (error) {
            console.error("Fetch custom problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // CREATE CUSTOM PROBLEM
    async createCustomProblem(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const { 
                name, 
                problem_definition, 
                problem_hints, 
                difficulty_level,
                test_cases,     // Array of { input, expectedOutput, is_public }
                code_snippets   // Array of { language, code, wrapperCode }
            } = req.body;

            // Using Prisma Nested Writes to create the Problem, Test Cases, and Snippets all at once
            const newProblem = await prisma.problem.create({
                data: {
                    name,
                    problem_definition,
                    problem_hints: problem_hints || [],
                    difficulty_level: difficulty_level || Level.MEDIUM,
                    isCustom: true,
                    creatorId: userId,
                    
                    test_cases: {
                        create: test_cases.map((tc: any) => ({
                            input: tc.input,
                            expectedOutput: tc.expectedOutput,
                            is_public: tc.is_public ?? true // False means it's a hidden edge case
                        }))
                    },

                    code_snippets: {
                        create: code_snippets.map((cs: any) => ({
                            language: cs.language,
                            code: cs.code,
                            wrapperCode: cs.wrapperCode
                        }))
                    }
                },
                include: { test_cases: true, code_snippets: true }
            });

            return res.json({ status: "success", message: "Custom problem created!", problem: newProblem });
        } catch (error) {
            console.error("Create custom problem error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
}

export const problemController = new Problems();
