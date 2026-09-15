import type { AuthRequest } from "../middleware/authentication";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { Level } from "../generated/prisma/client.js";
import { WrapperGenerator } from "../utils/wrapperGenerator.js";
import { deleteCachedByPrefix, getCached, setCached } from "../lib/cache.js";

// Problem payloads embed the caller's OWN progress (isSolved / attempts /
// lastCode), so the cache namespace is per user — a shared key would leak one
// user's progress to another. Definitions are static, so a 10-minute TTL is
// safe and the namespace is dropped explicitly on any progress write.
const PROBLEMS_CACHE_PREFIX = "problems:";
const PROBLEMS_CACHE_TTL_SECONDS = 10 * 60; // 10 minutes

const systemKey = (userId: string) => `${PROBLEMS_CACHE_PREFIX}${userId}:system`;
const customKey = (userId: string) => `${PROBLEMS_CACHE_PREFIX}${userId}:custom`;
const detailKey = (userId: string, id: string) => `${PROBLEMS_CACHE_PREFIX}${userId}:detail:${id}`;

/** Drop every cached problem payload for one user (call after a progress write). */
export function invalidateUserProblemsCache(userId: string): void {
    deleteCachedByPrefix(`${PROBLEMS_CACHE_PREFIX}${userId}:`);
}

/** Drop every user's cached problem payloads (the problem catalog changed). */
export function invalidateAllProblemsCache(): void {
    deleteCachedByPrefix(PROBLEMS_CACHE_PREFIX);
}

class Problems {
    // GET ALL SYSTEM PROBLEMS (enriched with solved status for the current user)
    async getSystemProblems(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const cacheKey = systemKey(userId);

            const cached = getCached<any[]>(cacheKey);
            if (cached) {
                return res.json({ status: "success", problems: cached, cached: true });
            }

            const problems = await prisma.problem.findMany({
                where: { isCustom: false },
                orderBy: { problem_number: 'asc' },
                select: {
                    id: true,
                    name: true,
                    problem_number: true,
                    github_oid: true,
                    problem_definition: true,
                    problem_hints: true,
                    difficulty_level: true,
                    timeLimitMs: true,
                    createdAt: true,
                    code_snippets: {
                        select: { language: true, code: true }
                    },
                    test_cases: {
                        where: { is_public: true },
                        select: { id: true, input: true, expectedOutput: true, is_public: true }
                    },
                    userProgress: {
                        where: { userId },
                        select: {
                            isSolved: true,
                            solvedAt: true,
                            attempts: true,
                            lastCode: true,
                            lastLanguage: true,
                            submissionTimes: true,
                        }
                    }
                }
            });

            // Flatten userProgress into top-level fields
            const enriched = problems.map((p) => {
                const progress = (p as any).userProgress?.[0] ?? null;
                const { userProgress, ...rest } = p as any;
                return {
                    ...rest,
                    isSolved: progress?.isSolved ?? false,
                    solvedAt: progress?.solvedAt ?? null,
                    attempts: progress?.attempts ?? 0,
                    lastCode: progress?.lastCode ?? null,
                    lastLanguage: progress?.lastLanguage ?? "javascript",
                    submissionTimes: progress?.submissionTimes ?? [],
                };
            });

            setCached(cacheKey, enriched, PROBLEMS_CACHE_TTL_SECONDS);

            return res.json({ status: "success", problems: enriched, cached: false });
        } catch (error) {
            console.error("Fetch system problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET SINGLE PROBLEM BY ID (full detail with snippets, test cases, user progress)
    async getProblemById(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const id = req.params.id as string;
            const cacheKey = detailKey(userId, id);

            const cached = getCached<any>(cacheKey);
            if (cached) {
                return res.json({ status: "success", problem: cached, cached: true });
            }

            const problem = await prisma.problem.findFirst({
                where: {
                    OR: [
                        { id },
                        { github_oid: id }
                    ],
                    isCustom: false
                },
                include: {
                    code_snippets: true,
                    test_cases: {
                        where: { is_public: true },
                        select: { id: true, input: true, expectedOutput: true, is_public: true }
                    },
                    userProgress: {
                        where: { userId },
                        select: {
                            isSolved: true,
                            solvedAt: true,
                            attempts: true,
                            lastCode: true,
                            lastLanguage: true,
                            submissionTimes: true,
                        }
                    }
                }
            });

            if (!problem) {
                return res.status(404).json({ message: "Problem not found" });
            }

            const progress = (problem as any).userProgress?.[0] ?? null;
            const { userProgress, ...rest } = problem as any;

            const payload = {
                ...rest,
                isSolved: progress?.isSolved ?? false,
                solvedAt: progress?.solvedAt ?? null,
                attempts: progress?.attempts ?? 0,
                lastCode: progress?.lastCode ?? null,
                lastLanguage: progress?.lastLanguage ?? "javascript",
                submissionTimes: progress?.submissionTimes ?? [],
            };

            setCached(cacheKey, payload, PROBLEMS_CACHE_TTL_SECONDS);

            return res.json({
                status: "success",
                problem: payload,
                cached: false,
            });
        } catch (error) {
            console.error("Fetch problem by ID error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET USER'S CUSTOM PROBLEMS
    async getMyCustomProblems(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const cacheKey = customKey(userId);

            const cached = getCached<any[]>(cacheKey);
            if (cached) {
                return res.json({ status: "success", problems: cached, cached: true });
            }

            const problems = await prisma.problem.findMany({
                where: { creatorId: userId, isCustom: true },
                include: { test_cases: true, code_snippets: true },
                orderBy: { createdAt: 'desc' }
            });

            setCached(cacheKey, problems, PROBLEMS_CACHE_TTL_SECONDS);

            return res.json({ status: "success", problems, cached: false });
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
                            is_public: tc.is_public ?? true
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

            // The creator's cached lists/detail no longer match the catalog.
            invalidateUserProblemsCache(userId);

            return res.json({ status: "success", message: "Custom problem created!", problem: newProblem });
        } catch (error) {
            console.error("Create custom problem error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // SEED SYSTEM PROBLEMS (Admin / System Integration)
    async seedSystemProblems(req: AuthRequest, res: Response) {
        try {
            const problems = req.body.problems;
            if (!Array.isArray(problems)) {
                return res.status(400).json({ message: "Expected 'problems' array" });
            }

            const results = [];
            for (const p of problems) {
                const { test_cases, code_snippets, ...problemData } = p;
                
                const difficulty = problemData.difficulty_level?.toUpperCase() || Level.MEDIUM;

                const problem = await prisma.problem.upsert({
                    where: { 
                        problem_number: problemData.problem_number || -1,
                    },
                    update: {
                        name: problemData.name,
                        github_oid: problemData.github_oid,
                        problem_definition: problemData.problem_definition,
                        problem_hints: problemData.problem_hints || [],
                        difficulty_level: difficulty,
                        isCustom: false,
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

                const generatedSnippets = problemData.signature 
                    ? WrapperGenerator.generateAll(problemData.signature) 
                    : null;
                
                const finalSnippets = code_snippets || generatedSnippets;

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

            // System problems changed for every user.
            invalidateAllProblemsCache();

            return res.json({ status: "success", message: `Seeded ${results.length} system problems!`, seeded: results });
        } catch (error) {
            console.error("Seed system problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
}

export const problemController = new Problems();
