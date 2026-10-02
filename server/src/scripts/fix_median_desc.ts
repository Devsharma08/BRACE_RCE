/**
 * Corrects the Median of Two Sorted Arrays description.
 *
 * The examples advertised `2.00000`, LeetCode's 5-decimal display format. The
 * execution wrapper serialises with JSON.stringify, so a correct submission
 * returning the number 2 prints `2` — the documented output was unreachable
 * and the stored test cases were recomputed to match what is actually printed.
 *
 *   npx tsx src/scripts/fix_median_desc.ts           # dry run
 *   npx tsx src/scripts/fix_median_desc.ts --write   # apply
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

const WRITE = process.argv.includes('--write');

async function main() {
  const problem = await prisma.problem.findUnique({
    where: { problem_number: 5 },
    select: { id: true, name: true, problem_definition: true },
  });
  if (!problem) {
    console.log('  ? #5 not found');
    return;
  }

  const before = problem.problem_definition ?? '';
  if (!before.includes('2.00000')) {
    console.log('  = description already free of the 5-decimal format');
    return;
  }

  // 2.00000 -> 2 and 2.50000 -> 2.5, i.e. drop trailing zeros.
  const after = before
    .replace(/(\d+)\.00000\b/g, '$1')
    .replace(/(\d+)\.(\d*?[1-9])0000\b/g, '$1.$2')
    .replace(
      '</pre>',
      '\n<strong>Note:</strong> output is a JSON number, so 2 rather than 2.00000.\n</pre>',
    );

  console.log(`  ~ #5 ${problem.name}`);
  console.log('      before: 2.00000 / 2.50000');
  console.log('      after : 2 / 2.5');

  if (WRITE) {
    await prisma.problem.update({
      where: { id: problem.id },
      data: { problem_definition: after },
    });
    console.log('      written');
  } else {
    console.log('      (dry run — pass --write to apply)');
  }
}

main()
  .catch((e) => { console.error('❌', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
