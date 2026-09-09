import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

(prisma.user.findMany as any) = jest.fn();
(prisma.user.findUnique as any) = jest.fn();

describe("Roadmap endpoints (/api/roadmap + /api/leaderboard)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: "user-1" }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/roadmap/generate-tests returns edge + random cases", async () => {
    const res = await request(app)
      .post("/api/roadmap/generate-tests")
      .set("Cookie", cookieHeader)
      .send({
        signature: { funcName: "twoSum", returnType: "int[]", args: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }] },
        count: 6,
        seed: 7,
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.testCases).toHaveLength(6);
    expect(res.body.testCases[0].is_public).toBe(true);
  });

  test("POST /api/roadmap/generate-tests rejects invalid signature", async () => {
    const res = await request(app)
      .post("/api/roadmap/generate-tests")
      .set("Cookie", cookieHeader)
      .send({ signature: { funcName: "", args: [] } });
    expect(res.status).toBe(400);
  });

  test("POST /api/roadmap/generate-wrappers returns 5 snippets", async () => {
    const res = await request(app)
      .post("/api/roadmap/generate-wrappers")
      .set("Cookie", cookieHeader)
      .send({ signature: { funcName: "solve", returnType: "int", args: [{ name: "n", type: "int" }] } });
    expect(res.status).toBe(200);
    expect(res.body.snippets).toHaveLength(5);
  });

  test("POST /api/roadmap/plagiarism-check flags copy-paste", async () => {
    const res = await request(app)
      .post("/api/roadmap/plagiarism-check")
      .set("Cookie", cookieHeader)
      .send({
        codeA: "function twoSum(nums, target) { for (let i = 0; i < nums.length; i++) {} }",
        codeB: "function solve(arr, goal) { for (let k = 0; k < arr.length; k++) {} }",
      });
    expect(res.status).toBe(200);
    expect(res.body.flagged).toBe(true);
  });

  test("POST /api/roadmap/focus-report evaluates telemetry", async () => {
    const res = await request(app)
      .post("/api/roadmap/focus-report")
      .set("Cookie", cookieHeader)
      .send({ events: [{ type: "blur", atMs: 2000 }, { type: "focus", atMs: 3000 }], startMs: 1000, endMs: 61000 });
    expect(res.status).toBe(200);
    expect(res.body.flagged).toBe(false);
  });

  test("POST /api/roadmap/rating-preview computes tier", async () => {
    const res = await request(app)
      .post("/api/roadmap/rating-preview")
      .set("Cookie", cookieHeader)
      .send({ history: [{ status: "WON" }, { status: "WON" }] });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBeGreaterThan(1000);
    expect(typeof res.body.tier).toBe("string");
  });

  test("GET /api/leaderboard ranks users by derived rating", async () => {
    (prisma.user.findMany as jest.Mock<any>).mockResolvedValue([
      { id: "u1", username: "alice", avatarUrl: null, performances: [{ status: "WON", timeTakenMs: 1000 }] },
      { id: "u2", username: "bob", avatarUrl: null, performances: [{ status: "LOST", timeTakenMs: 1000 }] },
    ]);
    const res = await request(app).get("/api/leaderboard").set("Cookie", cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.leaderboard[0].username).toBe("alice");
    expect(res.body.leaderboard[0].rank).toBe(1);
  });

  test("GET /api/leaderboard/me returns current user rating", async () => {
    (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
      id: "user-1",
      username: "me",
      performances: [{ status: "WON", timeTakenMs: 1000 }],
    });
    const res = await request(app).get("/api/leaderboard/me").set("Cookie", cookieHeader);
    expect(res.status).toBe(200);
    expect(res.body.rating.rating).toBeGreaterThan(1000);
  });
});
