import type { AuthRequest } from "../middleware/authentication";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { Level } from "../generated/prisma/client.js";
import { WrapperGenerator } from "../utils/wrapperGenerator.js";
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
                code_snippets,  // Array of { language, code, wrapperCode }
                signature       // Optional signature for auto-generation
            } = req.body;

            const generatedSnippets = signature ? WrapperGenerator.generateAll(signature) : null;
            const finalSnippets = code_snippets || generatedSnippets || [];

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
                        create: finalSnippets.map((cs: any) => ({
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
    // SEED SYSTEM PROBLEMS (Admin / System Integration)
    async seedSystemProblems(req: AuthRequest, res: Response) {
        try {
            // Ideally, add an admin check here
            // if (req.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
            
            const problems = req.body.problems; // Array of RawSeedProblem objects
            if (!Array.isArray(problems)) {
                return res.status(400).json({ message: "Expected 'problems' array" });
            }

            const results = [];
            for (const p of problems) {
                const { test_cases, code_snippets, ...problemData } = p;
                
                // Format difficulty if passed as lowercase
                const difficulty = problemData.difficulty_level?.toUpperCase() || Level.MEDIUM;

                const problem = await prisma.problem.upsert({
                    where: { 
                        // Fallback to name if problem_number isn't provided or unique enough
                        problem_number: problemData.problem_number || -1,
                    },
                    update: {
                        name: problemData.name,
                        github_oid: problemData.github_oid,
                        problem_definition: problemData.problem_definition,
                        problem_hints: problemData.problem_hints || [],
                        difficulty_level: difficulty,
                        isCustom: false, // Ensure seeded problems are System level
                        creatorId: null
                    },
                    create: {
                        name: problemData.name,
                        problem_number: problemData.problem_number,
                        github_oid: problemData.github_oid,
                        problem_definition: problemData.problem_definition,
                        problem_hints: problemData.problem_hints || [],
                        difficulty_level: difficulty,
                        isCustom: false,
                        creatorId: null
                    },
                });

                // Generate generic wrappers for all languages if signature is provided
                const generatedSnippets = problemData.signature 
                    ? WrapperGenerator.generateAll(problemData.signature) 
                    : null;
                
                const finalSnippets = code_snippets || generatedSnippets;

                // Overwrite snippets and test cases completely to ensure sync
                if (test_cases) {
                    await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
                    await prisma.testCase.createMany({
                        data: test_cases.map((tc: any) => ({ ...tc, problemId: problem.id })),
                    });
                }
                
                if (finalSnippets) {
                    await prisma.codeSnippet.deleteMany({ where: { problemId: problem.id } });
                    await prisma.codeSnippet.createMany({
                        data: finalSnippets.map((cs: any) => ({ ...cs, problemId: problem.id })),
                    });
                }

                results.push({ id: problem.id, name: problem.name });
            }

            return res.json({ status: "success", message: `Seeded ${results.length} system problems!`, seeded: results });
        } catch (error) {
            console.error("Seed system problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
}

export const problemController = new Problems();
