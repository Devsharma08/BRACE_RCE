/**
 * Compact problem DSL.
 *
 * Hand-authoring 100+ problems with full HTML descriptions inline would be
 * unwieldy, so entries are declared tersely here and expanded into the
 * canonical `ProblemBankEntry` shape (including the HTML body) at load time.
 */

import { describe, type DescExample } from './describe.js';
import type {
  DsCategory,
  Level,
  ProblemBankEntry,
  TestInput,
} from './types.js';

export interface RawProblem {
  /** Unique slug. */
  k: string;
  n: string;
  /** Globally unique problem number. */
  num: number;
  d: Level;
  c: DsCategory;
  /** Statement paragraphs. */
  intro: string[];
  notes?: string[];
  approach?: string[];
  ex: DescExample[];
  con: string[];
  cx?: string;
  h: string[];
  /** `[returnType, ...argTypes]`. */
  sig: string[];
  /** `[funcName, ...argNames]`. */
  fn: string[];
  /** Reference implementation used to compute expected outputs. */
  s: (args: any[]) => any;
  t: TestInput[];
}

const P = (p: RawProblem): ProblemBankEntry => ({
  key: p.k,
  name: p.n,
  number: p.num,
  difficulty: p.d,
  category: p.c,
  definition: describe({
    intro: p.intro,
    notes: p.notes,
    approach: p.approach,
    examples: p.ex,
    constraints: p.con,
    complexity: p.cx,
  }),
  examples: p.ex,
  hints: p.h,
  signature: {
    funcName: p.fn[0],
    returnType: p.sig[0],
    args: p.sig.slice(1).map((type, i) => ({ name: p.fn[i + 1] ?? `arg${i}`, type })),
  },
  solve: p.s,
  tests: p.t,
});

/** Declare a list of problems. */
export const bank = (list: RawProblem[]): ProblemBankEntry[] => list.map(P);