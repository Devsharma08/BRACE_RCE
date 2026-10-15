import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '/home/devsharma08/code/BRACE_RCE/server/dist/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const total = await prisma.problem.count();
  const byCustom = await prisma.problem.groupBy({
    by: ['isCustom'],
    _count: true,
  });
  console.log('TOTAL_PROBLEMS', total);
  console.log('BY_ISCUSTOM', JSON.stringify(byCustom, null, 2));

  const system = await prisma.problem.findMany({
    where: { isCustom: false },
    orderBy: { problem_number: 'asc' },
    select: { id: true, problem_number: true, name: true, difficulty_level: true },
    take: 5,
  });
  console.log('SYSTEM_SAMPLE', JSON.stringify(system, null, 2));

  const custom = await prisma.problem.findMany({
    where: { isCustom: true },
    orderBy: { problem_number: 'asc' },
    select: { id: true, problem_number: true, name: true, difficulty_level: true },
    take: 5,
  });
  console.log('CUSTOM_SAMPLE', JSON.stringify(custom, null, 2));

  // Any problem with missing/zero problem_number, or a duplicate number?
  const dupes = await prisma.problem.groupBy({
    by: ['problem_number', 'isCustom'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });
  console.log('DUPES_BY_NUMBER', JSON.stringify(dupes, null, 2));

  const nulls = await prisma.problem.findMany({
    where: { problem_number: null },
    select: { id: true, name: true },
    take: 5,
  });
  console.log('NULL_NUMBER_SAMPLE', JSON.stringify(nulls, null, 2));

  const testCases = await prisma.testCase.count();
  console.log("TOTAL_TEST_CASES", testCases);
}

main().catch((e) => {
  console.error('QUERY_ERROR', e);
  process.exit(1);
});
