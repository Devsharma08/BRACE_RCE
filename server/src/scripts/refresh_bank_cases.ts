/**
 * Regenerates the test cases of every BANK problem from its reference.
 *
 * `seed_problem_bank.ts` only ever CREATEs, so raising a bank's `autoTests`
 * total and re-seeding silently does nothing for problems already in the
 * database — the new total takes effect only for problems seeded afterwards.
 * `expand_test_cases.ts` does update, but it covers LEGACY, not BANK.
 *
 * This closes that gap: same delete-then-recreate as the expander, keyed by
 * `problem_number`, with expected outputs computed by the reference `solve`
 * rather than transcribed. Only test cases are touched — the definition,
 * hints and snippets are left exactly as seeded.
 *
 *   npx tsx src/scripts/refresh_bank_cases.ts           # dry run
 *   npx tsx src/scripts/refresh_bank_cases.ts --write   # apply
 *
 * Dry run is the default and prints every before/after count; nothing is
 * deleted until --write is passed.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { fmtIn, fmtOut } from './problemBank/helpers.js';
import { BANK } from './problemBank/banks/index.js';

const WRITE = process.argv.includes('--write');

/**
 * Piston's sandbox SIGKILLs a process whose stdout exceeds this, reporting
 * "stdout length exceeded". A test case whose expected output is larger than
 * that is therefore UNPASSABLE: the user writes a correct solution, the
 * sandbox kills it, and the case reports a wrong answer.
 *
 * This is not hypothetical — a Permutations generator that allowed five
 * distinct values produced 1.8 kB of output and shipped two such cases.
 * Anything at or over the limit is refused here rather than written, so a
 * generator change can never silently introduce an unwinnable case again.
 */
const MAX_STDOUT_BYTES = 1024;

async function main() {
  const rows = await prisma.problem.findMany({
    select: {
      id: true,
      problem_number: true,
      name: true,
      test_cases: { select: { input: true, expectedOutput: true } },
    },
  });
  const byNumber = new Map(rows.filter((r) => r.problem_number != null).map((r) => [r.problem_number as number, r]));

  let touched = 0;
  let grew = 0;
  let missing: number[] = [];
  const blocked: string[] = [];

  for (const p of BANK as any[]) {
    const problem = byNumber.get(p.number);
    if (!problem) { missing.push(p.number); continue; }

    const cases = (p.tests as any[]).map((t: any) => ({
      input: fmtIn(t.args).replace(/\n$/, ''),
      expectedOutput: fmtOut(p.solve(t.args)).trim(),
      is_public: t.isPublic ?? false,
    }));
    const before = problem.test_cases.length;

    // Refuse an unwinnable case rather than shipping it.
    const oversized = cases.filter((c) => Buffer.byteLength(c.expectedOutput, 'utf8') >= MAX_STDOUT_BYTES);
    if (oversized.length) {
      blocked.push(
        `#${p.number} ${problem.name}: ${oversized.length} case(s) whose expected output is ` +
          `${Math.max(...oversized.map((c) => Buffer.byteLength(c.expectedOutput, 'utf8')))} bytes, ` +
          `over Piston's ${MAX_STDOUT_BYTES}-byte stdout cap — the sandbox would SIGKILL a correct ` +
          `submission, so these are NOT written`,
      );
      continue;
    }

    // Compare CONTENT, not just the count. A generator change that keeps the
    // same number of cases — narrowing a range, say — would otherwise be
    // skipped and the stale cases would stay in the database. That is how two
    // unwinnable Permutations cases survived a fix: the count was already 15.
    const sameContent =
      before === cases.length &&
      cases.every((c, i) => {
        const db = problem.test_cases[i];
        return db && db.input === c.input && String(db.expectedOutput).trim() === c.expectedOutput;
      });
    if (sameContent) continue;
    grew++;

    console.log(
      `  ${WRITE ? '~' : '+'} #${p.number} ${problem.name}: ${before} -> ${cases.length} cases` +
        `${before === cases.length ? ' (content changed)' : ''}`,
    );

    if (WRITE) {
      await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
      await prisma.testCase.createMany({
        data: cases.map((c) => ({ ...c, problemId: problem.id })),
      });
      touched++;
    }
  }

  console.log(
    `\n${WRITE ? 'Refreshed' : 'Would refresh'} ${grew} of ${BANK.length} bank problem(s); ` +
      `${touched} written. ` + `${missing.length} not in DB (numbers: ${missing.join(', ') || 'none'}). ` +
      `${WRITE ? '' : '(dry run — pass --write to apply)'}`,
  );

  if (blocked.length) {
    console.log('\nREFUSED (expected output exceeds the sandbox stdout cap):');
    for (const b of blocked) console.log(`  ! ${b}`);
  }
  if (missing.length) {
    console.log('  Missing ones are simply not seeded yet; seed them with seed_problem_bank.ts --write.');
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
