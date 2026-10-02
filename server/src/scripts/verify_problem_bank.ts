import { BANK } from './problemBank/banks/index.js';
import { buildUserSolution } from './problemBank/solutionJs.js';
import { fmtIn, fmtOut } from './problemBank/helpers.js';
import type { ProblemBankEntry } from './problemBank/types.js';

const seenNumbers = new Set<number>();
const seenKeys = new Set<string>();

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('  ✗ ' + msg);
};

for (const p of BANK) {
  console.log(`\n${p.key}  (#${p.number} ${p.difficulty})`);

  // 1. Every documented example must be reproduced by the reference solution.
  for (const ex of p.examples) {
    if (!ex.args) {
      fail(`example "${ex.input}" has no machine-checkable args`);
      continue;
    }
    const got = fmtOut(p.solve(ex.args)).trim();
    const want = ex.output.trim();
    if (got === want) console.log(`  PASS example ${ex.input} -> ${got}`);
    else fail(`example ${ex.input}: got ${got} want ${want}`);
  }

  // 2. Structural checks on every generated test case.
  const seen = new Set<string>();
  for (const [i, tc] of p.tests.entries()) {
    let out: string;
    try {
      out = fmtOut(p.solve(tc.args));
    } catch (e: any) {
      fail(`case ${i} threw: ${e.message}`);
      continue;
    }
    const key = fmtIn(tc.args);
    if (seen.has(key)) fail(`duplicate case ${i}`);
    seen.add(key);
    if (!out.endsWith('\n')) fail(`case ${i}: missing trailing newline`);
    if (/\s/.test(out.replace(/\n$/, ''))) {
      fail(`case ${i}: output contains whitespace: ${JSON.stringify(out)}`);
    }
  }

  if (p.tests.length < 10 || p.tests.length > 15) {
    fail(`test count ${p.tests.length} outside required 10-15`);
  }
  const pubCount = p.tests.filter((t) => t.isPublic).length;
  if (pubCount === 0) fail('no public test cases');

  // 3. The reference must be SELF-CONTAINED. buildUserSolution serializes it
  // with Function.prototype.toString, so any module-scope binding it closes
  // over would be undefined in the sandboxed submission.
  const src = buildUserSolution(p);
  if (/\b__name\s*\(/.test(src)) fail('generated solution still contains __name(...)');
  // Known module-scope helpers from the problemBank package that must never
  // appear as free identifiers inside a reference body.
  const freeHelpers = [
    'buildTrie',
    'arrayToTree',
    'treeToArray',
    'arrayToList',
    'listToArray',
    'arrayToListNode',
    'listNodeToArray',
    'node',
  ];
  const bodySrc = src.slice(src.indexOf('return (') + 8, src.lastIndexOf('})(['));
  for (const helper of freeHelpers) {
    // Built with a character class (no backslash escapes) so there is no
    // double-escaping ambiguity between the JS string and the RegExp source.
    const re = new RegExp(`(?<![.A-Za-z0-9_$])${helper}[ ]*\\(`);
    if (re.test(bodySrc)) fail(`reference closes over module-scope helper ${helper}()`);
  }

  // 4. Problem number and key must be globally unique.
  if (seenNumbers.has(p.number)) fail(`duplicate problem number #${p.number}`);
  seenNumbers.add(p.number);
  if (seenKeys.has(p.key)) fail(`duplicate key ${p.key}`);
  seenKeys.add(p.key);

  // 5. The signature must line up with the argument count actually used.
  const fnArity = p.solve.length;
  if (fnArity !== 1) {
    fail(`solve must take exactly 1 args array (got arity ${fnArity})`);
  }
  console.log(
    `  cases: ${p.tests.length} (${pubCount} public) | hints: ${p.hints.length} | def: ${p.definition.length} chars`,
  );
}

console.log(
  failures === 0
    ? '\nAll reference checks passed ✅'
    : `\n${failures} FAILURES ❌`,
);
process.exitCode = failures === 0 ? 0 : 1;