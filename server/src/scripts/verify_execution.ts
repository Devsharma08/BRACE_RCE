import 'dotenv/config';
import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS, type SupportedLanguage } from '../services/codeExecution.js';
import { prepareFinalCode } from '../services/codeExecution.js';

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtimeMs: number;
  error?: string;
}

interface CheckResult {
  problemId: string;
  problemName: string;
  language: string;
  caseIndex: number;
  pass: boolean;
  stdout: string;
  expectedOutput: string;
  exitCode: number;
  stderr: string;
}

const failures: CheckResult[] = [];
const passes: CheckResult[] = [];
const skipped: CheckResult[] = [];

function check(
  name: string,
  pass: boolean,
  language: string,
  mode: string,
  input: string,
  expected: string,
  actual: string,
  exitCode: number,
  stderr: string,
  reason?: string,
): void {
  const r: CheckResult = { name, pass, language, mode, input, expected, actual, exitCode, stderr, reason };
  if (pass) passes.push(r);
  else failures.push(r);
}

function skip(name: string, language: string, mode: string, reason: string): void {
  skips.push({ name, pass: false, language, mode, input: '', expected: '', actual: '', exitCode: -1, stderr: '', reason });
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

async function runCodePipeline(
  language: SupportedLanguage,
  code: string,
  stdinInput: string,
  budget: typeof SANDBOX_BUDGETS,
): Promise<{ stdout: string; stderr: string; exitCode: number; runtimeMs: number; error?: string }> {
  const result = await executeDirectly(language, code, stdinInput, budget[language].runTimeoutMs, budget[language].compileTimeoutMs);
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode ?? 0,
    runtimeMs: result.runtimeMs ?? 0,
    error: result.error,
  };
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const problems = await prisma.problem.findMany({
      include: {
        testCases: {
          where: { isPublic: true },
          orderBy: { id: 'asc' },
        },
        codeSnippets: {
          where: {},
        },
      },
      where: {
        testCases: { some: {} },
        codeSnippets: { some: {} },
      },
      orderBy: { problem_number: 'asc' },
    });

    console.log(`Loaded ${problems.length} problems with test cases and code snippets\n`);

    let totalPass = 0;
    let totalFail = 0;
    let totalCases = 0;

    for (const problem of problems) {
      console.log(`\n=== ${problem.name} (${problem.id}) ===`);
      console.log(`  Difficulty: ${problem.difficulty_level}`);

      // Group code snippets by language
      const snippetsByLang: Record<string, string> = {};
      for (const cs of problem.codeSnippets) {
        snippetsByLang[cs.language as SupportedLanguage] = cs.code;
      }

      let problemPass = 0;
      let problemFail = 0;

      for (const lang of langs) {
        const code = snippetsByLang[lang as SupportedLanguage];
        if (!code) continue;

        const preparedCode = prepareFinalCode(language, code, undefined);

        let problemPass = 0;
        let problemFail = 0;

        for (const tc of problem.testCases) {
          const result = await runCodePipeline(lang, preparedCode, tc.input, SANDBOX_BUDGETS[lang]);
          const actual = normalize(result.stdout);
          const expected = normalize(tc.expectedOutput);
          const ok = result.exitCode === 0 && actual === expected;

          if (ok) {
            problemPass++;
            totalPass++;
          } else {
            problemFail++;
            failures.push({
              problemId: problem.id,
              problemName: problem.name,
              language: lang,
              caseIndex: tc.id,
              input: tc.input,
              expected: tc.expectedOutput,
              actual: result.stdout.trim(),
              exitCode: result.exitCode,
              stderr: result.stderr || '',
            });
          }
        }

        totalCases += problemPass + problemFail;

        const status = problemFail === 0 ? 'PASS' : 'FAIL';
        console.log(`  ${status}  ${lang.padEnd(10)} ${problemPass}/${problemPass + problemFail} cases`);
      }
    }

    console.log('\n========================================');
    console.log('FINAL SUMMARY');
    console.log('========================================');
    console.log(`Passes: ${totalPass}`);
    console.log(`Failures: ${totalFail}`);
    console.log(`Skips: ${skips.length}`);

    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const f of failures.slice(0, 30)) {
        console.log(`  FAIL: ${f.problemName}[${f.language}] case ${f.caseIndex}: expected="${f.expected}" actual="${f.actual}"`);
      }
    }

    process.exitCode = failures.length > 0 ? 1 : 0;
  } catch (e: any) {
    console.error('DB error:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exitCode = 1;
});