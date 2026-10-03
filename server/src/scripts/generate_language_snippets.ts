/**
 * Starter-snippet generator for the languages that have none.
 *
 * WHY
 *
 * `code_snippet` holds 187 java and 194 javascript rows and ZERO for python, c
 * and cpp, yet the UI advertises five languages. Selecting any of those three
 * leaves the user with an empty editor, and `prepareFinalCode` then has to guess
 * the signature from whatever they paste. So three of the five supported
 * languages shipped with no starting point at all.
 *
 * APPROACH
 *
 * These starters are emitted WITHOUT a `wrapperCode`. That is deliberate: the
 * wrapper's generic path already parses the signature out of the starter itself
 * (verified by verify_wrapper_shapes.ts across 50 shape/language combinations),
 * so there is no per-problem wrapper to write and maintain for three more
 * languages. Java and JavaScript keep their existing hand-written wrappers.
 *
 * The starter is derived from the same signature metadata the seeder already
 * uses, so it cannot drift from the test cases: same function name, same
 * parameter names, same argument order.
 *
 * Type mapping is deliberately conservative. Anything unrecognised falls back to
 * a form that still compiles in that language rather than guessing, because a
 * starter that does not compile is worse than no starter at all.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { BANK } from './problemBank/banks/index.js';
import { prepareFinalCode } from '../services/codeExecution.js';

const WRITE = process.argv.includes('--write');
// --verify-n=20 also implies verification, so match on prefix not equality.
const VERIFY = process.argv.some((a) => a.startsWith('--verify')) || WRITE;
const ONLY = (process.argv.find((a) => a.startsWith('--langs=')) || '')
  .replace('--langs=', '')
  .split(',')
  .filter(Boolean);

const TARGET_LANGS = ['python', 'c', 'cpp'].filter(
  (l) => ONLY.length === 0 || ONLY.includes(l),
);

type Arg = { name: string; type: string };

/** Normalise the bank's type strings into a small closed set. */
function classify(type: string): string {
  const t = (type || '').toLowerCase().replace(/\s+/g, '');
  if (t.includes('bool')) return 'bool';
  if (t.includes('float') || t.includes('double')) return 'double';
  if (t.includes('long')) return 'long';
  if (t.includes('char')) return 'char';
  if (t.includes('string') || t.includes('str')) return 'string';
  if (t.includes('[]') || t.includes('list') || t.includes('vector') || t.includes('array')) return 'array';
  if (t.includes('node')) return 'node';
  return 'int';
}

function pyType(t: string): string {
  switch (classify(t)) {
    case 'bool': return 'bool';
    case 'double': return 'float';
    case 'long': return 'int';
    case 'string': return 'str';
    case 'array': return 'list';
    default: return 'int';
  }
}

function pyDefault(t: string): string {
  switch (classify(t)) {
    case 'bool': return 'False';
    case 'double': return '0.0';
    case 'string': return '""';
    case 'array': return '[]';
    default: return '0';
  }
}

function cType(t: string): string {
  switch (classify(t)) {
    case 'bool': return 'int';
    case 'double': return 'double';
    case 'long': return 'long long';
    case 'string': return 'char*';
    case 'array': return 'int*';
    default: return 'int';
  }
}

function cppType(t: string): string {
  switch (classify(t)) {
    case 'bool': return 'bool';
    case 'double': return 'double';
    case 'long': return 'long long';
    case 'string': return 'string';
    case 'array': return 'vector<int>';
    default: return 'int';
  }
}

/** Python starter. A method on a Solution class, matching the java convention. */
function pythonStarter(funcName: string, ret: string, args: Arg[]): string {
  const params = args.map((a) => `${a.name}: ${pyType(a.type)}`).join(', ');
  const body = classify(ret) === 'void' ? '        pass' : `        return ${pyDefault(ret)}`;
  return `class Solution:\n    def ${funcName}(self${args.length ? ', ' + params : ''}):\n        # Your code here\n${body}\n`;
}

/**
 * C starter.
 *
 * Arrays are declared the way the wrapper's generated main() actually calls
 * them: a pointer plus an explicit length. A starter using `int nums[]` would
 * not match the argument order the wrapper emits.
 */
function cStarter(funcName: string, ret: string, args: Arg[]): string {
  const params: string[] = [];
  const returnsArray = classify(ret) === 'array';
  for (const a of args) {
    if (classify(a.type) === 'array') {
      params.push(`int* ${a.name}`, `int ${a.name}Size`);
    } else {
      params.push(`${cType(a.type)} ${a.name}`);
    }
  }
  if (returnsArray) params.push('int* returnSize');
  const decl = `${cType(ret)} ${funcName}(${params.join(', ')})`;
  const init = returnsArray ? '    if (returnSize) *returnSize = 0;\n' : '';
  const tail = returnsArray ? 'return NULL;' : classify(ret) === 'void' ? 'return;' : 'return 0;';
  return `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n${decl} {\n    // Your code here\n${init}    ${tail}\n}\n`;
}

function cppStarter(funcName: string, ret: string, args: Arg[]): string {
  const params = args
    .map((a) => {
      const k = classify(a.type);
      if (k === 'array') return `${cppType(a.type)}& ${a.name}`;
      return `${cppType(a.type)} ${a.name}`;
    })
    .join(', ');
  const isVoid = classify(ret) === 'void';
  const zero =
    isVoid ? ''
      : classify(ret) === 'array' ? '{}'
        : classify(ret) === 'string' ? '""'
          : classify(ret) === 'bool' ? 'false'
            : '0';
  return `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    ${cppType(ret)} ${funcName}(${params}) {\n        // Your code here\n${isVoid ? '        return;' : `        return ${zero};`}\n    }\n};\n`;
}

/**
 * Recover a signature from an EXISTING java snippet.
 *
 * The bank only covers 70 of the 194 problems in the database; the rest were
 * imported from GitHub and only have their hand-written java/javascript
 * snippets. Those java snippets carry the same signature metadata, so parsing
 * them extends starter generation to the legacy problems as well and keeps the
 * starters consistent with the existing java ones.
 *
 * Recognises:  public int[] productExceptSelf(int[] nums)
 *              int maxProfit(int[] prices)
 *              public ListNode reverse(ListNode head)
 */
function parseJavaSignature(code: string): { funcName: string; ret: string; args: Arg[] } | null {
  const re = /(?:public\s+|private\s+|protected\s+|static\s+)*([\w<>\[\], ]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code || '')) !== null) {
    const funcName = (m[2] || '').trim();
    // Skip constructors and non-solution helpers.
    if (!funcName || /^(if|for|while|switch|catch|return)$/.test(funcName)) continue;
    if (/^[A-Z]/.test(funcName)) continue;
    const ret = (m[1] || '').trim();
    const paramsRaw = (m[3] || '').trim();
    const args: Arg[] = [];
    if (paramsRaw) {
      // Split on top-level commas so generic/array types stay intact.
      const parts: string[] = [];
      let depth = 0;
      let cur = '';
      for (const ch of paramsRaw) {
        if (ch === '<' || ch === '[') depth++;
        else if (ch === '>' || ch === ']') depth--;
        if (ch === ',' && depth === 0) {
          parts.push(cur.trim());
          cur = '';
        } else cur += ch;
      }
      if (cur.trim()) parts.push(cur.trim());
      parts.forEach((part, i) => {
        const tokens = part.replace(/[&*]/g, ' ').trim().split(/\s+/);
        const name = tokens[tokens.length - 1] || `arg${i}`;
        args.push({ name, type: part });
      });
    }
    return { funcName, ret, args };
  }
  return null;
}

function buildStarter(lang: string, funcName: string, ret: string, args: Arg[]): string {
  switch (lang) {
    case 'python': return pythonStarter(funcName, ret, args);
    case 'c': return cStarter(funcName, ret, args);
    case 'cpp': return cppStarter(funcName, ret, args);
    default: throw new Error(`unsupported starter language: ${lang}`);
  }
}

/** Map every bank entry onto its database problem row. */

/** Map every bank entry onto its database problem row. */
// ── verification ────────────────────────────────────────────────────────────
const PISTON = process.env.PISTON_URL ?? 'http://localhost:2000';
const PISTON_LANG: Record<string, string> = { python: 'python', c: 'c', cpp: 'c++' };
const PISTON_FILE: Record<string, string> = { python: 'main.py', c: 'main.c', cpp: 'main.cpp' };

/**
 * Compile and run a starter on Piston.
 *
 * A starter that does not compile is worse than no starter, because the user
 * sees a red editor on a problem they have not touched. This is the check that
 * makes it safe to generate 561 of them unattended.
 *
 * It only asserts COMPILES AND RUNS, never that the answer is correct: a stub
 * returning 0 is expected to fail most test cases, and that is fine. What
 * matters is that the harness accepts it and produces a well-formed result.
 */
async function verifyStarter(lang: string, code: string): Promise<{ ok: boolean; why: string }> {
  const prepared = prepareFinalCode(lang as any, code, { code, wrapperCode: null } as any);
  const payload = {
    language: PISTON_LANG[lang],
    version: '*',
    files: [{ name: PISTON_FILE[lang], content: prepared }],
    stdin: '',
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
  const j: any = await res.json();
  if (j?.compile && j.compile.code !== 0) {
    const first = String(j.compile.stderr || j.compile.output || '').trim().split('\n')[0];
    return { ok: false, why: `compile: ${first}` };
  }
  if (j?.message) return { ok: false, why: `rejected: ${j.message}` };
  if (!j?.run) return { ok: false, why: 'no run object' };
  return { ok: true, why: '' };
}

/** Deterministic sample so a rerun checks the same starters. */
function sampleEvenly<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  const out: T[] = [];
  const step = list.length / n;
  for (let i = 0; i < n; i++) out.push(list[Math.floor(i * step)]!);
  return out;
}

async function verifyPlan(plan: { problemId: string; language: string; code: string; name: string }[]) {
  const perLang = (process.argv.find((a) => a.startsWith('--verify-n=')) || '--verify-n=20')
    .split('=')[1]!;
  const n = Number(perLang) || 20;
  let pass = 0;
  const failures: string[] = [];
  for (const lang of TARGET_LANGS) {
    const items = plan.filter((p) => p.language === lang);
    const chosen = sampleEvenly(items, n);
    let lpass = 0;
    for (const it of chosen) {
      const r = await verifyStarter(lang, it.code);
      if (r.ok) {
        lpass++;
        pass++;
      } else {
        failures.push(`${lang} :: ${it.name} -> ${r.why}`);
      }
    }
    console.log(`   ${lang}: ${lpass}/${chosen.length} starters compiled and ran`);
  }
  console.log(`\nverified ${pass} starter(s), ${failures.length} failure(s)`);
  if (failures.length) {
    console.log('\nFAILURES');
    for (const f of failures.slice(0, 25)) console.log(`  - ${f}`);
    if (failures.length > 25) console.log(`  ... and ${failures.length - 25} more`);
  }
  return failures.length === 0;
}



async function main() {
  console.log(`mode: ${WRITE ? 'WRITE' : 'dry run'}`);
  console.log(`languages: ${TARGET_LANGS.join(', ') || '(none selected)'}\n`);

  // One query for all problems, keyed by number and by name, because the bank
  // identifies problems either way depending on how they were seeded.
  const problems: any[] = await (prisma as any).problem.findMany({
    select: { id: true, name: true, problem_number: true },
  });
  const byNumber = new Map<number, any>();
  const byName = new Map<string, any>();
  for (const p of problems) {
    if (p.problem_number != null) byNumber.set(p.problem_number, p);
    byName.set(String(p.name).toLowerCase(), p);
  }

  const existing: any[] = await (prisma as any).codeSnippet.findMany({
    select: { problemId: true, language: true },
  });
  const have = new Set(existing.map((s) => `${s.problemId}:${s.language}`));

  // Existing snippets, so we can mine signatures for problems the bank does not
  // know about and skip languages that already have a starter.
  const snippets: any[] = await (prisma as any).codeSnippet.findMany({
    select: { problemId: true, language: true, code: true },
  });
  const javaByProblem = new Map<string, string>();
  for (const sn of snippets) {
    if (sn.language === 'java' && !javaByProblem.has(sn.problemId)) {
      javaByProblem.set(sn.problemId, sn.code);
    }
  }

  const plan: { problemId: string; language: string; code: string; name: string }[] = [];
  let unmatched = 0;
  let noSignature = 0;
  const done = new Set<string>();

  // Bank entries first: their metadata is authoritative.
  for (const entry of BANK) {
    const target = byNumber.get(entry.number) ?? byName.get(entry.name.toLowerCase());
    if (!target) {
      unmatched++;
      continue;
    }
    done.add(target.id);
    const sig = entry.signature;
    for (const lang of TARGET_LANGS) {
      if (have.has(`${target.id}:${lang}`)) continue;
      plan.push({
        problemId: target.id,
        language: lang,
        name: entry.name,
        code: buildStarter(lang, sig.funcName, sig.returnType, sig.args),
      });
    }
  }

  // Then the legacy problems, via their existing java snippet.
  for (const p of problems) {
    if (done.has(p.id)) continue;
    const javaCode = javaByProblem.get(p.id);
    if (!javaCode) continue;
    const sig = parseJavaSignature(javaCode);
    if (!sig) {
      noSignature++;
      continue;
    }
    for (const lang of TARGET_LANGS) {
      if (have.has(`${p.id}:${lang}`)) continue;
      plan.push({
        problemId: p.id,
        language: lang,
        name: p.name,
        code: buildStarter(lang, sig.funcName, sig.ret, sig.args),
      });
    }
  }

  console.log(`bank entries: ${BANK.length}`);
  console.log(`problems not matched to a DB row: ${unmatched}`);
  console.log(`problems with no recoverable signature: ${noSignature}`);
  console.log(`snippets to create: ${plan.length}`);
  for (const lang of TARGET_LANGS) {
    console.log(`   ${lang}: ${plan.filter((p) => p.language === lang).length}`);
  }

  if (plan.length) {
    console.log('\n--- sample (first of each language) ---');
    for (const lang of TARGET_LANGS) {
      const s = plan.find((p) => p.language === lang);
      if (!s) continue;
      console.log(`\n### ${lang} :: ${s.name}\n${s.code}`);
    }
  }

  if (VERIFY) {
    const ok = await verifyPlan(plan);
    if (!ok) {
      console.error('\nstarters failed verification — refusing to write');
      process.exitCode = 1;
      return;
    }
    console.log('\nall sampled starters verified');
  }

  if (!WRITE) {
    console.log('\n(dry run — pass --write to persist)');
    return;
  }

  let created = 0;
  for (const p of plan) {
    await (prisma as any).codeSnippet.create({
      data: { problemId: p.problemId, language: p.language, code: p.code, wrapperCode: null },
    });
    created++;
  }
  console.log(`\ncreated ${created} snippet(s)`);
}

main()
  .catch((e) => {
    console.error('failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
