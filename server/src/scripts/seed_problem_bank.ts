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

  /**
   * Reduce a name to its comparable essence: lowercase, alphanumerics only.
   *
   * "Longest Substring Without Repeating Characters" and "Longest Substring
   * Without Repeating" normalise to keys differing only by a trailing word, so
   * a containment test catches the near-duplicate that strict equality missed.
   */
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  /**
   * True when one name is the other plus a short trailing qualifier.
   *
   * Containment alone is far too eager: "Subsets" is contained in
   * "Subset Sum", but those are genuinely different problems. Requiring a long
   * shared stem plus one short trailing word separates the real duplicates
   * from coincidental prefix overlap.
   */
  const isNearDuplicate = (mine: string, theirs: string): boolean => {
    if (theirs === mine) return false;
    if (!theirs.includes(mine) && !mine.includes(theirs)) return false;
    const [short, long] =
      theirs.length <= mine.length ? [theirs, mine] : [mine, theirs];
    const extra = long.slice(short.length);
    return short.length >= 12 && /^[a-z]{1,11}$/.test(extra);
  };

  let inserted = 0;
  let skipped = 0;
  const collisions: { number: number; name: string; near?: string }[] = [];

  for (const p of BANK) {
    if (takenNames.has(p.name.toLowerCase())) {
      const already = existing.find((x) => x.name.toLowerCase() === p.name.toLowerCase());
      // Same number means it was seeded before; otherwise it is a real
      // collision with an unrelated problem and needs renaming.
      if (already && already.problem_number !== p.number) {
        collisions.push({ number: p.number, name: p.name });
      }
      console.log(`  = ${p.name} (already present)`);
      skipped++;
      continue;
    }

    // Near-duplicate guard: a strict-equality check is not enough. "Longest
    // Substring Without Repeating" is a prefix of #4 "Longest Substring
    // Without Repeating Characters" and would otherwise seed as a new
    // problem even though it is the same task.
    const mine = normalise(p.name);
    const near = existing.find((x) => isNearDuplicate(mine, normalise(x.name)));
    if (near) {
      collisions.push({ number: p.number, name: p.name, near: `#${near.problem_number} ${near.name}` });
      console.log(`  = ${p.name} (near-duplicate of #${near.problem_number} ${near.name})`);
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
    // Track newly seeded names too, so two entries in the SAME bank that are
    // near-duplicates of each other are caught on the first pass.
    existing.push({ problem_number: p.number, name: p.name });
    inserted++;
  }

  // A name collision silently skips an entry, which reads as success but
  // leaves a problem unseeded. Report those separately so they are noticed.
  if (collisions.length) {
    console.log('\n⚠ Name collisions (not seeded — rename these entries):');
    for (const c of collisions) {
      const suffix = c.near ? `  ← near-duplicate of ${c.near}` : '';
      console.log(`    #${c.number} ${c.name}${suffix}`);
    }
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