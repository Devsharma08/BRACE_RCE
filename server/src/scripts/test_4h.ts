import { executeDirectly } from '../services/directExecute.js';
import { SANDBOX_BUDGETS } from '../services/codeExecution.js';

async function main() {
  const code = `const fs = require('fs'); const paths = ['/var/run/docker.sock', '/proc/1/root', '/host']; let blocked = 0; paths.forEach(p => { try { const c = fs.readFileSync(p, 'utf8'); console.log('READABLE:', p); blocked++; } catch(e) { console.log('BLOCKED:', p); blocked++; } }); console.log(blocked === 3 ? 'ALL_BLOCKED' : 'SOME_READABLE');`;
  const { executeDirectly } = await import('../services/directExecute.js');
  const { SANDBOX_BUDGETS } = await import('../services/codeExecution.js');
  const result = await executeDirectly('javascript', code, '', SANDBOX_BUDGETS.javascript.runTimeoutMs, SANDBOX_BUDGETS.javascript.compileTimeoutMs);
  console.log('exitCode:', result.exitCode);
  console.log('stdout:', result.stdout);
  console.log('stderr:', result.stderr);
}
main();
