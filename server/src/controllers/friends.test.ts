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
(prisma.friendRequest.findUnique as any) = jest.fn();
(prisma.friendRequest.upsert as any) = jest.fn();
(prisma.friendRequest.update as any) = jest.fn();
(prisma.friendRequest.delete as any) = jest.fn();
(prisma.friendRequest.deleteMany as any) = jest.fn();

// Use valid UUIDs for testing
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_FRIEND_ID = "550e8400-e29b-41d4-a716-446655440001";
const TEST_REQUEST_ID = "550e8400-e29b-41d4-a716-446655440002";

describe("Friends Controller Routes (/api/v1/friends)", () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || "development-only-secret-key";
  const userToken = jwt.sign({ userId: TEST_USER_ID }, secret);
  const cookieHeader = [`token=${userToken}`];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v1/friends/", () => {
    test("should fetch list of user friends", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: TEST_USER_ID,
        friends: [{ id: TEST_FRIEND_ID, username: "friend2" }],
      });

      const res = await request(app)
        .get("/api/v1/friends/")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.friends).toHaveLength(1);
      expect(res.body.friends[0].username).toBe("friend2");
    });
  });

  describe("GET /api/v1/friends/messages/:friendId", () => {
    test("should fetch conversation history with a friend", async () => {
      (prisma.message.findMany as jest.Mock<any>).mockResolvedValue([
        { id: "msg-1", senderId: TEST_USER_ID, receiverId: TEST_FRIEND_ID, content: "Hello!" },
      ]);

      const res = await request(app)
        .get(`/api/v1/friends/messages/${TEST_FRIEND_ID}`)
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });
  });

  describe("GET /api/v1/friends/search", () => {
    test("should search users by query string", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440003";
      (prisma.user.findMany as jest.Mock<any>).mockResolvedValue([
        { id: otherUserId, username: "alice" },
      ]);
      (prisma.friendRequest.findMany as jest.Mock<any>).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/friends/search?q=ali")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.user[0].username).toBe("alice");
      expect(res.body.user[0].requestSent).toBe(false);
    });

    test("should return empty array if search query is missing", async () => {
      const res = await request(app)
        .get("/api/v1/friends/search")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([]);
    });
  });

  describe("POST /api/v1/friends/request", () => {
    test("should send friend request successfully", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({ id: TEST_USER_ID, friends: [] });
      (prisma.friendRequest.findFirst as jest.Mock<any>).mockResolvedValue(null);
      (prisma.friendRequest.upsert as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/friends/request")
        .set("Cookie", cookieHeader)
        .send({ targetUserId: TEST_FRIEND_ID });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Request sent successfully");
    });

    test("should auto-accept if reverse request exists", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({ id: TEST_USER_ID, friends: [] });
      (prisma.friendRequest.findFirst as jest.Mock<any>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: TEST_REQUEST_ID, senderId: TEST_FRIEND_ID, receiverId: TEST_USER_ID });

      (prisma.friendRequest.update as jest.Mock<any>).mockResolvedValue({});
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/friends/request")
        .set("Cookie", cookieHeader)
        .send({ targetUserId: TEST_FRIEND_ID });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Request accepted! You are now friends.");
    });
  });

  describe("POST /api/v1/friends/accept", () => {
    const pendingRequest = {
      id: TEST_REQUEST_ID,
      senderId: TEST_FRIEND_ID,
      receiverId: TEST_USER_ID,
      status: "PENDING",
    };

    test("should accept pending friend request", async () => {
      (prisma.friendRequest.findUnique as jest.Mock<any>).mockResolvedValue(pendingRequest);
      (prisma.friendRequest.update as jest.Mock<any>).mockResolvedValue({});
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/friends/accept")
        .set("Cookie", cookieHeader)
        .send({ requestId: TEST_REQUEST_ID, senderId: TEST_FRIEND_ID });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend added!");
    });

    test("404s when the request does not exist", async () => {
      (prisma.friendRequest.findUnique as jest.Mock<any>).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/friends/accept")
        .set("Cookie", cookieHeader)
        .send({ requestId: TEST_REQUEST_ID, senderId: TEST_FRIEND_ID });

      expect(res.status).toBe(404);
    });

    test("403s when the caller is not the receiver", async () => {
      (prisma.friendRequest.findUnique as jest.Mock<any>).mockResolvedValue({
        ...pendingRequest,
        receiverId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const res = await request(app)
        .post("/api/v1/friends/accept")
        .set("Cookie", cookieHeader)
        .send({ requestId: TEST_REQUEST_ID, senderId: TEST_FRIEND_ID });

      expect(res.status).toBe(403);
      // Nothing was mutated.
      expect(prisma.friendRequest.update).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test("400s when the request is no longer pending", async () => {
      (prisma.friendRequest.findUnique as jest.Mock<any>).mockResolvedValue({
        ...pendingRequest,
        status: "ACCEPTED",
      });

      const res = await request(app)
        .post("/api/v1/friends/accept")
        .set("Cookie", cookieHeader)
        .send({ requestId: TEST_REQUEST_ID, senderId: TEST_FRIEND_ID });

      expect(res.status).toBe(400);
      expect(prisma.friendRequest.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/friends/reject", () => {
    const pendingRequest = {
      id: TEST_REQUEST_ID,
      senderId: TEST_FRIEND_ID,
      receiverId: TEST_USER_ID,
      status: "PENDING",
    };

    test("rejects a pending request the caller owns", async () => {
      (prisma.friendRequest.findUnique as jest.Mock<any>).mockResolvedValue(pendingRequest);
      (prisma.friendRequest.delete as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/friends/reject")
        .set("Cookie", cookieHeader)
        .send({ requestId: TEST_REQUEST_ID });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Request rejected!");
      expect(prisma.friendRequest.delete).toHaveBeenCalledWith({
        where: { id: TEST_REQUEST_ID },
      });
    });

    test("403s when the caller is not the receiver", async () => {
      (prisma.friendRequest.findUnique as jest.Mock<any>).mockResolvedValue({
        ...pendingRequest,
        receiverId: "550e8400-e29b-41d4-a716-446655440099",
      });

      const res = await request(app)
        .post("/api/v1/friends/reject")
        .set("Cookie", cookieHeader)
        .send({ requestId: TEST_REQUEST_ID });

      expect(res.status).toBe(403);
      expect(prisma.friendRequest.delete).not.toHaveBeenCalled();
    });

    test("400s when requestId is missing", async () => {
      const res = await request(app)
        .post("/api/v1/friends/reject")
        .set("Cookie", cookieHeader)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/friends/remove/:id", () => {
    test("should delete friend and chat history", async () => {
      (prisma.message.deleteMany as jest.Mock<any>).mockResolvedValue({});
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/v1/friends/remove/${TEST_FRIEND_ID}`)
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend and chat history removed!");
    });
  });
});
