/**
 * Turns a bank entry's reference `solve` into a real JavaScript submission.
 *
 * The point is to have ONE source of truth. `verify_execution.ts` needs an
 * actual user-facing solution (plain JS, written the way a competitor would
 * write it) to push through the real `prepareFinalCode` + Piston pipeline.
 * Hand-maintaining a second copy of every algorithm invites drift, so instead
 * we SERIALIZE the reference implementation and adapt it to the published
 * signature:
 *
 *     var twoSum = function(nums, target) {
 *       return ((args) => { ...reference body... })([nums, target]);
 *     };
 *
 * That proves the stored `expectedOutput` is reachable by code which matches
 * the starter snippet the user receives.
 *
 * REQUIREMENTS on reference `solve` bodies:
 *   1. Write them in plain JavaScript — no TypeScript-only syntax such as `as`
 *      casts or type annotations — because `Function.prototype.toString` emits
 *      the source verbatim. Types are still checked at build time via the
 *      `ProblemBankEntry` contract.
 *   2. Keep them SELF-CONTAINED. A serialized function cannot see module-scope
 *      bindings, so any helper must be defined inside the body.
 *   3. Avoid assigning a function to a `const` inside the body. The TS/esbuild
 *      toolchain rewrites those as `__name(fn, "name")` for stack-trace
 *      labelling, and `__name` does not exist in the sandboxed submission.
 *      Plain function *declarations* are safe; inline arrows are safe too.
 */
import type { ProblemBankEntry } from './types.js';

/**
 * Strip bundler-injected helpers from serialized source.
 *
 * esbuild wraps `const f = () => {}` as `const f = __name(() => {}, "f")` so
 * that stack traces keep the original name. That annotation is meaningless
 * outside the bundler, so remove it and keep the bare function expression.
 */
export function stripBundlerHelpers(src: string): string {
  let out = src;
  for (let i = 0; i < 20; i++) {
    const at = out.indexOf('__name(');
    if (at === -1) break;
    // Replace `__name(` with `(` and remember where the new open paren sits.
    out = out.slice(0, at) + '(' + out.slice(at + '__name('.length);
    out = stripTrailingNameArg(out, at);
  }
  return out;
}

/**
 * Remove the orphaned name argument left behind by `__name(fn, "name")`.
 *
 * @param openAt Index of the `(` that used to follow `__name`.
 */
function stripTrailingNameArg(src: string, openAt: number): string {
  let depth = 0;
  let quote = '';
  for (let i = openAt; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return src;
    } else if (ch === ',' && depth === 1) {
      const rest = src.slice(i + 1).match(/^\s*["'][^"']*["']\s*,?/);
      if (rest) return src.slice(0, i) + src.slice(i + 1 + rest[0].length);
    }
  }
  return src;
}

/** Build the JavaScript submission for a bank entry. */
export function buildUserSolution(entry: ProblemBankEntry): string {
  const argNames = entry.signature.args.map((a) => a.name);
  const body = stripBundlerHelpers(entry.solve.toString());
  return [
    `// Auto-generated reference solution — problem "${entry.key}".`,
    `var ${entry.signature.funcName} = function(${argNames.join(', ')}) {`,
    `  return (${body})([${argNames.join(', ')}]);`,
    `};`,
  ].join('\n');
}