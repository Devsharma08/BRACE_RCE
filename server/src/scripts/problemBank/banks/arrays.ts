import { bank } from '../dsl.js';
import { autoTests, pub, priv } from '../tests.js';

export default bank([
  {
    k: 'arr-kadane',
    n: 'Maximum Subarray',
    num: 200,
    d: 'EASY',
    c: 'Arrays',
    intro: [
      'Given an integer array <code>nums</code>, find the contiguous subarray (containing at least one number) which has the largest sum and return that sum.',
    ],
    notes: [
      'A naive approach recomputes the sum of every suffix and takes O(n^2).',
      'Kadane\u2019s algorithm keeps a running best for the subarray ending at the current index.',
      'The running best is either the current element alone or the previous best extended by it, which is exactly max(nums[i], prev + nums[i]).',
    ],
    approach: [
      'Initialise the best and the current run with the first element.',
      'At each index, restart or extend.',
      'Track the maximum seen so far.',
    ],
    ex: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum.', args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]] },
      { input: 'nums = [1]', output: '1', explanation: 'A single element is always a valid subarray.', args: [[1]] },
      { input: 'nums = [5,4,-1,7,8]', output: '23', explanation: 'The whole array is the best subarray.', args: [[5, 4, -1, 7, 8]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= nums.length <= 100000', '-100000 <= nums[i] <= 100000'],
    h: [
      'The answer is never 0 for a non-empty array, so do not initialise to zero.',
      'At each step you may restart the subarray at the current element.',
      'Keep the global maximum separate from the running maximum.',
    ],
    sig: ['int', 'int[]'],
    fn: ['maxSubArray', 'nums'],
    s: (args) => {
      const nums = args[0];
      let best = nums[0];
      let run = nums[0];
      for (let i = 1; i < nums.length; i++) {
        run = Math.max(nums[i], run + nums[i]);
        if (run > best) best = run;
      }
      return best;
    },
    t: autoTests(
      [
        pub([-2, 1, -3, 4, -1, 2, 1, -5, 4]),
        pub([1]),
        pub([5, 4, -1, 7, 8]),
        priv([-3, -2, -5]),
        priv([-1]),
        priv([0, 0, 0, 0]),
      ],
      (r) => [r.nums(r.int(1, 14), -20, 20)],
      13,
      301,
    ),
  },
  {
    k: 'arr-maximum-product',
    n: 'Maximum Product Subarray',
    num: 201,
    d: 'MEDIUM',
    c: 'Arrays',
    intro: [
      'Given an integer array <code>nums</code>, find the contiguous subarray with the largest product and return that product.',
    ],
    notes: [
      'A large negative times a large negative becomes a large positive, so tracking only the maximum is not enough.',
      'Track both the maximum and the minimum product ending at each index.',
      'Each new candidate is the current number, the previous max times it, or the previous min times it.',
    ],
    approach: [
      'Keep maxHere and minHere for the subarray ending at the previous index.',
      'Compute the three candidates and keep the largest and smallest.',
      'Track the global maximum.',
    ],
    ex: [
      { input: 'nums = [2,3,-2,4]', output: '6', explanation: 'The subarray [2,3] has product 6.', args: [[2, 3, -2, 4]] },
      { input: 'nums = [-2,0,-1]', output: '0', explanation: 'Zero beats any negative product.', args: [[-2, 0, -1]] },
      { input: 'nums = [-2,3,-4]', output: '24', explanation: 'The subarray [-2,3,-4] has product 24.', args: [[-2, 3, -4]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= nums.length <= 100000', '-10 <= nums[i] <= 10'],
    h: [
      'Zeros reset both running values.',
      'The minimum is not optional: it is how you find large positive products.',
      'A subarray must contain at least one element.',
    ],
    sig: ['int', 'int[]'],
    fn: ['maxProduct', 'nums'],
    s: (args) => {
      const nums = args[0];
      let maxHere = nums[0];
      let minHere = nums[0];
      let best = nums[0];
      for (let i = 1; i < nums.length; i++) {
        const x = nums[i];
        const a = maxHere * x;
        const b = minHere * x;
        maxHere = Math.max(x, a, b);
        minHere = Math.min(x, a, b);
        if (maxHere > best) best = maxHere;
      }
      return best;
    },
    t: autoTests(
      [
        pub([2, 3, -2, 4]),
        pub([-2, 0, -1]),
        pub([-2, 3, -4]),
        priv([-2]),
        priv([-2, -3, -4]),
        priv([0, 0]),
      ],
      (r) => [r.nums(r.int(1, 10), -5, 5)],
      13,
      302,
    ),
  },
  {
    k: 'arr-two-pointer-sorted',
    n: 'Two Sum Sorted Array',
    num: 202,
    d: 'EASY',
    c: 'Arrays',
    intro: [
      'Given a sorted array of integers <code>nums</code> and an integer <code>target</code>, return the indices of the two numbers that add up to <code>target</code>, or an empty array if no such pair exists.',
      'You may not use the same element twice.',
    ],
    notes: [
      'Sorted order lets you discard whole regions of the array.',
      'If the sum is too small, every pair using the left element is too small, so the left pointer moves right.',
      'If the sum is too large, symmetrically the right pointer moves left.',
    ],
    approach: [
      'Start one pointer at each end of the array.',
      'Compute the sum and move the pointer that makes the sum worse.',
      'Return the two indices once the target is hit.',
    ],
    ex: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 9.', args: [[2, 7, 11, 15], 9] },
      { input: 'nums = [2,3,4], target = 5', output: '[0,1]', explanation: 'Only nums[0] + nums[1] = 5.', args: [[2, 3, 4], 5] },
      { input: 'nums = [1,2], target = 100', output: '[]', explanation: 'No pair sums to 100.', args: [[1, 2], 100] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['2 <= nums.length <= 100000', '-100000 <= nums[i] <= 100000', '-100000 <= target <= 100000'],
    h: [
      'The array is already sorted — do not sort it again.',
      'Moving both pointers at once is always wrong.',
      'Return the indices in ascending order of position.',
    ],
    sig: ['int[]', 'int[]', 'int'],
    fn: ['twoSumSorted', 'nums', 'target'],
    s: (args) => {
      const nums = args[0];
      const target = args[1];
      let lo = 0;
      let hi = nums.length - 1;
      while (lo < hi) {
        const sum = nums[lo] + nums[hi];
        if (sum === target) return [lo, hi];
        if (sum < target) lo++;
        else hi--;
      }
      return [];
    },
    t: autoTests(
      [
        pub([2, 7, 11, 15], 9),
        pub([2, 3, 4], 5),
        pub([1, 2], 100),
        priv([3, 5], 8),
        priv([-5, -2, 0, 3], -2),
        priv([1, 2, 3, 4], 10),
      ],
      (r) => {
        const n = r.int(2, 9);
        const nums = r.nums(n, -20, 20).sort((a, b) => a - b);
        const target = r.next() < 0.7 ? nums[0] + nums[n - 1] : r.int(-40, 40);
        return [nums, target];
      },
      13,
      303,
    ),
  },
  {
    k: 'arr-product-except-self',
    n: 'Product of Array Without Division',
    num: 203,
    d: 'MEDIUM',
    c: 'Arrays',
    intro: [
      'Given an integer array <code>nums</code>, return an array <code>answer</code> where <code>answer[i]</code> is the product of every element of <code>nums</code> except <code>nums[i]</code>.',
      'You must solve it in O(1) extra space, ignoring the returned array.',
    ],
    notes: [
      'Division is not allowed, so use prefix and suffix products.',
      'Sweep left to right multiplying the running prefix into the answer.',
      'Sweep right to left multiplying the running suffix in, turning each slot into the full product except itself.',
    ],
    approach: [
      'Left pass: answer[i] = product of everything strictly before i.',
      'Right pass: answer[i] *= product of everything strictly after i.',
    ],
    ex: [
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]', explanation: 'Each answer slot holds the product of the other three values.', args: [[1, 2, 3, 4]] },
      { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]', explanation: 'The zero forces every other answer to zero.', args: [[-1, 1, 0, -3, 3]] },
    ],
    cx: 'Time O(n), Space O(1) extra.',
    con: ['2 <= nums.length <= 100000', '-30 <= nums[i] <= 30'],
    h: [
      'Two passes in opposite directions avoid needing a prefix array.',
      'Zeros need no special handling with this method.',
      'Do not use division — it breaks when elements are zero.',
    ],
    sig: ['int[]', 'int[]'],
    fn: ['productExceptSelf', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length;
      const out = new Array(n).fill(1);
      let prefix = 1;
      for (let i = 0; i < n; i++) {
        out[i] = prefix;
        prefix *= nums[i];
      }
      let suffix = 1;
      for (let i = n - 1; i >= 0; i--) {
        out[i] *= suffix;
        suffix *= nums[i];
      }
      return out;
    },
    t: autoTests(
      [
        pub([1, 2, 3, 4]),
        pub([-1, 1, 0, -3, 3]),
        priv([2, 3]),
        priv([0, 0]),
        priv([5, 1, 4, 2]),
        priv([-1, -2, -3]),
      ],
      (r) => [r.nums(r.int(2, 9), -4, 4)],
      13,
      304,
    ),
  },
  {
    k: 'arr-max-difference',
    n: 'Maximum Difference',
    num: 204,
    d: 'EASY',
    c: 'Arrays',
    intro: [
      'Given an integer array <code>nums</code>, return the largest difference between any two numbers <code>nums[i]</code> and <code>nums[j]</code> with <code>i &lt; j</code>.',
    ],
    notes: [
      'Tracking the running minimum is enough: for a fixed right endpoint the best difference uses the smallest element seen so far.',
      'One pass, O(1) extra space.',
      'A single-element array has no valid pair and returns 0.',
      'The difference may be negative when the array is strictly decreasing.',
    ],
    approach: [
      'Remember the smallest value seen so far.',
      'At each index compute the difference against that minimum.',
      'Keep the largest difference found.',
    ],
    ex: [
      { input: 'nums = [7,1,5,3,6,9]', output: '8', explanation: '9 - 1 = 8.', args: [[7, 1, 5, 3, 6, 9]] },
      { input: 'nums = [7,1,6,4,3]', output: '5', explanation: '6 - 1 = 5, with 1 before 6.', args: [[7, 1, 6, 4, 3]] },
      { input: 'nums = [1]', output: '0', explanation: 'A single element has no pair.', args: [[1]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= nums.length <= 100000', '1 <= nums[i] <= 100000'],
    h: [
      'The smaller element must come first, so only look backwards.',
      'Update the minimum before using it, or you will use nums[i] against itself.',
      'A single element yields 0.',
    ],
    sig: ['int', 'int[]'],
    fn: ['maxDifference', 'nums'],
    s: (args) => {
      const nums = args[0];
      if (nums.length < 2) return 0;
      let minSoFar = nums[0];
      let best = nums[1] - nums[0];
      for (let i = 1; i < nums.length; i++) {
        const diff = nums[i] - minSoFar;
        if (diff > best) best = diff;
        if (nums[i] < minSoFar) minSoFar = nums[i];
      }
      return best;
    },
    t: autoTests(
      [
        pub([7, 1, 5, 3, 6, 9]),
        pub([7, 1, 6, 4, 3]),
        pub([1]),
        priv([2, 2]),
        priv([5, 1, 2, 3, 4]),
        priv([3, 8, 2]),
      ],
      (r) => [r.nums(r.int(1, 12), -30, 30)],
      13,
      305,
    ),
  },
]);
