import { describe, test, jest, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { getToken } from "../lib/jwt.js";

// The generated Prisma client does not expose the Feedback delegate yet
// (same caveat as controllers/admin.ts) — stub it for the unit under test.
(prisma as any).feedback = { create: jest.fn() };

describe("Feedback Routes (/api/feedback)", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects anonymous submissions with 401", async () => {
    const res = await request(app).post("/api/feedback").send({ content: "hello" });
    expect(res.status).toBe(401);
  });

  test("rejects empty content with 400", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Cookie", `token=${getToken("user-123")}`)
      .send({ content: "   " });
    expect(res.status).toBe(400);
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  test("rejects content over 5000 characters with 400", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Cookie", `token=${getToken("user-123")}`)
      .send({ content: "x".repeat(5001) });
    expect(res.status).toBe(400);
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  test("persists feedback for an authenticated user", async () => {
    (prisma.feedback.create as jest.Mock<any>).mockResolvedValue({
      id: "fb-1",
      userId: "user-123",
      content: "Great arena",
      status: "PENDING",
    });
    const res = await request(app)
      .post("/api/feedback")
      .set("Cookie", `token=${getToken("user-123")}`)
      .send({ content: "Great arena" });
    expect(res.status).toBe(201);
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: { userId: "user-123", content: "Great arena" },
    });
    expect(res.body.feedback.content).toBe("Great arena");
  });
});
