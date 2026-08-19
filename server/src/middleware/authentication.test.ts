import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import { authentication } from "./authentication.js";
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
});
