/**
 * Shared types for the generated problem bank.
 *
 * Every bank entry carries a *reference implementation* (`solve`) so that
 * expected outputs are COMPUTED rather than hand-written. The generator runs
 * `solve` against each test input and formats the result exactly the way the
 * execution wrapper formats user output, which guarantees the stored
 * `expectedOutput` matches what a correct submission will print.
 */

import type { DescExample } from './describe.js';

export type Level = 'EASY' | 'MEDIUM' | 'HARD';

/** Must match a LearningItem.name in the database so links can be rebuilt. */
export type DsCategory =
  | 'Arrays'
  | 'Stack'
  | 'Queue'
  | 'Linked List'
  | 'Hash Table'
  | 'Tree'
  | 'Binary Search Tree'
  | 'Heap'
  | 'Graph'
  | 'Trie'
  | 'Segment Tree'
  | 'Fenwick Tree'
  | 'Searching'
  | 'Dynamic Programming'
  | 'Math'
  | 'Greedy';

export interface ArgumentSignature {
  name: string;
  /** "int", "int[]", "int[][]", "string[]", "TreeNode", "ListNode", ... */
  type: string;
}

export interface ProblemSignature {
  funcName: string;
  returnType: string;
  args: ArgumentSignature[];
}

/** A single test case: the JSON-decoded argument list. */
export interface TestInput {
  args: unknown[];
  /** Public cases are shown in the UI. Defaults to false. */
  isPublic?: boolean;
}

export interface ProblemBankEntry {
  /** Stable key; also the canonical name we look up in the bank index. */
  key: string;
  name: string;
  /** Global unique problem number. 35-99 and 190+ are currently unused. */
  number: number;
  difficulty: Level;
  category: DsCategory;
  /** HTML body stored in Problem.problem_definition. */
  definition: string;
  /**
   * The documented examples, kept so `verify_problem_bank.ts` can assert that
   * the reference solution reproduces every published answer.
   */
  examples: DescExample[];
  /** 3-5 hints stored in Problem.problem_hints. */
  hints: string[];
  signature: ProblemSignature;
  /**
   * Reference implementation. Receives the same decoded arguments the
   * execution wrapper would hand to a user's solution and returns the value
   * the solution should produce. Implementations may narrow the parameter
   * type with an `as` cast, e.g. `(args) => f(args[0] as number[])`.
   */
  solve: (args: any[]) => any;
  /** 10-15 test inputs. */
  tests: TestInput[];
}