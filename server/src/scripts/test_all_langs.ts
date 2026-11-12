import { executeDirectly } from '../services/directExecute.js';

async function main() {
  const tests = [
    { lang: 'javascript', code: 'console.log(42)' },
    { lang: 'python', code: 'print(42)' },
    { lang: 'java', code: 'public class Main { public static void main(String[] a) { System.out.println(42); } }' },
    { lang: 'cpp', code: '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; }' },
    { lang: 'c', code: '#include <stdio.h>\nint main() { printf("42\\n"); return 0; }' },
  ];

  for (const t of tests) {
    const start = Date.now();
    const result = await executeDirectly(t.lang, t.code, '', 30000, 15000);
    const elapsed = Date.now() - start;
    console.log(t.lang.toUpperCase() + ': exitCode=' + result.exitCode + ', stdout="' + result.stdout.trim() + '", stderr="' + (result.stderr || '').substring(0, 50) + '", elapsed=' + elapsed + 'ms');
  }
}
main();