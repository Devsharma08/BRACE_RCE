import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import { authentication, optionalAuthentication } from "./authentication.js";
import type { AuthRequest } from "./authentication.js";

describe("Authentication Middleware", () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = { cookies: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  test("should return 401 if token cookie is missing", () => {
    authentication(mockRequest as any, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: "Token is not present",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test("should call next() and attach userId for valid token", () => {
    const secret = process.env.JWT_SECRET || "development-only-secret-key";
    const token = jwt.sign({ userId: "user-123" }, secret);
    mockRequest.cookies = { token };

    authentication(mockRequest as any, mockResponse, nextFunction);
    expect((mockRequest as AuthRequest).userId).toBe("user-123");
    expect(nextFunction).toHaveBeenCalled();
  });

  test("should return 401 if token is expired", () => {
    const secret = process.env.JWT_SECRET || "development-only-secret-key";
    const expiredToken = jwt.sign({ userId: "user-123" }, secret, { expiresIn: "-1s" });
    mockRequest.cookies = { token: expiredToken };

    authentication(mockRequest as any, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: "Token has expired",
    });
  });
  test("should return 403 if token signature is invalid", () => {
    const invalidToken = jwt.sign({ userId: "user-123" }, "wrong-secret-key");
    mockRequest.cookies = { token: invalidToken };

    authentication(mockRequest as any, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
      })
    );
  });
});

describe("Optional Authentication Middleware", () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = { cookies: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  test("lets an anonymous request through untouched", () => {
    optionalAuthentication(mockRequest as any, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.userId).toBeUndefined();
    // No error path exists: a public route must not be able to 401 from here.
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test("attaches userId for a valid token", () => {
    const secret = process.env.JWT_SECRET || "development-only-secret-key";
    mockRequest.cookies = { token: jwt.sign({ userId: "user-123" }, secret) };

    optionalAuthentication(mockRequest as any, mockResponse, nextFunction);

    expect((mockRequest as AuthRequest).userId).toBe("user-123");
    expect(nextFunction).toHaveBeenCalled();
  });

  test("treats a bad token as anonymous rather than rejecting the request", () => {
    // A stale cookie must not turn a public read into a 401 — that is exactly
    // the regression this middleware exists to prevent.
    mockRequest.cookies = { token: jwt.sign({ userId: "user-123" }, "wrong-secret-key") };

    optionalAuthentication(mockRequest as any, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.userId).toBeUndefined();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test("treats an expired token as anonymous", () => {
    const secret = process.env.JWT_SECRET || "development-only-secret-key";
    const expiredToken = jwt.sign({ userId: "user-123" }, secret, { expiresIn: "-1s" });
    mockRequest.cookies = { token: expiredToken };

    optionalAuthentication(mockRequest as any, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.userId).toBeUndefined();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});
