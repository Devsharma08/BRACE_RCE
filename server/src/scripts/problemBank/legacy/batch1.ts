// @ts-nocheck
//
// Reference solutions in this file are DELIBERATELY plain JavaScript.
//
// `buildUserSolution` serialises each `solve` with Function.prototype.toString
// and ships the result to the Piston sandbox as the user's submission. Any
// TypeScript-only syntax (type annotations, `as` casts, interfaces, generics)
// would be emitted verbatim into that sandbox and fail to parse, so these
// bodies must not carry annotations even though the project compiles with
// `strict`. The surrounding tooling IS type checked; only the reference
// implementations below are exempt.
/**
 * Legacy references, batch 1 — arrays and strings.
 *
 * Each `solve` is a plain-JS, self-contained function: `buildLegacySolution`
 * serializes it into a real submission, so it may not close over anything at
 * module scope and should avoid `const f = () => {}` (the toolchain rewrites
 * that into a `__name(...)` call).
 */
import { Rng } from '../helpers.js';
import type { LegacyEntry } from './types.js';

/** Shuffle helper, inlined into each generator that needs it. */
export const shuffle = (r: Rng, a: number[]): number[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
};

export const batch1: LegacyEntry[] = [
  {
    number: 1,
    funcName: 'twoSum',
    argNames: ['nums', 'target'],
    edge: [
      [[2, 7, 11, 15], 9],
      [[3, 2, 4], 6],
      [[3, 3], 6],
      [[], 0],
      [[5], 5],
    ],
    gen: (r) => {
      const n = r.int(2, 10);
      const nums = r.nums(n, -20, 20);
      // Target the sum of two distinct positions so a solution exists.
      const i = r.int(0, n - 1);
      let j = r.int(0, n - 1);
      while (j === i) j = r.int(0, n - 1);
      return [nums, nums[i] + nums[j]];
    },
    solve: (args) => {
      const nums = args[0];
      const target = args[1];
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        const want = target - nums[i];
        if (seen.has(want)) return [seen.get(want), i];
        seen.set(nums[i], i);
      }
      return [];
    },
  },
  {
    number: 10,
    funcName: 'isPalindrome',
    argNames: ['x'],
    edge: [[121], [-121], [10], [0], [1]],
    gen: (r) => {
      const v = r.int(1, 999999);
      // Half the time, build an actual palindrome.
      if (r.next() < 0.5) {
        const s = String(v);
        return [parseInt(s + s.split('').reverse().join(''), 10)];
      }
      return [r.int(-999999, 999999)];
    },
    solve: (args) => {
      let x = args[0];
      if (x < 0) return false;
      if (x === 0) return true;
      let rev = 0;
      let rest = x;
      while (rest > 0) {
        rev = rev * 10 + (rest % 10);
        rest = Math.floor(rest / 10);
      }
      return rev === x;
    },
  },
  {
    number: 18,
    funcName: 'highFive',
    argNames: ['items'],
    edge: [
      [[[1, 2, 90], [3, 2, 99], [2, 2, 10]]],
      [[[3, 0, 100]]],
      [[[1, 1, 100], [2, 2, 200]]],
      [[[5, 0, 98]]],
      [[[2, 2, 91], [1, 5, 90], [3, 1, 99]]],
    ],
    gen: (r) => {
      const k = r.int(1, 5);
      const items = [];
      for (let i = 0; i < k; i++) {
        items.push([r.int(1, 6), r.int(1, 3), r.int(1, 5), r.int(1, 100)]);
      }
      return [items];
    },
    solve: (args) => {
      const items = args[0];
      const byStudent = new Map();
      for (const it of items) {
        const [id, score, k] = it;
        const list = byStudent.get(id) ?? [];
        list.push({ score, k });
        byStudent.set(id, list);
      }
      const out = [];
      for (const [id, list] of byStudent) {
        list.sort((a, b) => b.score - a.score);
        const top = list.slice(0, list[0].k);
        let sum = 0;
        for (const t of top) sum += t.score;
        out.push([id, sum]);
      }
      out.sort((a, b) => a[0] - b[0]);
      return out;
    },
  },
  {
    number: 22,
    funcName: 'generate',
    argNames: ['numRows'],
    edge: [[1], [2], [3], [5], [10]],
    gen: (r) => [r.int(1, 15)],
    solve: (args) => {
      const rows = args[0];
      const out = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j <= i; j++) {
          if (j === 0 || j === i) row.push(1);
          else row.push(out[i - 1][j - 1] + out[i - 1][j]);
        }
        out.push(row);
      }
      return out;
    },
  },
  {
    number: 28,
    funcName: 'longestConsecutive',
    argNames: ['nums'],
    edge: [
      [[100, 4, 200, 1, 3, 2]],
      [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]],
      [[]],
      [[1]],
      [[1, 2, 0, 1]],
    ],
    gen: (r) => {
      const n = r.int(0, 12);
      if (n === 0) return [[]];
      // Build runs of consecutive integers, then include duplicates, so the
      // input contains multi-step sequences rather than isolated numbers.
      const set = new Set<number>();
      let cur = r.int(-20, 20);
      const runs = r.int(1, 3);
      for (let k = 0; k < runs; k++) {
        const len = r.int(1, 5);
        for (let i = 0; i < len; i++) {
          set.add(cur);
          cur += r.int(1, 3);
        }
      }
      return [shuffle(r, [...set])];
    },
    solve: (args) => {
      const set = new Set(args[0]);
      let best = 0;
      for (const v of set) {
        if (set.has(v - 1)) continue;
        let len = 0;
        let cur = v;
        while (set.has(cur)) {
          len++;
          cur++;
        }
        if (len > best) best = len;
      }
      return best;
    },
  },
  {
    number: 32,
    funcName: 'romanToInt',
    argNames: ['s'],
    edge: [
      ['III'],
      ['LVIII'],
      ['MCMXCIV'],
      ['IV'],
      ['I'],
    ],
    gen: (r) => {
      const vals = [1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1000];
      const syms = ['I', 'IV', 'V', 'IX', 'X', 'XL', 'L', 'XC', 'C', 'CD', 'D', 'CM', 'M'];
      // Build a number in 1..3999 and emit its canonical Roman form.
      let n = r.int(1, 3999);
      let out = '';
      for (let i = vals.length - 1; i >= 0; i--) {
        while (n >= vals[i]) {
          out += syms[i];
          n -= vals[i];
        }
      }
      return [out];
    },
    solve: (args) => {
      const map = {
        I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
      };
      const s = args[0];
      let total = 0;
      for (let i = 0; i < s.length; i++) {
        const cur = map[s[i]];
        const next = i + 1 < s.length ? map[s[i + 1]] : 0;
        // A smaller value before a larger one means subtraction.
        total += cur < next ? -cur : cur;
      }
      return total;
    },
  },
  {
    number: 103,
    funcName: 'productExceptSelf',
    argNames: ['nums'],
    edge: [
      [[1, 2, 3, 4]],
      [[-1, 1, 0, -3, 3]],
      [[0, 0]],
      [[5]],
      [[2, 3]],
    ],
    gen: (r) => {
      const n = r.int(2, 9);
      // Small range so zeros and sign collisions actually occur.
      return [r.nums(n, -3, 3)];
    },
    solve: (args) => {
      const nums = args[0];
      const n = nums.length;
      const out = new Array(n).fill(1);
      let pre = 1;
      for (let i = 0; i < n; i++) {
        out[i] = pre;
        pre *= nums[i];
      }
      let suf = 1;
      for (let i = n - 1; i >= 0; i--) {
        out[i] *= suf;
        suf *= nums[i];
      }
      return out;
    },
  },
  {
    number: 106,
    funcName: 'isAnagram',
    argNames: ['s', 't'],
    edge: [
      ['anagram', 'nagaram'],
      ['rat', 'car'],
      ['a', 'ab'],
      ['', ''],
      ['aacc', 'ccac'],
    ],
    gen: (r) => {
      const s = r.str(r.int(0, 10));
      if (r.next() < 0.5) {
        return [s, shuffleLetters(s)];
      }
      const t = r.str(r.int(0, 10));
      return [s, t];
    },
    solve: (args) => {
      const s = args[0];
      const t = args[1];
      if (s.length !== t.length) return false;
      const counts = new Map();
      for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
      for (const c of t) {
        const v = counts.get(c) ?? 0;
        if (v === 0) return false;
        counts.set(c, v - 1);
      }
      return true;
    },
  },
  {
    number: 114,
    funcName: 'removeDuplicates',
    argNames: ['nums'],
    edge: [
      [[1, 1, 2]],
      [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]],
      [[]],
      [[1]],
      [[1, 2, 3]],
    ],
    gen: (r) => {
      const n = r.int(0, 12);
      const base = r.nums(n, 0, 5).sort((a, b) => a - b);
      // Repeat a few values so in-place compaction actually matters.
      const withDups = [];
      for (const v of base) {
        withDups.push(v);
        if (r.next() < 0.5) withDups.push(v);
      }
      return [withDups];
    },
    solve: (args) => {
      const nums = args[0];
      if (nums.length === 0) return 0;
      let k = 1;
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[k - 1]) {
          nums[k] = nums[i];
          k++;
        }
      }
      return k;
    },
  },
  {
    number: 120,
    funcName: 'removeElement',
    argNames: ['nums', 'val'],
    edge: [
      [[3, 2, 2, 3], 3],
      [[0, 1, 2, 2, 3, 0, 4, 2], 2],
      [[], 1],
      [[7], 7],
      [[1, 1, 1], 1],
    ],
    gen: (r) => {
      const n = r.int(0, 10);
      const nums = r.nums(n, -2, 2);
      return [nums, r.pick([-2, -1, 0, 1, 2, 9])];
    },
    solve: (args) => {
      const nums = args[0];
      const val = args[1];
      let k = 0;
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== val) {
          nums[k] = nums[i];
          k++;
        }
      }
      return k;
    },
  },
];

/** Shuffle the characters of a string using the deterministic RNG. */
function shuffleLetters(s: string): string {
  const a = s.split('');
  for (let i = a.length - 1; i > 0; i--) {
    // Deterministic xorshift on the index, so no RNG dependency is needed.
    let x = (i + 1) * 2654435761;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const j = ((x >>> 0) % (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a.join('');
}
