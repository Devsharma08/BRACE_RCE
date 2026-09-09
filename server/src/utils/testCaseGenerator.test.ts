import { describe, test, expect } from "@jest/globals";
import { generateTestCases, seededRandom, validateSignaturePayload } from "./testCaseGenerator.js";

const sig = {
  funcName: "twoSum",
  returnType: "int[]",
  args: [
    { name: "nums", type: "int[]" },
    { name: "target", type: "int" },
  ],
};

describe("Test Case Generator (ROADMAP §2)", () => {
  test("generates requested count with public edge cases first", () => {
    const cases = generateTestCases(sig, 6, 7);
    expect(cases).toHaveLength(6);
    expect(cases[0].is_public).toBe(true);
    expect(cases[1].is_public).toBe(true);
    expect(cases[5].is_public).toBe(false);
  });

  test("each case has one JSON line per argument", () => {
    const cases = generateTestCases(sig, 4, 1);
    for (const c of cases) {
      const lines = c.input.split("\n");
      expect(lines).toHaveLength(2);
      expect(() => JSON.parse(lines[0])).not.toThrow();
      expect(() => JSON.parse(lines[1])).not.toThrow();
    }
  });

  test("generation is deterministic for the same seed", () => {
    const a = generateTestCases(sig, 5, 123);
    const b = generateTestCases(sig, 5, 123);
    expect(a).toEqual(b);
  });

  test("different seeds produce different cases", () => {
    const a = generateTestCases(sig, 6, 1);
    const b = generateTestCases(sig, 6, 999);
    expect(a.map((c) => c.input).join("|")).not.toBe(b.map((c) => c.input).join("|"));
  });

  test("seededRandom is reproducible", () => {
    const r1 = seededRandom(5);
    const r2 = seededRandom(5);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });

  test("signature validation rejects bad payloads", () => {
    expect(validateSignaturePayload(null).valid).toBe(false);
    expect(validateSignaturePayload({ funcName: "9bad", args: [] }).valid).toBe(false);
    expect(validateSignaturePayload({ funcName: "ok", args: [{ name: "x" }] }).valid).toBe(false);
    expect(validateSignaturePayload({ funcName: "solve", returnType: "int", args: [{ name: "n", type: "int" }] }).valid).toBe(true);
  });
});
