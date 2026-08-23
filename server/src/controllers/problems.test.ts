import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

// Assign mocks directly to Prisma delegate methods
(prisma.problem.findMany as any) = jest.fn();
(prisma.problem.create as any) = jest.fn();
(prisma.problem.upsert as any) = jest.fn();
(prisma.testCase.deleteMany as any) = jest.fn();
(prisma.testCase.createMany as any) = jest.fn();
(prisma.codeSnippet.deleteMany as any) = jest.fn();
(prisma.codeSnippet.createMany as any) = jest.fn();

describe("Problems Controller Routes (/api/problems)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: "user-1" }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/problems/system", () => {
    test("should fetch all non-custom system problems", async () => {
      (prisma.problem.findMany as jest.Mock<any>).mockResolvedValue([
        { id: "prob-1", name: "Two Sum", isCustom: false },
      ]);

      const res = await request(app)
        .get("/api/problems/system")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.problems).toHaveLength(1);
    });
  });

  describe("GET /api/problems/custom", () => {
    test("should fetch user's custom created problems", async () => {
      (prisma.problem.findMany as jest.Mock<any>).mockResolvedValue([
        { id: "custom-1", name: "My Problem", isCustom: true, creatorId: "user-1" },
      ]);

      const res = await request(app)
        .get("/api/problems/custom")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.problems[0].name).toBe("My Problem");
    });
  });

  describe("POST /api/problems/create", () => {
    test("should create custom problem with test cases and snippets", async () => {
      (prisma.problem.create as jest.Mock<any>).mockResolvedValue({
        id: "new-prob-id",
        name: "Reverse String",
        difficulty_level: "EASY",
        isCustom: true,
      });

      const res = await request(app)
        .post("/api/problems/create")
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

  describe("POST /api/problems/seed", () => {
    test("should seed system problems array", async () => {
      (prisma.problem.upsert as jest.Mock<any>).mockResolvedValue({
        id: "seed-1",
        name: "Seeded Problem",
      });
      (prisma.testCase.deleteMany as jest.Mock<any>).mockResolvedValue({});
      (prisma.testCase.createMany as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/problems/seed")
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
        .post("/api/problems/seed")
        .set("Cookie", cookieHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Expected 'problems' array");
    });
  });
});
