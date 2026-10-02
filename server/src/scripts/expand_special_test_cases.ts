/**
 * Expands the four bespoke-driver problems from 1-3 cases to 10-15.
 *
 * Their inputs are not JSON arguments (Clone Graph) and not call scripts (the
 * async ones), so each case is generated as raw stdin text and its expected
 * output is obtained by running the reference through the real
 * `prepareFinalCode` pipeline on Piston.
 *
 *   npx tsx src/scripts/expand_special_test_cases.ts          # dry run
 *   npx tsx src/scripts/expand_special_test_cases.ts --write  # apply
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import { Rng } from './problemBank/helpers.js';
import { SPECIAL_REFS } from './problemBank/specialRefs.js';
import { SPECIAL_TESTS } from './problemBank/specialTests.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';
const WRITE = process.argv.includes('--write');
const TARGET = 12;

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

  for (const spec of SPECIAL_TESTS) {
    const problem = await prisma.problem.findUnique({
      where: { problem_number: spec.number },
      include: { test_cases: true, code_snippets: { where: { language: 'javascript' } } },
    });
    const snippet = problem?.code_snippets[0];
    const reference = SPECIAL_REFS[spec.number];
    if (!problem || !snippet || !reference) {
      console.log(`  ? #${spec.number}: missing data`);
      continue;
    }

    const prepared = prepareFinalCode('javascript', reference, {
      code: snippet.code,
      wrapperCode: snippet.wrapperCode,
    });

    // Existing cases are dropped: for these problems the stored ones are either
    // unresolvable (Clone Graph) or placeholder prose ("Delayed execution"),
    // so every case is regenerated.
    const seen = new Set<string>();
    const rows = [];
    const r = new Rng(3300 + spec.number);
    let guard = 0;
    while (rows.length < TARGET && guard++ < TARGET * 60) {
      const stdin = spec.gen(r);
      if (seen.has(stdin)) continue;
      seen.add(stdin);
      let expected: string;
      try {
        expected = await piston(prepared, stdin);
      } catch (e: any) {
        console.log(`  ! #${spec.number}: generator error — ${String(e.message).slice(0, 80)}`);
        continue;
      }
      rows.push({ input: `${stdin}\n`, expectedOutput: `${expected}\n`, is_public: rows.length < 3 });
    }

    console.log(
      `  ${WRITE ? '~' : '+'} #${spec.number} ${problem.name}: ` +
        `${problem.test_cases.length} -> ${rows.length} cases (${rows.filter((x) => x.is_public).length} public)`,
    );

    if (WRITE) {
      await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
      await prisma.testCase.createMany({
        data: rows.map((x) => ({ ...x, problemId: problem.id })),
      });
    }
    expanded++;
  }

  console.log(`\n${WRITE ? 'Expanded' : 'Would expand'} ${expanded} problem(s). ${WRITE ? '' : '(dry run — pass --write to apply)'}`);
}

main()
  .catch((e) => { console.error('❌', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
