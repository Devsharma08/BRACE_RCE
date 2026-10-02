/**
 * Recomputes the expected outputs of the operation-sequence problems.
 *
 * These 7 problems shipped with hand-written expected outputs that were never
 * validated against any implementation. Several are simply wrong, e.g.
 * Find Median from Data Stream stores "1.5,2.0" for
 * `addNum(1),addNum(2),findMedian(),addNum(3),findMedian()` even though the
 * median after adding 3 is 3, not 2.
 *
 * This runs the reference implementation for each problem through the real
 * `prepareFinalCode` pipeline on Piston and stores whatever it prints, so the
 * stored answer is by construction the one a correct submission produces.
 *
 *   npx tsx src/scripts/fix_operation_expected.ts           # dry run
 *   npx tsx src/scripts/fix_operation_expected.ts --write   # apply
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import { OPERATION_REFERENCES, OPERATION_PROBLEMS } from './problemBank/operationRefs.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';
const WRITE = process.argv.includes('--write');

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
  if (j?.run?.code !== 0) throw new Error(j?.run?.stderr ?? j?.message ?? `exit ${j?.run?.code}`);
  return (j.run.stdout as string).trim();
}

async function main() {
  let changed = 0;
  let same = 0;
  let failed = 0;

  for (const num of OPERATION_PROBLEMS) {
    const problem = await prisma.problem.findUnique({
      where: { problem_number: num },
      include: { test_cases: true, code_snippets: { where: { language: 'javascript' } } },
    });
    const snippet = problem?.code_snippets[0];
    const reference = OPERATION_REFERENCES[num];
    if (!problem || !snippet || !reference) {
      console.log(`  ?  #${num}: skipped (missing data)`);
      continue;
    }

    const prepared = prepareFinalCode('javascript', reference, {
      code: snippet.code,
      wrapperCode: snippet.wrapperCode,
    });

    for (const tc of problem.test_cases) {
      const stored = tc.expectedOutput.trim();
      let actual: string;
      try {
        actual = await piston(prepared, tc.input.replace(/\n$/, ''));
      } catch (e: any) {
        console.log(`  ✗ #${num} case ${tc.id.slice(0, 8)}: ${String(e.message).slice(0, 110)}`);
        failed++;
        continue;
      }
      if (actual === stored) {
        same++;
        continue;
      }
      changed++;
      console.log(
        `  ~ #${num} ${problem.name}\n` +
        `      input   : ${JSON.stringify(tc.input.slice(0, 90))}\n` +
        `      was     : ${JSON.stringify(stored)}\n` +
        `      correct : ${JSON.stringify(actual)}`,
      );
      if (WRITE) {
        await prisma.testCase.update({
          where: { id: tc.id },
          data: { expectedOutput: `${actual}\n` },
        });
      }
    }
  }

  console.log(
    `\n${WRITE ? 'Fixed' : 'Would fix'} ${changed} expected output(s); ` +
      `${same} already correct; ${failed} errored. ` +
      `${WRITE ? '' : '(dry run — pass --write to apply)'}`,
  );
}

main()
  .catch((e) => { console.error('❌', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
