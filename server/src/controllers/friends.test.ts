import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

// Assign mocks directly to Prisma delegate methods
(prisma.user.findUnique as any) = jest.fn();
(prisma.user.findMany as any) = jest.fn();
(prisma.user.update as any) = jest.fn();
(prisma.message.findMany as any) = jest.fn();
(prisma.message.deleteMany as any) = jest.fn();
(prisma.friendRequest.findMany as any) = jest.fn();
(prisma.friendRequest.findFirst as any) = jest.fn();
(prisma.friendRequest.upsert as any) = jest.fn();
(prisma.friendRequest.update as any) = jest.fn();
(prisma.friendRequest.delete as any) = jest.fn();
(prisma.friendRequest.deleteMany as any) = jest.fn();

describe("Friends Controller Routes (/api/friends)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: "user-1" }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/friends/", () => {
    test("should fetch list of user friends", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-1",
        friends: [{ id: "user-2", username: "friend2" }],
      });

      const res = await request(app)
        .get("/api/friends/")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.friends).toHaveLength(1);
      expect(res.body.friends[0].username).toBe("friend2");
    });
  });

  describe("GET /api/friends/messages/:friendId", () => {
    test("should fetch conversation history with a friend", async () => {
      (prisma.message.findMany as jest.Mock<any>).mockResolvedValue([
        { id: "msg-1", senderId: "user-1", receiverId: "user-2", content: "Hello!" },
      ]);

      const res = await request(app)
        .get("/api/friends/messages/user-2")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });
  });

  describe("GET /api/friends/search", () => {
    test("should search users by query string", async () => {
      (prisma.user.findMany as jest.Mock<any>).mockResolvedValue([
        { id: "user-3", username: "alice" },
      ]);
      (prisma.friendRequest.findMany as jest.Mock<any>).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/friends/search?q=ali")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.user[0].username).toBe("alice");
      expect(res.body.user[0].requestSent).toBe(false);
    });

    test("should return empty array if search query is missing", async () => {
      const res = await request(app)
        .get("/api/friends/search")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([]);
    });
  });

  describe("POST /api/friends/request", () => {
    test("should send friend request successfully", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({ id: "user-1", friends: [] });
      (prisma.friendRequest.findFirst as jest.Mock<any>).mockResolvedValue(null);
      (prisma.friendRequest.upsert as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/friends/request")
        .set("Cookie", cookieHeader)
        .send({ targetUserId: "user-2" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Request sent successfully");
    });

    test("should auto-accept if reverse request exists", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({ id: "user-1", friends: [] });
      (prisma.friendRequest.findFirst as jest.Mock<any>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "req-99", senderId: "user-2", receiverId: "user-1" });

      (prisma.friendRequest.update as jest.Mock<any>).mockResolvedValue({});
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/friends/request")
        .set("Cookie", cookieHeader)
        .send({ targetUserId: "user-2" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Request accepted! You are now friends.");
    });
  });

  describe("POST /api/friends/accept", () => {
    test("should accept pending friend request", async () => {
      (prisma.friendRequest.update as jest.Mock<any>).mockResolvedValue({});
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/friends/accept")
        .set("Cookie", cookieHeader)
        .send({ requestId: "req-123", senderId: "user-2" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend added!");
    });
  });

  describe("DELETE /api/friends/remove/:id", () => {
    test("should delete friend and chat history", async () => {
      (prisma.message.deleteMany as jest.Mock<any>).mockResolvedValue({});
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .delete("/api/friends/remove/user-2")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend and chat history removed!");
    });
  });
});
