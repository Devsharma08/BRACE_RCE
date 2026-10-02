/**
 * Seeds the verified problem bank into PostgreSQL.
 *
 * Dry run by default (prints the plan); pass `--write` to persist.
 * Every entry carries a reference implementation, so expected outputs are
 * COMPUTED, never guessed. Run `verify_problem_bank.ts` and
 * `verify_execution.ts` before writing.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { Level } from '../generated/prisma/client.js';
import { fmtIn, fmtOut } from './problemBank/helpers.js';
import { buildSnippets } from './problemBank/snippets.js';
import { BANK } from './problemBank/banks/index.js';
const WRITE = process.argv.includes('--write');

async function main() {
  const existing = await prisma.problem.findMany({
    select: { problem_number: true, name: true },
  });
  const takenNumbers = new Set(existing.map((p) => p.problem_number));
  const takenNames = new Set(existing.map((p) => p.name.toLowerCase()));

  let inserted = 0;
  let skipped = 0;

  for (const p of BANK) {
    if (takenNames.has(p.name.toLowerCase())) {
      console.log(`  = ${p.name} (already present)`);
      skipped++;
      continue;
    }
    if (takenNumbers.has(p.number)) {
      console.log(`  ! ${p.name}: number #${p.number} already used — skipped`);
      skipped++;
      continue;
    }

    const testCases = p.tests.map((tc) => ({
      input: fmtIn(tc.args),
      expectedOutput: fmtOut(p.solve(tc.args)),
      is_public: tc.isPublic ?? false,
    }));

    console.log(
      `  + #${p.number} ${p.name} [${p.difficulty}/${p.category}] ` +
        `${testCases.length} cases (${testCases.filter((t) => t.is_public).length} public), ` +
        `${buildSnippets(p.signature).length} snippets`,
    );

    if (WRITE) {
      await prisma.problem.create({
        data: {
          name: p.name,
          problem_number: p.number,
          problem_definition: p.definition,
          problem_hints: p.hints,
          difficulty_level: p.difficulty as Level,
          isCustom: false,
          creatorId: null,
          test_cases: { create: testCases },
          code_snippets: { create: buildSnippets(p.signature) },
        },
      });
    }

    takenNumbers.add(p.number);
    takenNames.add(p.name.toLowerCase());
    inserted++;
  }

  const total = await prisma.problem.count();
  console.log(
    `\n${WRITE ? 'Seeded' : 'Would seed'} ${inserted} problem(s); ${skipped} skipped. ` +
      `Problems in DB: ${total}${WRITE ? '' : '  (dry run — pass --write to apply)'}`,
  );
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());