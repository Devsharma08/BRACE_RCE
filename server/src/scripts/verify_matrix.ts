/**
 * Problem x language correctness matrix.
 *
 * The existing suites cover the two ends of the risk curve but nothing in the
 * middle:
 *
 *   verify_execution.ts    893 bank cases, but JavaScript only.
 *   verify_wrapper_shapes.ts  50 cases across 5 languages, but synthetic
 *                              one-case shapes with hand-written stdin.
 *
 * So a wrapper could be correct for a synthetic `int[] + int` shape and still
 * be wrong for a real stored problem — or correct on one stored problem and
 * wrong on another shape. That gap is where the P0s lived: none of them showed
 * up in either suite.
 *
 * This runs REAL problems, with their REAL stored test cases pulled from the
 * database, through every supported language, and requires each output line to
 * equal the stored expected output. It also drives java/cpp through the batched
 * framing, so the batching path is exercised against real multi-case data rather
 * than only the synthetic three-case batch in the shape suite.
 *
 * It is deliberately a CATALOGUE, not a scan of every problem: correct
 * non-JavaScript reference solutions do not exist yet for most of the bank, so
 * a full 194 x 5 sweep would be mostly skipped. Growth rule: add a problem here
 * once a reference exists for each language, and it becomes a permanent gate.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { prepareFinalCode, SANDBOX_BUDGETS, fireOnPiston, supportsBatching } from '../services/codeExecution.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';

const LANG: Record<string, string> = {
  javascript: 'javascript', python: 'python', java: 'java', cpp: 'c++', c: 'c',
};
const FILE_NAME: Record<string, string> = {
  javascript: 'main.js', python: 'main.py', java: 'Main.java', cpp: 'main.cpp', c: 'main.c',
};
type Lang = keyof typeof LANG;
const LANGS = Object.keys(LANG) as Lang[];

type Ref = Partial<Record<Lang, string>>;

type ProblemSpec = {
  name: string;
  oid: string;
  /**
   * The problem's real stored cases, copied from the database.
   *
   * The runner prefers the live DB copy when it exists, so drift between this
   * file and the database is itself a failure. The embedded copy exists because
   * none of these three problems are in the seedable problem bank, so a fresh CI
   * database has no rows for them — without this the matrix could only run
   * against a locally seeded database and could not gate a pull request.
   */
  cases: [string, string][];
  /** Correct reference per language. Absent = skipped, with a stated reason. */
  refs: Ref;
  /** Languages deliberately excluded, each a place a defect could hide. */
  skip?: Partial<Record<Lang, string>>;
};

const SPECS: ProblemSpec[] = [
  {
    name: 'Two Sum',
    cases: [
        ['[2,7,11,15]\n9', '[0,1]'],
        ['[3,2,4]\n6', '[1,2]'],
        ['[3,3]\n6', '[0,1]'],
        ['[]\n0', '[]'],
        ['[5]\n5', '[]'],
        ['[10,-8,5,-12,16,6]\n11', '[2,5]'],
        ['[-13,17,7]\n-6', '[0,2]'],
        ['[-13,-1,7,-18,7,14,20,11]\n-6', '[0,2]'],
        ['[-4,7,12,3,-9,6]\n2', '[0,5]'],
        ['[-10,-11]\n-21', '[0,1]'],
        ['[-8,5,-6,9,-14,20,-4]\n-14', '[0,2]'],
        ['[8,-2,-11,-16,16,7,16,15,17,2]\n-14', '[3,9]'],
        ['[-17,4,-16,-13,-12,11,17,2,-14,10]\n-2', '[3,5]'],
    ],
    oid: '67a013521d80b36dba6b2d0b1f9bf2b824c79028',
    // int[] + int -> int[]. The array is the first stdin line, the target the
    // second, so this also guards the C synthetic-size off-by-one.
    refs: {
      javascript:
        'function twoSum(nums, target){const seen={};for(let i=0;i<nums.length;i++){const need=target-nums[i];if(seen[need]!==undefined)return [seen[need],i];seen[nums[i]]=i;}return [];}',
      python:
        'class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, v in enumerate(nums):\n            if target - v in seen:\n                return [seen[target - v], i]\n            seen[v] = i\n        return []',
      java:
        'class Solution { public int[] twoSum(int[] nums,int target){ java.util.Map<Integer,Integer> seen=new java.util.HashMap<>(); for(int i=0;i<nums.length;i++){int need=target-nums[i]; if(seen.containsKey(need)) return new int[]{seen.get(need),i}; seen.put(nums[i],i);} return new int[0]; } }',
      cpp:
        'class Solution { public: std::vector<int> twoSum(std::vector<int>& nums,int target){ std::unordered_map<int,int> seen; for(int i=0;i<(int)nums.size();i++){int need=target-nums[i]; if(seen.count(need)) return {seen[need],i}; seen[nums[i]]=i;} return {}; } };',
      c:
        'int* twoSum(int* nums,int numsSize,int target,int* returnSize){ for(int i=0;i<numsSize;i++) for(int j=i+1;j<numsSize;j++) if(nums[i]+nums[j]==target){int* o=(int*)malloc(sizeof(int)*2);o[0]=i;o[1]=j;*returnSize=2;return o;} *returnSize=0; return NULL; }',
    },
  },
  {
    name: 'Best Time to Buy and Sell Stock',
    cases: [
        ['[7,1,5,3,6,4]', '5'],
        ['[7,6,4,3,1]', '0'],
        ['[]', '0'],
        ['[1]', '0'],
        ['[1,2]', '1'],
        ['[5,33,9,4,33,9]', '29'],
        ['[13,35,29,3,22,4,29,2,13,35,27,31]', '33'],
        ['[16,30,12,9,35,16]', '26'],
        ['[32]', '0'],
        ['[13,23,7,32]', '25'],
        ['[27,13]', '0'],
        ['[7,26,37,1,30,24,34]', '33'],
        ['[40,5,29,14,34,28,14,3,16]', '29'],
    ],
    oid: 'abd9bcf674fde34a7cd15f1c2178e37f573fabe3',
    // int[] -> int. Single return scalar, so it exercises a different printer
    // from Two Sum's array return.
    refs: {
      javascript:
        'function maxProfit(prices){let best=0,low=Infinity;for(const p of prices){if(p<low)low=p;else if(p-low>best)best=p-low;}return best;}',
      python:
        'class Solution:\n    def maxProfit(self, prices):\n        best = 0\n        low = float("inf")\n        for p in prices:\n            if p < low:\n                low = p\n            elif p - low > best:\n                best = p - low\n        return best',
      java:
        'class Solution { public int maxProfit(int[] prices){ int best=0; int low=Integer.MAX_VALUE; for(int p: prices){ if(p<low) low=p; else if(p-low>best) best=p-low; } return best; } }',
      cpp:
        'class Solution { public: int maxProfit(std::vector<int>& prices){ int best=0; int low=2147483647; for(int p: prices){ if(p<low) low=p; else if(p-low>best) best=p-low; } return best; } };',
      c:
        'int maxProfit(int* prices,int pricesSize){ int best=0,low=2147483647; for(int i=0;i<pricesSize;i++){ if(prices[i]<low) low=prices[i]; else if(prices[i]-low>best) best=prices[i]-low; } return best; }',
    },
  },
  {
    name: 'Maximum Depth of Binary Tree',
    cases: [
        ['[3,9,20,null,null,15,7]', '3'],
        ['[1,null,2]', '2'],
        ['[]', '0'],
        ['[1]', '1'],
        ['[1,2,3,4,5,null,null,6]', '4'],
        ['[4,2,5,3,1,6]', '3'],
        ['[4,3,2,5,6,1]', '3'],
        ['[8,12,5,3,2,11,6,7,10,4,9,1]', '4'],
        ['[7,8,10,2,3,12,6,4,11,9,5,1]', '4'],
        ['[8,4,9,5,7,3,1,2,6,11,12,10]', '4'],
        ['[4,11,5,9,3,2,1,8,7,10,6,12]', '4'],
        ['[6,5,7,3,8,4,2,10,9,1]', '4'],
        ['[11,5,3,6,2,1,10,7,8,4,9]', '4'],
    ],
    oid: 'c2f93388b31584a8711a0c2fdac3a8525b33c550',
    // TreeNode -> int. Stored input is level-order with nulls, which is the
    // encoding the wrappers must reconstruct before the depth can be computed.
    // C is excluded: its driver has no tree argument parser, so a C reference
    // could not be reached by the generated wrapper at all.
    refs: {
      javascript:
        'function maxDepth(root){ if(!root) return 0; const q=[root]; let d=0; while(q.length){ const n=q.length; for(let i=0;i<n;i++){ const cur=q.shift(); if(cur.left) q.push(cur.left); if(cur.right) q.push(cur.right); } d++; } return d; }',
      python:
        'class Solution:\n    def maxDepth(self, root):\n        if not root:\n            return 0\n        q, d = [root], 0\n        while q:\n            for _ in range(len(q)):\n                cur = q.pop(0)\n                if cur.left: q.append(cur.left)\n                if cur.right: q.append(cur.right)\n            d += 1\n        return d',
      java:
        'class Solution { public int maxDepth(TreeNode root){ if(root==null) return 0; java.util.Queue<TreeNode> q=new java.util.ArrayDeque<>(); q.add(root); int d=0; while(!q.isEmpty()){ int n=q.size(); for(int i=0;i<n;i++){ TreeNode c=q.poll(); if(c.left!=null) q.add(c.left); if(c.right!=null) q.add(c.right); } d++; } return d; } }',
      cpp:
        'class Solution { public: int maxDepth(TreeNode* root){ if(!root) return 0; std::queue<TreeNode*> q; q.push(root); int d=0; while(!q.empty()){ size_t n=q.size(); for(size_t i=0;i<n;i++){ TreeNode* c=q.front(); q.pop(); if(c->left) q.push(c->left); if(c->right) q.push(c->right); } d++; } return d; } };',
    },
    skip: { c: 'no tree argument parser in the C driver' },
  },
];

type Case = { input: string; expected: string };

/** Frames cases exactly as `runBatched` in codeExecution.ts does. */
function frame(cases: Case[]): string {
  return cases
    .map((c) => {
      const body = c.input;
      const n = body.length === 0 ? 0 : body.replace(/\n$/, '').split('\n').length;
      return `__CASE__${n}\n${body}`;
    })
    .join('\n');
}

async function runOnPiston(lang: Lang, code: string, stdin: string) {
  const b = SANDBOX_BUDGETS[lang as keyof typeof SANDBOX_BUDGETS];
  const payload = {
    language: LANG[lang],
    version: '*',
    files: [{ name: FILE_NAME[lang], content: code }],
    stdin,
    compile_timeout: b.compileTimeoutMs,
    run_timeout: b.runTimeoutMs,
    run_cpu_time: b.runCpuTimeMs,
    compile_memory_limit: b.compileMemoryLimitBytes,
    run_memory_limit: b.runMemoryLimitBytes,
  };
  return (await fireOnPiston(lang as any, payload as Record<string, unknown>)) as any;
}

async function main() {
  const onlyLangs = (process.argv.find((a) => a.startsWith('--langs=')) || '')
    .replace('--langs=', '').split(',').filter(Boolean) as Lang[];
  const langs = LANGS.filter((l) => onlyLangs.length === 0 || onlyLangs.includes(l));

  console.log(`Piston: ${PISTON}`);
  console.log(`problems: ${SPECS.length}  languages: ${langs.length}\n`);

  const failures: string[] = [];
  let pass = 0, skip = 0, casesChecked = 0;

  for (const spec of SPECS) {
    // Prefer the live database copy; fall back to the embedded one so this runs
    // on a CI database that has never been seeded. Either way, flag it when the
    // two disagree — that means a stored case drifted from this file.
    let source = 'embedded';
    let cases: Case[] = spec.cases.map(([input, expected]) => ({
      input,
      expected: expected.trim(),
    }));

    let row: { name: string; test_cases: unknown } | null = null;
    try {
      row = await prisma.problem.findFirst({
        where: { OR: [{ github_oid: spec.oid }, { id: spec.oid }] },
        select: { name: true, test_cases: true },
      });
    } catch {
      // No database reachable. The embedded cases still make this a valid gate.
      row = null;
    }

    if (row) {
      const dbCases = ((row.test_cases ?? []) as any[]).map((c) => ({
        input: String(c.input ?? '').replace(/\n$/, ''),
        expected: String(c.expectedOutput ?? '').trim(),
      }));
      if (dbCases.length) {
        source = 'db';
        const drift =
          dbCases.length !== cases.length ||
          dbCases.some((d, i) => d.input !== cases[i]!.input || d.expected !== cases[i]!.expected);
        if (drift) {
          failures.push(
            `${spec.name}: stored cases have drifted from the copy embedded in verify_matrix.ts ` +
              `(${dbCases.length} in DB vs ${cases.length} embedded) — re-copy them`,
          );
        }
        cases = dbCases;
      }
    }

    const marks: string[] = [];
    for (const lang of langs) {
      if (spec.skip?.[lang]) { marks.push(`SKIP ${lang}`); skip++; continue; }
      const ref = spec.refs[lang];
      if (!ref) { marks.push(`MISS ${lang}`); skip++; continue; }

      const batched = supportsBatching(lang) && cases.length > 1;
      let j: any;
      try {
        const code = prepareFinalCode(lang as any, ref, { code: ref, wrapperCode: null } as any);
        j = await runOnPiston(lang, code, batched ? frame(cases) : cases[0]!.input);
      } catch (e) {
        marks.push(`ERR  ${lang}`);
        failures.push(`${spec.name} / ${lang}: ${String(e).slice(0, 120)}`);
        continue;
      }

      if (j?.compile && j.compile.code !== 0) {
        marks.push(`CERR ${lang}`);
        failures.push(`${spec.name} / ${lang}: COMPILE ${String(j.compile.stderr || j.compile.output || '').trim().split('\n').slice(0, 2).join(' | ').slice(0, 240)}`);
        continue;
      }

      const lines = String(j?.run?.stdout ?? '').split('\n').map((s) => s.trim())
        .filter((s, i, a) => !(s === '' && i === a.length - 1));

      // Unbatched returns one line for case 0; batched returns one per case.
      const got = batched ? lines : [lines[0] ?? ''];
      const want = batched ? cases.map((c) => c.expected) : [cases[0]!.expected];

      if (got.length !== want.length) {
        marks.push(`FAIL ${lang}`);
        failures.push(`${spec.name} / ${lang}: expected ${want.length} output lines, got ${got.length} (exit ${j?.run?.code}, stdout=${JSON.stringify(String(j?.run?.stdout ?? '').slice(0, 100))})`);
        continue;
      }

      const bad = got.map((g, i) => ({ g, w: want[i]!, i })).filter((x) => x.g !== x.w);
      if (bad.length) {
        marks.push(`FAIL ${lang}`);
        failures.push(`${spec.name} / ${lang}: ${bad.length}/${want.length} wrong — case${bad[0]!.i} got ${JSON.stringify(bad[0]!.g.slice(0, 60))} want ${JSON.stringify(bad[0]!.w.slice(0, 60))}`);
        continue;
      }

      casesChecked += want.length;
      pass++;
      marks.push(`${batched ? 'PASS*' : 'PASS '} ${lang}`);
    }
    console.log(`${spec.name.padEnd(32)} ${marks.join('  ')}   [cases: ${source}]`);
  }

  console.log(`\npassed: ${pass}, failed: ${failures.length}, skipped: ${skip}, cases checked: ${casesChecked}`);
  console.log('PASS* = verified through the batched __CASE__ framing');
  if (failures.length) {
    console.log('\nFAILURES');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error('matrix crashed:', e); process.exitCode = 1; });
