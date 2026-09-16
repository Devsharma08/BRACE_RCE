import { describe, test, expect, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp, getAllowedOrigins } from "./app.js";

const ORIGINAL_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;

/** Rebuild the app with a specific ALLOWED_ORIGINS value for the test. */
const buildApp = (origins?: string) => {
  if (origins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = origins;
  return createApp();
};

describe("CORS configuration", () => {
  afterAll(() => {
    if (ORIGINAL_ALLOWED_ORIGINS === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = ORIGINAL_ALLOWED_ORIGINS;
  });

  describe("getAllowedOrigins", () => {
    test("falls back to the local dev origins when ALLOWED_ORIGINS is unset", () => {
      delete process.env.ALLOWED_ORIGINS;
      expect(getAllowedOrigins()).toEqual([
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
      ]);
    });

    test("parses, trims and normalises the comma-separated env list", () => {
      process.env.ALLOWED_ORIGINS =
        ' "http://localhost:5173/" , http://127.0.0.1:5173 ,, https://app.example.com ';
      expect(getAllowedOrigins()).toEqual([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://app.example.com",
      ]);
    });
  });

  describe("preflight (OPTIONS) requests", () => {
    test("reflects the allowed origin and allows credentials instead of wildcarding", async () => {
      const app = buildApp("http://localhost:5173");

      const res = await request(app)
        .options("/api/auth/me")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "GET");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(res.headers["access-control-allow-origin"]).not.toBe("*");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    test("does not advertise CORS for a disallowed origin", async () => {
      const app = buildApp("http://localhost:5173");

      const res = await request(app)
        .options("/api/auth/me")
        .set("Origin", "http://evil.example")
        .set("Access-Control-Request-Method", "GET");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
    });
  });

  describe("credentialed requests", () => {
    test("echoes the caller origin (never '*') with credentials allowed", async () => {
      const app = buildApp("http://localhost:5173,http://127.0.0.1:5173");

      // No session cookie is sent, so the route itself answers 401 — the CORS
      // headers must still be present, otherwise the browser would report a
      // CORS failure instead of a clean 401.
      const res = await request(app)
        .get("/api/auth/me")
        .set("Origin", "http://localhost:5173");

      expect(res.status).toBe(401);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    test("non-CORS callers (no Origin header) are unaffected", async () => {
      const app = buildApp("http://localhost:5173");

      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.text).toBe("Everything's Good!");
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });
});
