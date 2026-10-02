/**
 * Proves the operation-sequence problems are now passable.
 *
 * These 7 problems store inputs like `push(1),peek(),pop()` and expected
 * outputs like `1,1,false`. Before the operation driver existed, the wrapper
 * tried to JSON.parse that input, so every submission errored and NOBODY could
 * solve these problems at all.
 *
 * For each problem we take the REAL javascript starter snippet from the
 * database, attach a correct reference implementation of that exact class,
 * push the combination through `prepareFinalCode`, and run it on Piston against
 * every stored test case. Output must match byte for byte.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import {
  OPERATION_PROBLEMS,
  OPERATION_REFERENCES,
} from './problemBank/operationRefs.js';

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
    throw new Error(j?.run?.stderr ?? j?.message ?? `exit ${j?.run?.code}`);
  }
  return (j.run.stdout as string).trim();
}

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const num of OPERATION_PROBLEMS) {
    const problem = await prisma.problem.findUnique({
      where: { problem_number: num },
      include: {
        test_cases: true,
        code_snippets: { where: { language: 'javascript' } },
      },
    });
    if (!problem) {
      console.log(`  ?  #${num}: not in database`);
      continue;
    }
    const snippet = problem.code_snippets[0];
    const reference = OPERATION_REFERENCES[num];
    if (!snippet || !reference) {
      console.log(`  ?  #${num} ${problem.name}: missing snippet or reference`);
      continue;
    }

    // The real pipeline: snippet metadata in, executable program out.
    const prepared = prepareFinalCode('javascript', reference, {
      code: snippet.code,
      wrapperCode: snippet.wrapperCode,
    });

    let ok = 0;
    let bad = 0;
    for (const [i, tc] of problem.test_cases.entries()) {
      const expected = tc.expectedOutput.trim();
      try {
        const got = await piston(prepared, tc.input.replace(/\n$/, ''));
        if (got === expected) ok++;
        else {
          bad++;
          failures.push(`#${num} case ${i}: got ${got} expected ${expected}`);
        }
      } catch (e: any) {
        bad++;
        failures.push(`#${num} case ${i}: ${String(e.message).slice(0, 130)}`);
      }
    }
    pass += ok;
    fail += bad;
    console.log(
      `  ${bad === 0 ? 'PASS' : 'FAIL'}  #${String(num).padEnd(4)} ` +
        `${problem.name.padEnd(38)} ${ok}/${problem.test_cases.length}`,
    );
  }

  console.log(`\n==== OPERATION PROBLEM VERIFICATION ====\npassed: ${pass}, failed: ${fail}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 25)) console.log('  ✗ ' + f);
  }
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
