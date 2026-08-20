import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../Lib/prisma.js";
import jwt from "jsonwebtoken";

// Assign mocks directly to Prisma delegate methods
(prisma.event.findMany as any) = jest.fn();
(prisma.event.findUnique as any) = jest.fn();
(prisma.event.findFirst as any) = jest.fn();
(prisma.event.create as any) = jest.fn();
(prisma.event.update as any) = jest.fn();
(prisma.event.delete as any) = jest.fn();
(prisma.templateSubscription.upsert as any) = jest.fn();

describe("Room Controller Routes (/api/rooms)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: "user-host" }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/rooms/lobby", () => {
    test("should return waiting public rooms", async () => {
      (prisma.event.findMany as jest.Mock<any>).mockResolvedValue([
        { id: "room-1", name: "Speed Coding Arena", isPublic: true, status: "WAITING" },
      ]);

      const res = await request(app)
        .get("/api/rooms/lobby")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.rooms).toHaveLength(1);
    });
  });

  describe("POST /api/rooms/create", () => {
    test("should create a new live room", async () => {
      (prisma.event.create as jest.Mock<any>).mockResolvedValue({
        id: "room-123",
        name: "Custom Battle",
        roomCode: "ABCDEF",
        hostId: "user-host",
      });

      const res = await request(app)
        .post("/api/rooms/create")
        .set("Cookie", cookieHeader)
        .send({
          name: "Custom Battle",
          description: "Friendly match",
          isPublic: true,
          problemIds: ["prob-1"],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.room.roomCode).toBe("ABCDEF");
    });
  });

  describe("PUT /api/rooms/lock & /unlock", () => {
    test("should lock room if caller is host", async () => {
      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({ id: "room-1", hostId: "user-host" });
      (prisma.event.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .put("/api/rooms/lock")
        .set("Cookie", cookieHeader)
        .send({ roomId: "room-1" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Room locked!");
    });

    test("should deny lock request if user is not host", async () => {
      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue({ id: "room-1", hostId: "other-user" });

      const res = await request(app)
        .put("/api/rooms/lock")
        .set("Cookie", cookieHeader)
        .send({ roomId: "room-1" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only the host can lock the room");
    });
  });

  describe("GET /api/rooms/time-left", () => {
    test("should calculate remaining battle time", async () => {
      const startedAt = new Date(Date.now() - 30000).toISOString();
      (prisma.event.findFirst as jest.Mock<any>).mockResolvedValue({
        id: "room-1",
        status: "IN_PROGRESS",
        startedAt,
        totalTimeLimitMs: 600000,
        problems: [{ timeLimitMs: 600000 }],
      });

      const res = await request(app)
        .get("/api/rooms/time-left?roomId=room-1")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.isExpired).toBe(false);
    });
  });
});
