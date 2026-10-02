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
 * Legacy references, batch 4 — searching, sorting, two-pointer and DP.
 */
import { Rng } from '../helpers.js';
import type { LegacyEntry } from './types.js';

export const batch4: LegacyEntry[] = [
  {
    number: 129,
    funcName: 'search',
    argNames: ['nums', 'target'],
    edge: [
      [[4, 5, 6, 7, 0, 1, 2], 0],
      [[4, 5, 6, 7, 0, 1, 2], 3],
      [[1], 0],
      [[], 5],
      [[1, 3], 3],
    ],
    gen: (r) => {
      // Build a sorted array, rotate it, then search for a present or absent value.
      const n = r.int(1, 10);
      const nums = [];
      for (let i = 0; i < n; i++) nums.push(i * 2 + 1);
      const pivot = r.int(0, n - 1);
      const rotated = nums.slice(pivot).concat(nums.slice(0, pivot));
      const target = r.next() < 0.6 ? rotated[r.int(0, n - 1)] : r.int(-5, n * 2 + 5);
      return [rotated, target];
    },
    solve: (args) => {
      // Binary search that first decides which half is sorted.
      const nums = args[0];
      const target = args[1];
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (nums[mid] === target) return mid;
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
          else lo = mid + 1;
        } else {
          if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
          else hi = mid - 1;
        }
      }
      return -1;
    },
  },
  {
    number: 131,
    funcName: 'searchRange',
    argNames: ['nums', 'target'],
    edge: [
      [[5, 7, 7, 8, 8, 10], 8],
      [[5, 7, 7, 8, 8, 10], 6],
      [[], 0],
      [[1], 1],
      [[2, 2, 2], 2],
    ],
    gen: (r) => {
      const n = r.int(0, 12);
      const nums = [];
      for (let i = 0; i < n; i++) nums.push(r.int(0, 6));
      nums.sort((a, b) => a - b);
      return [nums, r.int(0, 7)];
    },
    solve: (args) => {
      const nums = args[0];
      const target = args[1];
      // Inline lower bound: first index whose value is >= v.
      const lowerBound = (v) => {
        let lo = 0;
        let hi = nums.length;
        while (lo < hi) {
          const mid = lo + Math.floor((hi - lo) / 2);
          if (nums[mid] < v) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      };
      const first = lowerBound(target);
      if (first === nums.length || nums[first] !== target) return [-1, -1];
      return [first, lowerBound(target + 1) - 1];
    },
  },
  {
    number: 146,
    funcName: 'insert',
    argNames: ['intervals', 'newInterval'],
    edge: [
      [[[1, 3], [6, 9]], [2, 5]],
      [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 9]],
      [[], [5, 7]],
      [[[1, 5]], [6, 8]],
      [[[1, 5]], [0, 1]],
    ],
    gen: (r) => {
      // Non-overlapping, sorted intervals so the merge is well defined.
      const count = r.int(0, 5);
      const intervals = [];
      let cursor = r.int(-5, 5);
      for (let i = 0; i < count; i++) {
        const start = cursor;
        const end = start + r.int(0, 5);
        intervals.push([start, end]);
        cursor = end + r.int(1, 5);
      }
      const s = r.int(-5, cursor + 5);
      return [intervals, [s, s + r.int(0, 5)]];
    },
    solve: (args) => {
      const intervals = args[0];
      const added = args[1];
      const out = [];
      let i = 0;
      let placed = false;
      while (i < intervals.length && intervals[i][1] < added[0]) {
        out.push(intervals[i]);
        i++;
      }
      while (i < intervals.length && intervals[i][0] <= added[1]) {
        // Absorb any interval that overlaps the incoming one.
        added[0] = Math.min(added[0], intervals[i][0]);
        added[1] = Math.max(added[1], intervals[i][1]);
        i++;
      }
      out.push(added.slice());
      while (i < intervals.length) {
        out.push(intervals[i]);
        i++;
      }
      placed = true;
      void placed;
      return out;
    },
  },
  {
    number: 149,
    funcName: 'leastInterval',
    argNames: ['tasks', 'n'],
    edge: [
      [['A', 'A', 'A', 'B', 'B', 'C'], 2],
      [['A', 'A', 'A', 'B', 'B', 'C'], 0],
      [['A'], 1],
      [['A', 'A'], 2],
      [['A', 'B', 'C', 'D'], 3],
    ],
    gen: (r) => {
      const kinds = r.int(1, 4);
      const pool = ['A', 'B', 'C', 'D'].slice(0, kinds);
      const total = r.int(1, 10);
      const tasks = [];
      for (let i = 0; i < total; i++) tasks.push(r.pick(pool));
      return [tasks, r.int(0, 4)];
    },
    solve: (args) => {
      // The frame is set by the most frequent task; the rest fill the gaps.
      const tasks = args[0];
      const n = args[1];
      if (tasks.length === 0) return 0;
      const counts = new Map();
      for (const t of tasks) counts.set(t, (counts.get(t) ?? 0) + 1);
      let maxCount = 0;
      for (const c of counts.values()) if (c > maxCount) maxCount = c;
      const maxKinds = [...counts.values()].filter((c) => c === maxCount).length;
      const frame = Math.max(tasks.length, (maxCount - 1) * (n + 1) + maxKinds);
      return n === 0 ? tasks.length : frame;
    },
  },
  {
    number: 152,
    funcName: 'countSubstrings',
    argNames: ['s'],
    edge: [['abc'], ['aaa'], [''], ['a'], ['aba']],
    gen: (r) => [r.str(r.int(0, 14), 'aab')],
    solve: (args) => {
      // Expand around every centre and count the matching pairs.
      const s = args[0];
      let count = 0;
      for (let i = 0; i < s.length; i++) {
        for (let l = i, r = i; l >= 0 && r < s.length && s[l] === s[r]; l--, r++) count++;
        for (let l = i - 1, r = i + 1; l >= 0 && r < s.length && s[l] === s[r]; l--, r++) count++;
      }
      return count;
    },
  },
  {
    number: 162,
    funcName: 'climbStairs',
    argNames: ['n'],
    edge: [[2], [3], [1], [10], [0]],
    gen: (r) => [r.int(0, 15)],
    solve: (args) => {
      // Ways(n) = Ways(n-1) + Ways(n-2), with the base cases 1 and 2.
      const n = args[0];
      if (n <= 2) return Math.max(1, n);
      let prev2 = 1;
      let prev1 = 2;
      for (let i = 3; i <= n; i++) {
        const cur = prev1 + prev2;
        prev2 = prev1;
        prev1 = cur;
      }
      return prev1;
    },
  },
  {
    number: 164,
    funcName: 'dailyTemperatures',
    argNames: ['temperatures'],
    edge: [
      [[73, 74, 75, 71, 69, 72, 76, 73]],
      [[30, 40, 50, 60]],
      [[30, 60, 90]],
      [[]],
      [[50]],
    ],
    gen: (r) => {
      const n = r.int(0, 12);
      // Small range so warmer days actually appear ahead of colder ones.
      return [r.nums(n, 30, 45)];
    },
    solve: (args) => {
      // Monotonic stack of indices awaiting a warmer day.
      const t = args[0];
      const out = new Array(t.length).fill(0);
      const stack = [];
      for (let i = 0; i < t.length; i++) {
        while (stack.length && t[stack[stack.length - 1]] < t[i]) {
          const idx = stack.pop();
          out[idx] = i - idx;
        }
        stack.push(i);
      }
      return out;
    },
  },
  {
    number: 169,
    funcName: 'sortColors',
    argNames: ['nums'],
    edge: [
      [[2, 0, 2, 1, 1, 0]],
      [[2, 0, 1]],
      [[0]],
      [[1, 2, 0]],
      [[2, 2, 2]],
    ],
    gen: (r) => [r.nums(r.int(0, 14), 0, 2)],
    solve: (args) => {
      // Dutch national flag: three pointers, one pass, in place.
      const nums = args[0];
      let low = 0;
      let mid = 0;
      let high = nums.length - 1;
      while (mid <= high) {
        if (nums[mid] === 0) {
          const t = nums[low];
          nums[low] = nums[mid];
          nums[mid] = t;
          low++;
          mid++;
        } else if (nums[mid] === 1) {
          mid++;
        } else {
          const t = nums[high];
          nums[high] = nums[mid];
          nums[mid] = t;
          high--;
        }
      }
      return nums;
    },
  },
  {
    number: 173,
    funcName: 'subsets',
    argNames: ['nums'],
    edge: [
      [[1, 2, 3]],
      [[0]],
      [[1, 2, 3, 4, 5]],
      [[]],
      [[5]],
    ],
    gen: (r) => {
      const n = r.int(0, 6);
      // Distinct values, since duplicate handling makes the ordering ambiguous.
      return [r.distinct(n, 1, 30)];
    },
    solve: (args) => {
      // Backtracking: every element is either in or out of each subset.
      const nums = args[0];
      const out = [];
      const walk = (start, current) => {
        out.push(current.slice());
        for (let i = start; i < nums.length; i++) {
          current.push(nums[i]);
          walk(i + 1, current);
          current.pop();
        }
      };
      walk(0, []);
      return out;
    },
  },
  {
    number: 180,
    funcName: 'merge',
    argNames: ['nums1', 'm', 'nums2', 'n'],
    edge: [
      [[1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3],
      [[1], 1, [], 0],
      [[], 0, [0], 1],
      [[1, 2], 2, [1], 1],
      [[4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3],
    ],
    gen: (r) => {
      const m = r.int(0, 6);
      const n = r.int(0, 6);
      const a = [];
      for (let i = 0; i < m; i++) a.push(r.int(1, 20));
      const b = [];
      for (let i = 0; i < n; i++) b.push(r.int(1, 20));
      const merged = a.concat(b).sort((x, y) => x - y);
      return [a.concat(new Array(n).fill(0)), m, b, n, merged];
    },
    solve: (args) => {
      // Merge from the back so no extra buffer is needed.
      const nums1 = args[0];
      const m = args[1];
      const nums2 = args[2];
      const n = args[3];
      let i = m - 1;
      let j = n - 1;
      let k = m + n - 1;
      while (j >= 0) {
        if (i >= 0 && nums1[i] > nums2[j]) {
          nums1[k] = nums1[i];
          i--;
        } else {
          nums1[k] = nums2[j];
          j--;
        }
        k--;
      }
      return nums1;
    },
  },
  {
    number: 182,
    funcName: 'kClosest',
    argNames: ['points', 'k'],
    edge: [
      [[[1, 3], [-2, 2]], 1],
      [[[3, 3], [5, -1], [-2, 4]], 2],
      [[[1, 1]], 1],
      [[[0, 0], [2, 2]], 2],
      [[[1, 0], [-1, 0], [0, 1]], 1],
    ],
    gen: (r) => {
      const n = r.int(1, 8);
      const points = [];
      for (let i = 0; i < n; i++) points.push([r.int(-10, 10), r.int(-10, 10)]);
      return [points, r.int(1, n)];
    },
    solve: (args) => {
      const points = args[0];
      const k = args[1];
      return points
        .map((p, i) => ({ p, d: p[0] * p[0] + p[1] * p[1], i }))
        .sort((a, b) => a.d - b.d || a.i - b.i)
        .slice(0, k)
        .map((e) => e.p);
    },
  },
  {
    number: 185,
    funcName: 'threeSum',
    argNames: ['nums'],
    edge: [
      [[-1, 0, 1, 2, -1, -4]],
      [[0, 1, 1]],
      [[0, 0, 0]],
      [[1, 2, 3]],
      [[]],
    ],
    gen: (r) => {
      const n = r.int(0, 10);
      // A narrow range makes zero-sum triples likely rather than rare.
      return [r.nums(n, -4, 4)];
    },
    solve: (args) => {
      // Sort, then fix one element and two-pointer the rest, skipping duplicates.
      const nums = args[0].slice().sort((a, b) => a - b);
      const out = [];
      for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        let lo = i + 1;
        let hi = nums.length - 1;
        while (lo < hi) {
          const sum = nums[i] + nums[lo] + nums[hi];
          if (sum === 0) {
            out.push([nums[i], nums[lo], nums[hi]]);
            while (lo < hi && nums[lo] === nums[lo + 1]) lo++;
            while (lo < hi && nums[hi] === nums[hi - 1]) hi--;
            lo++;
            hi--;
          } else if (sum < 0) {
            lo++;
          } else {
            hi--;
          }
        }
      }
      return out;
    },
  },
  {
    number: 187,
    funcName: 'characterReplacement',
    argNames: ['s', 'k'],
    edge: [
      ['ABAB', 2],
      ['AABABBA', 1],
      ['', 0],
      ['a', 0],
      ['AAAA', 0],
    ],
    gen: (r) => {
      const n = r.int(0, 14);
      const s = r.str(n, 'abc');
      // k must be at least what the tightest window needs to be meaningful.
      return [s, r.int(0, 4)];
    },
    solve: (args) => {
      const s = args[0];
      const k = args[1];
      const counts = new Map();
      let best = 0;
      let left = 0;
      let maxFreq = 0;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        counts.set(c, (counts.get(c) ?? 0) + 1);
        if (counts.get(c) > maxFreq) maxFreq = counts.get(c);
        // The window only ever needs to shrink, never grow, so this is O(n).
        while (right - left + 1 - maxFreq > k) {
          const lc = s[left];
        counts.set(lc, counts.get(lc)! - 1);
          left++;
        }
        if (right - left + 1 > best) best = right - left + 1;
      }
      return best;
    },
  },
  {
    number: 188,
    funcName: 'checkInclusion',
    argNames: ['s1', 's2'],
    edge: [
      ['ab', 'eidbaooo'],
      ['ab', 'eidboaoo'],
      ['abc', 'a'],
      ['abc', ''],
      ['', 'a'],
    ],
    gen: (r) => {
      const a = r.str(r.int(1, 8), 'abc');
      const b = r.str(r.int(1, 8), 'abc');
      // Half the time, plant b inside a so the answer is genuinely true.
      if (r.next() < 0.5) {
        const at = r.int(0, a.length);
        return [a.slice(0, at) + b + a.slice(at), b];
      }
      return [a, b];
    },
    solve: (args) => {
      const s1 = args[0];
      const s2 = args[1];
      if (s2.length > s1.length) return false;
      // Sliding window holding the character frequencies of s2.
      const need = new Map();
      for (const c of s2) need.set(c, (need.get(c) ?? 0) + 1);
      const have = new Map();
      let matched = 0;
      for (let i = 0; i < s1.length; i++) {
        const c = s1[i];
        have.set(c, (have.get(c) ?? 0) + 1);
        if (have.get(c) === need.get(c)) matched++;
        if (i >= s2.length) {
          const drop = s1[i - s2.length];
          have.set(drop, have.get(drop)! - 1);
          if (have.get(drop) === need.get(drop) - 1) matched--;
        }
        if (matched === need.size) return true;
      }
      return false;
    },
  },
];
