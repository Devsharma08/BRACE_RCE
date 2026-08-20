import { describe, test, expect } from "@jest/globals";
import { apiLimiter } from "./apiLimiter.js";

describe("apiLimiter Middleware", () => {
  test("should be defined as a valid express rate limiting handler", () => {
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe("function");
  });
});
