/**
 * Runs the legacy references through the REAL execution pipeline.
 *
 * For each legacy problem we serialize its reference into a submission, push
 * it through `prepareFinalCode`, and execute every generated case on Piston.
 * This proves the expanded expected outputs are reachable by code that matches
 * the existing starter signature — before anything is written to the database.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import { fmtIn, fmtOut, Rng } from './problemBank/helpers.js';
import { LEGACY, OPERATION_SEQUENCE } from './problemBank/legacy/index.js';
import type { LegacyEntry } from './problemBank/legacy/types.js';
import { autoTests } from './problemBank/tests.js';
import { stripBundlerHelpers } from './problemBank/solutionJs.js';

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
  if (j?.run?.code !== 0) throw new Error(j?.message ?? j?.run?.stderr ?? `exit ${j?.run?.code}`);
  return (j.run.stdout as string).trim();
}

/** Build the submission, exactly as a user would receive it. */
function buildLegacySolution(e: LegacyEntry): string {
  const argNames = e.argNames;
  const body = stripBundlerHelpers(e.solve.toString());
  return [
    `var ${e.funcName} = function(${argNames.join(', ')}) {`,
    `  return (${body})([${argNames.join(', ')}]);`,
    `};`,
  ].join('\n');
}

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const e of LEGACY) {
    if (OPERATION_SEQUENCE.has(e.number)) continue;

    const problem = await prisma.problem.findUnique({
      where: { problem_number: e.number },
      select: { id: true, name: true },
    });
    if (!problem) {
      console.log(`  ?  #${e.number}: not in database`);
      continue;
    }

    const tests = autoTests(
      e.edge.map((a) => ({ args: a, isPublic: false })),
      (r) => e.gen(r),
      13,
      9000 + e.number,
    );
    const prepared = prepareFinalCode('javascript', buildLegacySolution(e));
    let ok = 0;
    let bad = 0;

    for (const [i, tc] of tests.entries()) {
      const stdin = fmtIn(tc.args).replace(/\n$/, '');
      const expected = fmtOut(e.solve(tc.args)).trim();
      try {
        const got = await piston(prepared, stdin);
        if (got === expected) ok++;
        else {
          bad++;
          failures.push(`#${e.number} ${problem.name} case ${i}: got ${got} expected ${expected}`);
        }
      } catch (err: any) {
        bad++;
        failures.push(`#${e.number} ${problem.name} case ${i}: ${String(err.message).slice(0, 130)}`);
      }
    }

    pass += ok;
    fail += bad;
    console.log(`  ${bad === 0 ? 'PASS' : 'FAIL'}  #${String(e.number).padEnd(4)} ${problem.name.padEnd(34)} ${ok}/${tests.length}`);
  }

  console.log(`\n==== LEGACY EXECUTION VERIFICATION ====\npassed: ${pass}, failed: ${fail}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 30)) console.log('  ✗ ' + f);
  }
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
