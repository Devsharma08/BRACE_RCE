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
 * Legacy references, batch 3 — strings, arrays and numbers.
 *
 * Tree-valued parameters normalise their input with a local asTree(), which
 * accepts either a TreeNode or a level-order array, because the execution
 * wrapper only converts arrays to nodes when its name heuristic fires.
 */
import { Rng } from '../helpers.js';
import type { LegacyEntry } from './types.js';

export const batch3: LegacyEntry[] = [
  {
    number: 3,
    funcName: 'longestValidParentheses',
    argNames: ['s'],
    edge: [['(())'], ['()((())'], [''], ['()(()'], ['()(())']],
    gen: (r) => {
      // Build a random parenthesis string, biased towards valid nesting so the
      // answer is not always 0.
      let s = '';
      let open = 0;
      const n = r.int(0, 14);
      for (let i = 0; i < n; i++) {
        if (open > 0 && r.next() < 0.55) {
          s += ')';
          open--;
        } else {
          s += '(';
          open++;
        }
      }
      while (open > 0 && r.next() < 0.6) {
        s += ')';
        open--;
      }
      return [s];
    },
    solve: (args) => {
      // Stack of indices; -1 marks the position just before a valid run.
      const s = args[0];
      const stack = [-1];
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') {
          stack.push(i);
        } else {
          stack.pop();
          if (stack.length === 0) {
            stack.push(i);
          } else {
            const len = i - stack[stack.length - 1];
            if (len > best) best = len;
          }
        }
      }
      return best;
    },
  },
  {
    number: 4,
    funcName: 'lengthOfLongestSubstring',
    argNames: ['s'],
    edge: [['abcabcbb'], ['bbbbb'], ['pwwkew'], [''], ['dvdf']],
    gen: (r) => [r.str(r.int(0, 16), 'abcd')],
    solve: (args) => {
      // Sliding window over the last-seen index of each character.
      const s = args[0];
      const last = new Map();
      let start = 0;
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (last.has(c) && last.get(c) >= start) start = last.get(c) + 1;
        last.set(c, i);
        const len = i - start + 1;
        if (len > best) best = len;
      }
      return best;
    },
  },
  {
    number: 6,
    funcName: 'longestPalindrome',
    argNames: ['s'],
    edge: [['babad'], ['cbbd'], [''], ['a'], ['ac']],
    gen: (r) => {
      // Sometimes build a genuine palindrome so the answer is non-trivial.
      if (r.next() < 0.5) {
        const half = r.str(r.int(0, 5), 'abc');
        return [half + half.split('').reverse().join('')];
      }
      return [r.str(r.int(0, 12), 'abc')];
    },
    solve: (args) => {
      // Expand around every centre.
      const s = args[0];
      let best = '';
      const expand = (l, r) => {
        while (l >= 0 && r < s.length && s[l] === s[r]) {
          l--;
          r++;
        }
        const candidate = s.slice(l + 1, r);
        if (candidate.length > best.length) best = candidate;
      };
      for (let i = 0; i < s.length; i++) {
        expand(i, i);
        expand(i, i + 1);
      }
      return best;
    },
  },
  {
    number: 8,
    funcName: 'reverse',
    argNames: ['x'],
    edge: [[123], [-123], [120], [0], [1534236469]],
    gen: (r) => [r.int(-99999999, 99999999)],
    solve: (args) => {
      const x = args[0];
      const sign = x < 0 ? -1 : 1;
      let rest = Math.abs(x);
      let rev = 0;
      while (rest > 0) {
        rev = rev * 10 + (rest % 10);
        rest = Math.floor(rest / 10);
      }
      const out = sign * rev;
      return out > 2147483647 || out < -2147483648 ? 0 : out;
    },
  },
  {
    number: 9,
    funcName: 'myAtoi',
    argNames: ['s'],
    edge: [['42'], ['   -42'], ['4193 with words'], ['words and 987'], ['-91283472332']],
    gen: (r) => {
      const roll = r.int(0, 5);
      if (roll === 0) return [String(r.int(0, 200000))];
      if (roll === 1) return ['  -' + r.int(0, 50000)];
      if (roll === 2) return ['+' + r.int(0, 50000)];
      if (roll === 3) return ['abc' + r.int(0, 100)];
      if (roll === 4) return [String(r.int(0, 300000)) + 'xyz'];
      return [''];
    },
    solve: (args) => {
      const s = args[0].trim();
      if (s.length === 0) return 0;
      let i = 0;
      let sign = 1;
      if (s[i] === '+' || s[i] === '-') {
        if (s[i] === '-') sign = -1;
        i++;
      }
      let value = 0;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') {
        value = value * 10 + (s.charCodeAt(i) - 48);
        // Clamp as soon as the limit is passed so 32-bit range is respected.
        if (value > 2147483648) return sign === 1 ? 2147483647 : -2147483648;
        i++;
      }
      const out = sign * value;
      return out > 2147483647 ? 2147483647 : out < -2147483648 ? -2147483648 : out;
    },
  },
  {
    number: 15,
    funcName: 'lastStoneWeight',
    argNames: ['stones'],
    edge: [
      [[2, 7, 4, 1, 8, 1]],
      [[1]],
      [[2, 2]],
      [[1, 2, 3]],
      [[]],
    ],
    gen: (r) => [r.nums(r.int(0, 10), 1, 30)],
    solve: (args) => {
      // Repeatedly collide the two heaviest stones.
      const stones = args[0].slice().sort((a, b) => b - a);
      let lo = 0;
      let hi = stones.length - 1;
      while (lo < hi) {
        const top = stones[lo];
        const next = stones[hi];
        if (top === next) {
          lo++;
          hi--;
        } else if (top > next) {
          stones[lo] = top - next;
          lo++;
        } else {
          stones[hi] = next - top;
          hi--;
        }
      }
      return lo === hi ? stones[lo] : 0;
    },
  },
  {
    number: 24,
    funcName: 'maxProfit',
    argNames: ['prices'],
    edge: [
      [[7, 1, 5, 3, 6, 4]],
      [[7, 6, 4, 3, 1]],
      [[]],
      [[1]],
      [[1, 2]],
    ],
    gen: (r) => [r.nums(r.int(0, 12), 1, 40)],
    solve: (args) => {
      // Track the cheapest price seen so far.
      const prices = args[0];
      if (prices.length === 0) return 0;
      let minSoFar = prices[0];
      let best = 0;
      for (let i = 1; i < prices.length; i++) {
        if (prices[i] - minSoFar > best) best = prices[i] - minSoFar;
        if (prices[i] < minSoFar) minSoFar = prices[i];
      }
      return best;
    },
  },
  {
    number: 25,
    funcName: 'minRemoveToMakeValid',
    argNames: ['s'],
    edge: [['lee(t(c)o)de)'], ['a)b(c)d'], ['))'], ['(a(b(c)d)'], ['']],
    gen: (r) => {
      const pool = '()abc';
      let s = '';
      const n = r.int(0, 14);
      for (let i = 0; i < n; i++) s += pool[r.int(0, pool.length - 1)];
      return [s];
    },
    solve: (args) => {
      const s = args[0];
      const chars = s.split('');
      const open = [];
      let removed = 0;
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === '(') {
          open.push(i);
        } else if (chars[i] === ')') {
          if (open.length > 0) open.pop();
          else {
            chars[i] = '';
            removed++;
          }
        }
      }
      for (const idx of open) {
        chars[idx] = '';
        removed++;
      }
      return removed;
    },
  },
  {
    number: 126,
    funcName: 'divide',
    argNames: ['dividend', 'divisor'],
    edge: [
      [10, 3],
      [7, -3],
      [-2147483648, -1],
      [1, 1],
      [0, 5],
    ],
    gen: (r) => [r.int(-100000, 100000), r.int(-1000, 1000) || 1],
    solve: (args) => {
      const dividend = args[0];
      const divisor = args[1];
      if (divisor === 0) return 0;
      // INT_MIN / -1 overflows a 32-bit signed integer.
      if (dividend === -2147483648 && divisor === -1) return 2147483647;
      const negative = (dividend < 0) !== (divisor < 0);
      let a = Math.abs(dividend);
      const b = Math.abs(divisor);
      let result = 0;
      while (a >= b) {
        let value = b;
        let multiple = 1;
        // Double the divisor while it still fits, then step back.
        while (value * 2 <= a) {
          value *= 2;
          multiple *= 2;
        }
        a -= value;
        result += multiple;
      }
      return negative ? -result : result;
    },
  },
  {
    number: 127,
    funcName: 'nextPermutation',
    argNames: ['nums'],
    edge: [
      [[1, 2, 3]],
      [[3, 2, 1]],
      [[1, 1, 5]],
      [[1]],
      [[1, 3, 2]],
    ],
    gen: (r) => [r.nums(r.int(1, 8), 1, 5)],
    solve: (args) => {
      // Find the rightmost ascent, swap with its suffix pivot, then reverse.
      const nums = args[0];
      const n = nums.length;
      let i = n - 2;
      while (i >= 0 && nums[i] >= nums[i + 1]) i--;
      if (i >= 0) {
        let j = n - 1;
        while (nums[j] <= nums[i]) j--;
        const t = nums[i];
        nums[i] = nums[j];
        nums[j] = t;
      }
      let lo = i + 1;
      let hi = n - 1;
      while (lo < hi) {
        const t = nums[lo];
        nums[lo] = nums[hi];
        nums[hi] = t;
        lo++;
        hi--;
      }
      return nums;
    },
  },
  {
    number: 130,
    funcName: 'topKFrequent',
    argNames: ['nums', 'k'],
    edge: [
      [[1, 1, 1, 2, 2, 3], 2],
      [[1], 1],
      [[4, 4, 4, 5, 5, 6], 2],
      [[-1, -1, 3], 1],
      [[1, 2], 2],
    ],
    gen: (r) => {
      const n = r.int(1, 14);
      // A tiny value range guarantees repeats, so k is always satisfiable.
      const nums = r.nums(n, -3, 3);
      return [nums, r.int(1, Math.min(nums.length, 4))];
    },
    solve: (args) => {
      const nums = args[0];
      const k = args[1];
      const counts = new Map();
      for (const v of nums) counts.set(v, (counts.get(v) ?? 0) + 1);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      return sorted.slice(0, k).map((e) => e[0]);
    },
  },
  {
    number: 133,
    funcName: 'searchInsert',
    argNames: ['nums', 'target'],
    edge: [
      [[1, 3, 5, 6], 5],
      [[1, 3, 5, 6], 2],
      [[1, 3, 5, 6], 7],
      [[1, 3, 5, 6], 0],
      [[], 1],
    ],
    gen: (r) => {
      const n = r.int(0, 10);
      const nums = [];
      for (let i = 0; i < n; i++) nums.push(i * 2);
      return [nums, r.int(-2, n * 2 + 2)];
    },
    solve: (args) => {
      // Lower bound: first index whose value is >= target.
      const nums = args[0];
      const target = args[1];
      let lo = 0;
      let hi = nums.length;
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
  },

  {
    number: 135,
    funcName: 'countAndSay',
    argNames: ['n'],
    edge: [[1], [2], [3], [4], [5]],
    gen: (r) => [r.int(1, 12)],
    solve: (args) => {
      let term = '1';
      for (let step = 1; step < args[0]; step++) {
        let next = '';
        let i = 0;
        while (i < term.length) {
          let j = i;
          while (j < term.length && term[j] === term[i]) j++;
          next += (j - i) + term[i];
          i = j;
        }
        term = next;
      }
      return term;
    },
  },
  {
    number: 136,
    funcName: 'fizzBuzz',
    argNames: ['n'],
    edge: [[1], [3], [5], [15], [0]],
    gen: (r) => [r.int(0, 20)],
    solve: (args) => {
      const n = args[0];
      const out = [];
      for (let i = 1; i <= n; i++) {
        if (i % 15 === 0) out.push('FizzBuzz');
        else if (i % 3 === 0) out.push('Fizz');
        else if (i % 5 === 0) out.push('Buzz');
        else out.push(String(i));
      }
      return out;
    },
  },
  {
    number: 138,
    funcName: 'firstMissingPositive',
    argNames: ['nums'],
    edge: [
      [[1, 2, 0]],
      [[3, 4, -1, 1]],
      [[7, 8, 9, 11, 12]],
      [[1]],
      [[1, 1]],
    ],
    gen: (r) => {
      const n = r.int(1, 12);
      // Values drawn from a range around 1..n so an answer usually exists.
      return [r.nums(n, -2, n + 2)];
    },
    solve: (args) => {
      // Cyclic sort: place value v at index v - 1.
      const nums = args[0];
      const n = nums.length;
      for (let i = 0; i < n; i++) {
        while (nums[i] > 0 && nums[i] <= n && nums[nums[i] - 1] !== nums[i]) {
          const target = nums[i] - 1;
          const t = nums[target];
          nums[target] = nums[i];
          nums[i] = t;
        }
      }
      for (let i = 0; i < n; i++) {
        if (nums[i] !== i + 1) return i + 1;
      }
      return n + 1;
    },
  },
  {
    number: 140,
    funcName: 'multiply',
    argNames: ['num1', 'num2'],
    edge: [
      ['2', '3'],
      ['123', '456'],
      ['0', '52'],
      ['-5', '-12'],
      ['999', '999'],
    ],
    gen: (r) => {
      const mk = () => {
        const digits = r.int(1, 12);
        let s = String(r.int(1, 9));
        for (let i = 1; i < digits; i++) s += String(r.int(0, 9));
        return s;
      };
      return [mk(), mk()];
    },
    solve: (args) => {
      // Grade-school multiplication on digit arrays, sign handled separately.
      const a = args[0];
      const b = args[1];
      const negative = (a[0] === '-') !== (b[0] === '-');
      const x = (a[0] === '-' ? a.slice(1) : a).split('').reverse().map(Number);
      const y = (b[0] === '-' ? b.slice(1) : b).split('').reverse().map(Number);
      const out = new Array(x.length + y.length).fill(0);
      for (let i = 0; i < x.length; i++) {
        for (let j = 0; j < y.length; j++) {
          const sum = out[i + j] + x[i] * y[j];
          out[i + j] = sum % 10;
          out[i + j + 1] = Math.floor(sum / 10) + (out[i + j + 1] ?? 0);
        }
      }
      const digits = out.reverse();
      // Strip leading zeros but keep a single digit for a zero product.
      let start = 0;
      while (start < digits.length - 1 && digits[start] === 0) start++;
      let result = digits.slice(start).join('');
      if (negative && result !== '0') result = '-' + result;
      return result;
    },
  },
  {
    number: 141,
    funcName: 'groupAnagrams',
    argNames: ['strs'],
    edge: [
      [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']],
      [['']],
      [['a']],
      [['ab', 'ba', 'abc']],
      [['a', 'b']],
    ],
    gen: (r) => {
      const n = r.int(1, 8);
      const words = [];
      for (let i = 0; i < n; i++) {
        const len = r.int(1, 6);
        let w = '';
        for (let j = 0; j < len; j++) w += 'abcde'[r.int(0, 4)];
        words.push(w);
      }
      return [words];
    },
    solve: (args) => {
      // Group by a sorted-character signature.
      const groups = new Map();
      for (const s of args[0]) {
        const key = s.split('').sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
      }
      return [...groups.values()];
    },
  },
  {
    number: 142,
    funcName: 'myPow',
    argNames: ['x', 'n'],
    edge: [
      [2.0, 10],
      [2.1, 3],
      [2.0, -2],
      [1.0, 0],
      [2.0, -2147483648],
    ],
    gen: (r) => [r.int(-5, 5), r.int(-20, 20)],
    solve: (args) => {
      let base = args[0];
      let exp = args[1];
      if (exp < 0) {
        base = 1 / base;
        exp = -exp;
      }
      let result = 1;
      while (exp > 0) {
        if (exp % 2 === 1) result *= base;
        base *= base;
        exp = Math.floor(exp / 2);
      }
      return result;
    },
  },
  {
    number: 147,
    funcName: 'lengthOfLastWord',
    argNames: ['s'],
    edge: [['Hello World'], ['   fly me   to   the moon  '], ['luffy is still joyboy'], [''], ['a']],
    gen: (r) => {
      const words = r.int(0, 4);
      const parts = [];
      for (let i = 0; i < words; i++) parts.push(r.str(r.int(1, 6), 'abc'));
      return [parts.join(' ')];
    },
    solve: (args) => {
      const words = args[0].trim().split(/\s+/).filter((w) => w.length > 0);
      return words.length === 0 ? 0 : words[words.length - 1].length;
    },
  },
  {
    number: 151,
    funcName: 'uniquePaths',
    argNames: ['m', 'n'],
    edge: [[3, 7], [3, 2], [7, 3], [3, 3], [1, 1]],
    gen: (r) => [r.int(1, 10), r.int(1, 10)],
    solve: (args) => {
      // DP over the grid: paths(m, n) = paths(m-1, n) + paths(m, n-1).
      const m = args[0];
      const n = args[1];
      const row = new Array(n).fill(1);
      for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) row[j] += row[j - 1];
      }
      return row[n - 1];
    },
  },
  {
    number: 154,
    funcName: 'plusOne',
    argNames: ['digits'],
    edge: [
      [[1, 2, 3]],
      [[4, 3, 2, 1]],
      [[9]],
      [[9, 9]],
      [[0]],
    ],
    gen: (r) => {
      // Trailing 9s are what trigger the carry, so vary them deliberately.
      const n = r.int(1, 6);
      const digits = [];
      for (let i = 0; i < n; i++) digits.push(r.int(0, 9));
      if (r.next() < 0.4) {
        const start = r.int(0, n - 1);
        for (let i = start; i < n; i++) digits[i] = 9;
      }
      return [digits];
    },
    solve: (args) => {
      // Add one from the least significant digit, carrying as needed.
      const digits = args[0];
      for (let i = digits.length - 1; i >= 0; i--) {
        if (digits[i] < 9) {
          digits[i]++;
          return digits;
        }
        digits[i] = 0;
      }
      return [1, ...digits];
    },
  },
  {
    number: 155,
    funcName: 'addBinary',
    argNames: ['a', 'b'],
    edge: [
      ['11', '10'],
      ['1010', '1011'],
      ['0', '0'],
      ['1', '1'],
      ['1111', '1111'],
    ],
    gen: (r) => {
      const mk = () => {
        const len = r.int(1, 12);
        let s = '';
        for (let i = 0; i < len; i++) s += String(r.int(0, 1));
        return s;
      };
      return [mk(), mk()];
    },
    solve: (args) => {
      // Column-wise addition with a carry, without parsing to a number.
      const a = args[1 - 1];
      const b = args[1];
      let i = a.length - 1;
      let j = b.length - 1;
      let carry = 0;
      const out = [];
      while (i >= 0 || j >= 0 || carry) {
        let sum = carry;
        if (i >= 0) sum += a[i--] === '1' ? 1 : 0;
        if (j >= 0) sum += b[j--] === '1' ? 1 : 0;
        out.push(String(sum % 2));
        carry = Math.floor(sum / 2);
      }
      return out.reverse().join('');
    },
  },
  {
    number: 159,
    funcName: 'mySqrt',
    argNames: ['x'],
    edge: [[4], [8], [0], [1], [2147395599]],
    gen: (r) => [r.int(0, 100000)],
    solve: (args) => {
      // Binary search for the largest r with r * r <= x.
      const x = args[0];
      if (x < 2) return x;
      let lo = 1;
      let hi = Math.floor(x / 2);
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (mid * mid <= x) lo = mid + 1;
        else hi = mid - 1;
      }
      return hi;
    },
  },

];
