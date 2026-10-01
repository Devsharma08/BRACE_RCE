/** SNAPSHOT (read-only): dumps every TestCase so a bad migration can be undone. */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';

async function main() {
  const cases = await prisma.testCase.findMany({
    include: { problem: { select: { problem_number: true, name: true } } },
    orderBy: [{ problem: { problem_number: 'asc' } }, { id: 'asc' }],
  });
  const out = cases.map((c) => ({
    id: c.id,
    problem_number: c.problem?.problem_number ?? null,
    problem_name: c.problem?.name ?? null,
    input: c.input,
    expectedOutput: c.expectedOutput,
    is_public: c.is_public,
  }));
  const file = path.join(process.cwd(), '..', 'test_cases_backup.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Backed up ${out.length} test cases to ${file}`);
}
main().finally(() => prisma.$disconnect());
