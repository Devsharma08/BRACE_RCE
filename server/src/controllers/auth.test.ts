import { describe, test, jest, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

// Mock Prisma user delegate methods directly
(prisma.user.findFirst as any) = jest.fn();
(prisma.user.findUnique as any) = jest.fn();
(prisma.user.create as any) = jest.fn();

// Mock Google OAuth2Client prototype method verifyIdToken
jest.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation(async (options: any) => {
  if (options.idToken === "valid-google-token") {
    return {
      getPayload: () => ({
        email: "googleuser@example.com",
        name: "Google User",
        picture: "https://example.com/avatar.png",
      }),
    } as any;
  }
  throw new Error("Invalid token");
});

describe("Auth Controller Routes (/api/auth)", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/signup", () => {
    test("should successfully register a new user", async () => {
      (prisma.user.findFirst as jest.Mock<any>).mockResolvedValue(null);
      (prisma.user.create as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          avatarUrl: "http://avatar.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Registered successfully");
      expect(res.body.user).toEqual({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: "http://avatar.com",
      });
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("should return 409 if email or username already exists", async () => {
      (prisma.user.findFirst as jest.Mock<any>).mockResolvedValue({ id: "existing-id" });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          username: "existinguser",
          email: "existing@example.com",
          password: "password123",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Username or email already exists");
    });
  });

  describe("POST /api/auth/signin", () => {
    test("should log in user with correct credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        password: hashedPassword,
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .post("/api/auth/signin")
        .send({ email: "test@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged in successfully");
      expect(res.body.user.id).toBe("user-123");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("should return 404 if user not found", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/signin")
        .send({ email: "nonexistent@example.com", password: "password123" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    test("should return 401 if password is wrong", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: hashedPassword,
      });

      const res = await request(app)
        .post("/api/auth/signin")
        .send({ email: "test@example.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid password");
    });
  });

  describe("POST /api/auth/signout", () => {
    test("should clear token cookie and sign out", async () => {
      const res = await request(app).post("/api/auth/signout");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out successfully");
    });
  });

  describe("GET /api/auth/me", () => {
    test("should return authenticated user details", async () => {
      const secret = process.env.JWT_SECRET || "development-only-secret-key";
      const token = jwt.sign({ userId: "user-123" }, secret);

      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User found");
      expect(res.body.user.id).toBe("user-123");
    });

    test("should return 401 if unauthenticated", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/google", () => {
    test("should authenticate Google user successfully", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";

      (prisma.user.findFirst as jest.Mock<any>).mockResolvedValue(null);
      (prisma.user.create as jest.Mock<any>).mockResolvedValue({
        id: "google-user-id",
        username: "googleuser",
        email: "googleuser@example.com",
        avatarUrl: "https://example.com/avatar.png",
      });

      const res = await request(app)
        .post("/api/auth/google")
        .send({ credential: "valid-google-token" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Google auth successful");
      expect(res.body.user.email).toBe("googleuser@example.com");
    });

    test("should return 400 if Google credential token is missing", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";

      const res = await request(app).post("/api/auth/google").send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing Google credential token");
    });
  });
});
