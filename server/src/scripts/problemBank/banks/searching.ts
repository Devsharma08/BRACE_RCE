// @ts-nocheck
//
// Reference solutions in this file are DELIBERATELY plain JavaScript.
//
// buildUserSolution serialises each `solve` with Function.prototype.toString
// and ships the result to the Piston sandbox as the user's submission. Any
// TypeScript-only syntax would be emitted verbatim into that sandbox and fail
// to parse, so these bodies must not carry annotations.

import { bank } from '../dsl.js';
import { autoTests, pub, priv } from '../tests.js';

export default bank([
  {
    k: 'srch-first-bad-version',
    n: 'First Bad Version',
    num: 290,
    d: 'EASY',
    c: 'Searching',
    intro: [
      'You are a product manager and the newest version of a product is bad. People began reporting that the latest version is broken.',
      'Given an integer n, find the FIRST version that is bad, assuming every version after a bad version is also bad.',
      'Return n if every version up to n is good.',
    ],
    notes: [
      'Binary search applies because the truthiness of a version is monotonic: good, good, ..., bad, bad.',
      'Treating "is this version bad" as an oracle keeps the solution decoupled from any API.',
      'An O(1) implementation is possible when isBadVersion(n) is true, because the first bad version is then n.',
    ],
    approach: [
      'Set the search range to 1..n.',
      'Probe the midpoint and shrink the upper bound when it is bad.',
      'Return the low end of the range, which is the first bad version.',
    ],
    ex: [
      { input: 'n = 5, bad = 4', output: '4', explanation: 'Versions 1-3 are good, so 4 is the first bad one.', args: [5, 4] },
      { input: 'n = 1, bad = 1', output: '1', explanation: 'The only version is bad.', args: [1, 1] },
      { input: 'n = 1, bad = 0', output: '1', explanation: 'No version is bad, so fall back to n.', args: [1, 0] },
      { input: 'n = 2, bad = 2', output: '2', explanation: 'The first version is already bad.', args: [2, 2] },
    ],
    cx: 'Time O(log n), Space O(1).',
    con: [
      '1 <= n <= 2^31 - 1',
      '1 <= bad <= n, or 0 when every version is good.',
    ],
    h: [
      'The predicate must be monotonic for binary search to be valid.',
      'An out-of-range version is treated as good.',
      'Use integer division so the midpoint never overflows.',
    ],
    sig: ['int', 'int', 'int'],
    fn: ['firstBadVersion', 'n', 'bad'],
    s: (args) => {
      const n = args[0];
      const bad = args[1];
      // The array is monotonic: every version at or after `bad` is also bad.
      if (bad <= 0) return n;
      let lo = 1;
      let hi = n;
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (mid >= bad) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
    t: autoTests(
      [
        pub(5, 4),
        pub(1, 1),
        pub(1, 0),
        priv(2, 2),
        priv(10, 7),
        priv(3, 1),
      ],
      (r) => {
        const n = r.int(1, 50);
        // 0 means every version is good.
        const bad = r.next() < 0.2 ? 0 : r.int(1, n);
        return [n, bad];
      },
      15,
      901,
    ),
  },
  {
    k: 'srch-sqrt-precision',
    n: 'Integer Square Root',
    num: 291,
    d: 'EASY',
    c: 'Searching',
    intro: [
      'Given a non-negative integer x, return the largest integer n such that n * n <= x.',
      'This is the integer square root, i.e. floor(sqrt(x)).',
    ],
    notes: [
      'A floating-point sqrt can round the wrong way for large values, so search in integer space instead.',
      'Binary search over 0..x works because squaring is monotonic on non-negatives.',
      'Comparing mid * mid avoids any floating point entirely.',
    ],
    approach: [
      'Binary search between 0 and x.',
      'If mid * mid is too large, halve the upper bound.',
      'Otherwise move the lower bound up.',
    ],
    ex: [
      { input: 'x = 4', output: '2', explanation: '2 * 2 = 4.', args: [4] },
      { input: 'x = 8', output: '2', explanation: '2 * 2 = 4 <= 8 but 3 * 3 = 9 is too large.', args: [8] },
      { input: 'x = 0', output: '0', explanation: 'Zero is the square root of zero.', args: [0] },
      { input: 'x = 1', output: '1', explanation: 'One is the square root of one.', args: [1] },
    ],
    cx: 'Time O(log x), Space O(1).',
    con: [
      '0 <= x <= 2^31 - 1',
    ],
    h: [
      'Search in integers so no floating point rounding is involved.',
      'The answer is the largest mid whose square does not exceed x.',
      'Mid * mid can exceed 2^53, so keep the search range bounded by x.',
    ],
    sig: ['int', 'int'],
    fn: ['integerSqrt', 'x'],
    s: (args) => {
      const x = args[0];
      if (x < 2) return x;
      let lo = 1;
      let hi = Math.floor(x / 2);
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        // Compare squares rather than taking a float sqrt.
        if (mid * mid <= x) lo = mid + 1;
        else hi = mid - 1;
      }
      return hi;
    },
    t: autoTests(
      [
        pub(4),
        pub(8),
        pub(0),
        pub(1),
        priv(9),
        priv(10000),
      ],
      (r) => [r.int(0, 100000)],
      15,
      902,
    ),
  },
  {
    k: 'srch-first-position',
    n: 'Index of First Occurrence',
    num: 292,
    d: 'EASY',
    c: 'Searching',
    intro: [
      'Given an array of integers sorted in ascending order and a target value, return the index of the first occurrence of the target.',
      'Return -1 if the target is not present.',
    ],
    notes: [
      'Because the array is sorted, a plain binary search finds any occurrence.',
      'To find the FIRST one, bias the search leftwards whenever the midpoint matches.',
      'A lower-bound formulation is the same idea stated directly.',
    ],
    approach: [
      'Binary search over the sorted array.',
      'When nums[mid] equals the target, keep searching the left half.',
      'Return -1 when the range closes without a match.',
    ],
    ex: [
      { input: 'nums = [1,2,2,2,3,4], target = 2', output: '1', explanation: 'The first 2 sits at index 1.', args: [[1,2,2,2,3,4], 2] },
      { input: 'nums = [1,2,2,2,3,4], target = 5', output: '-1', explanation: 'The target is absent.', args: [[1,2,2,2,3,4], 5] },
      { input: 'nums = [], target = 1', output: '-1', explanation: 'An empty array has no matches.', args: [[], 1] },
      { input: 'nums = [7], target = 7', output: '0', explanation: 'A single match at index 0.', args: [[7], 7] },
    ],
    cx: 'Time O(log n), Space O(1).',
    con: [
      '0 <= nums.length <= 100000',
      'nums is sorted in non-decreasing order.',
      '-10^4 <= nums[i], target <= 10^4',
    ],
    h: [
      'Keep searching left after a match, or you find a LATER occurrence.',
      'Prefer a lower-bound formulation to make the bias explicit.',
      'Return -1 rather than 0 when the array is empty.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['firstPosition', 'nums', 'target'],
    s: (args) => {
      const nums = args[0];
      const target = args[1];
      // Lower bound: the first index whose value is >= target.
      let lo = 0;
      let hi = nums.length;
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      if (lo < nums.length && nums[lo] === target) return lo;
      return -1;
    },
    t: autoTests(
      [
        pub([1,2,2,2,3,4], 2),
        pub([1,2,2,2,3,4], 5),
        pub([], 1),
        pub([7], 7),
        priv([2,2,2], 2),
        priv([1,3,5], 3),
      ],
      (r) => {
        // Build a sorted array from a small range so repeats are common.
        const n = r.int(0, 12);
        const nums = [];
        for (let i = 0; i < n; i++) nums.push(r.int(1, 5));
        nums.sort((a, b) => a - b);
        // Sometimes target a value that is present, sometimes not.
        const target = r.next() < 0.6 && n > 0 ? nums[r.int(0, n - 1)] : r.int(1, 7);
        return [nums, target];
      },
      15,
      903,
    ),
  },
  {
    k: 'srch-rotated-min',
    n: 'Find Minimum in Rotated Sorted Array',
    num: 293,
    d: 'MEDIUM',
    c: 'Searching',
    intro: [
      'Given an array of distinct ascending values which was rotated at an unknown pivot, return the index of the minimum element.',
      'Your algorithm must run in O(log n) time.',
    ],
    notes: [
      'Rotating a sorted array keeps each half internally sorted, so a binary search can tell which side holds the minimum.',
      'Comparing the midpoint with the RIGHT end is enough to decide which half to discard, because values are distinct.',
      'The usual three-way comparison against both neighbours is unnecessary here.',
    ],
    approach: [
      'Binary search between index 0 and n - 1.',
      'If nums[mid] > nums[hi], the minimum is strictly to the right of mid.',
      'Otherwise the minimum is at mid or to the left, so move hi to mid.',
      'When the bounds meet, that index holds the minimum.',
    ],
    ex: [
      { input: 'nums = [4,5,6,7,0,1,2]', output: '4', explanation: 'The value 0 sits at index 4.', args: [[4, 5, 6, 7, 0, 1, 2]] },
      { input: 'nums = [3,4,5,1,2]', output: '3', explanation: 'The value 1 sits at index 3.', args: [[3, 4, 5, 1, 2]] },
      { input: 'nums = [11,13,15,17]', output: '0', explanation: 'An unrotated array keeps its minimum first.', args: [[11, 13, 15, 17]] },
      { input: 'nums = [2,1]', output: '1', explanation: 'The array was rotated by one position.', args: [[2, 1]] },
    ],
    cx: 'Time O(log n), Space O(1).',
    con: ['1 <= nums.length <= 5000', '-10^4 <= nums[i] <= 10^4', 'nums holds distinct values, ascending before rotation.'],
    h: [
      'Comparing against the RIGHT end keeps this to one comparison instead of three.',
      'Because values are distinct, nums[mid] can never equal nums[hi], so discarding mid is safe.',
      'A single-element array returns 0.',
    ],
    sig: ['int', 'int[]'],
    fn: ['findMinRotated', 'nums'],
    s: (args) => {
      const nums = args[0];
      let lo = 0;
      let hi = nums.length - 1;
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        // nums[mid] > nums[hi] means the pivot, and the minimum, lies to the right.
        if (nums[mid] > nums[hi]) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    t: autoTests(
      [
        pub([4, 5, 6, 7, 0, 1, 2]),
        pub([3, 4, 5, 1, 2]),
        pub([11, 13, 15, 17]),
        pub([2, 1]),
        priv([1]),
        priv([5, 1, 3]),
      ],
      (r) => {
        const n = r.int(1, 10);
        const nums = [];
        for (let i = 0; i < n; i++) nums.push(r.int(1, 30));
        nums.sort((a, b) => a - b);
        // Rotate by a random amount, including 0 for an unrotated array.
        const pivot = r.int(0, n);
        return [nums.slice(pivot).concat(nums.slice(0, pivot))];
      },
      15,
      904,
    ),
  },
  {
    k: 'srch-peak-index',
    n: 'Find Peak Index',
    num: 294,
    d: 'MEDIUM',
    c: 'Searching',
    intro: [
      'Given an integer array nums, return the index of any peak element, where a peak is an element strictly greater than all of its neighbours.',
      'You may assume nums[-1] = nums[n] = -infinity, so an edge element counts as a peak when it exceeds its single neighbour.',
    ],
    notes: [
      'Because the array must contain a peak, every strictly decreasing run ends at one.',
      'A naive "walk uphill" can stop on a plateau and go the wrong way, so compare against the next element explicitly.',
      'A binary search variant works by checking whether the middle rises to the right.',
    ],
    approach: [
      'Compare nums[mid] with nums[mid + 1].',
      'If the middle rises, the peak lies to the right; otherwise at or left of it.',
      'Move the search bound accordingly.',
    ],
    ex: [
      { input: 'nums = [1,2,3,1]', output: '2', explanation: 'Index 2 holds 3, greater than both neighbours.', args: [[1,2,3,1]] },
      { input: 'nums = [1,2,1,3,5,6,4]', output: '1', explanation: 'Index 1 holds 2, greater than both neighbours (1 and 1). Several peaks exist, and the first is returned.', args: [[1, 2, 1, 3, 5, 6, 4]] },
      { input: 'nums = [1]', output: '0', explanation: 'A single element is a peak.', args: [[1]] },
      { input: 'nums = [1,2,3,4,5]', output: '4', explanation: 'The final element exceeds its only neighbour.', args: [[1, 2, 3, 4, 5]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: [
      '1 <= nums.length <= 100000',
      '-10^4 <= nums[i] <= 10^4',
    ],
    h: [
      'A plateau means "greater than", so comparing only the next element is not enough to walk downhill correctly.',
      'Comparing against nums[mid + 1] keeps the walk strictly increasing or strictly decreasing.',
      'A single-element array returns 0.',
    ],
    sig: ['int', 'int[]'],
    fn: ['peakIndex', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length;
      if (n === 1) return 0;
      // Walk towards a strictly greater neighbour; the array always has a peak.
      for (let i = 0; i + 1 < n; i++) {
        if (nums[i] > nums[i + 1]) return i;
        // A plateau breaks the strictly-increasing run, so step past it.
        if (nums[i] < nums[i + 1]) continue;
        let j = i;
        while (j + 1 < n && nums[j] === nums[j + 1]) j++;
        if (j === n - 1) return j;
        i = j;
      }
      return n - 1;
    },
    t: autoTests(
      [
        pub([1,2,3,1]),
        pub([1,2,1,3,5,6,4]),
        pub([1]),
        pub([1,2,3,4,5]),
        priv([3,2,1]),
        priv([1,2,3,1,4,5,6]),
      ],
      (r) => {
        const n = r.int(1, 12);
        // A small range makes plateaus, the tricky case, common.
        return [r.nums(n, 1, 4)];
      },
      15,
      905,
    ),
  },
]);
