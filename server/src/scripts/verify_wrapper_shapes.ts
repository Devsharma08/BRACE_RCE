/**
 * Wrapper conformance suite: every signature shape, in every language.
 *
 * WHY THIS EXISTS
 *
 * The problem bank only ever exercises JavaScript, which is how two P0 defects
 * survived: the C wrapper read arguments from the wrong stdin line, and the
 * Java wrapper emitted invalid char literals. Both were in the CODE THAT
 * BUILDS A SUBMISSION, not in any problem, so no amount of JavaScript testing
 * would ever have caught them.
 *
 * The only reliable guard is to enumerate the shapes the wrapper claims to
 * support and assert each one round-trips in all five languages. This file is
 * that guard: a fixed catalogue of signatures x languages, each asserting the
 * reference output is reproduced exactly.
 *
 * Complements verify_languages.ts (one problem, five languages, cost stats)
 * and verify_execution.ts (every problem, JavaScript only). Together they cover
 * the two axes that matter: shape coverage here, problem coverage there.
 *
 * Usage:
 *   NODE_MODE=development npx tsx src/scripts/verify_wrapper_shapes.ts
 *   --langs=c,java     restrict to specific languages
 *   --verbose          print every case, not just failures
 */
import 'dotenv/config';
import { prepareFinalCode, supportsBatching } from '../services/codeExecution.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';

const LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'c++',
  c: 'c',
};
const FILE_NAME: Record<string, string> = {
  javascript: 'main.js',
  python: 'main.py',
  java: 'Main.java',
  cpp: 'main.cpp',
  c: 'main.c',
};

type Lang = keyof typeof LANG;

type Shape = {
  /** Stable id, used in the report. */
  id: string;
  /** Stdin, one argument per line. */
  stdin: string;
  /** Exactly what the wrapper must print. */
  expected: string;
  /** A correct reference per language, written to this shape's convention. */
  refs: Partial<Record<Lang, string>>;
  /** Justified per-language exclusions. Each one is a place a defect could hide. */
  skip?: Partial<Record<Lang, string>>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue. One entry per argument/return shape the wrapper special-cases.
// ─────────────────────────────────────────────────────────────────────────────
const SHAPES: Shape[] = [
  {
    id: 'int-return',
    stdin: '7\n3',
    expected: '10',
    refs: {
      javascript: 'function solve(a,b){return a+b;}',
      python: 'class Solution:\n    def solve(self,a,b):\n        return a+b',
      java: 'class Solution { public int solve(int a,int b){ return a+b; } }',
      cpp: 'class Solution { public: int solve(int a,int b){ return a+b; } };',
      c: 'int solve(int a,int b){return a+b;}',
    },
  },
  {
    id: 'int-array-arg+int',
    stdin: '[2,7,11,15]\n9',
    expected: '[0,1]',
    refs: {
      javascript:
        'function solve(nums,target){const s={};for(let i=0;i<nums.length;i++){const n=target-nums[i];if(s[n]!==undefined)return [s[n],i];s[nums[i]]=i;}return [];}',
      python:
        'class Solution:\n    def solve(self, nums, target):\n        seen = {}\n        for i, v in enumerate(nums):\n            if target - v in seen:\n                return [seen[target - v], i]\n            seen[v] = i\n        return []',
      java:
        'class Solution { public int[] solve(int[] nums,int target){ java.util.Map<Integer,Integer> seen=new java.util.HashMap<>(); for(int i=0;i<nums.length;i++){int n=target-nums[i]; if(seen.containsKey(n)) return new int[]{seen.get(n),i}; seen.put(nums[i],i);} return new int[0]; } }',
      cpp:
        'class Solution { public: std::vector<int> solve(std::vector<int>& nums,int target){ std::unordered_map<int,int> seen; for(int i=0;i<(int)nums.size();i++){int n=target-nums[i]; if(seen.count(n)) return {seen[n],i}; seen[nums[i]]=i;} return {}; } };',
      c: 'int* solve(int* nums,int numsSize,int target,int* returnSize){ for(int i=0;i<numsSize;i++) for(int j=i+1;j<numsSize;j++) if(nums[i]+nums[j]==target){int* o=(int*)malloc(sizeof(int)*2);o[0]=i;o[1]=j;*returnSize=2;return o;} *returnSize=0; return NULL; }',
    },
  },
  {
    id: 'two-args-after-array',
    // Regression guard for the C off-by-one: `numsSize` consumes no stdin line,
    // so `target` must come from line 1, not line 2.
    stdin: '[4,5,6]\n2',
    expected: '[0,2]',
    refs: {
      javascript: 'function solve(nums,size,target){return [0,2];}',
      python: 'class Solution:\n    def solve(self, nums, size, target):\n        return [0, 2]',
      java: 'class Solution { public int[] solve(int[] nums,int size,int target){ return new int[]{0,2}; } }',
      cpp: 'class Solution { public: std::vector<int> solve(std::vector<int>& nums,int size,int target){ return {0,2}; } };',
      c: 'int* solve(int* nums,int numsSize,int target,int* returnSize){int* o=(int*)malloc(sizeof(int)*2);o[0]=0;o[1]=2;*returnSize=2;return o;}',
    },
  },
  {
    id: 'string-arg',
    stdin: '"hello"',
    expected: '5',
    refs: {
      javascript: 'function solve(s){return s.length;}',
      python: 'class Solution:\n    def solve(self, s):\n        return len(s)',
      java: 'class Solution { public int solve(String s){ return s.length(); } }',
      cpp: 'class Solution { public: int solve(std::string s){ return (int)s.size(); } };',
      c: 'int solve(char* s){ int n=0; while(s[n]) n++; return n; }',
    },
  },
  {
    id: 'string-array-arg',
    stdin: '["a","bb","ccc"]',
    expected: '6',
    refs: {
      javascript: 'function solve(words){return words.join("").length;}',
      python: 'class Solution:\n    def solve(self, words):\n        return sum(len(w) for w in words)',
      java: 'class Solution { public int solve(String[] words){ int n=0; for(String w:words) n+=w.length(); return n; } }',
      cpp: 'class Solution { public: int solve(std::vector<std::string> words){ int n=0; for(auto&w:words) n+=(int)w.size(); return n; } };',
      c: 'int solve(char** words,int wordsSize){ int n=0; for(int i=0;i<wordsSize;i++){int k=0;while(words[i][k])k++;n+=k;} return n; }',
    },
  },

  {
    id: 'int-array-return',
    stdin: '5',
    expected: '[0,1,2,3,4]',
    refs: {
      javascript: 'function solve(n){const a=[];for(let i=0;i<n;i++)a.push(i);return a;}',
      python: 'class Solution:\n    def solve(self, n):\n        return list(range(n))',
      java: 'class Solution { public int[] solve(int n){ int[] a=new int[n]; for(int i=0;i<n;i++) a[i]=i; return a; } }',
      cpp: 'class Solution { public: std::vector<int> solve(int n){ std::vector<int> a; for(int i=0;i<n;i++) a.push_back(i); return a; } };',
      c: 'int* solve(int n,int* returnSize){ int* o=(int*)malloc(sizeof(int)*n); for(int i=0;i<n;i++) o[i]=i; *returnSize=n; return o; }',
    },
  },
  {
    id: 'empty-array-arg',
    // Boundary: a zero-length array must not read past the parsed line.
    stdin: '[]',
    expected: '0',
    refs: {
      javascript: 'function solve(nums){return nums.length;}',
      python: 'class Solution:\n    def solve(self, nums):\n        return len(nums)',
      java: 'class Solution { public int solve(int[] nums){ return nums.length; } }',
      cpp: 'class Solution { public: int solve(std::vector<int>& nums){ return (int)nums.size(); } };',
      c: 'int solve(int* nums,int numsSize){ return numsSize; }',
    },
  },
  {
    id: 'negative-and-zero',
    // Boundary: sign handling and a zero value.
    stdin: '-5\n0',
    expected: '-5',
    refs: {
      javascript: 'function solve(a,b){return a;}',
      python: 'class Solution:\n    def solve(self, a, b):\n        return a',
      java: 'class Solution { public int solve(int a,int b){ return a; } }',
      cpp: 'class Solution { public: int solve(int a,int b){ return a; } };',
      c: 'int solve(int a,int b){return a;}',
    },
  },
  {
    id: 'void-return-mutates-in-place',
    stdin: '[3,1,2]',
    expected: '[2,1,3]',
    refs: {
      // Deliberately silent: for a void function taking an int[] the WRAPPER
      // prints the (possibly mutated) array. A reference that also printed
      // would double up, which is a test bug, not a wrapper bug.
      javascript: 'function solve(nums){ nums.reverse(); }',
      python: 'class Solution:\n    def solve(self, nums):\n        nums.reverse()',
      java: 'class Solution { public void solve(int[] nums){ for(int i=0,j=nums.length-1;i<j;i++,j--){ int t=nums[i]; nums[i]=nums[j]; nums[j]=t; } } }',
      cpp: 'class Solution { public: void solve(std::vector<int>& nums){ std::reverse(nums.begin(), nums.end()); } };',
      c: 'void solve(int* nums,int numsSize){ for(int i=0,j=numsSize-1;i<j;i++,j--){ int t=nums[i]; nums[i]=nums[j]; nums[j]=t; } }',
    },
  },
  {
    id: 'large-ints',
    // Boundary: values beyond 16 bits.
    stdin: '100000\n99999',
    expected: '199999',
    refs: {
      javascript: 'function solve(a,b){return a+b;}',
      python: 'class Solution:\n    def solve(self, a, b):\n        return a + b',
      java: 'class Solution { public int solve(int a,int b){ return a+b; } }',
      cpp: 'class Solution { public: int solve(int a,int b){ return a+b; } };',
      c: 'int solve(int a,int b){return a+b;}',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Batched execution.
//
// `executeCode` packs every test case into ONE sandbox invocation using a
// `__CASE__<lineCount>` header, which is how Java went 51s -> 4s and C++ 22s ->
// 6.8s on a 13-case submission. This section is the guard for that framing.
//
// It deliberately lives beside the single-case matrix rather than inside it,
// because the two exercise different branches of the generated driver: stdin
// WITHOUT a header is the legacy single-case path, stdin WITH headers is the
// batched loop. Testing only the single-case matrix would leave the batched
// loop completely uncovered, which is how the escaping bug that broke all ten
// Java shapes went unnoticed until a live submission.
//
// Only the languages whose driver implements the framing are listed here;
// `supportsBatching` is the single source of truth for that.
// ─────────────────────────────────────────────────────────────────────────────
const BATCH_CASES: { stdin: string; expected: string }[] = [
  { stdin: '[2,7,11,15]\n9', expected: '[0,1]' },
  { stdin: '[3,2,4]\n6', expected: '[1,2]' },
  { stdin: '[3,3]\n6', expected: '[0,1]' },
];

const BATCH_REF: Partial<Record<Lang, string>> = {
  java:
    'class Solution { public int[] solve(int[] nums,int target){ java.util.Map<Integer,Integer> seen=new java.util.HashMap<>(); for(int i=0;i<nums.length;i++){int n=target-nums[i]; if(seen.containsKey(n)) return new int[]{seen.get(n),i}; seen.put(nums[i],i);} return new int[0]; } }',
  cpp:
    'class Solution { public: std::vector<int> solve(std::vector<int>& nums,int target){ std::unordered_map<int,int> seen; for(int i=0;i<(int)nums.size();i++){int n=target-nums[i]; if(seen.count(n)) return {seen[n],i}; seen[nums[i]]=i;} return {}; } };',
};

/** Builds the batched stdin exactly as `runBatched` does in codeExecution.ts. */
function frameBatch(cases: { stdin: string }[]): string {
  return cases
    .map((c) => {
      const body = c.stdin;
      const lineCount = body.length === 0 ? 0 : body.replace(/\n$/, '').split('\n').length;
      return `__CASE__${lineCount}\n${body}`;
    })
    .join('\n');
}

async function verifyBatched(langs: Lang[], failures: string[]) {
  const batchable = langs.filter((l) => supportsBatching(l));
  if (batchable.length === 0) return { pass: 0, fail: 0 };

  console.log(
    `\nbatched framing: ${BATCH_CASES.length} cases in one invocation ` +
      `(${batchable.join(', ')})\n`,
  );

  let pass = 0;
  let fail = 0;
  const stdin = frameBatch(BATCH_CASES);

  for (const lang of batchable) {
    const ref = BATCH_REF[lang];
    if (!ref) {
      console.log(`  ${lang.padEnd(11)} SKIP (no batch reference)`);
      continue;
    }
    let j: any;
    try {
      j = await runOnPiston(
        lang,
        prepareFinalCode(lang as any, ref, { code: ref, wrapperCode: null } as any),
        stdin,
      );
    } catch (e) {
      console.log(`  ${lang.padEnd(11)} ERR`);
      failures.push(`batch / ${lang}: transport error ${String(e).slice(0, 80)}`);
      fail++;
      continue;
    }

    if (j?.compile && j.compile.code !== 0) {
      console.log(`  ${lang.padEnd(11)} CERR`);
      failures.push(
        `batch / ${lang}: COMPILE ${String(j.compile.stderr || j.compile.output || '').trim().split('\n').slice(0, 3).join(' | ').slice(0, 300)}`,
      );
      fail++;
      continue;
    }

    const lines = String(j?.run?.stdout ?? '')
      .trim()
      .split('\n')
      .map((s) => s.trim());

    if (lines.length !== BATCH_CASES.length) {
      console.log(`  ${lang.padEnd(11)} FAIL  got ${lines.length} lines, want ${BATCH_CASES.length}`);
      failures.push(
        `batch / ${lang}: expected ${BATCH_CASES.length} output lines, got ${lines.length} (stdout=${JSON.stringify(String(j?.run?.stdout ?? '').slice(0, 120))})`,
      );
      fail++;
      continue;
    }

    const bad = lines
      .map((got, i) => ({ got, want: BATCH_CASES[i]!.expected, i }))
      .filter((c) => c.got !== c.want);
    if (bad.length) {
      console.log(`  ${lang.padEnd(11)} FAIL  ${bad.map((b) => `case${b.i}=${b.got} want ${b.want}`).join('; ')}`);
      failures.push(`batch / ${lang}: ${bad.map((b) => `case${b.i} got ${b.got} want ${b.want}`).join('; ')}`);
      fail++;
      continue;
    }

    console.log(`  ${lang.padEnd(11)} PASS  ${BATCH_CASES.length}/${BATCH_CASES.length} lines, exit ${j?.run?.code}`);
    pass++;
  }
  return { pass, fail };
}

// ─────────────────────────────────────────────────────────────────────────────
async function runOnPiston(lang: Lang, code: string, stdin: string) {
  const payload = {
    language: LANG[lang],
    version: '*',
    files: [{ name: FILE_NAME[lang], content: code }],
    stdin,
    compile_timeout: 10000,
    run_timeout: 8000,
    run_cpu_time: 20000,
    compile_memory_limit: 768 * 1024 * 1024,
    run_memory_limit: 512 * 1024 * 1024,
  };
  const res = await fetch(`${PISTON}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });
  return await res.json();
}

async function main() {
  const onlyLangs = (process.argv.find((a) => a.startsWith('--langs=')) || '')
    .replace('--langs=', '')
    .split(',')
    .filter(Boolean) as Lang[];
  const langs = (Object.keys(LANG) as Lang[]).filter(
    (l) => onlyLangs.length === 0 || onlyLangs.includes(l),
  );
  const verbose = process.argv.includes('--verbose');

  console.log(`Piston: ${PISTON}`);
  console.log(
    `shapes: ${SHAPES.length}  languages: ${langs.length}  ` +
      `matrix: ${SHAPES.length * langs.length} cases\n`,
  );

  const failures: string[] = [];
  let pass = 0;
  let skipped = 0;

  for (const shape of SHAPES) {
    const row: string[] = [];
    for (const lang of langs) {
      if (shape.skip?.[lang]) {
        row.push(`SKIP ${lang}`);
        skipped++;
        continue;
      }
      const ref = shape.refs[lang];
      if (!ref) {
        row.push(`MISS ${lang}`);
        skipped++;
        continue;
      }
      let j: any;
      try {
        j = await runOnPiston(
          lang,
          prepareFinalCode(lang as any, ref, { code: ref, wrapperCode: null } as any),
          shape.stdin,
        );
      } catch (e) {
        row.push(`ERR  ${lang}`);
        failures.push(`${shape.id} / ${lang}: transport error ${String(e).slice(0, 80)}`);
        continue;
      }

      const got = String(j?.run?.stdout ?? '').trim();
      if (j?.compile && j.compile.code !== 0) {
        row.push(`CERR ${lang}`);
        const first = String(j.compile.stderr || j.compile.output || '')
          .trim()
          .split('\n')[0];
        failures.push(`${shape.id} / ${lang}: COMPILE ${String(j.compile.stderr || j.compile.output || '').trim().split('\n').slice(0,3).join(' | ').slice(0, 300)}`);
        continue;
      }
      if (j?.message) {
        row.push(`REJ  ${lang}`);
        failures.push(`${shape.id} / ${lang}: piston rejected - ${j.message}`);
        continue;
      }
      if (got === shape.expected) {
        row.push(`PASS ${lang}`);
        pass++;
      } else {
        row.push(`FAIL ${lang}`);
        const why = j?.run?.status
          ? ` [sandbox=${j.run.status}${j.run.message ? ': ' + j.run.message : ''}]`
          : '';
        failures.push(
          `${shape.id} / ${lang}: got ${JSON.stringify(got.slice(0, 50))} want ${JSON.stringify(shape.expected)}${why}`,
        );
      }
    }
    console.log(`${shape.id.padEnd(24)} ${row.join('  ')}`);
    if (verbose)
      console.log(`    stdin=${JSON.stringify(shape.stdin)} want=${JSON.stringify(shape.expected)}`);
  }

  console.log(`\npassed: ${pass}, failed: ${failures.length}, skipped: ${skipped}`);

  // Batched framing is a separate code path from the matrix above, so it gets
  // its own verdict and its own pass/fail count.
  const batch = await verifyBatched(langs, failures);
  if (batch.pass + batch.fail > 0) {
    console.log(`\nbatched passed: ${batch.pass}, failed: ${batch.fail}`);
  }

  if (failures.length) {
    console.log('\nFAILURES');
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('suite crashed:', e);
  process.exitCode = 1;
});
