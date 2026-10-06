import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import request from "supertest";
import { createApp, getAllowedOrigins } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { executionGuard } from "./executionGuard.js";
import { executeCodeSchema } from "./validation.js";

// NOTE: this suite is ESM (ts-jest default-esm), where static jest.mock of
// modules is a no-op — so instead of stubbing the executeCode service we
// unit-test the guard with mock req/res (it short-circuits before the
// service on every rejection path) and keep two supertest wiring checks.

const ALLOWED_ORIGIN = getAllowedOrigins()[0];

type FinishHandler = () => void;

const makeReq = (over: Record<string, unknown> = {}): Request =>
  ({
    headers: {},
    cookies: {},
    body: { mode: "RUN" },
    ip: "203.0.113.9",
    socket: { remoteAddress: "203.0.113.9" },
    ...over,
  }) as unknown as Request;

const makeRes = () => {
  const finishHandlers: FinishHandler[] = [];
  const res = {
    statusCode: 200,
    finishHandlers,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(() => res),
    on: jest.fn((_event: string, handler: FinishHandler) => {
      finishHandlers.push(handler);
    }),
  };
  return res;
};

const runGuard = async (req: Request, res: ReturnType<typeof makeRes>) => {
  const next = jest.fn() as unknown as NextFunction;
  await executionGuard()(req, res as unknown as Response, next);
  return next as unknown as jest.Mock;
};

describe("executionGuard — browser header verification (headers only)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.executionQuota.upsert as any) = jest.fn().mockResolvedValue({ count: 1 });
    (prisma.executionLog.create as any) = jest.fn().mockResolvedValue({ id: "log-1" });
  });

  test("allow-listed Origin + app marker proceeds to next()", async () => {
    const res = makeRes();
    const next = await runGuard(
      makeReq({ headers: { origin: ALLOWED_ORIGIN, "x-requested-with": "XMLHttpRequest" } }),
      res,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("foreign Origin → 403, never reaches next()", async () => {
    const res = makeRes();
    const next = await runGuard(
      makeReq({ headers: { origin: "https://evil.example.com", "x-requested-with": "XMLHttpRequest" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("Origin present but X-Requested-With missing → 403", async () => {
    const res = makeRes();
    const next = await runGuard(makeReq({ headers: { origin: ALLOWED_ORIGIN } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("Origin present with a wrong X-Requested-With value → 403", async () => {
    const res = makeRes();
    const next = await runGuard(
      makeReq({ headers: { origin: ALLOWED_ORIGIN, "x-requested-with": "fetch" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("no Origin + Sec-Fetch-Site cross-site → 403", async () => {
    const res = makeRes();
    const next = await runGuard(makeReq({ headers: { "sec-fetch-site": "cross-site" } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("no Origin + Sec-Fetch-Site same-origin → proceeds", async () => {
    const res = makeRes();
    const next = await runGuard(makeReq({ headers: { "sec-fetch-site": "same-origin" } }), res);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("no headers at all (curl / CI smoke scripts) → proceeds", async () => {
    const res = makeRes();
    const next = await runGuard(makeReq(), res);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("executionGuard — persisted daily quota + audit log", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.executionQuota.upsert as any) = jest.fn().mockResolvedValue({ count: 1 });
    (prisma.executionLog.create as any) = jest.fn().mockResolvedValue({ id: "log-1" });
  });

  test("exhausted quota → 429 with reset info, never reaches next()", async () => {
    (prisma.executionQuota.upsert as any) = jest.fn().mockResolvedValue({ count: 999999 });
    const res = makeRes();
    const next = await runGuard(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
    const payload = (res.json as jest.Mock).mock.calls[0][0] as { message: string };
    expect(payload.message).toMatch(/Daily execution quota exceeded/);
  });

  test("quota keyed by sha256 — no raw ip/user id in the row", async () => {
    const res = makeRes();
    await runGuard(makeReq(), res);
    const upsertArgs = (prisma.executionQuota.upsert as unknown as jest.Mock).mock.calls[0][0] as {
      where: { keyHash_date: { keyHash: string } };
    };
    expect(upsertArgs.where.keyHash_date.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(upsertArgs.where.keyHash_date.keyHash).not.toContain("203.0.113.9");
  });

  test("quota store failure fails open — execution continues", async () => {
    (prisma.executionQuota.upsert as any) = jest
      .fn()
      .mockRejectedValue(new Error('relation "ExecutionQuota" does not exist'));
    const res = makeRes();
    const next = await runGuard(makeReq(), res);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("response finish appends exactly one audit row", async () => {
    const res = makeRes();
    await runGuard(makeReq({ body: { mode: "SUBMIT" } }), res);
    expect(res.finishHandlers).toHaveLength(1);
    res.finishHandlers.forEach((handler) => handler());
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(prisma.executionLog.create).toHaveBeenCalledTimes(1);
    const arg = (prisma.executionLog.create as unknown as jest.Mock).mock.calls[0][0] as {
      data: { mode: string; status: number; keyHash: string; origin: string | null };
    };
    expect(arg.data.mode).toBe("SUBMIT");
    expect(arg.data.status).toBe(200);
    expect(arg.data.origin).toBeNull();
    expect(arg.data.keyHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("executeCodeSchema — H1 IDOR regression (performanceId stripped)", () => {
  test("a client-supplied performanceId never survives validation", () => {
    const result = executeCodeSchema.safeParse({
      code: "console.log(1)",
      language: "javascript",
      mode: "SUBMIT",
      roomId: "room-abc",
      performanceId: "victim-performance-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("performanceId");
      expect(result.data.roomId).toBe("room-abc");
      expect(result.data.mode).toBe("SUBMIT");
    }
  });
});

describe("POST /execute — guard wired into the real router", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.executionQuota.upsert as any) = jest.fn().mockResolvedValue({ count: 1 });
    (prisma.executionLog.create as any) = jest.fn().mockResolvedValue({ id: "log-1" });
  });

  test("foreign Origin is rejected by the route with 403", async () => {
    const res = await request(app)
      .post("/api/v1/execute")
      .set("Origin", "https://evil.example.com")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ code: "x", language: "javascript", mode: "RUN" });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Origin not allowed/);
  });

  test("exhausted quota is rejected by the route with 429", async () => {
    (prisma.executionQuota.upsert as any) = jest.fn().mockResolvedValue({ count: 999999 });
    const res = await request(app)
      .post("/api/v1/execute")
      .send({ code: "x", language: "javascript", mode: "RUN" });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/Daily execution quota exceeded/);
  });
});