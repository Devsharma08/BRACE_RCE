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
import { bank } from '../dsl.js';
import { autoTests, pub, priv } from '../tests.js';

export default bank([
  {
    k: 'ht-subarray-sum-equals-k',
    n: 'Subarray Sum Equals K',
    num: 265,
    d: 'MEDIUM',
    c: 'Hash Table',
    intro: [
      'Given an array of integers <code>nums</code> and an integer <code>k</code>, return the total number of continuous subarrays whose sum equals <code>k</code>.',
    ],
    notes: [
      'Rewrite the condition as prefix[j] - prefix[i] = k, so prefix[i] = prefix[j] - k.',
      'A frequency map of previously seen prefix sums answers that in O(1).',
      'The prefix sum 0 must be seeded with count 1, or subarrays starting at index 0 are missed.',
    ],
    approach: [
      'Track a running prefix sum and a map of seen prefix sums.',
      'For each element, add the count of prefix sums equal to running minus k.',
      'Then record the running prefix sum.',
    ],
    ex: [
      { input: 'nums = [1,1,1], k = 2', output: '2', explanation: 'The subarrays [1,1] starting at 0 and at 1.', args: [[1, 1, 1], 2] },
      { input: 'nums = [1,2,3], k = 3', output: '2', explanation: '[1,2] and [3].', args: [[1, 2, 3], 3] },
      { input: 'nums = [1,-1,0], k = 0', output: '3', explanation: '[1,-1], [1,-1,0] and [0].', args: [[1, -1, 0], 0] },
      { input: 'nums = [1], k = 1', output: '1', explanation: 'A single element subarray.', args: [[1], 1] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: ['1 <= nums.length <= 2000', '-1000 <= nums[i] <= 1000', '-1000 <= k <= 1000'],
    h: [
      'Seed the map with {0: 1} so subarrays beginning at index 0 are counted.',
      'Count BEFORE recording the current prefix, or you count the empty subarray.',
      'Negative numbers are fine; the map does not need ordered keys.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['subarraySum', 'nums', 'k'],
    s: (args) => {
      const nums = args[0];
      const k = args[1];
      const freq = new Map();
      // The empty prefix must be present before any element is seen.
      freq.set(0, 1);
      let running = 0;
      let count = 0;
      for (const v of nums) {
        running += v;
        const want = running - k;
        if (freq.has(want)) count += freq.get(want);
        freq.set(running, (freq.get(running) ?? 0) + 1);
      }
      return count;
    },
    t: autoTests(
      [
        pub([1, 1, 1], 2),
        pub([1, 2, 3], 3),
        pub([1, -1, 0], 0),
        pub([1], 1),
        priv([3], 3),
        priv([1, -1, 0], 1),
      ],
      (r) => {
        const n = r.int(1, 12);
        // A small range and sign mix make zero-sum runs common.
        return [r.nums(n, -3, 3), r.int(-3, 6)];
      },
      15,
      701,
    ),
  },
  {
    k: 'ht-min-size-subarray',
    n: 'Minimum Size Subarray Sum',
    num: 266,
    d: 'MEDIUM',
    c: 'Hash Table',
    intro: [
      'Given an array of positive integers <code>nums</code> and a target <code>target</code>, return the minimal length of a contiguous subarray whose sum is at least <code>target</code>.',
      'Return <code>0</code> if no such subarray exists.',
    ],
    notes: [
      'All values are positive, so extending the window increases the sum and shrinking it decreases it.',
      'That monotonicity is what makes a two-pointer window correct and linear.',
      'An infinite best tracks the smallest window seen so far.',
    ],
    approach: [
      'Expand the right edge, accumulating the running sum.',
      'While the sum is at least the target, record the length and shrink from the left.',
      'Return the smallest recorded length, or 0 if none was found.',
    ],
    ex: [
      { input: 'nums = [2,3,1,2,4,3], target = 7', output: '2', explanation: 'The subarray [4,3] sums to 7.', args: [[2, 3, 1, 2, 4, 3], 7] },
      { input: 'nums = [1,4,4], target = 8', output: '2', explanation: 'No single element reaches 8, but [4,4] sums to exactly 8.', args: [[1, 4, 4], 8] },
      { input: 'nums = [1,2,3], target = 7', output: '0', explanation: 'The whole array sums to only 6.', args: [[1, 2, 3], 7] },
      { input: 'nums = [1], target = 1', output: '1', explanation: 'The single element suffices.', args: [[1], 1] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= target <= 10000', '1 <= nums.length <= 100000', '1 <= nums[i] <= 10000'],
    h: [
      'Positivity is what allows the two-pointer window.',
      'Shrink from the left only while the sum still meets the target.',
      'Return 0 rather than a large sentinel when no window qualifies.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['minSubarrayLen', 'nums', 'target'],
    s: (args) => {
      const nums = args[0];
      const target = args[1];
      let left = 0;
      let sum = 0;
      let best = Infinity;
      for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        // Positivity means shrinking keeps the sum meaningful.
        while (sum >= target) {
          const len = right - left + 1;
          if (len < best) best = len;
          sum -= nums[left];
          left++;
        }
      }
      return best === Infinity ? 0 : best;
    },
    t: autoTests(
      [
        pub([2, 3, 1, 2, 4, 3], 7),
        pub([1, 4, 4], 8),
        pub([1, 2, 3], 7),
        pub([1], 1),
        priv([5], 5),
        priv([1, 1, 1, 1], 4),
      ],
      (r) => {
        const n = r.int(1, 12);
        // Positive values are required by the problem.
        return [r.nums(n, 1, 9), r.int(1, 20)];
      },
      15,
      702,
    ),
  },
  {
    k: 'ht-array-intersection',
    n: 'Intersection of Two Arrays',
    num: 267,
    d: 'EASY',
    c: 'Hash Table',
    intro: [
      'Given two integer arrays <code>nums1</code> and <code>nums2</code>, return their intersection as the distinct values present in both, in ascending order.',
      'Return <code>[]</code> when they share nothing.',
    ],
    notes: [
      'A set of the first array answers membership in O(1) average time.',
      'A second set prevents duplicates in the result.',
      'Sorting the result makes the output order deterministic, which matters for automated grading.',
    ],
    approach: [
      'Build a set from nums1.',
      'Keep values of nums2 that are in that set, collecting them into a second set.',
      'Return the sorted contents of the second set.',
    ],
    ex: [
      { input: 'nums1 = [1,2,2,1], nums2 = [2,2]', output: '[2]', explanation: 'Only 2 is shared.', args: [[1, 2, 2, 1], [2, 2]] },
      { input: 'nums1 = [4,9,5], nums2 = [9,4,9,8,4]', output: '[4,9]', explanation: 'Shared values are 4 and 9.', args: [[4, 9, 5], [9, 4, 9, 8, 4]] },
      { input: 'nums1 = [1,2,3], nums2 = [4,5,6]', output: '[]', explanation: 'No shared values.', args: [[1, 2, 3], [4, 5, 6]] },
      { input: 'nums1 = [], nums2 = [1]', output: '[]', explanation: 'An empty array shares nothing.', args: [[], [1]] },
    ],
    cx: 'Time O(n + m + k log k), Space O(n).',
    con: ['1 <= nums1.length, nums2.length <= 1000', '-1000 <= nums[i] <= 1000'],
    h: [
      'Return distinct values, not one entry per occurrence.',
      'Sort the output so repeated runs agree on ordering.',
      'A set built from the smaller array saves memory.',
    ],
    sig: ['int[]', 'int[]', 'int[]'],
    fn: ['arrayIntersection', 'nums1', 'nums2'],
    s: (args) => {
      const a = new Set(args[0]);
      const common = new Set();
      for (const v of args[1]) {
        if (a.has(v)) common.add(v);
      }
      // Sorted so the result is deterministic regardless of input order.
      return [...common].sort((x, y) => x - y);
    },
    t: autoTests(
      [
        pub([1, 2, 2, 1], [2, 2]),
        pub([4, 9, 5], [9, 4, 9, 8, 4]),
        pub([1, 2, 3], [4, 5, 6]),
        pub([], [1]),
        priv([5], [5]),
        priv([1, 1, 1], [1, 1]),
      ],
      (r) => {
        // Overlapping ranges make shared values likely.
        const a = r.nums(r.int(0, 10), 1, 6);
        const b = r.nums(r.int(0, 10), 1, 6);
        return [a, b];
      },
      15,
      703,
    ),
  },
  {
    k: 'ht-design-hash-set',
    n: 'Design a Hash Set',
    num: 268,
    d: 'MEDIUM',
    c: 'Hash Table',
    intro: [
      'Design a data structure implementing a set of integers with <code>add</code>, <code>remove</code> and <code>contains</code>, all in average O(1) time.',
      'Operations are supplied as a script such as <code>"add:1,2|contains:1|remove:2|contains:2"</code>.',
    ],
    notes: [
      'A set already provides exactly these operations in constant average time.',
      'The interesting part is the protocol: which calls report a value.',
      'add and remove report nothing; only contains reports a boolean.',
    ],
    approach: [
      'Keep one set.',
      'add: insert each listed value and record no output.',
      'remove: delete each listed value and record no output; contains: record membership.',
    ],
    ex: [
      { input: 'ops = "add:1,2|contains:1|remove:2|contains:2"', output: '[null,true,null,false]', explanation: 'Four calls: one add (no value), then contains 1 is true, remove, then contains 2 is false.', args: ['add:1,2|contains:1|remove:2|contains:2'] },
      { input: 'ops = "add:1|contains:1|contains:2|remove:1|contains:1"', output: '[null,true,false,null,false]', explanation: 'Only 1 was ever added.', args: ['add:1|contains:1|contains:2|remove:1|contains:1'] },
      { input: 'ops = "contains:5"', output: '[false]', explanation: 'Nothing was added.', args: ['contains:5'] },
      { input: 'ops = ""', output: '[]', explanation: 'No operations, no output.', args: [''] },
    ],
    cx: 'Time O(1) per operation, Space O(n).',
    con: ['1 <= operations <= 2000', '-100000 <= key <= 100000'],
    h: [
      'add and remove produce no output entries, only contains does.',
      'Removing a key that was never added is a no-op, not an error.',
      'An empty script must return an empty list.',
    ],
    sig: ['boolean[]', 'string'],
    fn: ['runHashSet', 'ops'],
    s: (args) => {
      const set = new Set();
      const out = [];
      for (const part of String(args[0]).split('|')) {
        if (part.length === 0) continue;
        const at = part.indexOf(':');
        const name = at === -1 ? part : part.slice(0, at);
        const raw = at === -1 ? '' : part.slice(at + 1);
        const keys = raw.length ? raw.split(',').map(Number) : [];
        if (name === 'add') {
          for (const k of keys) set.add(k);
          // add returns nothing, but the call still yields a null entry.
          out.push(null);
        } else if (name === 'remove') {
          for (const k of keys) set.delete(k);
          out.push(null);
        } else if (name === 'contains') {
          out.push(keys.length ? set.has(keys[0]) : false);
        }
      }
      return out;
    },
    t: autoTests(
      [
        pub('add:1,2|contains:1|remove:2|contains:2'),
        pub('add:1|contains:1|contains:2|remove:1|contains:1'),
        pub('contains:5'),
        pub(''),
        priv('add:7|contains:7'),
        priv('add:1,1,1|contains:1'),
      ],
      (r) => {
        const parts = [];
        const n = r.int(0, 8);
        const present = new Set();
        for (let i = 0; i < n; i++) {
          const roll = r.int(0, 2);
          const key = r.int(1, 5);
          if (roll === 0) {
            const batch = [];
            for (let j = 0; j < r.int(1, 3); j++) {
              const v = r.int(1, 5);
              batch.push(v);
              present.add(v);
            }
            parts.push('add:' + batch.join(','));
          } else if (roll === 1) {
            // Remove a key that may or may not be present.
            const v = r.next() < 0.7 ? [...present][r.int(0, Math.max(0, present.size - 1))] ?? key : key;
            present.delete(v);
            parts.push('remove:' + v);
          } else {
            const v = r.next() < 0.7 ? [...present][r.int(0, Math.max(0, present.size - 1))] ?? key : key;
            parts.push('contains:' + v);
          }
        }
        return [parts.join('|')];
      },
      15,
      704,
    ),
  },
  {
    k: 'ht-varying-frequency',
    n: 'Count Elements with Varying Frequency',
    num: 269,
    d: 'MEDIUM',
    c: 'Hash Table',
    intro: [
      'Given an integer array <code>nums</code> and an integer array <code>queries</code>, return an array where the answer to each <code>queries[i]</code> is the number of elements in <code>nums</code> that appear EXACTLY <code>queries[i]</code> times.',
    ],
    notes: [
      'Count the frequency of every distinct value once.',
      'Group the distinct values by their frequency, which answers each query in O(1).',
      'Values whose frequency never appears simply contribute nothing.',
    ],
    approach: [
      'Build a frequency map over nums.',
      'Build a second map from frequency to how many distinct values have it.',
      'Look up each query in the second map, defaulting to 0.',
    ],
    ex: [
      { input: 'nums = [1,2,3], queries = [1,2,3]', output: '[3,0,0]', explanation: 'All three distinct values appear exactly once.', args: [[1, 2, 3], [1, 2, 3]] },
      { input: 'nums = [1,2,3,1,2], queries = [2]', output: '[2]', explanation: 'The values 1 and 2 each appear twice.', args: [[1, 2, 3, 1, 2], [2]] },
      { input: 'nums = [2,3,1,2,3], queries = [3]', output: '[0]', explanation: 'No value appears three times.', args: [[2, 3, 1, 2, 3], [3]] },
      { input: 'nums = [0,0,0,0], queries = [1,2,3]', output: '[0,0,0]', explanation: 'The only distinct value appears four times, so no query below 4 matches.', args: [[0, 0, 0, 0], [1, 2, 3]] },
    ],
    cx: 'Time O(n + q), Space O(n).',
    con: ['1 <= nums.length <= 100000', '1 <= queries.length <= 100000'],
    h: [
      'Count DISTINCT values per frequency, not total occurrences.',
      'A query larger than the array length always answers 0.',
      'Build the frequency-to-count map once, then every query is a lookup.',
    ],
    sig: ['int[]', 'int[]', 'int[]'],
    fn: ['frequencyQueries', 'nums', 'queries'],
    s: (args) => {
      const nums = args[0];
      const queries = args[1];
      const counts = new Map();
      for (const v of nums) counts.set(v, (counts.get(v) ?? 0) + 1);
      // How many distinct values share each frequency.
      const byFreq = new Map();
      for (const f of counts.values()) byFreq.set(f, (byFreq.get(f) ?? 0) + 1);
      return queries.map((q) => byFreq.get(q) ?? 0);
    },
    t: autoTests(
      [
        pub([1, 2, 3], [1, 2, 3]),
        pub([1, 2, 3, 1, 2], [2]),
        pub([2, 3, 1, 2, 3], [3]),
        pub([0, 0, 0, 0], [1, 2, 3]),
        priv([1], [1]),
        priv([1, 1, 2, 2, 3], [1, 2, 3]),
      ],
      (r) => {
        // A tiny alphabet guarantees shared frequencies, which is the point.
        const n = r.int(1, 12);
        const nums = r.nums(n, 1, 3);
        const qn = r.int(1, 5);
        const queries = [];
        for (let i = 0; i < qn; i++) queries.push(r.int(1, 4));
        return [nums, queries];
      },
      15,
      705,
    ),
  },
]);
