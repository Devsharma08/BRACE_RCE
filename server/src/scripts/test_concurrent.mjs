import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';
import { performance } from 'perf_hooks';

async function testConcurrent() {
  console.log('Testing 5 concurrent C++ TLE submissions...');
  const code = 'int main() { while(1) {} return 0; }';
  const promises = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const promise = executeDirectly('cpp', 'int main() { while(1) {} return 0; }', '', SANDBOX_BUDGETS.cpp.runTimeoutMs, SANDBOX_BUDGETS.cpp.compileTimeoutMs)
      .then(r => ({ elapsed: performance.now() - start, exitCode: r.exitCode, stderr: r.stderr }));
    promises.push(promise);
  }
  const results = await Promise.all(promises);
  results.forEach((r, i) => {
    console.log('Job ' + i + ': exitCode=' + r.exitCode + ', elapsed=' + r.elapsed.toFixed(0) + 'ms, stderr=' + (r.stderr || '').substring(0, 50));
  }
  const avg = results.reduce((a, r) => a + r.elapsed, 0) / 5;
  console.log('Average: ' + avg.toFixed(0) + 'ms');
}

async function testLargeCompile() {
  console.log('\nTesting large Java compile...');
  const { executeDirectly } = await import('../services/directExecute.js');
  const { SANDBOX_BUDGETS } = await import('../services/codeExecution.js');
  
  const largeJava = 'public class Main { ' + 'static int[] arr = new int[10000]; '.repeat(50) + 'public static void main(String[] a) {} }';
  const start2 = Date.now();
  const result2 = await executeDirectly('java', 'public class Main { ' + 'static int[] arr = new int[10000]; '.repeat(50) + 'public static void main(String[] a) {} }', '', 15000, 15000);
  console.log('Large Java compile+run: ' + (Date.now() - start2) + 'ms, exit: ' + result2.exitCode + ', stderr: ' + (result2.stderr || '').substring(0, 100));
  
  const largeCpp = '#include <vector>\nint main() { std::vector<std::vector<int>> v; ' + 'v.emplace_back(10000); '.repeat(1000) + 'return 0; }';
  const start3 = Date.now();
  const result3 = await executeDirectly('cpp', largeCpp, '', 15000, 15000);
  console.log('Large C++ compile+run: ' + (Date.now() - start3) + 'ms, exit: ' + result3.exitCode + ', stderr: ' + (result3.stderr || '').substring(0, 100));
}

async function main() {
  await testConcurrent();
  await testLargeCompile();
}

main();
