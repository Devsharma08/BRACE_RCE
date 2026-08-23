import 'dotenv/config';
import { prisma } from "../lib/prisma.js";

async function main() {
  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      name: true,
      problem_number: true,
      github_oid: true,
      difficulty_level: true,
      code_snippets: { select: { language: true, code: true } },
      test_cases: { select: { input: true, expectedOutput: true }, take: 2 }
    },
    orderBy: { problem_number: 'asc' }
  });

  console.log(`TOTAL PROBLEMS IN DB: ${problems.length}\n`);
  for (const p of problems) {
    console.log(`[#${p.problem_number || 'custom'}] ${p.name} (id: ${p.id}, oid: ${p.github_oid})`);
    for (const s of p.code_snippets) {
      const firstLine = s.code.trim().split('\n')[0] || '';
      console.log(`  - ${s.language.toUpperCase().padEnd(10)}: ${firstLine}`);
    }
    if (p.test_cases[0]) {
      console.log(`  - TEST INPUT : ${JSON.stringify(p.test_cases[0].input).slice(0, 80)}`);
      console.log(`  - TEST EXPECT: ${JSON.stringify(p.test_cases[0].expectedOutput).slice(0, 80)}`);
    }
    console.log("--------------------------------------------------------------------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
