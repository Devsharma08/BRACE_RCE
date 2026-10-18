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

  let missingPy = 0, missingC = 0, missingCpp = 0, missingJava = 0, missingJs = 0;
  const missingDetails: any[] = [];

  for (const p of problems) {
    const langs = new Set(p.code_snippets.map(s => s.language));
    const missing = [];
    if (!langs.has('python')) { missingPy++; missing.push('python'); }
    if (!langs.has('c')) { missingC++; missing.push('c'); }
    if (!langs.has('cpp')) { missingCpp++; missing.push('cpp'); }
    if (!langs.has('java')) { missingJava++; missing.push('java'); }
    if (!langs.has('javascript')) { missingJs++; missing.push('javascript'); }

    if (missing.length > 0) {
      missingDetails.push({ number: p.problem_number, name: p.name, langs: Array.from(langs), missing });
    }
  }

  console.log('=== SNIPPET SUMMARY ===');
  console.log('Total problems:', problems.length);
  console.log('Missing Python:', missingPy);
  console.log('Missing C:', missingC);
  console.log('Missing C++:', missingCpp);
  console.log('Missing Java:', missingJava);
  console.log('Missing JavaScript:', missingJs);
  console.log('Avg snippets/problem:', (problems.reduce((s,p) => s + p.code_snippets.length, 0) / problems.length).toFixed(1));

  // Test case summary
  const tcCounts = await prisma.testCase.groupBy({
    by: ['problemId'],
    _count: { _all: true }
  });
  const tcByCount: Record<number, number> = {};
  for (const c of tcCounts) {
    const n = c._count._all;
    tcByCount[n] = (tcByCount[n] || 0) + 1;
  }
  console.log('\n=== TEST CASE SUMMARY ===');
  console.log('Case count distribution:', JSON.stringify(tcByCount));
  const under15 = tcCounts.filter(c => c._count._all < 15).length;
  const over15 = tcCounts.filter(c => c._count._all > 15).length;
  console.log('Under 15 cases:', under15);
  console.log('Over 15 cases:', over15);
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
