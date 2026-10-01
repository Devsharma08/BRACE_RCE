import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';
import trieBank from './problemBank/banks/trie.js';
import type { ProblemBankEntry } from './problemBank/types.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';
const BANK: ProblemBankEntry[] = [...trieBank];

async function piston(code: string, stdin: string) {
  const res = await fetch(`${PISTON}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'javascript',
      version: '18.15.0',
      files: [{ name: 'main.js', content: code }],
      stdin,
    }),
  });
  const j: any = await res.json();
  if (j?.run?.code !== 0) {
    throw new Error(j?.message ?? j?.run?.stderr ?? `exit ${j?.run?.code}`);
  }
  return (j.run.stdout as string).trim();
}

/**
 * A correct solution, written the way a user would: it uses the same starter
 * signature the platform hands them. We push it through the REAL
 * `prepareFinalCode` + Piston pipeline so the stored expected outputs are
 * proven to match what the platform will actually print.
 */
const SOLUTIONS: Record<string, string> = {
  'trie-shortest-key': `var shortestSubstring = function(s1, s2) {
    if (!s2.length) return '';
    const need = new Map();
    for (const c of s2) need.set(c, (need.get(c) || 0) + 1);
    const cnt = new Map();
    let missing = s2.length, left = 0, bestStart = -1, bestLen = Infinity;
    for (let r = 0; r < s1.length; r++) {
      const c = s1[r];
      cnt.set(c, (cnt.get(c) || 0) + 1);
      if (need.has(c) && cnt.get(c) <= need.get(c)) missing--;
      while (missing === 0) {
        const len = r - left + 1;
        if (len < bestLen) { bestLen = len; bestStart = left; }
        const lc = s1[left];
        cnt.set(lc, (cnt.get(lc) || 1) - 1);
        if (need.has(lc) && cnt.get(lc) < need.get(lc)) missing++;
        left++;
      }
    }
    return bestStart === -1 ? '' : s1.slice(bestStart, bestStart + bestLen);
};`,
  'trie-design-add-search': `class TrieNode { constructor(){this.ch=new Map();this.end=false;} }
class Trie {
  constructor(){this.root=new TrieNode();}
  insert(w){let n=this.root;for(const c of w){if(!n.ch.has(c))n.ch.set(c,new TrieNode());n=n.ch.get(c);}n.end=true;}
  go(node,q,i){if(i===q.length)return node.end;const c=q[i];
    if(c==='.'){for(const k of node.ch.values())if(this.go(k,q,i+1))return true;return false;}
    const nx=node.ch.get(c);return nx?this.go(nx,q,i+1):false;}
  search(q){return this.go(this.root,q,0);}
}
var search = function(words, query) {
  const t = new Trie();
  for (const w of words) t.insert(w);
  return t.search(query);
};`,
};

async function main() {
  let pass = 0;
  let fail = 0;

  for (const p of BANK) {
    const sol = SOLUTIONS[p.key];
    if (!sol) {
      console.log(`  ? ${p.key}: no reference user solution defined`);
      continue;
    }
    console.log(`\n${p.key} — running ${p.tests.length} cases through Piston`);

    // Feed the real starter snippet + a user solution through the real pipeline.
    const full = sol;
    const prepared = prepareFinalCode('javascript', full);

    for (const [i, tc] of p.tests.entries()) {
      const stdin = tc.args
        .map((a) => JSON.stringify(a))
        .join('\n');
      const expected = JSON.stringify(p.solve(tc.args)).replace(/\s/g, '');
      try {
        const got = await piston(prepared, stdin);
        if (got === expected) {
          pass++;
        } else {
          fail++;
          console.log(`  ✗ case ${i}: got ${got} expected ${expected}`);
        }
      } catch (e: any) {
        fail++;
        console.log(`  ✗ case ${i}: ${e.message.slice(0, 120)}`);
      }
    }
  }

  console.log(`\n==== EXECUTION VERIFICATION ====\npassed: ${pass}, failed: ${fail}`);
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
