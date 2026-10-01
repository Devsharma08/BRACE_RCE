/**
 * MIGRATION: JSON-quotes test-case arguments the execution wrapper cannot parse.
 *
 * The wrapper feeds stdin line-by-line through `JSON.parse(input[i])`, but many
 * stored cases pass bare strings (`PAYPALISHIRING`, `4193 with words`), which
 * throw `SyntaxError` and make those problems impossible to submit against.
 * Likewise a problem whose return type is `string` must have its expected
 * output quoted, because the wrapper prints `JSON.stringify(result)`.
 *
 * Rules (deliberately conservative):
 *   input line   -> quote only if it is a bare word / word-with-spaces,
 *                   i.e. NOT already JSON, NOT starting with [ { or (.
 *   expectedOutput -> quote only when the problem's declared return type is
 *                   `string`, and never when it already parses as JSON.
 *
 * Problems using a bespoke DSL (`push(1),peek()`) are reported and left alone —
 * they cannot be expressed under the per-line JSON contract at all.
 *
 * Dry run by default. Pass --write to persist.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

const WRITE = process.argv.includes('--write');

const parses = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

/**
 * Problems whose inputs are an OPERATION SEQUENCE DSL rather than plain values:
 *   push(1),push(2),peek()   ·   set('a',1,100),get('a')   ·   addNum(1),findMedian()
 *   [{id:1,x:1}]            ·   KthLargest(3,[4,5,8,2])
 *
 * These cannot be expressed as one JSON value per stdin line, so they are left
 * exactly as they are. They are listed explicitly rather than detected by
 * shape, because legitimate string arguments also contain parentheses
 * (LeetCode's own example for #25 is `lee(t(c)o)de)`, and #3 is `(()`).
 */
const OPERATION_DSL_PROBLEMS = new Set([
  101, // Implement Queue using Stacks
  109, // Cache With Time Limit
  111, // Debounce
  118, // Join Two Arrays by ID
  124, // Find Median from Data Stream
  132, // Design Twitter
  150, // Design Circular Queue
  160, // Kth Largest Element in a Stream
  163, // Max Stack
  121, // Walls and Gates (INF matrix, not valid JSON)
]);

/**
 * Inputs that LOOK like numbers or whitespace but are actually strings.
 *
 * These cannot be detected by shape — `42` is a valid JSON number, so the
 * quoting rule above correctly leaves it alone — yet the wrapper needs `"42"`
 * because the parameter is a string. Each entry lists the exact raw values
 * that must be quoted, per problem.
 */
const EXPLICIT_STRING_INPUTS: Record<number, string[]> = {
  9: ['42', '-42'],            // String to Integer (atoi); matched on the trimmed line
  155: ['11', '1', '1010', '1011'], // Add Binary — binary digits are strings
};

/**
 * Problems whose expected output is a STRING even though the text happens to be
 * valid JSON (`100` parses as a number, so shape alone cannot tell us).
 * The wrapper prints `JSON.stringify("100")` → `"100"`.
 */
const EXPLICIT_STRING_OUTPUTS: Record<number, string[]> = {
  155: ['100', '10101'],        // Add Binary
};

/**
 * Quote a raw stdin line as a JSON string.
 * Returns null when the line must be left alone (operation DSL / JSON payload).
 */
const asQuotedString = (line: string, problemNumber?: number): string | null => {
  if (!line) return null;
  // Explicit string arguments (digit-only / whitespace-only) always quote.
  if (problemNumber != null && EXPLICIT_STRING_INPUTS[problemNumber]?.includes(line)) {
    return quote(line);
  }
  if (parses(line)) return null;
  if (/^\s*[A-Za-z_$][\w$]*\s*\(/.test(line) && !line.includes(' ')) return null; // e.g. debounce(100)
  if (/^\s*[\[{]/.test(line)) return null; // array / object payloads
  return quote(line);
};

const quote = (line: string): string => JSON.stringify(line);

async function main() {
  const problems = await prisma.problem.findMany({
    include: { test_cases: true, code_snippets: true },
    orderBy: { problem_number: 'asc' },
  });

  let fixedInputs = 0;
  let fixedOutputs = 0;
  let touchedProblems = 0;
  const unfixable: { n: number; name: string; input: string }[] = [];

  for (const p of problems) {
    const js = p.code_snippets.find((s) => s.language === 'javascript')?.code ?? '';
    const ret = js.match(/@return \{([^}]+)\}/)?.[1]?.trim() ?? '';
    const returnsString = ret === 'string';

    let problemChanged = false;

    const updates = p.test_cases.map((tc) => {
      // Operation-DSL problems are never rewritten.
      if (p.problem_number != null && OPERATION_DSL_PROBLEMS.has(p.problem_number)) {
        return { id: tc.id, input: tc.input, expectedOutput: tc.expectedOutput, changed: false };
      }

      let inputChanged = false;
      let quotedLines = 0;
      const nextInput = tc.input
        .split('\n')
        .map((raw) => {
          const s = raw.trim();
          // NOTE: whitespace-only arguments are impossible under the wrapper's
          // `filter(x => x.length > 0)` contract, so they are deliberately not
          // attempted here (e.g. #26's single-space case).
          if (!s) return raw;
          const quoted = asQuotedString(s, p.problem_number ?? undefined);
          if (quoted === null) return raw;
          inputChanged = true;
          quotedLines++;
          return quoted;
        })
        .join('\n');

      let nextOut = tc.expectedOutput;
      const trimmed = tc.expectedOutput.trim();
      // The wrapper prints `JSON.stringify(result)`, so a string result is
      // emitted WITH quotes. Two ways to detect that we need to add them:
      //   1. the declared return type is `string`, or
      //   2. the stored output is not itself valid JSON — a real JSON scalar
      //      (number / true / false / null / [] / {}) always parses, so an
      //      unparseable expected output must be a bare string.
      // Many snippets carry no @return JSDoc at all, so rule 2 is what keeps
      // problems like #170 ("BANC") consistent with what the wrapper prints.
      //
      // Idempotence: when the output ALREADY parses as a JSON string it is
      // already correctly quoted — re-quoting would produce "\"bab\"" and break
      // a previously-correct case, so that case is skipped.
      const alreadyJsonString =
        trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
      const explicitOut =
        EXPLICIT_STRING_OUTPUTS[p.problem_number ?? -1]?.includes(trimmed) ?? false;
      const needsQuotes = returnsString || explicitOut || !parses(trimmed);
      let outputChanged = false;
      if (trimmed && needsQuotes && !alreadyJsonString) {
        nextOut = `${quote(trimmed)}\n`;
        outputChanged = true;
      }

      const input = inputChanged ? nextInput : tc.input;
      const expectedOutput = outputChanged ? nextOut : tc.expectedOutput;

      // SAFETY GUARD — never persist a case that still fails JSON.parse.
      // The wrapper does `JSON.parse(input[i])`, so an unparseable line means
      // the problem is unrunnable; writing that would be worse than doing
      // nothing, so the case is skipped and reported instead. Counters are
      // only advanced for changes that survive this guard.
      const allLinesParse = input
        .split('\n')
        .every((l) => !l.trim() || parses(l.trim()));
      if (!allLinesParse) {
        unfixable.push({ n: p.problem_number ?? 0, name: p.name, input: tc.input.trim() });
        return { id: tc.id, input: tc.input, expectedOutput: tc.expectedOutput, changed: false };
      }

      if (inputChanged) fixedInputs += quotedLines;
      if (outputChanged) fixedOutputs += 1;
      if (inputChanged || outputChanged) problemChanged = true;

      return {
        id: tc.id,
        input,
        expectedOutput,
        changed: inputChanged || outputChanged,
      };
    });

    const changed = updates.filter((u) => u.changed);
    if (!changed.length) continue;

    touchedProblems++;
    console.log(`  #${p.problem_number} ${p.name} — ${changed.length} case(s)`);
    for (const u of changed) {
      const before = p.test_cases.find((t) => t.id === u.id)!;
      console.log(`      in : ${JSON.stringify(before.input.trim().slice(0, 60))}`);
      console.log(`      out: ${JSON.stringify(before.expectedOutput.trim().slice(0, 40))}`);
      console.log(`   -> in : ${JSON.stringify(u.input.trim().slice(0, 60))}`);
      console.log(`   -> out: ${JSON.stringify(u.expectedOutput.trim().slice(0, 40))}`);
    }

    if (WRITE) {
      await prisma.$transaction(
        updates
          .filter((u) => u.changed)
          .map((u) =>
            prisma.testCase.update({
              where: { id: u.id },
              data: { input: u.input, expectedOutput: u.expectedOutput },
            }),
          ),
      );
    }
  }

  console.log(`\n${WRITE ? 'FIXED' : 'WOULD FIX'}: ${fixedInputs} input lines, ${fixedOutputs} expected outputs across ${touchedProblems} problems.`);

  if (unfixable.length) {
    console.log(
      `\n⚠  ${unfixable.length} case(s) still not JSON-parseable and were left UNCHANGED:`,
    );
    const seen = new Set<number>();
    for (const u of unfixable) {
      if (seen.has(u.n)) continue;
      seen.add(u.n);
      console.log(`   #${u.n} ${u.name} — ${JSON.stringify(u.input.slice(0, 60))}`);
    }
    console.log(
      '   These are operation-sequence DSL problems (push(1),peek()) or INF matrices.',
    );
    console.log('   They need a bespoke wrapper, not a data fix — see the report.');
  }
}

const entry = async () => {
  if (process.argv.includes('--repair')) await repair();
  else await main();
};

entry()
  .catch((e) => {
    console.error('❌', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * REPAIR: undo an accidental double-quoting pass.
 *
 * An earlier revision of this script re-quoted outputs that were already JSON
 * strings, turning `"bab"` into `"\"bab\""`. This collapses any expectedOutput
 * that is a JSON string whose CONTENT is itself a quoted string back down to a
 * single level of quoting. Only applies when the inner value round-trips.
 *
 * Dry run by default. Pass --write to persist.
 */
async function repair() {
  const cases = await prisma.testCase.findMany();
  const write = process.argv.includes('--write');
  let repaired = 0;

  for (const tc of cases) {
    const t = tc.expectedOutput.trim();
    if (!t.startsWith('"') || !t.endsWith('"')) continue;
    let outer: unknown;
    try {
      outer = JSON.parse(t);
    } catch {
      continue;
    }
    if (typeof outer !== 'string') continue;
    if (!outer.startsWith('"') || !outer.endsWith('"')) continue;
    let inner: unknown;
    try {
      inner = JSON.parse(outer);
    } catch {
      continue;
    }
    const fixed = `${JSON.stringify(inner)}\n`;
    repaired++;
    console.log(`  ${tc.id.slice(0, 8)}  ${t}  ->  ${fixed.trim()}`);
    if (write) {
      await prisma.testCase.update({
        where: { id: tc.id },
        data: { expectedOutput: fixed },
      });
    }
  }
  console.log(`\n${write ? 'REPAIRED' : 'WOULD REPAIR'}: ${repaired} double-quoted expected outputs.`);
}