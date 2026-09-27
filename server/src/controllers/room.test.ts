import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

// Assign mocks directly to Prisma delegate methods
(prisma.event.findMany as any) = jest.fn();
(prisma.event.findUnique as any) = jest.fn();
(prisma.event.findFirst as any) = jest.fn();
(prisma.event.create as any) = jest.fn();
(prisma.event.update as any) = jest.fn();
(prisma.event.delete as any) = jest.fn();
(prisma.templateSubscription.upsert as any) = jest.fn();

// Use valid UUIDs
const TEST_HOST_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_ROOM_ID = "550e8400-e29b-41d4-a716-446655440001";

describe("Room Controller Routes (/api/v1/rooms)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: TEST_HOST_ID }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v1/rooms/lobby", () => {
    test("should return waiting public rooms", async () => {
      (prisma.event.findMany as jest.Mock<any>).mockResolvedValue([
        { id: TEST_ROOM_ID, name: "Speed Coding Arena", isPublic: true, status: "WAITING" },
      ]);

      const res = await request(app)
        .get("/api/v1/rooms/lobby")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.rooms).toHaveLength(1);
    });
  });

  describe("POST /api/v1/rooms/create", () => {
    test("should create a new live room", async () => {
      (prisma.event.create as jest.Mock<any>).mockResolvedValue({
        id: "room-123",
        name: "Custom Battle",
        roomCode: "ABCDEF",
        hostId: TEST_HOST_ID,
      });

      const res = await request(app)
        .post("/api/v1/rooms/create")
        .set("Cookie", cookieHeader)
        .send({
          name: "Custom Battle",
          description: "Friendly match",
          isPublic: true,
          problemIds: ["550e8400-e29b-41d4-a716-446655440010"],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.room.roomCode).toBe("ABCDEF");
    });
  });

  describe("PUT /api/v1/rooms/lock & /unlock", () => {
    test("should lock room if caller is host", async () => {
      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({ id: TEST_ROOM_ID, hostId: TEST_HOST_ID });
      (prisma.event.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .put("/api/v1/rooms/lock")
        .set("Cookie", cookieHeader)
        .send({ roomId: TEST_ROOM_ID });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Room locked!");
    });

    test("should deny lock request if user is not host", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440002";
      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({ id: TEST_ROOM_ID, hostId: otherUserId });

      const res = await request(app)
        .put("/api/v1/rooms/lock")
        .set("Cookie", cookieHeader)
        .send({ roomId: TEST_ROOM_ID });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only the host can lock the room");
    });
  });

  describe("GET /api/v1/rooms/time-left", () => {
    test("should calculate remaining battle time", async () => {
      const startedAt = new Date(Date.now() - 30000).toISOString();
      (prisma.event.findFirst as jest.Mock<any>).mockResolvedValue({
        id: TEST_ROOM_ID,
        status: "IN_PROGRESS",
        startedAt,
        totalTimeLimitMs: 600000,
        problems: [{ timeLimitMs: 600000 }],
      });

      const res = await request(app)
        .get(`/api/v1/rooms/time-left?roomId=${TEST_ROOM_ID}`)
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.isExpired).toBe(false);
    });
  });
});
