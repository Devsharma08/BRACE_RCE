/**
 * ANALYSIS (read-only): classifies stored test cases by how well they survive
 * the execution wrapper's `JSON.parse(input[i])` per-line contract.
 *
 * Three buckets:
 *  - plain-bad  : a bare scalar/word line that JSON.parse rejects but that is
 *                 legitimately a string argument (fixable by JSON-quoting).
 *  - bad-output : expectedOutput that is not valid JSON (e.g. an unquoted
 *                 string result), so it can never equal the wrapper's output.
 *  - custom     : inputs in a bespoke DSL (e.g. `push(1),peek()`), which the
 *                 per-line JSON contract cannot represent at all.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

const parses = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  const problems = await prisma.problem.findMany({
    include: { test_cases: true, code_snippets: true },
    orderBy: { problem_number: 'asc' },
  });

  const rows: {
    n: number;
    name: string;
    ret: string;
    cases: number;
    plainBad: number;
    badOut: number;
    custom: number;
  }[] = [];

  for (const p of problems) {
    const js = p.code_snippets.find((s) => s.language === 'javascript')?.code ?? '';
    const ret = js.match(/@return \{([^}]+)\}/)?.[1]?.trim() ?? '?';

    let plainBad = 0;
    let badOut = 0;
    let custom = 0;
    for (const t of p.test_cases) {
      for (const line of t.input.trim().split('\n')) {
        const s = line.trim();
        if (!s || parses(s)) continue;
        // Bespoke DSL: calls (`push(1)`) or object literals (`{id:1}`).
        if (/[A-Za-z_$][\w$]*\s*\(/.test(s) || (/[{]/.test(s) && /[:"']/.test(s))) custom++;
        else plainBad++;
      }
      if (t.expectedOutput.trim() && !parses(t.expectedOutput.trim())) badOut++;
    }

    if (plainBad || badOut || custom) {
      rows.push({
        n: p.problem_number ?? 0,
        name: p.name.slice(0, 36),
        ret,
        cases: p.test_cases.length,
        plainBad,
        badOut,
        custom,
      });
    }
  }

  console.log('  #  | return type        | cases | plainBad | badOut | custom | name');
  console.log('-----+--------------------+-------+----------+--------+--------+------');
  for (const r of rows) {
    console.log(
      `${String(r.n).padEnd(4)} | ${r.ret.padEnd(18)} | ${String(r.cases).padEnd(5)} | ` +
        `${String(r.plainBad).padEnd(8)} | ${String(r.badOut).padEnd(6)} | ${String(r.custom).padEnd(6)} | ${r.name}`,
    );
  }

  const sum = (k: 'plainBad' | 'badOut' | 'custom') =>
    rows.reduce((a, r) => a + r[k], 0);
  console.log(`\naffected problems: ${rows.length} / ${problems.length}`);
  console.log(`  quoteable input lines : ${sum('plainBad')}`);
  console.log(`  unquoted expectedOut  : ${rows.filter((r) => r.badOut).length} problems`);
  console.log(`  custom DSL problems   : ${rows.filter((r) => r.custom).length}`);
  console.log(
    `  fully auto-fixable    : ${rows.filter((r) => r.plainBad && !r.custom).length} problems`,
  );
}

main()
  .catch((e) => console.error('ERR', e))
  .finally(() => prisma.$disconnect());