import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

// Assign mocks directly to Prisma delegate methods
(prisma.user.findUnique as any) = jest.fn();
(prisma.user.update as any) = jest.fn();
(prisma.user.delete as any) = jest.fn();
(prisma.userPersonalPerformance.findMany as any) = jest.fn();

describe("Profile Calculations & Endpoints (/api/profile)", () => {
  const calculateRating = (wins: number, losses: number): number => {
    return Math.max(1000, 1000 + wins * 25 - losses * 10);
  };

  const calculateWinRate = (wins: number, totalMatches: number): number => {
    if (totalMatches === 0) return 0;
    return Math.round((wins / totalMatches) * 100);
  };

  describe("Unit Logic", () => {
    test("should calculate dynamic user rating accurately", () => {
      expect(calculateRating(0, 0)).toBe(1000);
      expect(calculateRating(10, 2)).toBe(1230); // 1000 + 250 - 20
      expect(calculateRating(0, 50)).toBe(1000); // Floor rating at 1000
    });

    test("should calculate win rate percentage rounded to integer", () => {
      expect(calculateWinRate(0, 0)).toBe(0);
      expect(calculateWinRate(2, 3)).toBe(67);
      expect(calculateWinRate(10, 10)).toBe(100);
    });
  });

  describe("API Endpoints", () => {
    const app = createApp();
    const secret = process.env.JWT_SECRET || "development-only-secret-key";
    const userToken = jwt.sign({ userId: "user-123" }, secret);
    const cookieHeader = [`token=${userToken}`];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("GET /api/profile", () => {
      test("should return current user profile", async () => {
        (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
          id: "user-123",
          email: "test@example.com",
          username: "testuser",
          avatarUrl: "http://avatar.com",
        });

        const res = await request(app)
          .get("/api/profile")
          .set("Cookie", cookieHeader);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("success");
        expect(res.body.data.username).toBe("testuser");
      });

      test("should return 404 if user profile is missing", async () => {
        (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);

        const res = await request(app)
          .get("/api/profile")
          .set("Cookie", cookieHeader);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("User not found");
      });
    });

    describe("PUT /api/profile", () => {
      test("should update profile details", async () => {
        (prisma.user.update as jest.Mock<any>).mockResolvedValue({
          id: "user-123",
          username: "newname",
          bio: "Developer",
          avatarUrl: "http://newavatar.com",
        });

        const res = await request(app)
          .put("/api/profile")
          .set("Cookie", cookieHeader)
          .send({ username: "newname", bio: "Developer", avatarUrl: "http://newavatar.com" });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("success");
        expect(res.body.user.username).toBe("newname");
      });
    });

    describe("GET /api/profile/stats", () => {
      test("should calculate profile statistics and win rate from performance history", async () => {
        (prisma.userPersonalPerformance.findMany as jest.Mock<any>).mockResolvedValue([
          { status: "WON", timeTakenMs: 60000 },
          { status: "PASSED", timeTakenMs: 40000 },
          { status: "LOST", timeTakenMs: 50000 },
        ]);

        const res = await request(app)
          .get("/api/profile/stats")
          .set("Cookie", cookieHeader);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("success");
        expect(res.body.stats.totalMatches).toBe(3);
        expect(res.body.stats.wins).toBe(2);
        expect(res.body.stats.losses).toBe(1);
        expect(res.body.stats.winRate).toBe(67);
      });
    });
  });
});
