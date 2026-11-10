import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  const r = await executeDirectly('javascript', 'console.log("hello")', '', SANDBOX_BUDGETS.javascript.runTimeoutMs, SANDBOX_BUDGETS.javascript.compileTimeoutMs);
  console.log('Result:', r.exitCode, r.stdout.trim());
}

main().catch(e => console.error('ERR:', e.message));
