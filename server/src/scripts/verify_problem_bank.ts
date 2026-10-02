import { BANK } from './problemBank/banks/index.js';
import { fmtIn, fmtOut } from './problemBank/helpers.js';
import type { ProblemBankEntry } from './problemBank/types.js';

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