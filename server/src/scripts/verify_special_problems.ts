/**
 * Proves the four bespoke-driver problems pass with their stored cases.
 *
 * Runs the reference for each through the real `prepareFinalCode` pipeline on
 * Piston against every stored test case.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import { SPECIAL_REFS } from './problemBank/specialRefs.js';
import { SPECIAL_TESTS } from './problemBank/specialTests.js';

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
  if (j?.run?.code !== 0) throw new Error(j?.run?.stderr ?? `exit ${j?.run?.code}`);
  return (j.run.stdout as string).trim();
}

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const spec of SPECIAL_TESTS) {
    const problem = await prisma.problem.findUnique({
      where: { problem_number: spec.number },
      include: { test_cases: true, code_snippets: { where: { language: 'javascript' } } },
    });
    const snippet = problem?.code_snippets[0];
    if (!problem || !snippet) continue;

    const prepared = prepareFinalCode('javascript', SPECIAL_REFS[spec.number], {
      code: snippet.code,
      wrapperCode: snippet.wrapperCode,
    });

    let ok = 0;
    let bad = 0;
    for (const [i, tc] of problem.test_cases.entries()) {
      try {
        const got = await piston(prepared, tc.input.replace(/\n$/, ''));
        if (got === tc.expectedOutput.trim()) ok++;
        else {
          bad++;
          failures.push(`#${spec.number} case ${i}: got ${got} expected ${tc.expectedOutput.trim()}`);
        }
      } catch (e: any) {
        bad++;
        failures.push(`#${spec.number} case ${i}: ${String(e.message).slice(0, 120)}`);
      }
    }
    pass += ok;
    fail += bad;
    console.log(`  ${bad === 0 ? 'PASS' : 'FAIL'}  #${String(spec.number).padEnd(4)} ${problem.name.padEnd(44)} ${ok}/${problem.test_cases.length}`);
  }

  console.log(`\n==== SPECIAL PROBLEM VERIFICATION ====\npassed: ${pass}, failed: ${fail}`);
  if (failures.length) for (const f of failures.slice(0, 20)) console.log('  ✗ ' + f);
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
