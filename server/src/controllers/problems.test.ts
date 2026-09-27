import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { internalCache } from "../lib/cache.js";
import jwt from "jsonwebtoken";

// Mock the withDisplayProblemName function to avoid filesystem access in tests
jest.mock("../utils/problemName.js", () => ({
  withDisplayProblemName: jest.fn((problem: any) => problem),
  displayProblemName: jest.fn((name: string) => name),
}));

// Assign mocks directly to Prisma delegate methods
(prisma.problem.findMany as any) = jest.fn();
(prisma.problem.create as any) = jest.fn();
(prisma.problem.upsert as any) = jest.fn();
(prisma.problem.count as any) = jest.fn();
(prisma.testCase.deleteMany as any) = jest.fn();
(prisma.testCase.createMany as any) = jest.fn();
(prisma.codeSnippet.deleteMany as any) = jest.fn();
(prisma.codeSnippet.createMany as any) = jest.fn();
(prisma.testCase.deleteMany as any) = jest.fn();
(prisma.testCase.createMany as any) = jest.fn();
(prisma.codeSnippet.deleteMany as any) = jest.fn();
(prisma.codeSnippet.createMany as any) = jest.fn();

describe("Problems Controller Routes (/api/v1/problems)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: "user-1" }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
    // Problem payloads are cached per user in the shared node-cache, which
    // persists across tests — flush it so every test exercises the DB path it
    // just mocked instead of a previous test's cached response.
    internalCache.flushAll();
  });

  describe("GET /api/v1/problems/system", () => {
    test("should fetch all non-custom system problems", async () => {
      (prisma.problem.findMany as jest.Mock<any>).mockResolvedValue([
        { 
          id: "prob-1", 
          name: "LeetCode-01E", 
          problem_number: 1, 
          isCustom: false,
          github_oid: "two-sum",
          problem_definition: "Test problem",
          problem_hints: [],
          difficulty_level: "EASY",
          timeLimitMs: 60000,
          createdAt: new Date(),
          code_snippets: [],
          test_cases: [],
          userProgress: [{
            isSolved: false,
            solvedAt: null,
            attempts: 0,
            lastCode: null,
            lastLanguage: "javascript",
            submissionTimes: []
          }]
        },
      ]);
      (prisma.problem.count as jest.Mock<any>).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/problems/system")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.problems).toHaveLength(1);
      expect(res.body.problems[0].name).toBe("Two Sum");
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe("GET /api/v1/problems/custom", () => {
    test("should fetch user's custom created problems", async () => {
      (prisma.problem.findMany as jest.Mock<any>).mockResolvedValue([
        { 
          id: "custom-1", 
          name: "My Problem", 
          isCustom: true, 
          creatorId: "user-1",
          problem_number: 1,
          github_oid: "my-problem",
          problem_definition: "Test problem",
          problem_hints: [],
          difficulty_level: "EASY",
          timeLimitMs: 60000,
          test_cases: [],
          code_snippets: [],
          createdAt: new Date(),
          userProgress: []
        },
      ]);
      (prisma.problem.count as jest.Mock<any>).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/problems/custom")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.problems[0].name).toBe("My Problem");
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe("POST /api/v1/problems/create", () => {
    test("should create custom problem with test cases and snippets", async () => {
      (prisma.problem.create as jest.Mock<any>).mockResolvedValue({
        id: "new-prob-id",
        name: "Reverse String",
        difficulty_level: "EASY",
        isCustom: true,
      });

      const res = await request(app)
        .post("/api/v1/problems/create")
        .set("Cookie", cookieHeader)
        .send({
          name: "Reverse String",
          problem_definition: "Reverse a string in place",
          difficulty_level: "EASY",
          test_cases: [{ input: '"hello"', expectedOutput: '"olleh"', is_public: true }],
          code_snippets: [{ language: "javascript", code: "function reverseString(s) {}" }],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe("Custom problem created!");
    });
  });

  describe("POST /api/v1/problems/seed", () => {
    test("should seed system problems array", async () => {
      (prisma.problem.upsert as jest.Mock<any>).mockResolvedValue({
        id: "seed-1",
        name: "Seeded Problem",
      });
      (prisma.testCase.deleteMany as jest.Mock<any>).mockResolvedValue({});
      (prisma.testCase.createMany as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/problems/seed")
        .set("Cookie", cookieHeader)
        .send({
          problems: [
            {
              problem_number: 1,
              name: "Seeded Problem",
              problem_definition: "Test problem",
              difficulty_level: "EASY",
              test_cases: [{ input: "1", expectedOutput: "1" }],
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.seeded).toHaveLength(1);
    });

    test("should return 400 if problems array is not provided", async () => {
      const res = await request(app)
        .post("/api/v1/problems/seed")
        .set("Cookie", cookieHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });
  });
});