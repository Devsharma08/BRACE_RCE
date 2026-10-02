/**
 * Types for extending the EXISTING (pre-bank) problems.
 *
 * These 124 rows predate the bank and each shipped with only 2-3 test cases,
 * usually copied straight from the LeetCode examples. They are complete enough
 * to demonstrate a problem but far too thin to catch a wrong or partial
 * submission.
 *
 * Rather than hand-writing expected outputs (which is how the originals went
 * stale), each legacy problem supplies a reference `solve`. Expected outputs are
 * COMPUTED from it, exactly as for bank problems, and `verify_execution.ts`
 * pushes the serialized reference through the real Piston pipeline.
 *
 * The existing HTML definition and hints are left untouched — only test cases
 * are regenerated.
 */

/** Problems whose reference cannot be expressed as a single pure function. */
export const OPERATION_SEQUENCE = new Set([
  101, // Implement Queue using Stacks
  109, // Cache With Time Limit
  111, // Debounce
  112, // Promise Time Limit
  117, // Execute Asynchronous Functions in Parallel
  124, // Find Median from Data Stream
  132, // Design Twitter
  150, // Design Circular Queue
  160, // Kth Largest Element in a Stream
  163, // Max Stack
]);

/**
 * Problems whose input encoding cannot express the interesting cases.
 *
 * A linked list is passed as a FLAT array of values, so a cycle cannot be
 * represented: [3,2,0,-4] denotes an acyclic list, yet an index-based cycle
 * check reads nums[1] as a valid next-pointer and wrongly reports a cycle.
 * These need an explicit `next` index array before they can be generated.
 *
 * Find the Duplicate Number has the same root problem: Floyd's algorithm only
 * terminates when the cycle is reachable from index 0, and nothing in a flat
 * array of values guarantees that. Constructing inputs that always work was
 * attempted and abandoned as too fragile; a `next`-index encoding is the right
 * fix.
 */
export const UNREPRESENTABLE_INPUT = new Set<number>([]);

export interface LegacyEntry {
  /** Matches Problem.problem_number in the database. */
  number: number;
  /** Matches the existing javascript snippet's function name. */
  funcName: string;
  /** Positional argument names, matching the existing signature. */
  argNames: string[];
  /** Reference implementation. Receives the decoded argument list. */
  solve: (args: any[]) => any;
  /**
   * Generates one random argument list, or null to stop generating.
   * Cases must respect the problem's constraints so that the reference and a
   * correct user submission agree.
   */
  gen: (r: import('../helpers.js').Rng) => any[] | null;
  /** Hand-written edge cases, kept and marked public first. */
  edge: any[][];
}
