/**
 * Proves the stored expected outputs are actually reachable.
 *
 * For every bank entry we build a JavaScript submission from the reference
 * implementation (`buildUserSolution`), push it through the REAL
 * `prepareFinalCode` used in production, and run it on Piston against every
 * generated test case. The stdout must equal the expected output exactly.
 *
 * This is the check that catches mismatches a pure unit test cannot: wrapper
 * argument parsing, the whitespace-stripping serializer, and stdin framing.
 */
import 'dotenv/config';
import { BANK } from './problemBank/banks/index.js';
import { fmtIn, fmtOut } from './problemBank/helpers.js';
import { buildUserSolution } from './problemBank/solutionJs.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';

async function piston(code: string, stdin: string) {
  const res = await fetch(`${PISTON}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'javascript',
      version: '18.15.0',
      files: [{ name: 'main.js', content: code }],
      stdin,
    }),
  });
  const j: any = await res.json();
  if (j?.run?.code !== 0) {
    throw new Error(j?.message ?? j?.run?.stderr ?? `exit ${j?.run?.code}`);
  }
  return (j.run.stdout as string).trim();
}

async function main() {
  // Imported lazily so the Piston check still reports a clean error if the
  // Prisma-generated client is unavailable in some environment.
  const { prepareFinalCode } = await import('../services/codeExecution.js');

  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const p of BANK) {
    const source = buildUserSolution(p);
    const prepared = prepareFinalCode('javascript', source);
    let ok = 0;
    let bad = 0;

    for (const [i, tc] of p.tests.entries()) {
      const stdin = fmtIn(tc.args).replace(/\n$/, '');
      const expected = fmtOut(p.solve(tc.args)).trim();
      try {
        const got = await piston(prepared, stdin);
        if (got === expected) {
          ok++;
        } else {
          bad++;
          failures.push(`${p.key} case ${i}: got ${got} expected ${expected}`);
        }
      } catch (e: any) {
        bad++;
        failures.push(`${p.key} case ${i}: ${String(e.message).slice(0, 140)}`);
      }
    }

    pass += ok;
    fail += bad;
    const mark = bad === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${p.key.padEnd(30)} ${ok}/${p.tests.length} cases`);
  }

  console.log(`\n==== EXECUTION VERIFICATION ====\npassed: ${pass}, failed: ${fail}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 40)) console.log('  ✗ ' + f);
  }
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
