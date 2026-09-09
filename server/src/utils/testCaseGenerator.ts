/**
 * Automated Test Case Generator (ROADMAP §2).
 * Synthesizes randomized-but-deterministic test inputs from a ProblemSignature
 * so custom-problem authors get edge + random coverage without hand-writing cases.
 */

import type { ProblemSignature } from "./wrapperGenerator.js";

export interface GeneratedTestCase {
  input: string; // newline-separated JSON args (matches RCE stdin format)
  expectedOutput?: string;
  is_public: boolean;
}

/** Tiny seeded PRNG (mulberry32) so generation is reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randomArray(rand: () => number, len: number, min: number, max: number): number[] {
  return Array.from({ length: len }, () => randInt(rand, min, max));
}

function randomString(rand: () => number, len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: len }, () => chars[Math.floor(rand() * chars.length)]).join("");
}

function sampleValueForType(type: string, rand: () => number, edge: boolean): unknown {
  const t = (type || "").trim().toLowerCase();
  if (t === "int" || t === "integer" || t === "number") {
    if (edge) return [0, 1, -1, 2147483647, -2147483648][randInt(rand, 0, 4)];
    return randInt(rand, -100, 100);
  }
  if (t === "long") return randInt(rand, -1000000, 1000000);
  if (t === "double" || t === "float") return Math.round(rand() * 200 * 100) / 100 - 100;
  if (t === "boolean" || t === "bool") return rand() > 0.5;
  if (t === "string") {
    if (edge) return ["", "a", "racecar"][randInt(rand, 0, 2)];
    return randomString(rand, randInt(rand, 1, 8));
  }
  if (t === "char" || t === "character") return randomString(rand, 1);
  if (t.includes("[][]") || t.includes("int[][]") || t === "matrix") {
    if (edge) return edge ? [[]] : [[1]];
    const rows = randInt(rand, 1, 3);
    const cols = randInt(rand, 1, 4);
    return Array.from({ length: rows }, () => randomArray(rand, cols, -20, 20));
  }
  if (t.includes("[]") || t === "array" || t === "list") {
    if (edge) return [[], [0], [1, 1, 1]][randInt(rand, 0, 2)];
    return randomArray(rand, randInt(rand, 1, 8), -50, 50);
  }
  // Fallback scalar
  return randInt(rand, -100, 100);
}

/**
 * Generate `count` test cases: first up-to-2 are edge cases (public),
 * the rest are randomized (hidden) for anti-hardcoding coverage.
 */
export function generateTestCases(
  sig: ProblemSignature,
  count = 6,
  seed = 42,
): GeneratedTestCase[] {
  const total = Math.min(Math.max(count, 1), 20);
  const rand = seededRandom(seed);
  const cases: GeneratedTestCase[] = [];

  for (let i = 0; i < total; i++) {
    const edge = i < 2;
    const args = sig.args.map((a) => sampleValueForType(a.type, rand, edge));
    cases.push({
      input: args.map((v) => JSON.stringify(v)).join("\n"),
      is_public: edge,
    });
  }
  return cases;
}

/** Validate a ProblemSignature payload coming from the creator GUI. */
export function validateSignaturePayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") return { valid: false, error: "Signature payload required" };
  if (!payload.funcName || typeof payload.funcName !== "string") return { valid: false, error: "funcName is required" };
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(payload.funcName)) return { valid: false, error: "funcName must be a valid identifier" };
  if (!Array.isArray(payload.args) || payload.args.length === 0) return { valid: false, error: "At least one argument is required" };
  for (const a of payload.args) {
    if (!a?.name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(a.name)) return { valid: false, error: `Invalid argument name: ${a?.name}` };
    if (!a?.type || typeof a.type !== "string") return { valid: false, error: `Missing type for argument ${a?.name}` };
  }
  return { valid: true };
}
