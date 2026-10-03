/**
 * Cross-language execution audit against Piston.
 *
 * The problem bank only ever verifies JavaScript, so a wrapper regression in
 * the Java, C, C++ or Python paths would go unnoticed until a real user hit it.
 * This takes ONE problem, writes a correct reference in all five supported
 * languages, pushes every one through the REAL `prepareFinalCode` used in
 * production, and runs them on Piston.
 *
 * Two properties are checked:
 *
 *  1. CORRECTNESS - all five must print byte-identical output. If any language
 *     disagrees, that language's wrapper or formatter is wrong.
 *  2. COST - compile time, run time, peak memory and payload size, because
 *     Java and C++ pay a compile cost the interpreted languages never do and
 *     that shows up directly in the user's response time.
 */
import 'dotenv/config';
import { prepareFinalCode } from '../services/codeExecution.js';

const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';

/** Piston language names, mirroring pistonLanguageMap in codeExecution.ts. */
const LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'c++',
  c: 'c',
};

// ── the problem: two-sum over a small array ───────────────────────────────
// Chosen because it exercises every wrapper path that matters: an int array
// argument, an int target, and an int[] return that must be serialised as JSON.
const STDIN = '[2,7,11,15]\n9';
const EXPECTED = '[0,1]';

const SRC: Record<string, string> = {
  javascript: `
function twoSum(nums, target) {
  const seen = {};
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen[need] !== undefined) return [seen[need], i];
    seen[nums[i]] = i;
  }
  return [];
}
`,
  python: `
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, v in enumerate(nums):
            need = target - v
            if need in seen:
                return [seen[need], i]
            seen[v] = i
        return []
`,
  java: `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        java.util.Map<Integer, Integer> seen = new java.util.HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[]{seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
`,
  cpp: `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int need = target - nums[i];
            if (seen.count(need)) return {seen[need], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`,
  // C exposes the function at file scope rather than as a struct method; the
  // wrapper generates a bare `twoSum(...)` call, so a struct method would not
  // link. Note the synthetic `numsSize` param: it consumes no stdin line.
  c: `
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    for (int i = 0; i < numsSize; i++)
        for (int j = i + 1; j < numsSize; j++)
            if (nums[i] + nums[j] == target) {
                int* out = (int*)malloc(sizeof(int) * 2);
                out[0] = i; out[1] = j;
                *returnSize = 2;
                return out;
            }
    *returnSize = 0;
    return NULL;
}
`,
};

/** Snippet metadata the wrapper needs; mirrors what the DB stores. */
const SNIPPET: Record<string, { code: string; wrapperCode: string | null }> = {
  javascript: { code: SRC.javascript, wrapperCode: null },
  python: { code: SRC.python, wrapperCode: null },
  java: { code: SRC.java, wrapperCode: null },
  cpp: { code: SRC.cpp, wrapperCode: null },
  c: { code: SRC.c, wrapperCode: null },
};

const FILE_NAME: Record<string, string> = {
  javascript: 'main.js',
  python: 'main.py',
  java: 'Main.java',
  cpp: 'main.cpp',
  c: 'main.c',
};

type Row = {
  lang: string;
  ok: boolean;
  note: string;
  wallMs: number;
  compileMs: number;
  runMs: number;
  memoryKb: number;
  reqBytes: number;
  codeBytes: number;
};

function blank(lang: string, note: string, reqBytes: number, codeBytes: number, wallMs: number): Row {
  return { lang, ok: false, note, wallMs: Math.round(wallMs), compileMs: 0, runMs: 0, memoryKb: 0, reqBytes, codeBytes };
}

async function runOne(lang: string): Promise<Row> {
  // EXACTLY the payload production builds.
  const finalCode = prepareFinalCode(lang as any, SRC[lang], SNIPPET[lang] as any);
  const payload = {
    language: LANG[lang],
    version: '*',
    files: [{ name: FILE_NAME[lang], content: finalCode }],
    stdin: STDIN,
    compile_timeout: 5000,
    run_timeout: 3000,
    compile_memory_limit: 268435456,
    run_memory_limit: 268435456,
  };
  const body = JSON.stringify(payload);

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(`${PISTON}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return blank(lang, `fetch failed: ${String(e).slice(0, 60)}`, body.length, finalCode.length, performance.now() - t0);
  }
  const wallMs = performance.now() - t0;

  let j: any;
  try {
    j = await res.json();
  } catch {
    return blank(lang, `non-JSON response (HTTP ${res.status})`, body.length, finalCode.length, wallMs);
  }

  const compileMs = Number(j?.compile?.time ?? 0) * 1000;
  const runMs = Number(j?.run?.time ?? 0) * 1000;
  const memoryKb = Math.round(Number(j?.run?.memory ?? 0) / 1024);

  // Compile failure is the most common cross-language breakage.
  if (j?.compile && j.compile.code !== 0) {
    const cOut = (j.compile.stderr || j.compile.output || '').trim().split('\n').slice(0, 3).join(' | ');
    return {
      ...blank(lang, '', body.length, finalCode.length, wallMs),
      ok: false,
      note: `COMPILE FAILED: ${cOut.slice(0, 200)}`,
      compileMs: Math.round(compileMs),
      runMs: Math.round(runMs),
      memoryKb,
    };
  }
  if (j?.message) {
    return blank(lang, `Piston: ${String(j.message).slice(0, 90)}`, body.length, finalCode.length, wallMs);
  }

  const got = String(j?.run?.stdout ?? '').trim();
  const runCode = j?.run?.code;
  const ok = got === EXPECTED && runCode === 0;
  const note = ok
    ? 'ok'
    : got
      ? `got ${JSON.stringify(got.slice(0, 60))}, want ${EXPECTED} (exit ${runCode})`
      : `empty stdout, exit ${runCode}, stderr ${JSON.stringify(String(j?.run?.stderr ?? '').slice(0, 100))}`;

  return {
    lang, ok, note,
    wallMs: Math.round(wallMs),
    compileMs: Math.round(compileMs),
    runMs: Math.round(runMs),
    memoryKb,
    reqBytes: body.length,
    codeBytes: finalCode.length,
  };
}

async function main() {
  console.log(`Piston: ${PISTON}`);
  const runtimes = (await fetch(`${PISTON}/api/v2/runtimes`).then((r) => r.json())) as any[];
  const names = new Set<string>();
  for (const r of runtimes) {
    names.add(r.language);
    for (const a of r.aliases ?? []) names.add(a);
  }

  const rows: Row[] = [];
  for (const lang of Object.keys(SRC)) {
    const r = await runOne(lang);
    rows.push(r);
    const known = names.has(LANG[lang]) ? '' : `  [WARN: piston has no "${LANG[lang]}"]`;
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'}  ${lang.padEnd(11)} wall=${String(r.wallMs).padStart(5)}ms ` +
      `compile=${String(r.compileMs).padStart(5)}ms run=${String(r.runMs).padStart(5)}ms ` +
      `mem=${String(r.memoryKb).padStart(6)}KB code=${String(r.codeBytes).padStart(6)}B req=${String(r.reqBytes).padStart(6)}B${known}`,
    );
    if (!r.ok) console.log(`      -> ${r.note}`);
  }

  const pass = rows.filter((r) => r.ok).length;
  console.log(`\npassed: ${pass}, failed: ${rows.length - pass}`);

  const worst = [...rows].sort((a, b) => b.wallMs - a.wallMs)[0];
  const heaviest = [...rows].sort((a, b) => b.reqBytes - a.reqBytes)[0];
  if (worst) console.log(`slowest: ${worst.lang} ${worst.wallMs}ms`);
  if (heaviest) console.log(`largest request: ${heaviest.lang} ${heaviest.reqBytes}B`);

  const missing = Object.keys(SRC).filter((l) => !names.has(LANG[l]));
  if (missing.length) console.log(`\nMISSING RUNTIMES: ${missing.join(', ')}`);

  if (pass !== rows.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error('audit crashed:', e);
  process.exitCode = 1;
});
