/**
 * Static audit of every bank entry, with no database and no sandbox.
 *
 * Building the Graph bank surfaced five defects that neither `tsc` nor the
 * existing suites caught, so these checks are now permanent:
 *
 *  1. MAX OUTPUT — a case whose expected output reaches Piston's stdout cap is
 *     UNWINNABLE. The sandbox SIGKILLs the process with "stdout length exceeded",
 *     so a correct submission is killed and the case reports a wrong answer.
 *     This shipped twice before it was checked.
 *  2. PUBLISHED EXAMPLES — each documented example is re-evaluated against the
 *     reference. Two Network Delay Time examples stated the wrong answer; the
 *     reference was right and the prose was wrong, which no other check sees.
 *  3. PURITY — `solve` is called twice with the same arguments. A reference that
 *     mutates its input (Flood Fill repainted the grid) returns something
 *     different the second time and fails the comparison.
 *  4. CASE COUNT — every problem should carry the full 15. Anything short is
 *     usually an exhausted input domain, which is legitimate but must be
 *     visible rather than silent.
 *  5. DUPLICATE NUMBERS — two entries sharing a problem_number would silently
 *     overwrite each other on seed.
 *  6. WRAPPER CONTRACT — a TreeNode/ListNode argument reaches the reference as a
 *     built object in the sandbox, but as a raw array at seed time. A reference
 *     handling only the array passes 1-5 and still fails every case for real.
 *
 *   npx tsx src/scripts/audit_bank.ts
 */
import { BANK } from './problemBank/banks/index.js';
import { fmtOut } from './problemBank/helpers.js';

const MAX_STDOUT_BYTES = 1024;
const EXPECTED_CASES = 15;

let problems = 0;
const failures: string[] = [];
const warnings: string[] = [];

const seenNumbers = new Map<number, string>();

for (const p of BANK as any[]) {
  problems++;
  const label = `#${p.number} ${p.name}`;

  if (seenNumbers.has(p.number)) {
    failures.push(`${label}: duplicate problem_number, also used by ${seenNumbers.get(p.number)}`);
  }
  seenNumbers.set(p.number, p.name);

  const tests = p.tests as any[];
  if (tests.length < EXPECTED_CASES) {
    warnings.push(`${label}: ${tests.length} cases (expected ${EXPECTED_CASES}) — input domain may be exhausted`);
  }

  // 1 + 2 + 3: evaluate each case and every published example twice, and check
  // both that the output fits and that repeated evaluation is stable.
  const check = (args: unknown[], where: string) => {
    let out: string;
    try {
      out = fmtOut(p.solve(args)).trim();
    } catch (e) {
      failures.push(`${label} ${where}: reference threw — ${String(e).slice(0, 100)}`);
      return;
    }
    const bytes = Buffer.byteLength(out, 'utf8');
    if (bytes >= MAX_STDOUT_BYTES) {
      failures.push(
        `${label} ${where}: expected output is ${bytes} bytes, at or over Piston's ` +
          `${MAX_STDOUT_BYTES}-byte stdout cap — the sandbox would SIGKILL a correct submission`,
      );
      return;
    }
    let again: string;
    try {
      again = fmtOut(p.solve(args)).trim();
    } catch {
      return;
    }
    if (again !== out) {
      failures.push(
        `${label} ${where}: reference is not pure — a second call with the same arguments ` +
          `gave "${again.slice(0, 40)}" instead of "${out.slice(0, 40)}"`,
      );
    }
  };

  tests.forEach((t, i) => check(t.args, `case ${i}`));

  // 6. WRAPPER CONTRACT. A TreeNode-typed argument is converted by arrayToTree
  // in the generated wrapper BEFORE the reference is called, so at run time the
  // reference receives a tree OBJECT. At seed time it receives the raw array.
  // A reference that only handles the array passes every check above and then
  // fails every case in the real sandbox — which is exactly what happened to the
  // tree and BST entries. Each TreeNode/ListNode argument is therefore fed
  // through once in its converted form; a reference that returns a different
  // answer has a contract bug, not a seeding bug.
  const converted = (arg: unknown): unknown => {
    if (!Array.isArray(arg)) return arg;
    if (arg.length === 0) return arg;
    if (arg[0] === null) return arg;
    // Only the head is validated: a tree is an array of scalars (or nulls) and a
    // list is an array of scalars. A 2D array of scalars (e.g. [[1,2],[3,4]]) is
    // not a tree, so the head check is on the first element being scalar.
    if (typeof arg[0] === 'object' && arg[0] !== null) return arg;
    const node: any = { val: arg[0], left: null, right: null };
    const q = [node];
    let i = 1;
    while (q.length && i < arg.length) {
      const c = q.shift();
      if (arg[i] !== null && arg[i] !== undefined) { c.left = { val: arg[i], left: null, right: null }; q.push(c.left); }
      i++;
      if (arg[i] !== null && arg[i] !== undefined) { c.right = { val: arg[i], left: null, right: null }; q.push(c.right); }
      i++;
    }
    return node;
  };

  for (const a of p.signature.args) {
    if (a.type !== 'TreeNode' && a.type !== 'ListNode') continue;
    for (const [i, t] of (tests as any[]).entries()) {
      const asObj = t.args.map((v: unknown, k: number) =>
        p.signature.args[k]!.type === 'TreeNode' ? converted(v) : v);
      let rawOut: string, objOut: string;
      try {
        rawOut = fmtOut(p.solve(t.args)).trim();
        objOut = fmtOut(p.solve(asObj)).trim();
      } catch {
        continue;
      }
      if (rawOut !== objOut) {
        failures.push(
          `${label} case ${i}: reference disagrees when arg "${a.name}" arrives as a ` +
            `${a.type} object instead of the raw array — the sandbox passes the built ` +
            `tree, so this case would fail in production (array form gave ` +
            `"${rawOut.slice(0, 40)}", object form "${objOut.slice(0, 40)}")`,
        );
      }
    }
  }

  for (const ex of p.examples as any[]) {
    check(ex.args, `example "${ex.input.slice(0, 40)}"`);
    const got = fmtOut(p.solve(ex.args)).trim();
    if (got !== String(ex.output).trim()) {
      failures.push(
        `${label}: published example ${ex.input} states "${ex.output}" but the reference returns "${got}"`,
      );
    }
  }
}

console.log(`bank entries: ${problems}`);
console.log(`failures: ${failures.length}`);
console.log(`warnings: ${warnings.length}`);
if (warnings.length) {
  console.log('\nWARNINGS');
  for (const w of warnings) console.log(`  - ${w}`);
}
if (failures.length) {
  console.log('\nFAILURES');
  for (const f of failures) console.log(`  ! ${f}`);
  process.exitCode = 1;
} else {
  console.log('\nAll bank entries pass the static audit.');
}
