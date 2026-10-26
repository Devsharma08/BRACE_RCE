import type { AuthRequest } from "../middleware/authentication.js";
import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import { Level } from "../generated/prisma/client.js";
import { WrapperGenerator } from "../utils/wrapperGenerator.js";
import { deleteCachedByPrefix, getCached, setCached } from "../lib/cache.js";
import { withDisplayProblemName } from "../utils/problemName.js";

// Problem payloads embed the caller's OWN progress (isSolved / attempts /
// lastCode), so the cache namespace is per user — a shared key would leak one
// user's progress to another. Definitions are static, so a 10-minute TTL is
// safe and the namespace is dropped explicitly on any progress write.
const PROBLEMS_CACHE_PREFIX = "problems:";
const PROBLEMS_CACHE_TTL_SECONDS = 2 * 60; // 2 minutes — fresh problem data for the terminal

/**
 * Guests all share one cache namespace, because an anonymous response carries
 * no per-user data to distinguish them by. Without this an `undefined` userId
 * would be interpolated into the key as the literal string "undefined" — which
 * works today, but reads like a bug and is exactly what a later "cleanup" turns
 * into a shared-cache leak.
 */
const GUEST_CACHE_NAMESPACE = "guest";
const cacheNamespace = (userId?: string): string => userId ?? GUEST_CACHE_NAMESPACE;

const systemKey = (userId: string | undefined, page: number, limit: number) => `${PROBLEMS_CACHE_PREFIX}${cacheNamespace(userId)}:system:${page}:${limit}`;
const customKey = (userId: string | undefined, page: number, limit: number) => `${PROBLEMS_CACHE_PREFIX}${cacheNamespace(userId)}:custom:${page}:${limit}`;
const detailKey = (userId: string | undefined, id: string) => `${PROBLEMS_CACHE_PREFIX}${cacheNamespace(userId)}:detail:${id}`;

/**
 * The per-user columns merged into a problem payload. Guests never receive
 * them, and the join is skipped rather than run with an undefined key:
 * Prisma reads `where: { userId: undefined }` as "no filter on this field", so
 * the query would return EVERY user's progress row for the problem — solved
 * flags, attempt counts and saved drafts included.
 */
const USER_PROGRESS_SELECT = {
    isSolved: true,
    solvedAt: true,
    attempts: true,
    lastCode: true,
    lastLanguage: true,
    submissionTimes: true,
} as const;

/**
 * Fields shipped in list responses (`/problems/system`, `/problems/custom`).
 *
 * List consumers only need metadata for display and filtering — the Terminal
 * sidebar, the Problems index, the Dashboard, CreateRoom, ChallengeModal, and
 * DataStructureDetail all render name / difficulty / solved status / attempts.
 *
 * Test cases, code snippets, and the full problem statement are NOT selected here.
 * They live only in the detail response (`GET /problems/:id`), which the Terminal
 * fetches on demand when a user opens a specific problem.
 */
const SUMMARY_SELECT = {
    id: true,
    name: true,
    problem_number: true,
    github_oid: true,
    difficulty_level: true,
} as const;

/**
 * Ship every stored test case to the client, WITH its real input and expected
 * output — including the ones flagged `is_public: false`.
 *
 * This used to blank the non-public pairs so the answers would not sit in the
 * page source. The product decision is the opposite: the terminal's Output
 * window is where a learner is meant to read every case, so all 15 render in
 * full. `is_public` is still carried through because the panel labels the first
 * three as samples and the rest as withheld-in-spirit, and because the case
 * count on the problem cards is derived from it.
 *
 * The execution service already knows every expected output (it compares
 * submissions against them server-side), so grading is unaffected; this only
 * prevents the client from ever seeing the hidden answers at all.
 *
 * Called only from the detail endpoint (`GET /problems/:id`) — the list
 * endpoints no longer select test_cases at all.
 */
function shipTestCases<
    T extends { id: string; input: string; expectedOutput: string | null; is_public: boolean },
>(cases: T[]): T[] {
    return cases ?? [];
}

/** Drop every cached problem payload for one user (call after a progress write). */
export async function invalidateUserProblemsCache(userId: string): Promise<void> {
    await deleteCachedByPrefix(`${PROBLEMS_CACHE_PREFIX}${userId}:`);
}

/** Drop every user's cached problem payloads (the problem catalog changed). */
export async function invalidateAllProblemsCache(): Promise<void> {
    await deleteCachedByPrefix(PROBLEMS_CACHE_PREFIX);
}

class Problems {
    // GET ALL SYSTEM PROBLEMS (enriched with solved status for the current user) - WITH PAGINATION
    async getSystemProblems(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string | undefined;
            const validatedQuery = (req as any).validatedQuery || req.query;
            const page = Math.max(1, parseInt(String(validatedQuery.page ?? "1"), 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(String(validatedQuery.limit ?? "25"), 10) || 25));
            const cacheKey = systemKey(userId, page, limit);

            const cached = await getCached<any[]>(cacheKey);
            // An empty array is a truthy cache hit — but an empty catalog was
            // almost certainly captured mid-reseed (the seeder wipes the table
            // first). Serving it would show "NO PROBLEMS FOUND" for the whole
            // TTL, so only trust non-empty snapshots and re-query otherwise.
            if (cached && cached.length > 0) {
                return res.json({
                    status: "success",
                    problems: cached.map((problem) => withDisplayProblemName(problem)),
                    cached: true,
                    pagination: { page, limit },
                });
            }

            const skip = (page - 1) * limit;

            const [problems, total] = await Promise.all([
                prisma.problem.findMany({
                    where: { isCustom: false },
                    orderBy: { problem_number: 'asc' },
                    skip,
                    take: limit,
                    select: {
                        ...SUMMARY_SELECT,
                        userProgress: userId
                            ? { where: { userId }, select: USER_PROGRESS_SELECT }
                            : // Guest: skip the join entirely. An undefined key
                              // would match every user's row instead of none.
                              false,
                    }
                }),
                prisma.problem.count({ where: { isCustom: false } })
            ]);

            // Flatten userProgress into top-level fields
            const enriched = problems.map((p) => {
                const progress = (p as any).userProgress?.[0] ?? null;
                const { userProgress, ...rest } = p as any;
                return {
                    ...withDisplayProblemName(rest),
                    isSolved: progress?.isSolved ?? false,
                    solvedAt: progress?.solvedAt ?? null,
                    attempts: progress?.attempts ?? 0,
                    lastCode: progress?.lastCode ?? null,
                    lastLanguage: progress?.lastLanguage ?? "javascript",
                    submissionTimes: progress?.submissionTimes ?? [],
                };
            });

            // Never cache an empty catalog (see the read-side note above).
            if (enriched.length > 0) {
                await setCached(cacheKey, enriched, PROBLEMS_CACHE_TTL_SECONDS);
            }

            return res.json({ 
                status: "success", 
                problems: enriched, 
                cached: false,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error) {
            console.error("Fetch system problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }

    // GET SINGLE PROBLEM BY ID (full detail with snippets, test cases, user progress)
    async getProblemById(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string | undefined;
            const id = req.params.id as string;
            const cacheKey = detailKey(userId, id);

            const cached = await getCached<any>(cacheKey);
            if (cached) {
                return res.json({ status: "success", problem: withDisplayProblemName(cached), cached: true });
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
                        orderBy: { id: "asc" },
                        select: { id: true, input: true, expectedOutput: true, is_public: true }
                    },
                    userProgress: userId
                        ? { where: { userId }, select: USER_PROGRESS_SELECT }
                        : // Guest: skip the join entirely. An undefined key
                          // would match every user's row instead of none.
                          false,
                }
            });

            if (!problem) {
                return res.status(404).json({ message: "Problem not found" });
            }

            const progress = (problem as any).userProgress?.[0] ?? null;
            const { userProgress, ...rest } = problem as any;

            const payload = {
                ...withDisplayProblemName(rest),
                test_cases: shipTestCases((rest as any).test_cases ?? []),
                isSolved: progress?.isSolved ?? false,
                solvedAt: progress?.solvedAt ?? null,
                attempts: progress?.attempts ?? 0,
                lastCode: progress?.lastCode ?? null,
                lastLanguage: progress?.lastLanguage ?? "javascript",
                submissionTimes: progress?.submissionTimes ?? [],
            };

            await setCached(cacheKey, payload, PROBLEMS_CACHE_TTL_SECONDS);

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

    // GET USER'S CUSTOM PROBLEMS - WITH PAGINATION
    async getMyCustomProblems(req: AuthRequest, res: Response) {
        try {
            const userId = req.userId as string;
            const validatedQuery = (req as any).validatedQuery || req.query;
            const page = Math.max(1, parseInt(String(validatedQuery.page ?? "1"), 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(String(validatedQuery.limit ?? "25"), 10) || 25));
            const cacheKey = customKey(userId, page, limit);

            const cached = await getCached<any[]>(cacheKey);
            if (cached) {
                return res.json({
                    status: "success",
                    problems: cached.map((problem) => withDisplayProblemName(problem)),
                    cached: true,
                    pagination: { page, limit },
                });
            }

            const skip = (page - 1) * limit;

            const [problems, total] = await Promise.all([
                prisma.problem.findMany({
                    where: { creatorId: userId, isCustom: true },
                    select: {
                        ...SUMMARY_SELECT,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.problem.count({ where: { creatorId: userId, isCustom: true } })
            ]);

            const displayProblems = problems.map((problem) => withDisplayProblemName(problem));
            await setCached(cacheKey, displayProblems, PROBLEMS_CACHE_TTL_SECONDS);

            return res.json({ 
                status: "success", 
                problems: displayProblems, 
                cached: false,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
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
            await invalidateUserProblemsCache(userId);

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
            await invalidateAllProblemsCache();

            return res.json({ status: "success", message: `Seeded ${results.length} system problems!`, seeded: results });
        } catch (error) {
            console.error("Seed system problems error:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
}

export const problemController = new Problems();
