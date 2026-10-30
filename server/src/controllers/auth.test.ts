import { describe, test, jest, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

/**
 * Firebase and Gmail are mocked at module level. ESM requires
 * jest.unstable_mockModule to be registered BEFORE the modules under test are
 * imported, so every import that transitively reaches those mocks
 * (../app.js → auth controller → firebase/gmail) is dynamic and evaluated after
 * the registrations below. Everything else (prisma delegates, supertest, jwt,
 * bcrypt, google-auth-library) is a normal static import.
 *
 * Defaults applied in beforeEach: isFirebaseConfigured() is false and
 * signInWithEmailAndPassword rejects — i.e. a deployment without Firebase.
 * That is what keeps the legacy bcrypt /signup and /signin behaviour covered;
 * tests for the Firebase-first branches flip isFirebaseConfigured to true.
 */
const createUserWithEmailAndPassword = jest.fn<(...args: any[]) => Promise<any>>();
const signInWithEmailAndPassword = jest.fn<(...args: any[]) => Promise<any>>();
const sendPasswordResetEmail = jest.fn<(...args: any[]) => Promise<any>>();
const confirmPasswordReset = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule("firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
}));

const isFirebaseConfigured = jest.fn<() => boolean>();
const getFirebaseAuth = jest.fn<() => any>(() => ({}));
jest.unstable_mockModule("../lib/firebase.js", () => ({
  isFirebaseConfigured,
  getFirebaseAuth,
}));

const sendGmailEmail = jest.fn<(...args: any[]) => Promise<any>>();
const sendQueuedEmail = jest.fn<(...args: any[]) => Promise<string>>();
const mockEmailQueueAdd = jest.fn().mockResolvedValue({ id: "mock-job-id" });
jest.unstable_mockModule("../lib/gmail.js", () => ({
  sendGmailEmail,
  sendQueuedEmail,
}));
jest.unstable_mockModule("../lib/queues.js", () => ({
  emailQueue: { add: mockEmailQueueAdd },
  codeExecutionQueue: { add: jest.fn() },
  notificationQueue: { add: jest.fn() },
}));

// Imported after the mock registrations above — see the note at the top.
(globalThis as typeof globalThis & { jest?: typeof jest }).jest = jest;
const { createApp } = await import("../app.js");
const { setCachedAsync, getCachedAsync } = await import("../lib/cache.js");

// Mock Prisma user delegate methods directly
(prisma.user.findFirst as any) = jest.fn();
(prisma.user.findUnique as any) = jest.fn();
(prisma.user.create as any) = jest.fn();
(prisma.user.update as any) = jest.fn();

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

// Mock the PKCE authorization-code exchange — tests must never reach Google's
// token endpoint. The returned id_token is then checked by the verifyIdToken
// spy above, so the callback path exercises the same payload handling.
jest.spyOn(OAuth2Client.prototype, "getToken").mockImplementation(async () => {
  return { tokens: { id_token: "valid-google-token" } } as any;
});

describe("Auth Controller Routes (/api/v1/auth)", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findFirst as jest.Mock<any>).mockReset();
    (prisma.user.findUnique as jest.Mock<any>).mockReset();
    (prisma.user.create as jest.Mock<any>).mockReset();
    (prisma.user.update as jest.Mock<any>).mockReset();
    // Firebase-off defaults: legacy bcrypt signup/signin paths stay covered.
    isFirebaseConfigured.mockReturnValue(false);
    sendGmailEmail.mockResolvedValue({ messageId: "mock-message-id" });
    sendQueuedEmail.mockResolvedValue("test-job-id");
    createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: "fb-new-uid" } });
    signInWithEmailAndPassword.mockRejectedValue(new Error("auth/invalid-credential"));
    sendPasswordResetEmail.mockResolvedValue(undefined);
    confirmPasswordReset.mockResolvedValue(undefined);
  });

  describe("POST /api/v1/auth/signup", () => {
    test("should successfully register a new user", async () => {
      (prisma.user.findFirst as jest.Mock<any>).mockResolvedValue(null);
      (prisma.user.create as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .post("/api/v1/auth/signup")
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
      expect(res.headers["set-cookie"]?.some((cookie: string) => cookie.startsWith("token=")) ?? false).toBe(false);
    });

    test("should return 409 if email or username already exists", async () => {
      (prisma.user.findFirst as jest.Mock<any>).mockResolvedValue({ id: "existing-id" });

      const res = await request(app)
        .post("/api/v1/auth/signup")
        .send({
          username: "existinguser",
          email: "existing@example.com",
          password: "password123",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Username or email already exists");
    });
  });

  describe("POST /api/v1/auth/signin", () => {
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
        .post("/api/v1/auth/signin")
        .send({ email: "test@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged in successfully");
      expect(res.body.user.id).toBe("user-123");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("should return 401 if user not found", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/signin")
        .send({ email: "nonexistent@example.com", password: "password123" });

       expect(res.status).toBe(401);
       expect(res.body.message).toBe("Invalid email or password");
     });

     test("should return 401 if password is wrong", async () => {
       const hashedPassword = await bcrypt.hash("correctpassword", 10);
       (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
         id: "user-123",
         email: "test@example.com",
         password: hashedPassword,
       });

       const res = await request(app)
         .post("/api/v1/auth/signin")
         .send({ email: "test@example.com", password: "wrongpassword" });

       expect(res.status).toBe(401);
       expect(res.body.message).toBe("Invalid email or password");
     });

     test("requires email verification before password sign-in", async () => {
       (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
         id: "user-123",
         email: "test@example.com",
         emailVerified: false,
         password: await bcrypt.hash("password123", 10),
       });

       const res = await request(app)
         .post("/api/v1/auth/signin")
         .send({ email: "test@example.com", password: "password123" });

       expect(res.status).toBe(403);
       expect(res.body.message).toMatch(/verify your email/i);
       expect(res.headers["set-cookie"]).toBeUndefined();
     });
  });

  describe("POST /api/v1/auth/signout", () => {
    test("should clear token cookie and sign out", async () => {
      const res = await request(app).post("/api/v1/auth/signout");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out successfully");
    });
  });

  describe("GET /api/v1/auth/me", () => {
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
        .get("/api/v1/auth/me")
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User found");
      expect(res.body.user.id).toBe("user-123");
    });

    // The client derives `isAdmin` from this field, so it has to survive the
    // trip to the browser or the admin console becomes unreachable for real
    // admins while still being visible to everyone.
    test("should include role so the client can gate the admin console", async () => {
      const secret = process.env.JWT_SECRET || "development-only-secret-key";
      const token = jwt.sign({ userId: "user-123" }, secret);

      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: "http://avatar.com",
        role: "ADMIN",
      });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("ADMIN");
    });

    test("should return 401 if unauthenticated", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/google", () => {
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
        .post("/api/v1/auth/google")
        .send({ credential: "valid-google-token" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Google auth successful");
      expect(res.body.user.email).toBe("googleuser@example.com");
    });

    test("should return 400 if Google credential token is missing", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";

      const res = await request(app).post("/api/v1/auth/google").send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });
  });

  describe("POST /api/v1/auth/google/callback", () => {
    test("should exchange a PKCE code and authenticate the Google user", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";

      (prisma.user.findFirst as jest.Mock<any>).mockResolvedValue(null);
      (prisma.user.create as jest.Mock<any>).mockResolvedValue({
        id: "google-user-id",
        username: "googleuser",
        email: "googleuser@example.com",
        avatarUrl: "https://example.com/avatar.png",
      });

      const res = await request(app)
        .post("/api/v1/auth/google/callback")
        .send({
          code: "auth-code-123",
          code_verifier: "v".repeat(64),
          redirect_uri: "http://localhost:5173/signin",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Google auth successful");
      expect(res.body.user.email).toBe("googleuser@example.com");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    test("should return 400 when the PKCE body is incomplete", async () => {
      process.env.GOOGLE_CLIENT_ID = "mock-google-client-id";

      const res = await request(app)
        .post("/api/v1/auth/google/callback")
        .send({ code: "auth-code-123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });

    test("should return 500 when the server has no Google client id", async () => {
      const previous = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      const res = await request(app)
        .post("/api/v1/auth/google/callback")
        .send({
          code: "auth-code-123",
          code_verifier: "v".repeat(64),
          redirect_uri: "http://localhost:5173/signin",
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Server is not configured with GOOGLE_CLIENT_ID");

      process.env.GOOGLE_CLIENT_ID = previous;
    });
  });

  describe("POST /api/v1/auth/firebase/signup", () => {
    test("returns JSON when a database query fails", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      (prisma.user.findUnique as jest.Mock<any>).mockRejectedValue(
        new Error('The column "User.emailVerified" does not exist in the current database.')
      );

      const res = await request(app)
        .post("/api/v1/auth/firebase/signup")
        .send({ username: "newuser", email: "new@example.com", password: "password123" });

      expect(res.status).toBe(500);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ status: "error", message: "Internal server error" });
    });

    test("registers the account in Firebase and creates the local row", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);
      (prisma.user.create as jest.Mock<any>).mockResolvedValue({
        id: "user-789",
        username: "fbuser",
        email: "fbuser@example.com",
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .post("/api/v1/auth/firebase/signup")
        .send({
          username: "fbuser",
          email: "FBUser@example.com",
          password: "password123",
          avatarUrl: "http://avatar.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Registered successfully");
      expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
      // Email must be normalised before it reaches Firebase.
      expect(createUserWithEmailAndPassword.mock.calls[0][1]).toBe("fbuser@example.com");
      expect(res.headers["set-cookie"]?.some((cookie: string) => cookie.startsWith("token=")) ?? false).toBe(false);
      expect((prisma.user.create as jest.Mock<any>).mock.calls[0][0].data.emailVerified).toBe(false);
    });

    test("should return 409 when the local row already exists (no Firebase call)", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({ id: "existing-id" });

      const res = await request(app)
        .post("/api/v1/auth/firebase/signup")
        .send({ username: "existinguser", email: "existing@example.com", password: "password123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("An account with this email already exists. Sign in instead.");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test("should return 409 when Firebase reports the email is already in use", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);
      createUserWithEmailAndPassword.mockRejectedValue(
        Object.assign(new Error("email in use"), { code: "auth/email-already-in-use" })
      );

      const res = await request(app)
        .post("/api/v1/auth/firebase/signup")
        .send({ username: "takenuser", email: "taken@example.com", password: "password123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("An account with this email already exists. Sign in instead.");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    test("should return 503 when Firebase is not configured", async () => {
      const res = await request(app)
        .post("/api/v1/auth/firebase/signup")
        .send({ username: "fbuser", email: "fbuser@example.com", password: "password123" });

      expect(res.status).toBe(503);
      expect(res.body.message).toBe("Email registration is not configured on the server");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/auth/firebase/signin", () => {
    test("authenticates through Firebase and syncs the local row", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: "fb-uid-1", displayName: "FB User", photoURL: null },
      });
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .post("/api/v1/auth/firebase/signin")
        .send({ email: "Test@Example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged in successfully");
      expect(res.body.user.id).toBe("user-123");
      // Token is now delivered exclusively via httpOnly cookie — never in body.
      expect(res.body.token).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(signInWithEmailAndPassword.mock.calls[0][1]).toBe("test@example.com");
    });

    test("falls back to local bcrypt credentials when Firebase rejects the login", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      isFirebaseConfigured.mockReturnValue(true);
      // Default mock from beforeEach rejects — accounts that predate the
      // Firebase migration must still authenticate against the local hash.
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-123",
        username: "testuser",
        email: "test@example.com",
        password: hashedPassword,
        avatarUrl: "http://avatar.com",
      });

      const res = await request(app)
        .post("/api/v1/auth/firebase/signin")
        .send({ email: "test@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged in successfully");
      expect(res.body.user.id).toBe("user-123");
      expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/v1/auth/otp/send", () => {
    test("emails a 6-digit code to an existing account", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-otp",
        username: "otpuser",
        email: "otp-send@example.com",
      });

      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ email: "otp-send@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Verification code sent to your email");
      expect(sendQueuedEmail).toHaveBeenCalledTimes(1);
      const mail = sendQueuedEmail.mock.calls[0][0] as any;
      expect(mail.to).toBe("otp-send@example.com");
      expect(mail.text).toMatch(/verification code is: \d{6}/);
      // The code must be cached so /otp/verify can check it.
      expect(await getCachedAsync(`otp:otp-send@example.com`)).toBeDefined();
    });

    test("should return 404 for an unknown email", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ email: "nobody@example.com" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("No account found with this email address");
      expect(sendQueuedEmail).not.toHaveBeenCalled();
    });

    test("sends OTP directly through Gmail if the queue is unavailable", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-otp",
        username: "otpuser",
        email: "otp-fail@example.com",
      });
      sendQueuedEmail.mockRejectedValue(new Error("Queue unavailable"));

      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ email: "otp-fail@example.com" });

      expect(res.status).toBe(200);
      expect(sendGmailEmail).toHaveBeenCalledTimes(1);
      expect(await getCachedAsync(`otp:otp-fail@example.com`)).toBeDefined();
    });

    test("clears the OTP if both queued and direct email delivery fail", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-otp",
        email: "otp-fail@example.com",
      });
      sendQueuedEmail.mockRejectedValue(new Error("Queue unavailable"));
      sendGmailEmail.mockRejectedValue(new Error("SMTP unavailable"));

      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ email: "otp-fail@example.com" });

      expect(res.status).toBe(500);
      expect(await getCachedAsync(`otp:otp-fail@example.com`)).toBeUndefined();
    });
  });

  describe("POST /api/v1/auth/otp/verify", () => {
    test("issues a session for the matching code", async () => {
      await setCachedAsync(`otp:otp-verify@example.com`, {
        otp: "123456",
        expiresAt: Date.now() + 10 * 60 * 1000,
      }, 600);
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "user-otp",
        username: "otpuser",
        email: "otp-verify@example.com",
        avatarUrl: "http://avatar.com",
      });
      (prisma.user.update as jest.Mock<any>).mockResolvedValue({
        id: "user-otp",
        emailVerified: true,
      });

      const res = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ email: "otp-verify@example.com", otp: "123456" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged in successfully");
      expect(res.body.user.id).toBe("user-otp");
      expect(res.body.token).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-otp" },
        data: { emailVerified: true },
      });
      // Codes are single-use.
      expect(await getCachedAsync(`otp:otp-verify@example.com`)).toBeUndefined();
    });

    test("should return 401 for a wrong code without touching the user table", async () => {
      await setCachedAsync(`otp:otp-wrong@example.com`, {
        otp: "123456",
        expiresAt: Date.now() + 10 * 60 * 1000,
      }, 600);

      const res = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ email: "otp-wrong@example.com", otp: "654321" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired verification code");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("should return 401 when no code was requested", async () => {
      const res = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ email: "otp-none@example.com", otp: "123456" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired verification code");
    });

    test("should return 401 for an expired code", async () => {
      await setCachedAsync(`otp:otp-expired@example.com`, {
        otp: "123456",
        expiresAt: Date.now() - 1,
      }, 600);

      const res = await request(app)
        .post("/api/v1/auth/otp/verify")
        .send({ email: "otp-expired@example.com", otp: "123456" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired verification code");
      expect(await getCachedAsync(`otp:otp-expired@example.com`)).toBeUndefined();
    });
  });

  describe("POST /api/v1/auth/password-reset/request", () => {
    test("returns the generic response when no account exists and Firebase is not configured", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/request")
        .send({ email: "reset@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account with this email exists, a password reset link has been sent.");
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test("sends a reset link for local password accounts", async () => {
      (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({
        id: "local-user",
        email: "reset@example.com",
        password: "existing-hash",
      });

      const res = await request(app)
        .post("/api/v1/auth/password-reset/request")
        .set("Origin", "http://localhost:5173")
        .send({ email: "Reset@Example.com" });

      expect(res.status).toBe(200);
      expect(sendQueuedEmail).toHaveBeenCalledTimes(1);
      const email = sendQueuedEmail.mock.calls[0][0] as { text: string };
      expect(email.text).toContain("http://localhost:5173/reset-password");
      expect(email.text).toMatch(/oobCode=[\w-]+/);

      const resetLink = email.text.match(/https?:\/\/\S+/)?.[0];
      expect(resetLink).toBeDefined();
      const token = new URL(resetLink!).searchParams.get("oobCode");
      expect(token).toBeTruthy();

      (prisma.user.update as jest.Mock<any>).mockResolvedValue({});
      const confirmRes = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ oobCode: token, newPassword: "newpassword123" });

      expect(confirmRes.status).toBe(200);
      const updatedPassword = (prisma.user.update as jest.Mock<any>).mock.calls[0][0].data.password;
      expect(await bcrypt.compare("newpassword123", updatedPassword)).toBe(true);
    });

    test("sends the Firebase reset email and returns a generic message", async () => {
      isFirebaseConfigured.mockReturnValue(true);

      const res = await request(app)
        .post("/api/v1/auth/password-reset/request")
        .send({ email: "Reset@Example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account with this email exists, a password reset link has been sent.");
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmail.mock.calls[0][1]).toBe("reset@example.com");
    });

    test("still returns the generic message when Firebase rejects (no account enumeration)", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      sendPasswordResetEmail.mockRejectedValue(
        Object.assign(new Error("no such user"), { code: "auth/user-not-found" })
      );

      const res = await request(app)
        .post("/api/v1/auth/password-reset/request")
        .send({ email: "unknown@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("If an account with this email exists, a password reset link has been sent.");
    });
  });

  describe("POST /api/v1/auth/password-reset/confirm", () => {
    test("rejects an unknown local reset code when Firebase is not configured", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ oobCode: "code-123", newPassword: "newpassword123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("The reset link is invalid or has expired");
      expect(confirmPasswordReset).not.toHaveBeenCalled();
    });

    test("applies the new password from the reset link", async () => {
      isFirebaseConfigured.mockReturnValue(true);

      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ oobCode: "valid-oob-code", newPassword: "newpassword123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password reset successful. You can now sign in with your new password.");
      expect(confirmPasswordReset).toHaveBeenCalledTimes(1);
      expect(confirmPasswordReset.mock.calls[0][1]).toBe("valid-oob-code");
    });

    test("should return 400 when the reset link has expired", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      confirmPasswordReset.mockRejectedValue(
        Object.assign(new Error("expired"), { code: "auth/expired-action-code" })
      );

      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ oobCode: "expired-oob-code", newPassword: "newpassword123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("The reset link is invalid or has expired");
    });

    test("should return 400 for a password Firebase rejects", async () => {
      isFirebaseConfigured.mockReturnValue(true);
      confirmPasswordReset.mockRejectedValue(
        Object.assign(new Error("weak"), { code: "auth/weak-password" })
      );

      // Passes the local length check (>= 8) but Firebase still rejects it,
      // e.g. when the password is too similar to the account email.
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ oobCode: "valid-oob-code", newPassword: "ResetExample123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("The new password is invalid");
    });
  });
});
