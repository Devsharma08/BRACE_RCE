import 'dotenv/config';
import { prisma } from "../lib/prisma.js";

async function main() {
  const problems = await prisma.problem.findMany({
    take: 30,
    include: {
      code_snippets: true,
      test_cases: { take: 2 }
    },
    orderBy: { problem_number: 'asc' }
  });

  for (const p of problems) {
    console.log(`[#${p.problem_number || 'custom'}] ${p.name}`);
    console.log(`  Snippets: ${p.code_snippets.map(s => s.language).join(', ')}`);
    for (const tc of p.test_cases) {
      console.log(`  TC Input:  ${JSON.stringify(tc.input)}`);
      console.log(`  TC Expect: ${JSON.stringify(tc.expectedOutput)}`);
    }
    console.log("--------------------------------------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
