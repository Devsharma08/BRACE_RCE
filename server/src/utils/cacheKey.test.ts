import { getCacheKey } from "./cacheKey.js";

describe("getCacheKey", () => {
  it("should return the key name as is when no value is provided", () => {
    const result = getCacheKey("problems");
    expect(result).toBe("problems");
  });

  it("should append the value to the key name separated by a dash when a value is provided", () => {
    const result = getCacheKey("problem", "123");
    expect(result).toBe("problem-123");
  });
});
