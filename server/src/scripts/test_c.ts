import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  const cCode = `#include <stdio.h>
int main() {
  int n;
  scanf("%d", &n);
  printf("%d", n * 2);
  return 0;
}
`;
  const result = await executeDirectly('c', cCode, '7', SANDBOX_BUDGETS.c.runTimeoutMs, SANDBOX_BUDGETS.c.compileTimeoutMs);
  console.log('C test: exitCode=' + result.exitCode + ', stdout=' + result.stdout.trim() + ', stderr=' + result.stderr, result.error);
}

main();