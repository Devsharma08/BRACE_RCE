import 'dotenv/config';
import { prisma } from "../Lib/prisma.js";

async function main() {
  const problems = await prisma.problem.findMany({
    include: {
      code_snippets: true,
      test_cases: true,
    }
  });

  console.log(`Found ${problems.length} problems in database:\n`);
  for (const p of problems) {
    console.log(`=== PROBLEM #${p.problem_number || ''}: ${p.name} (id: ${p.id}, oid: ${p.github_oid}) ===`);
    console.log(`Difficulty: ${p.difficulty_level}`);
    console.log(`Snippets languages (${p.code_snippets.length}): ${p.code_snippets.map(s => s.language).join(", ")}`);
    console.log(`Test cases count: ${p.test_cases.length}`);
    for (const snip of p.code_snippets) {
      console.log(`\n--- Language: ${snip.language} ---`);
      console.log(`Code snippet:\n${snip.code}\n`);
      if (snip.wrapperCode) {
        console.log(`Wrapper code:\n${snip.wrapperCode.slice(0, 150)}...\n`);
      }
    }
    for (let i = 0; i < Math.min(3, p.test_cases.length); i++) {
      const tc = p.test_cases[i];
      console.log(`TestCase #${i+1}: Input: ${JSON.stringify(tc?.input)} | Expected: ${JSON.stringify(tc?.expectedOutput)}`);
    }
    console.log("=====================================================\n");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
