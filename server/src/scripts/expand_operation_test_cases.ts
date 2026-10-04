/**
 * Expands the operation-sequence problems from 1-2 cases to 10-15.
 *
 * Their inputs are call scripts rather than JSON arguments, so this script
 * works directly on the script text and computes each expected output by
 * executing the reference through the real `prepareFinalCode` pipeline on
 * Piston. That guarantees the stored answer is exactly what a correct
 * submission prints, with no hand transcription.
 *
 *   npx tsx src/scripts/expand_operation_test_cases.ts          # dry run
 *   npx tsx src/scripts/expand_operation_test_cases.ts --write  # apply
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import { Rng } from './problemBank/helpers.js';
import { OPERATION_TESTS } from './problemBank/operationTests.js';
import { OPERATION_REFERENCES } from './problemBank/operationRefs.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';
const WRITE = process.argv.includes('--write');
const TARGET = 15;

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
  let expanded = 0;

  for (const spec of OPERATION_TESTS) {
    const problem = await prisma.problem.findUnique({
      where: { problem_number: spec.number },
      include: { test_cases: true, code_snippets: { where: { language: 'javascript' } } },
    });
    const snippet = problem?.code_snippets[0];
    const reference = OPERATION_REFERENCES[spec.number];
    if (!problem || !snippet || !reference) {
      console.log(`  ? #${spec.number}: missing data`);
      continue;
    }

    const prepared = prepareFinalCode('javascript', reference, {
      code: snippet.code,
      wrapperCode: snippet.wrapperCode,
    });

    // Keep the hand-written cases first: they are the documented examples.
    const kept = problem.test_cases.map((t) => ({
      input: t.input.replace(/\n$/, ''),
      expectedOutput: t.expectedOutput.trim(),
      isPublic: t.is_public,
    }));

    const seen = new Set(kept.map((t) => t.input));
    const generated = [];
    const r = new Rng(7700 + spec.number);
    let guard = 0;
    while (kept.length + generated.length < TARGET && guard++ < TARGET * 60) {
      const script = spec.gen(r);
      if (seen.has(script)) continue;
      seen.add(script);
      let expected: string;
      try {
        expected = await piston(prepared, script);
      } catch (e: any) {
        // A generator that produces an invalid sequence is skipped rather
        // than stored with a bogus expectation.
        console.log(`  ! #${spec.number}: generator error — ${String(e.message).slice(0, 90)}`);
        continue;
      }
      generated.push({ input: script, expectedOutput: expected, isPublic: false });
    }

    // Public cases are capped so the UI stays readable.
    const rows = [...kept, ...generated].map((row, i) => ({
      input: `${row.input}\n`,
      expectedOutput: `${row.expectedOutput}\n`,
      is_public: i < 3,
    }));

    console.log(
      `  ${WRITE ? '~' : '+'} #${spec.number} ${problem.name}: ` +
        `${problem.test_cases.length} -> ${rows.length} cases (${rows.filter((x) => x.is_public).length} public)`,
    );

    if (WRITE) {
      await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
      await prisma.testCase.createMany({
        data: rows.map((r2) => ({ ...r2, problemId: problem.id })),
      });
    }
    expanded++;
  }

  console.log(
    `\n${WRITE ? 'Expanded' : 'Would expand'} ${expanded} problem(s). ` +
      `${WRITE ? '' : '(dry run — pass --write to apply)'}`,
  );
}

main()
  .catch((e) => { console.error('❌', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
