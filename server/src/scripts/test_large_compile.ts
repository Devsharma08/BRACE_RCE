import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function testLargeJavaCompile() {
  console.log('Testing large Java compile (50 classes, big static arrays)...');
  
  // Generate 50 classes with large static arrays
  let code = '';
  for (let i = 0; i < 50; i++) {
    code += `class Class${i} {\n  static final int[] arr = new int[10000];\n  static { for (int j = 0; j < arr.length; j++) arr[j] = j; }\n}\n`;
  }
  code += 'public class Main { public static void main(String[] a) { System.out.println("done"); } }';
  
  const start = Date.now();
  const result = await executeDirectly('java', code, '', 15000, 15000);
  console.log(`Large Java compile+run: ${Date.now() - start}ms, exit: ${result.exitCode}`);
  if (result.exitCode !== 0) {
    console.log(`  stderr: ${(result.stderr || '').substring(0, 200)}`);
  }
  
  // Test compile error budget (should fail with OOM or compile error)
  const hugeJava = 'public class Main { ' + 'static int[] arr = new int[1000000]; '.repeat(100) + 'public static void main(String[] a) {} }';
  const start2 = Date.now();
  const result2 = await executeDirectly('java', hugeJava, '', 15000, 15000);
  console.log(`Huge Java compile+run: ${Date.now() - start2}ms, exit: ${result2.exitCode}`);
  if (result2.exitCode !== 0) {
    console.log(`  stderr: ${(result2.stderr || '').substring(0, 200)}`);
  }
}

async function testLargeCppCompile() {
  console.log('\nTesting large C++ compile (template-heavy)...');
  
  // Template-heavy C++ code
  let code = '#include <vector>\n#include <map>\n#include <string>\ntemplate<typename T> struct Container { std::vector<T> data; };\n';
  for (let i = 0; i < 1000; i++) {
    code += `template struct Container<int${i}>;\n`;
  }
  code += 'int main() { Container<int> c; return 0; }';
  
  const start = Date.now();
  const result = await executeDirectly('cpp', code, '', 30000, 15000);
  console.log(`Large C++ compile+run: ${Date.now() - start}ms, exit: ${result.exitCode}`);
  if (result.exitCode !== 0) {
    console.log(`  stderr: ${(result.stderr || '').substring(0, 200)}`);
  }
}

async function testLargeStdin() {
  console.log('\nTesting large stdin (10^5 elements)...');
  
  // Generate 100K elements
  const nums = [];
  for (let i = 0; i < 100000; i++) {
    nums.push(i);
  }
  const stdin = nums.join(' ');
  
  // Java: read 100K ints, sum them
  const javaCode = 'import java.util.*; public class Main { public static void main(String[] a) { Scanner s = new Scanner(System.in); long sum = 0; while (s.hasNext()) sum += s.nextLong(); System.out.println(sum); } }';
  
  const start = Date.now();
  const result = await executeDirectly('java', javaCode, stdin, 15000, 15000);
  console.log(`Java large stdin: ${Date.now() - start}ms, exit: ${result.exitCode}`);
  if (result.exitCode !== 0) {
    console.log(`  stderr: ${(result.stderr || '').substring(0, 200)}`);
  } else {
    console.log(`  stdout: ${result.stdout.trim().substring(0, 100)}`);
  }
}

async function main() {
  await testLargeJavaCompile();
  await testLargeCppCompile();
  await testLargeStdin();
}

main();
