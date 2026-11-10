import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  const tests = [
    { lang: 'javascript', code: 'console.log(42)', stdin: '', budget: SANDBOX_BUDGETS.javascript },
    { lang: 'python', code: 'print(42)', stdin: '', budget: SANDBOX_BUDGETS.python },
    { lang: 'java', code: 'public class Main { public static void main(String[] a) { System.out.println(42); } }', stdin: '', budget: SANDBOX_BUDGETS.java },
    { lang: 'cpp', code: '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; }', stdin: '', budget: SANDBOX_BUDGETS.cpp },
    { lang: 'c', code: '#include <stdio.h>\nint main() { printf("42\\n"); return 0; }', stdin: '', budget: SANDBOX_BUDGETS.c },
  ];
  
  for (const t of tests) {
    const start = Date.now();
    const result = await executeDirectly(t.lang, t.code, t.stdin, t.budget.runTimeoutMs, t.budget.compileTimeoutMs);
    const elapsed = Date.now() - start;
    console.log(`${t.lang}: exitCode=${result.exitCode}, stdout="${result.stdout.trim()}", elapsed=${elapsed}ms, stderr="${result.stderr?.substring(0,50)}"`, result.error ? `ERROR: ${result.error}` : '');
  }
}

main().catch(e => console.error('FATAL:', e.message));
