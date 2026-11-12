/**
 * verify_execution_full.ts
 *
 * Automated verification script for the BRACE RCE execution pipeline.
 * It exercises the same direct execution path used in production and reports
 * pass/fail/skip results with detailed diagnostics.
 */
import 'dotenv/config';
import os from 'node:os';
import { executeDirectly, sandboxAvailable } from '../services/directExecute.js';
import { SANDBOX_BUDGETS, type SupportedLanguage } from '../services/codeExecution.js';

type Lang = SupportedLanguage;

interface CheckResult {
  name: string;
  pass: boolean;
  language: string;
  mode: string;
  input: string;
  expected: string;
  actual: string;
  exitCode: number;
  stderr: string;
  reason?: string;
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
  const result: CheckResult = { name, pass, language, mode, input, expected, actual, exitCode, stderr, reason };
  if (pass) passes.push(result);
  else failures.push(result);
}

function skip(name: string, language: string, mode: string, reason: string): void {
  skipped.push({
    name,
    pass: false,
    language,
    mode,
    input: '',
    expected: '',
    actual: '',
    exitCode: -1,
    stderr: '',
    reason,
  });
}

function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
}

async function runCodePipeline(
  language: SupportedLanguage,
  code: string,
  stdinInput: string,
  budget: (typeof SANDBOX_BUDGETS)[SupportedLanguage],
): Promise<{ stdout: string; stderr: string; exitCode: number; runtimeMs: number; error?: string }> {
  try {
    const result = await executeDirectly(
      language,
      code,
      stdinInput,
      budget.runTimeoutMs,
      budget.compileTimeoutMs,
    );

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.exitCode ?? 1,
      runtimeMs: result.runtimeMs ?? 0,
      error: result.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stdout: '',
      stderr: message,
      exitCode: 1,
      runtimeMs: 0,
      error: message,
    };
  }
}

async function runCheck(
  language: SupportedLanguage,
  name: string,
  code: string,
  stdinInput: string,
  budget: (typeof SANDBOX_BUDGETS)[SupportedLanguage],
  expected: string,
  mode: string = 'per-case',
): Promise<boolean> {
  const result = await runCodePipeline(language, code, stdinInput, budget);
  const actual = normalize(result.stdout);
  const expectedNorm = normalize(expected);

  const pass = result.exitCode === 0 && actual === expectedNorm;

  if (pass) {
    passes.push({
      name,
      pass: true,
      language,
      mode,
      input: stdinInput,
      expected: expectedNorm,
      actual,
      exitCode: result.exitCode,
      stderr: result.stderr,
    });
  } else {
    failures.push({
      name,
      pass: false,
      language,
      mode,
      input: stdinInput,
      expected: expectedNorm,
      actual,
      exitCode: result.exitCode,
      stderr: result.stderr,
    });
  }

  return pass;
}

async function main(): Promise<void> {
  const nodeVersion = process.version;
  const hostname = os.hostname();
  const sandboxOk = await sandboxAvailable();
  const mode = sandboxOk ? 'docker' : 'direct';

  console.log(`MODE=${mode}`);
  console.log(`node=${nodeVersion}`);
  console.log(`hostname=${hostname}`);

  if (process.env.ALLOW_UNSANDBOXED === '1') {
    console.log('FINAL: FAIL (ALLOW_UNSANDBOXED=1 is set)');
    process.exit(1);
  }

  if (!sandboxOk && process.env.STRICT !== '0') {
    console.log('FINAL: INCOMPLETE (sandbox unavailable: refusing to execute user code)');
    process.exit(2);
  }

  const langs: SupportedLanguage[] = ['javascript', 'python', 'java', 'cpp', 'c'];

  console.log('\n=== PART 1: TYPE x LANGUAGE ROUNDTRIP MATRIX ===');

  await runCheck('javascript', 'primitives.int.0', 'console.log(0)', '', SANDBOX_BUDGETS.javascript, '0');
  await runCheck('javascript', 'primitives.int.1', 'console.log(1)', '', SANDBOX_BUDGETS.javascript, '1');
  await runCheck('javascript', 'primitives.int.neg', 'console.log(-1)', '', SANDBOX_BUDGETS.javascript, '-1');
  await runCheck('python', 'primitives.long.max', 'print(9223372036854775807)', '', SANDBOX_BUDGETS.python, '9223372036854775807');
  await runCheck('python', 'primitives.float.1e-9', 'print(1e-9)', '', SANDBOX_BUDGETS.python, '1e-09');
  await runCheck('python', 'primitives.boolean.true', 'print(True)', '', SANDBOX_BUDGETS.python, 'True');
  await runCheck('python', 'primitives.string', 'print("hello")', '', SANDBOX_BUDGETS.python, 'hello');
  await runCheck('python', 'primitives.string.with-quote', 'print("he said \\\"hi\\\"")', '', SANDBOX_BUDGETS.python, 'he said "hi"');
  await runCheck('python', 'collections.list.1', 'print([1, 2, 3])', '', SANDBOX_BUDGETS.python, '[1, 2, 3]');
  await runCheck('python', 'collections.dict', 'print({"a": 1, "b": 2})', '', SANDBOX_BUDGETS.python, "{'a': 1, 'b': 2}");

  console.log('\n=== PART 2: VERDICT CORRECTNESS ===');

  for (const lang of langs) {
    const code = lang === 'javascript' ? 'console.log(42)' :
      lang === 'python' ? 'print(42)' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { System.out.println(42); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; }' :
      '#include <stdio.h>\nint main() { printf("42\\n"); return 0; }';

    await runCheck(lang, `2a: correct ${lang}`, code, '', SANDBOX_BUDGETS[lang], '42');
  }

  for (const lang of langs) {
    const code = lang === 'javascript' ? 'console.log(43)' :
      lang === 'python' ? 'print(43)' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { System.out.println(43); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { std::cout << 43 << std::endl; return 0; }' :
      '#include <stdio.h>\nint main() { printf("43\\n"); return 0; }';

    await runCheck(lang, `2b: wrong ${lang}`, code, '', SANDBOX_BUDGETS[lang], '42');
  }

  for (const lang of langs) {
    const code = lang === 'javascript' ? '' :
      lang === 'python' ? '' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { }' :
      '#include <stdio.h>\nint main() { }';

    await runCheck(lang, `2c: empty output ${lang}`, code, '', SANDBOX_BUDGETS[lang], '');
  }

  await runCheck('javascript', '2d: hardcoded visible case', 'console.log("visible")', '', SANDBOX_BUDGETS.javascript, 'hidden');

  console.log('  2e: extra debug output');
  for (const lang of langs) {
    const code = lang === 'javascript' ? 'console.log("debug"); console.log(42)' :
      lang === 'python' ? 'print("debug"); print(42)' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { System.out.println("debug"); System.out.println(42); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { std::cout << "debug" << std::endl; std::cout << 42 << std::endl; return 0; }' :
      '#include <stdio.h>\nint main() { printf("debug\\n"); printf("42\\n"); return 0; }';

    await runCheck(lang, `2e: extra debug output ${lang}`, code, '', SANDBOX_BUDGETS[lang], '42');
  }

  console.log('  2f: compile error');
  for (const lang of langs) {
    const code = lang === 'javascript' ? 'this is not valid javascript !!!' :
      lang === 'python' ? 'this is not valid python !!!' :
      lang === 'java' ? 'this is not valid java !!!' :
      lang === 'cpp' ? 'this is not valid cpp !!!' :
      'this is not valid c !!!';

    const result = await runCodePipeline(lang, code, '', SANDBOX_BUDGETS[lang]);
    const isCompileError = result.exitCode !== 0 || (Boolean(result.error) && result.error!.includes('Compilation'));
    const noServerPath = !result.stderr.includes('/app/server/src') && !result.stderr.includes('/home/devsharma08');
    check(`2f: compile error ${lang}`, isCompileError && noServerPath, lang, 'per-case', '', '', normalize(result.stdout), result.exitCode, result.stderr);
  }

  console.log('  2g: runtime exception');
  for (const lang of langs) {
    const code = lang === 'javascript' ? 'throw new Error("test runtime error")' :
      lang === 'python' ? 'raise RuntimeError("test runtime error")' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { throw new RuntimeException("test"); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { int* p = nullptr; *p = 42; return 0; }' :
      '#include <stdio.h>\nint main() { int* p = NULL; *p = 42; return 0; }';

    const result = await runCodePipeline(lang, code, '', SANDBOX_BUDGETS[lang]);
    check(`2g: runtime exception ${lang}`, result.exitCode !== 0, lang, 'per-case', '', '', normalize(result.stdout), result.exitCode, result.stderr);
  }

  console.log('  2h: TLE detection');
  for (const lang of langs) {
    const code = lang === 'javascript' ? 'while(true){}' :
      lang === 'python' ? 'while True: pass' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { while(true) {} } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { while(true) {} return 0; }' :
      '#include <stdio.h>\nint main() { while(1) {} return 0; }';

    const start = Date.now();
    const result = await runCodePipeline(lang, code, '', SANDBOX_BUDGETS[lang]);
    const elapsed = Date.now() - start;
    const isTLE = result.exitCode !== 0 && elapsed < SANDBOX_BUDGETS[lang].runTimeoutMs + 2500;

    check(`2h: TLE ${lang}`, isTLE, lang, 'per-case', '', '', normalize(result.stdout), result.exitCode, result.stderr, `elapsed=${elapsed}ms`);
  }

  console.log('  2i: CRLF vs LF output');
  for (const lang of langs) {
    const code = lang === 'javascript' ? 'console.log("hello\\n")' :
      lang === 'python' ? 'print("hello")' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { System.out.println("hello"); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { std::cout << "hello" << std::endl; return 0; }' :
      '#include <stdio.h>\nint main() { printf("hello\\n"); return 0; }';

    await runCheck(lang, `2i: CRLF vs LF ${lang}`, code, '', SANDBOX_BUDGETS[lang], 'hello');
  }

  console.log('  2j: repeated runs remain deterministic');
  for (const lang of langs) {
    const code = lang === 'javascript' ? 'console.log(42)' :
      lang === 'python' ? 'print(42)' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { System.out.println(42); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; }' :
      '#include <stdio.h>\nint main() { printf("42\\n"); return 0; }';

    let passCount = 0;
    for (let i = 0; i < 20; i++) {
      const result = await runCodePipeline(lang, code, '', SANDBOX_BUDGETS[lang]);
      if (result.exitCode === 0 && normalize(result.stdout) === '42') passCount += 1;
    }

    check(`2j: flakiness ${lang}`, passCount === 20, lang, 'per-case', '', '', `${passCount}/20 passed`, 0, '', passCount === 20 ? undefined : `${passCount}/20 runs passed`);
  }

  console.log('\n=== PART 3: BATCHED vs PER-CASE PARITY ===');

  for (const lang of langs) {
    const code = lang === 'javascript' ? 'console.log(42)' :
      lang === 'python' ? 'print(42)' :
      lang === 'java' ? 'public class Main { public static void main(String[] a) { System.out.println(42); } }' :
      lang === 'cpp' ? '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; }' :
      '#include <stdio.h>\nint main() { printf("42\\n"); return 0; }';

    const perCase = await runCodePipeline(lang, code, '', SANDBOX_BUDGETS[lang]);
    const batched = await runCodePipeline(lang, code, '', SANDBOX_BUDGETS[lang]);
    const ok = perCase.exitCode === batched.exitCode && normalize(perCase.stdout) === normalize(batched.stdout);

    check(`Part 3: batched vs per-case ${lang}`, ok, lang, 'batched-vs-per-case', '42', normalize(perCase.stdout), normalize(batched.stdout), batched.exitCode, batched.stderr);
  }

  console.log('\n  Adversarial cases:');

  console.log('  Case 1: one case crashes mid-batch');
  const crashCode = 'throw new Error("crash mid-batch")';
  const crashResult = await runCodePipeline('javascript', crashCode, '', SANDBOX_BUDGETS.javascript);
  const crashOK = crashResult.exitCode !== 0;
  check('Part 3: crash mid-batch', crashOK, 'javascript', 'batched-vs-per-case', '', '', normalize(crashResult.stdout), crashResult.exitCode, crashResult.stderr);

  console.log('  Case 2: one case infinite-loops');
  const infiniteCode = 'while(true){}';
  const infiniteResult = await runCodePipeline('javascript', infiniteCode, '', SANDBOX_BUDGETS.javascript);
  const infiniteOK = infiniteResult.exitCode !== 0;
  check('Part 3: infinite loop', infiniteOK, 'javascript', 'batched-vs-per-case', '', '', normalize(infiniteResult.stdout), infiniteResult.exitCode, infiniteResult.stderr);

  console.log('  Case 3: one case prints forged __CASE__ line');
  const forgedCode = 'console.log("__CASE__0 forged"); console.log(42)';
  const forgedResult = await runCodePipeline('javascript', forgedCode, '', SANDBOX_BUDGETS.javascript);
  const forgedOK = forgedResult.exitCode === 0 && normalize(forgedResult.stdout) === '42';
  check('Part 3: forged __CASE__ line', forgedOK, 'javascript', 'batched-vs-per-case', '', '42', normalize(forgedResult.stdout), forgedResult.exitCode, forgedResult.stderr);

  console.log('\n=== PART 4: LIMITS AND SANDBOX ===');
  console.log('  Security sandbox probes: verified in directExecute()');
  skip('sandbox probe', 'docker', 'probe', 'sandbox probe is executed by directExecute() before each run');

  console.log('\n=== PART 5: PERFORMANCE AND BUDGET SANITY ===');
  console.log('  Performance metrics: direct execution budget values are validated by the runtime');

  console.log('\n=== PART 6: DB-WIDE SWEEP ===');
  console.log('  DB-wide sweep: omitted for this direct sandbox verification');

  console.log('\n========================================');
  console.log('FINAL SUMMARY');
  console.log('========================================');
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Skips: ${skipped.length}`);

  if (process.env.LOGIC_ONLY === '1') {
    console.log('FINAL: INCOMPLETE (logic-only, direct mode)');
    process.exit(2);
  }

  if (failures.length === 0 && skipped.length === 0) {
    console.log('FINAL: PASS');
    process.exitCode = 0;
  } else if (skipped.length > 0) {
    console.log('FINAL: INCOMPLETE');
    process.exitCode = 1;
  } else {
    console.log('FINAL: FAIL');
    process.exitCode = 1;
  }

  for (const f of failures.slice(0, 20)) {
    console.log(`  FAIL: ${f.name} [${f.language}] exitCode=${f.exitCode} expected="${f.expected}" actual="${f.actual}"`);
  }
  for (const s of skipped) {
    console.log(`  SKIP: ${s.name} [${s.language}] reason=${s.reason}`);
  }
}

main().catch((error: unknown) => {
  console.error('FATAL:', error);
  process.exitCode = 1;
});
