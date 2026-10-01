/**
 * Test-case construction helpers.
 *
 * Every problem needs 10-15 cases: a few hand-written edge cases (empty input,
 * single element, duplicates, extremes) plus deterministic pseudo-random
 * cases. Duplicates are removed by serialized input so a problem never ships
 * the same case twice.
 */

import { Rng, fmtIn } from './helpers.js';
import type { TestInput } from './types.js';

export const PUBLIC_CASES = 3;

const dedupeKey = (args: unknown[]): string => JSON.stringify(args);

/**
 * Build the case list for a problem.
 *
 * @param explicit Hand-written edge cases, always kept (first ones are public).
 * @param gen      Produces one random argument list, or `null` to stop early.
 * @param total    Target total number of cases (clamped to >= explicit.length).
 * @param seed     Seed for the deterministic RNG.
 */
export function autoTests(
  explicit: TestInput[],
  gen: (r: Rng) => unknown[] | null,
  total: number,
  seed: number,
): TestInput[] {
  const target = Math.max(total, explicit.length);
  const seen = new Set<string>();
  const out: TestInput[] = [];

  for (const tc of explicit) {
    const k = dedupeKey(tc.args);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ args: tc.args, isPublic: out.length < PUBLIC_CASES });
  }

  const r = new Rng(seed);
  let guard = 0;
  while (out.length < target && guard++ < target * 60) {
    const args = gen(r);
    if (!args) break;
    const k = dedupeKey(args);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ args, isPublic: out.length < PUBLIC_CASES });
  }

  return out;
}

/** Shorthand for a case marked public. */
export const pub = (...args: unknown[]): TestInput => ({ args, isPublic: true });

/** Shorthand for a hidden (private) case. */
export const priv = (...args: unknown[]): TestInput => ({ args, isPublic: false });

/** Build cases from plain argument tuples, marking the first `n` public. */
export const cases = (rows: unknown[][], n = PUBLIC_CASES): TestInput[] =>
  rows.map((args, i) => ({ args, isPublic: i < n }));

export { fmtIn };