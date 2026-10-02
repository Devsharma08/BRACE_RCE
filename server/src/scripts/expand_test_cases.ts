/**
 * Expands the pre-bank problems from their original 2-3 cases up to 10-15.
 *
 * Existing rows shipped with little more than the published examples, so a
 * submission can pass while still being wrong on the general case. For each
 * problem that has a legacy reference we REGENERATE the whole case list:
 * hand-written edge cases first (these become the public ones), then
 * deterministic pseudo-random cases from the reference's own generator.
 *
 * Expected outputs are computed by the reference implementation, never
 * transcribed by hand.
 *
 *   npx tsx src/scripts/expand_test_cases.ts            # dry run
 *   npx tsx src/scripts/expand_test_cases.ts --write    # apply
 *
 * Run `problem:verify` and `problem:verify-exec` first. The backup written by
 * `backup_test_cases.ts` is the recovery path if anything looks wrong.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { fmtIn, fmtOut, Rng } from './problemBank/helpers.js';
import { LEGACY, OPERATION_SEQUENCE } from './problemBank/legacy/index.js';
import type { LegacyEntry } from './problemBank/legacy/types.js';
import { autoTests } from './problemBank/tests.js';

const WRITE = process.argv.includes('--write');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

async function main() {
  const entries = ONLY
    ? LEGACY.filter((e) => ONLY.split(',').includes(String(e.number)))
    : LEGACY;

  if (entries.length === 0) {
    console.log('No legacy entries matched.');
    return;
  }

  let expanded = 0;
  let skipped = 0;
  let wrote = 0;

  for (const e of entries) {
    const problem = await prisma.problem.findUnique({
      where: { problem_number: e.number },
      select: { id: true, name: true, _count: { select: { test_cases: true } } },
    });
    if (!problem) {
      console.log(`  ? #${e.number}: not in the database — skipped`);
      skipped++;
      continue;
    }
    if (OPERATION_SEQUENCE.has(e.number)) {
      console.log(`  ! #${e.number} ${problem.name}: operation-sequence, needs a bespoke adapter`);
      skipped++;
      continue;
    }

    const tests = autoTests(
      e.edge.map((a) => ({ args: a, isPublic: false })),
      (r) => e.gen(r),
      13,
      9000 + e.number,
    );
    if (tests.length < 10) {
      console.log(`  ! #${e.number} ${problem.name}: only ${tests.length} cases generated`);
      skipped++;
      continue;
    }

    // Compute every expected output up front so a broken reference aborts
    // before touching the database.
    const rows = tests.map((tc) => ({
      input: fmtIn(tc.args),
      expectedOutput: fmtOut(e.solve(tc.args)),
      is_public: tc.isPublic ?? false,
    }));

    const pubCount = rows.filter((r) => r.is_public).length;
    console.log(
      `  ${WRITE ? '~' : '+'} #${e.number} ${problem.name}: ` +
        `${problem._count.test_cases} -> ${rows.length} cases (${pubCount} public)`,
    );

    if (WRITE) {
      await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
      await prisma.testCase.createMany({
        data: rows.map((r) => ({ ...r, problemId: problem.id })),
      });
      wrote++;
    }
    expanded++;
  }

  console.log(
    `\n${WRITE ? 'Expanded' : 'Would expand'} ${expanded} problem(s); ${skipped} skipped. ` +
      `${WRITE ? '' : '(dry run — pass --write to apply)'}`,
  );
  if (WRITE && wrote > 0) {
    const total = await prisma.problem.count();
    console.log(`Problems in DB: ${total}`);
  }
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
