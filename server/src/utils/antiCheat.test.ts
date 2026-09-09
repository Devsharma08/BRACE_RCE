import { describe, test, expect } from "@jest/globals";
import { compareCodeStructure, evaluateFocusTelemetry, normalizeCodeStructure } from "./antiCheat.js";

describe("Anti-Cheat Engine (ROADMAP §3)", () => {
  test("identical structure with renamed identifiers is flagged", () => {
    const a = "function twoSum(nums, target) { for (let i = 0; i < nums.length; i++) {} }";
    const b = "function solve(arr, goal) { for (let k = 0; k < arr.length; k++) {} }";
    const res = compareCodeStructure(a, b);
    expect(res.similarity).toBeGreaterThanOrEqual(0.85);
    expect(res.flagged).toBe(true);
  });

  test("different algorithms are not flagged", () => {
    const a = "function add(a, b) { return a + b; }";
    const b = "class Tree { constructor(v) { this.left = null; this.right = v; } traverse() { while(true) { break; } } }";
    const res = compareCodeStructure(a, b);
    expect(res.flagged).toBe(false);
  });

  test("empty submissions are never flagged", () => {
    expect(compareCodeStructure("", "const x = 1;").flagged).toBe(false);
  });

  test("normalizer abstracts identifiers, strings and numbers", () => {
    expect(normalizeCodeStructure("const foo = 42;")).toBe(normalizeCodeStructure("const bar = 7;"));
    expect(normalizeCodeStructure('const s = "hello";')).toBe(normalizeCodeStructure("const t = 'world';"));
  });

  test("excessive focus loss is flagged", () => {
    const start = 1_000;
    const end = 61_000;
    const events = Array.from({ length: 7 }, (_, i) => ({ type: "blur" as const, atMs: start + i * 1000 }));
    const evalRes = evaluateFocusTelemetry(events, start, end, { maxEvents: 5 });
    expect(evalRes.flagged).toBe(true);
    expect(evalRes.blurCount).toBe(7);
  });

  test("normal focus behavior passes", () => {
    const evalRes = evaluateFocusTelemetry(
      [{ type: "blur", atMs: 2000 }, { type: "focus", atMs: 3000 }],
      1000,
      61_000,
    );
    expect(evalRes.flagged).toBe(false);
  });
});
