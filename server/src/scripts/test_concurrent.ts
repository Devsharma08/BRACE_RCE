import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  console.log('=== CONCURRENCY TEST: 5 concurrent submissions ===\n');

  const jsCode = `
const input = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
console.log(parseInt(input) * 2);
`;

  const javaCode = `
import java.util.*;
public class Main {
  public static void main(String[] args) {
    java.util.Scanner s = new java.util.Scanner(System.in);
    int n = s.nextInt();
    System.out.println(n * 2);
  }
}
`;

  const cppCode = `
#include <iostream>
int main() {
  int n;
  std::cin >> n;
  std::cout << n * 2 << std::endl;
  return 0;
}
`;

  const pyCode = `
import sys
n = int(sys.stdin.readline().strip())
print(n * 2)
`;

  const cCode = `
#include <stdio.h>
int main() {
  int n;
  scanf("%d", &n);
  printf("%d\n", n * 2);
  return 0;
}
`;

  const tests = [
    { lang: 'javascript', code: jsCode, stdin: '7' },
    { lang: 'python', code: pyCode, stdin: '7' },
    { lang: 'java', code: javaCode, stdin: '7', budget: SANDBOX_BUDGETS.java },
    { lang: 'cpp', code: cppCode, stdin: '7' },
    { lang: 'c', code: cCode, stdin: '7' },
  ];

  console.log('Running 5 concurrent submissions...\n');
  const start = Date.now();

  const promises = tests.map(async (t) => {
    const start = Date.now();
    const result = await executeDirectly(
      t.lang, t.code, t.stdin,
      t.budget?.runTimeoutMs || SANDBOX_BUDGETS.javascript.runTimeoutMs,
      t.budget?.compileTimeoutMs || SANDBOX_BUDGETS.javascript.compileTimeoutMs
    );
    const elapsed = Date.now() - start;
    return { ...t, result, elapsed };
  });

  const results = await Promise.all(promises);

  results.forEach(r => {
    const pass = r.result.exitCode === 0 && r.result.stdout.trim() === '14';
    console.log(r.label + ': exitCode=' + r.result.exitCode + ', stdout=' + r.result.stdout.trim() + ', elapsed=' + r.elapsed + 'ms, ' + (pass ? 'PASS' : 'FAIL'));
  });

  const totalTime = Date.now() - start;
  console.log('\nTotal time: ' + totalTime + 'ms');
  console.log('All passed:', results.every(r => r.result.exitCode === 0 && r.result.stdout.trim() === '14'));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });