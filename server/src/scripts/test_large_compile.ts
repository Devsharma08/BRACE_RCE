import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  console.log('=== LARGE C++ COMPILE TEST ===\n');

  // C++: template-heavy
  let cppCode = '#include <vector>\n#include <map>\n#include <string>\n';
  for (let i = 0; i < 2000; i++) {
    cppCode += `template<typename T> struct Container${i} { std::vector<T> data${i}; };\n`;
  }
  cppCode += 'int main() { Container<0> c; return 0; }\n';

  const start = Date.now();
  const result = await executeDirectly('cpp', cppCode, '', SANDBOX_BUDGETS.cpp.runTimeoutMs, SANDBOX_BUDGETS.cpp.compileTimeoutMs);
  const elapsed = Date.now() - start;
  console.log(`Large C++ (2000 templates): exitCode=${result.exitCode}, time=${elapsed}ms`);
  if (result.exitCode !== 0) {
    console.log('  stderr:', result.stderr?.substring(0, 200));
  } else {
    console.log('  stdout:', result.stdout.trim());
  }

  console.log('\n=== LARGE COMPILE TEST COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });