import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  console.log('=== LARGE STDIN TEST ===\n');

  // Generate 100K elements
  const nums = [];
  for (let i = 0; i < 100000; i++) {
    nums.push(i);
  }
  const input = nums.join(' ') + '\n';

  // JS: sum all numbers
  const jsCode = `
const input = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
const nums = input.split(' ').map(Number);
let sum = 0;
for (const n of nums) sum += n;
console.log(sum);
`;

  console.log('Testing JavaScript with 100K elements...');
  const start1 = Date.now();
  const jsResult = await executeDirectly('javascript', jsCode, input, SANDBOX_BUDGETS.javascript.runTimeoutMs, SANDBOX_BUDGETS.javascript.compileTimeoutMs);
  const jsTime = Date.now() - start1;
  console.log(`JS: exitCode=${jsResult.exitCode}, stdout=${jsResult.stdout.trim()}, time=${jsTime}ms`);
  if (jsResult.exitCode !== 0) {
    console.log('  stderr:', jsResult.stderr?.substring(0, 200));
  }

  // Python: sum all numbers
  const pyCode = `
import sys
data = sys.stdin.read().split()
nums = [int(x) for x in data]
print(sum(nums))
`;

  console.log('\\nTesting Python with 100K elements...');
  const start2 = Date.now();
  const pyResult = await executeDirectly('python', pyCode, input, SANDBOX_BUDGETS.python.runTimeoutMs, SANDBOX_BUDGETS.python.compileTimeoutMs);
  const pyTime = Date.now() - start2;
  console.log(`Python: exitCode=${pyResult.exitCode}, stdout=${pyResult.stdout.trim()}, time=${pyTime}ms`);
  if (pyResult.exitCode !== 0) {
    console.log('  stderr:', pyResult.stderr?.substring(0, 200));
  }

  // Java: sum all numbers
  const javaCode = `
import java.util.*;
public class Main {
  public static void main(String[] args) {
    java.util.Scanner s = new java.util.Scanner(System.in);
    long sum = 0;
    while (s.hasNextInt()) {
      sum += s.nextInt();
    }
    System.out.println(sum);
  }
}
`;

  console.log('\\nTesting Java with 100K elements...');
  const start3 = Date.now();
  const javaResult = await executeDirectly('java', javaCode, input, SANDBOX_BUDGETS.java.runTimeoutMs, SANDBOX_BUDGETS.java.compileTimeoutMs);
  const javaTime = Date.now() - start3;
  console.log(`Java: exitCode=${javaResult.exitCode}, stdout=${javaResult.stdout.trim()}, time=${javaTime}ms`);
  if (javaResult.exitCode !== 0) {
    console.log('  stderr:', javaResult.stderr?.substring(0, 200));
  }

  console.log('\\n=== LARGE STDIN TEST COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });