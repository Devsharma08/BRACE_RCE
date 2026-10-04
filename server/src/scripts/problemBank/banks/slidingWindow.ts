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
    k: 'sw-max-subarray',
    n: 'Maximum Sum of Subarray with Minimum Size',
    num: 310,
    d: 'MEDIUM',
    c: 'Sliding Window',
    intro: [
      'Given an array of positive integers nums and a limit, return the largest sum of a contiguous subarray whose sum is at most limit.',
      'Return 0 when no non-empty subarray satisfies the limit.',
    ],
    notes: [
      'Every contiguous subarray can be represented by a left and right index.',
      'Sliding the left edge forward never increases the sum, so the window is maximal at each right edge.',
      'Shrinking while the sum exceeds the limit finds the best window ending at each right edge.',
    ],
    approach: [
      'Walk the right edge across the array, tracking the running sum.',
      'While the sum exceeds the limit, drop elements from the left.',
      'Record the best sum seen once the window is valid.',
    ],
    ex: [
      { input: 'nums = [2,3,4,1], limit = 8', output: '8', explanation: 'The subarray [3,4,1] sums to 8, which is larger than [3,4] at 7.', args: [[2, 3, 4, 1], 8] },
      { input: 'nums = [2,2,2,2], limit = 8', output: '8', explanation: 'All four together sum to 8.', args: [[2, 2, 2, 2], 8] },
      { input: 'nums = [1,2,3], limit = 5', output: '5', explanation: 'The subarray [2,3] sums to 5.', args: [[1, 2, 3], 5] },
      { input: 'nums = [5], limit = 4', output: '0', explanation: 'No subarray fits under the limit, so the answer is 0.', args: [[5], 4] },
      { input: 'nums = [1], limit = 0', output: '0', explanation: 'The limit can be smaller than every element.', args: [[1], 0] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: [
      '1 <= nums.length <= 100000',
      '1 <= nums[i] <= 2000',
      '0 <= limit <= 10^7',
    ],
    h: [
      'All values are positive, so shrinking the window always reduces the sum.',
      'Move the left edge while the sum is too large.',
      'The answer is the largest valid sum, not the longest window.',
      'Update the best after each shrink completes.',
      'A subarray that exceeds the limit is never a candidate, even by itself.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['maxSubArraySum', 'nums', 'limit'],
    s: (args) => {
      const nums = args[0];
      const limit = args[1];
      let left = 0;
      let sum = 0;
      let best = 0;
      for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        // Every value is positive, so dropping from the left is guaranteed to help.
        while (sum > limit) sum -= nums[left++];
        if (sum > best) best = sum;
      }
      return best;
    },
    t: autoTests(
      [
        pub([2,3,4,1], 8),
        pub([2,2,2,2], 8),
        pub([1,2,3], 5),
        pub([5], 4),
        pub([1], 0),
        priv([4,2,3], 6),
      ],
      (r) => {
        const n = r.int(1, 8);
        const nums = r.nums(n, 1, 6);
        return [nums, r.int(0, 20)];
      },
      15,
      310,
    ),
  },
  {
    k: 'sw-k-distinct',
    n: 'Number of Subarrays with K Distinct',
    num: 311,
    d: 'MEDIUM',
    c: 'Sliding Window',
    intro: [
      'Given an array nums and an integer k, return the number of contiguous subarrays that contain exactly k distinct values.',
    ],
    notes: [
      'Sliding the window right and shrinking left while there are too many distinct values keeps the count exact.',
      'Adding a new value can only increase the distinct count, never decrease it.',
      'The atMost(k) helper turns an exact count into a difference of two counts.',
    ],
    approach: [
      'Define atMost(k) as the number of subarrays with at most k distinct values.',
      'Every subarray with exactly k distinct values is counted by atMost(k) minus atMost(k - 1).',
      'Use two pointers to compute atMost in one pass.',
    ],
    ex: [
      { input: 'nums = [1,2,1,2,3], k = 2', output: '7', explanation: 'Seven subarrays have exactly two distinct values.', args: [[1,2,1,2,3], 2] },
      { input: 'nums = [1,2,3], k = 1', output: '3', explanation: 'Only the single-element subarrays qualify.', args: [[1,2,3], 1] },
      { input: 'nums = [1,1,1], k = 2', output: '0', explanation: 'There is only one distinct value.', args: [[1,1,1], 2] },
      { input: 'nums = [1,2,3,4,5], k = 3', output: '3', explanation: 'Only [1,2,3], [2,3,4] and [3,4,5] have exactly three distinct values.', args: [[1, 2, 3, 4, 5], 3] },
      { input: 'nums = [2,2,2,3,4], k = 2', output: '4', explanation: 'Four windows contain both a 2 and one other value.', args: [[2, 2, 2, 3, 4], 2] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: [
      '1 <= nums.length <= 2 * 10^4',
      '-1000 <= nums[i] <= 1000',
      '1 <= k <= nums.length',
    ],
    h: [
      'Exactly k equals at most k minus at most k minus 1.',
      'Shrink the left edge while the distinct count is too large.',
      'Each position contributes right - left + 1 valid subarrays.',
      'K must be at least 1.',
      'An all-identical array has zero valid subarrays when k is 2.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['totalSubarrays', 'nums', 'k'],
    s: (args) => {
      const nums = args[0];
      const k = args[1];
      // atMost(m) counts subarrays with at most m distinct values.
      const atMost = (m) => {
        if (m < 1) return 0;
        const freq = {};
        let distinct = 0;
        let left = 0;
        let total = 0;
        for (let right = 0; right < nums.length; right++) {
          const v = nums[right];
          if (freq[v] === undefined) {
            freq[v] = 0;
            distinct++;
          }
          freq[v]++;
          // Shrink until the window satisfies the at-most constraint.
          while (distinct > m) {
            const out = nums[left];
            freq[out]--;
            // DELETE the key once it hits zero. Leaving a zero-count key behind
            // would make the "freq[v] === undefined" test above fail when the
            // same value reappears, so distinct would never be incremented.
            if (freq[out] === 0) {
              delete freq[out];
              distinct--;
            }
            left++;
          }
          // Every start from left to right gives a valid subarray here.
          total += right - left + 1;
        }
        return total;
      };
      return atMost(k) - atMost(k - 1);
    },
    t: autoTests(
      [
        pub([1,2,1,2,3], 2),
        pub([1,2,3], 1),
        pub([1,1,1], 2),
        pub([1,2,3,4,5], 3),
        pub([2,2,2,3,4], 2),
        priv([4,4,1,4,4], 2),
      ],
      (r) => {
        const n = r.int(1, 8);
        const nums = r.nums(n, -3, 3);
        return [nums, r.int(1, 4)];
      },
      15,
      311,
    ),
  },
  {
    k: 'sw-min-distinct-groups',
    n: 'Minimum Groups With Distinct Values',
    num: 312,
    d: 'MEDIUM',
    c: 'Sliding Window',
    intro: [
      'Given an array nums, return the minimum number of groups such that every number appears in exactly one group, and no group contains a duplicate.',
      'The result is the highest frequency of any value.',
    ],
    notes: [
      'A value that appears f times must go into f different groups, so at least f groups are needed.',
      'Spreading the copies across different groups always works, so the largest frequency is exactly enough.',
      'Counting frequencies and taking the maximum gives the answer directly.',
    ],
    approach: [
      'Count how often each value appears.',
      'Return the largest count.',
      'No grouping needs to be constructed.',
    ],
    ex: [
      { input: 'nums = [1,2,3,4]', output: '1', explanation: 'All values differ, so one group works.', args: [[1,2,3,4]] },
      { input: 'nums = [1,1,1,2,2,2,3,3,3]', output: '3', explanation: 'Each value appears three times.', args: [[1,1,1,2,2,2,3,3,3]] },
      { input: 'nums = [1,1]', output: '2', explanation: 'The value 1 appears twice.', args: [[1,1]] },
      { input: 'nums = [1,2,2,1]', output: '2', explanation: 'Both values appear twice.', args: [[1,2,2,1]] },
      { input: 'nums = [7]', output: '1', explanation: 'A single value fits in one group.', args: [[7]] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: [
      '1 <= nums.length <= 2 * 10^5',
      '-10^5 <= nums[i] <= 10^5',
    ],
    h: [
      'The answer is the maximum frequency.',
      'Lower frequencies never force more groups than the maximum does.',
      'No actual grouping is needed.',
      'A single value always gives 1.',
      'Empty input is excluded by the constraints.',
    ],
    sig: ['int', 'int[]'],
    fn: ['minGroups', 'nums'],
    s: (args) => {
      const nums = args[0];
      const freq = {};
      let best = 0;
      for (const v of nums) {
        freq[v] = (freq[v] || 0) + 1;
        // A value seen f times forces at least f distinct groups.
        if (freq[v] > best) best = freq[v];
      }
      return best;
    },
    t: autoTests(
      [
        pub([1,2,3,4]),
        pub([1,1,1,2,2,2,3,3,3]),
        pub([1,1]),
        pub([1,2,2,1]),
        pub([7]),
        priv([5,5,5,4,4]),
      ],
      (r) => {
        const n = r.int(1, 8);
        // Small value range so repeats are common and frequencies above 1 occur.
        return [r.nums(n, 1, 3)];
      },
      15,
      312,
    ),
  },
  {
    k: 'sw-two-non-overlapping',
    n: 'Maximum Sum of Two Non Overlapping',
    num: 313,
    d: 'MEDIUM',
    c: 'Sliding Window',
    intro: [
      'Given an array of positive integers nums and two indices left and right, return the largest possible sum of two non-overlapping subarrays, one entirely before left and one entirely after right.',
    ],
    notes: [
      'Fixing the gap between the two subarrays lets each side be optimised independently.',
      'A prefix maximum of the best subarray sums before each index handles the left side.',
      'The same idea scanning backwards handles the right side.',
    ],
    approach: [
      'Sweep left to right keeping the best single subarray ending before each index.',
      'Sweep right to left keeping the best single subarray starting after each index.',
      'Combine the two values across every possible gap.',
    ],
    ex: [
      { input: 'nums = [2,1,5,1,3,2], left = 3, right = 4', output: '11', explanation: 'The subarrays [2, 1, 5, 1] and [2].', args: [[2, 1, 5, 1, 3, 2], 3, 4] },
      { input: 'nums = [1,2,3,4,5], left = 1, right = 3', output: '8', explanation: 'The subarrays [1, 2] and [5].', args: [[1, 2, 3, 4, 5], 1, 3] },
      { input: 'nums = [3,4,1,2], left = 0, right = 1', output: '6', explanation: 'The subarrays [3] and [1, 2].', args: [[3, 4, 1, 2], 0, 1] },
      { input: 'nums = [5,1,1,1], left = 2, right = 3', output: '0', explanation: 'Nothing follows right, so no pair exists.', args: [[5, 1, 1, 1], 2, 3] },
      { input: 'nums = [2,9,1,3,3], left = 1, right = 2', output: '17', explanation: 'The subarrays [2, 9] and [3, 3].', args: [[2, 9, 1, 3, 3], 1, 2] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: [
      '1 <= nums.length <= 10^5',
      '1 <= nums[i] <= 10^5',
      '0 <= left < right <= nums.length - 1',
    ],
    h: [
      'One subarray must lie entirely before left.',
      'The other must lie entirely after right.',
      'Prefix and suffix maxima make each side an O(1) lookup.',
      'All values are positive, so running sums are enough.',
      'The two subarrays may not share an index.',
    ],
    sig: ['int', 'int[]', 'int', 'int'],
    fn: ['maxTwoSum', 'nums', 'left', 'right'],
    s: (args) => {
      const nums = args[0];
      const left = args[1];
      const right = args[2];
      const n = nums.length;
      // pre[i] = best subarray sum found entirely within nums[0..i].
      const pre = new Array(n).fill(0);
      let running = 0;
      let best = 0;
      for (let i = 0; i < n; i++) {
        running += nums[i];
        if (running > best) best = running;
        pre[i] = best;
      }
      // suf[i] = best subarray sum found entirely within nums[i..n-1].
      const suf = new Array(n).fill(0);
      running = 0;
      best = 0;
      for (let i = n - 1; i >= 0; i--) {
        running += nums[i];
        if (running > best) best = running;
        suf[i] = best;
      }
      // The two subarrays are separated by the indices left and right.
      let answer = 0;
      for (let i = 0; i <= left; i++) {
        const candidate = pre[i] + suf[right + 1];
        if (candidate > answer) answer = candidate;
      }
      return answer;
    },
    t: autoTests(
      [
        pub([2,1,5,1,3,2], 3, 4),
        pub([1,2,3,4,5], 1, 3),
        pub([1,1], 0, 1),
        pub([3,4,5], 0, 2),
        pub([5,1,1,1], 2, 3),
        priv([1,2,3], 0, 2),
      ],
      (r) => {
        const n = r.int(2, 7);
        const nums = r.nums(n, 1, 6);
        const a = r.int(0, n - 2);
        return [nums, a, a + 1];
      },
      15,
      313,
    ),
  },
  {
    k: 'sw-find-anagrams',
    n: 'Find All Anagrams in String',
    num: 314,
    d: 'MEDIUM',
    c: 'Sliding Window',
    intro: [
      'Given a string s and a non-empty string p, return the starting indices of every anagram of p in s.',
      'Each substring must have the same length as p and contain exactly the same characters with the same counts.',
    ],
    notes: [
      'Sliding a window of fixed length means only one character leaves and one enters per step.',
      'Maintaining a difference counter for all 256 possible byte values makes each step O(1).',
      'The window is an anagram exactly when every entry in the counter is zero.',
    ],
    approach: [
      'Build a counter comparing the window against the pattern.',
      'Slide the window one position at a time, updating only the outgoing and incoming characters.',
      'Record the start index whenever every counter is zero.',
    ],
    ex: [
      { input: 's = "cbaebabacd", p = "abc"', output: '[0,6]', explanation: 'abc occurs at 0 and cba at 6.', args: ["cbaebabacd", "abc"] },
      { input: 's = "abab", p = "ab"', output: '[0,1,2]', explanation: 'Every length-two window matches.', args: ["abab", "ab"] },
      { input: 's = "aa", p = "b"', output: '[]', explanation: 'No window matches.', args: ["aa", "b"] },
      { input: 's = "aaaaaaaaaa", p = "aaaaaaaaaaaaa"', output: '[]', explanation: 'The pattern is longer than the string.', args: ["aaaaaaaaaa", "aaaaaaaaaaaaa"] },
    ],
    cx: 'Time O(n + m), Space O(1) for the fixed-size counter.',
    con: [
      '1 <= s.length, p.length <= 10^5',
      's and p consist of lowercase English letters',
    ],
    h: [
      'Keep a fixed-size counter indexed by character code.',
      'Update only the character leaving and the character entering the window.',
      'All-zero counter means the window is an anagram.',
      'Return an empty list when nothing matches.',
      'Overlapping matches must all be reported.',
    ],
    sig: ['int[]', 'string', 'string'],
    fn: ['findAnagrams', 's', 'p'],
    s: (args) => {
      const s = args[0];
      const p = args[1];
      const n = s.length;
      const m = p.length;
      const out = [];
      if (m > n) return out;
      // diff[c] = count in window minus count in pattern, over all byte values.
      const diff = new Array(256).fill(0);
      // Seed NEGATIVELY: the loop below adds the window in, so the pattern
      // counts must start on the other side of zero for the sums to cancel
      // when the two match. Seeding positively would never find a match.
      for (let i = 0; i < m; i++) diff[p.charCodeAt(i)]--;
      for (let i = 0; i < n; i++) {
        diff[s.charCodeAt(i)]++;
        if (i >= m) diff[s.charCodeAt(i - m)]--;
        // Zero everywhere means the window is an anagram of the pattern.
        if (i >= m - 1 && diff.every((v) => v === 0)) out.push(i - m + 1);
      }
      return out;
    },
    t: autoTests(
      [
        pub("cbaebabacd", "abc"),
        pub("abab", "ab"),
        pub("aa", "b"),
        pub("aaaaaaaaaa", "aaaaaaaaaaaaa"),
        priv("aaaaaaaa", "a"),
        priv("aaflslflsldkalskaaa", "aaa"),
      ],
      (r) => {
        const letters = 'abc';
        const mk = (maxLen) => {
          const len = r.int(1, maxLen);
          let out = '';
          for (let i = 0; i < len; i++) out += letters[r.int(0, 2)];
          return out;
        };
        return [mk(10), mk(3)];
      },
      15,
      314,
    ),
  },
]);
