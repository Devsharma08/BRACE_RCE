import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

async function main() {
  const problems = await prisma.problem.findMany({
    where: { isCustom: false },
    select: {
      problem_number: true,
      name: true,
      code_snippets: { select: { language: true } }
    }
  });

  for (const p of problems) {
    const langs = new Set(p.code_snippets.map(s => s.language));
    const missing = [];
    if (!langs.has('python')) missing.push('python');
    if (!langs.has('c')) missing.push('c');
    if (!langs.has('cpp')) missing.push('cpp');
    if (!langs.has('java')) missing.push('java');
    if (!langs.has('javascript')) missing.push('javascript');

    if (missing.length > 0) {
      console.log(`#${p.problem_number} ${p.name}: has [${Array.from(langs).join(',')}], missing [${missing.join(',')}]`);
    }
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
