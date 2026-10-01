/**
 * AUDIT (read-only): replays stored test cases through Piston using correct
 * reference solutions, to prove the wrapper emits the exact `expectedOutput`
 * that is stored in the database.
 *
 * This exists because the generated wrapper previously contained
 * `.replace(/s/g, '')` instead of `.replace(/\s/g, '')`, silently stripping
 * every letter "s" from user output.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode } from '../services/codeExecution.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';

/** Solutions keyed by DB `problem_number` (a sequential index, not the LC id). */
const SOLUTIONS: Record<number, string> = {
  1: `var twoSum = function(nums, target){const m=new Map();for(let i=0;i<nums.length;i++){if(m.has(target-nums[i]))return[m.get(target-nums[i]),i];m.set(nums[i],i);}return[];};`,
  106: `var isAnagram = function(s, t){if(s.length!==t.length)return false;const a=new Array(26).fill(0),b=new Array(26).fill(0);for(let i=0;i<s.length;i++){a[s.charCodeAt(i)-97]++;b[t.charCodeAt(i)-97]++;}return a.every((v,i)=>v===b[i]);};`,
  123: `var strStr = function(h, n){return h.indexOf(n);};`,
  155: `var addBinary = function(a, b){let i=a.length-1,j=b.length-1,carry=0,out='';while(i>=0||j>=0||carry){let s=carry;if(i>=0)s+=+a[i--];if(j>=0)s+=+b[j--];out=(s%2)+out;carry=Math.floor(s/2);}return out;};`,
  170: `var minWindow = function(s, t){if(t.length>s.length)return "";const need=new Map();for(const c of t)need.set(c,(need.get(c)||0)+1);let miss=t.length,left=0,best="",bl=Infinity;for(let r=0;r<s.length;r++){const c=s[r];if(need.has(c)){const n=need.get(c);if(n>0)miss--;need.set(c,n-1);}while(miss===0){const len=r-left+1;if(len<bl){bl=len;best=s.slice(left,r+1);}const lc=s[left];if(need.has(lc)){need.set(lc,need.get(lc)+1);if(need.get(lc)>0)miss++;}left++;}}return best;};`,
};

async function run(code: string, stdin: string, signal?: AbortSignal) {
  const res = await fetch(`${PISTON}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'javascript',
      version: '18.15.0',
      files: [{ name: 'main.js', content: code }],
      stdin,
    }),
    signal,
  });
  const j: any = await res.json();
  if (j?.run?.code !== 0) throw new Error(j?.message ?? j?.run?.stderr ?? 'run failed');
  return (j.run.stdout as string).trim();
}

async function main() {
  const nums = Object.keys(SOLUTIONS).map(Number);
  let total = 0;
  let ok = 0;
  const bad: string[] = [];

  for (const n of nums) {
    const p = await prisma.problem.findUnique({
      where: { problem_number: n },
      include: { test_cases: true },
    });
    if (!p) {
      console.log(`#${n}: not in database`);
      continue;
    }

    // Run the real wrapper the platform would generate for a user submission.
    const prepared = prepareFinalCode('javascript', SOLUTIONS[n]);

    for (const [i, tc] of p.test_cases.entries()) {
      total++;
      let actual: string;
      try {
        actual = await run(prepared, tc.input);
      } catch (e: any) {
        bad.push(`#${n} ${p.name} case${i} ERROR ${e.message.slice(0, 80)}`);
        continue;
      }
      const stored = (tc.expectedOutput ?? '').trim();
      if (actual === stored) ok++;
      else {
        bad.push(
          `#${n} ${p.name} case${i}: stored=${JSON.stringify(stored)} actual=${JSON.stringify(actual)}`,
        );
      }
    }
  }

  console.log(
    `\n==== WRAPPER AUDIT ====\nproblems: ${nums.length}, cases: ${total}, matched stored output: ${ok}`,
  );
  bad.forEach((b) => console.log('  ✗ ' + b));
  if (bad.length === 0) console.log('  ✅ wrapper now emits exactly the stored expected outputs');
}

main()
  .catch((e) => console.error('ERR', e))
  .finally(() => prisma.$disconnect());