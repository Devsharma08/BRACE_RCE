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
    k: 'dp-longest-increasing-subseq',
    n: 'Longest Increasing Subsequence',
    num: 280,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'Given an integer array <code>nums</code>, return the length of the longest strictly increasing subsequence.',
      'The subsequence need not be contiguous.',
    ],
    notes: [
      'A quadratic DP over the array length is simple and fast enough here.',
      'dp[i] is the length of the longest increasing subsequence ending at index i.',
      'The answer is the maximum over all dp[i], not the last one.',
    ],
    approach: [
      'Set dp[i] = 1 for every index.',
      'For each i, look back over j where nums[j] < nums[i] and extend.',
      'Take the largest dp value.',
    ],
    ex: [
      { input: 'nums = [10,9,2,5,3,7,101,18]', output: '4', explanation: 'The subsequence [2,3,7,101] has length 4.', args: [[10, 9, 2, 5, 3, 7, 101, 18]] },
      { input: 'nums = [0,1,0,3,2,3]', output: '4', explanation: 'The subsequence [0,1,2,3] has length 4.', args: [[0, 1, 0, 3, 2, 3]] },
      { input: 'nums = [7,7,7,7]', output: '1', explanation: 'Strictly increasing, so equal values do not extend.', args: [[7, 7, 7, 7]] },
      { input: 'nums = []', output: '0', explanation: 'An empty array has no subsequence.', args: [[]] },
    ],
    cx: 'Time O(n^2), Space O(n).',
    con: ['0 <= nums.length <= 1000', '-10000 <= nums[i] <= 10000'],
    h: [
      'The comparison is STRICT, so equal values do not extend a subsequence.',
      'The answer is the max of dp, not dp[n-1].',
      'An empty array must return 0.',
    ],
    sig: ['int', 'int[]'],
    fn: ['lengthOfLIS', 'nums'],
    s: (args) => {
      const nums = args[0];
      if (nums.length === 0) return 0;
      const dp = new Array(nums.length).fill(1);
      let best = 1;
      for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
          // Strictly increasing, so equal values are skipped.
          if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
        }
        if (dp[i] > best) best = dp[i];
      }
      return best;
    },
    t: autoTests(
      [
        pub([10, 9, 2, 5, 3, 7, 101, 18]),
        pub([0, 1, 0, 3, 2, 3]),
        pub([7, 7, 7, 7]),
        pub([]),
        priv([1]),
        priv([5, 4, 3, 2, 1]),
      ],
      (r) => {
        const n = r.int(0, 12);
        // A small range produces many equal values and short LIS results.
        return [r.nums(n, 1, 8)];
      },
      15,
      901,
    ),
  },
  {
    k: 'dp-maximum-subarray-sum',
    n: 'Maximum Subarray Sum Returned',
    num: 281,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'Given an integer array <code>nums</code>, return the largest sum of a non-empty contiguous subarray.',
    ],
    notes: [
      'Kadane\u2019s algorithm keeps the best subarray ending at each index.',
      'At each step either extend the previous best or start fresh.',
      'The result may be negative, so do not clamp the running best at zero.',
    ],
    approach: [
      'Track the best sum ending at the current index.',
      'Extend when the previous running sum is positive, otherwise restart.',
      'Track the global maximum.',
    ],
    ex: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] sums to 6.', args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]] },
      { input: 'nums = [-3,-2,-5]', output: '-2', explanation: 'All subarrays are negative, so the best single element wins.', args: [[-3, -2, -5]] },
      { input: 'nums = [1]', output: '1', explanation: 'A single element.', args: [[1]] },
      { input: 'nums = [5,4,-1,7,8]', output: '23', explanation: 'The whole array sums to 23.', args: [[5, 4, -1, 7, 8]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= nums.length <= 100000', '-100000 <= nums[i] <= 100000'],
    h: [
      'The answer can be NEGATIVE; never clamp the running sum at zero.',
      'The subarray must be non-empty, so seed from nums[0].',
      'Restarting beats extending when the running sum is negative.',
    ],
    sig: ['int', 'int[]'],
    fn: ['maxSubarraySum', 'nums'],
    s: (args) => {
      const nums = args[0];
      if (nums.length === 0) return 0;
      let bestEndingHere = nums[0];
      let best = nums[0];
      for (let i = 1; i < nums.length; i++) {
        // Extend a positive run, otherwise start over at this element.
        bestEndingHere = Math.max(nums[i], bestEndingHere + nums[i]);
        if (bestEndingHere > best) best = bestEndingHere;
      }
      return best;
    },
    t: autoTests(
      [
        pub([-2, 1, -3, 4, -1, 2, 1, -5, 4]),
        pub([-3, -2, -5]),
        pub([1]),
        pub([5, 4, -1, 7, 8]),
        priv([-1]),
        priv([2, 2, 2]),
      ],
      (r) => {
        const n = r.int(1, 12);
        // Sign mix exercises both the extending and restarting branches.
        return [r.nums(n, -6, 8)];
      },
      15,
      902,
    ),
  },
  {
    k: 'dp-grid-unique-paths',
    n: 'Unique Paths in a Grid',
    num: 282,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'You are given an <code>m x n</code> grid where each cell is either empty or blocked, and you may only move RIGHT or DOWN.',
      'Return the number of distinct paths from the top-left cell to the bottom-right cell, treating blocked cells as unusable.',
    ],
    notes: [
      'Paths into a cell come only from the cell above or the cell to its left.',
      'A blocked cell always has zero paths, which resets the running value.',
      'One row of DP is enough; only the previous row matters.',
    ],
    approach: [
      'Initialise a row of ones for the empty first row.',
      'For each cell, paths = above + left, unless the cell is blocked.',
      'Return the last value of the final row.',
    ],
    ex: [
      { input: 'grid = [[0,0,0],[0,1,0],[0,0,0]], m = 3, n = 3', output: '2', explanation: 'The blocked centre forces the two symmetric routes.', args: [[[0, 0, 0], [0, 1, 0], [0, 0, 0]], 3, 3] },
      { input: 'grid = [[0,0],[0,0]], m = 2, n = 2', output: '2', explanation: 'Two ways in a 2x2 grid.', args: [[[0, 0], [0, 0]], 2, 2] },
      { input: 'grid = [[0,1],[1,0]], m = 2, n = 2', output: '0', explanation: 'Both routes are blocked.', args: [[[0, 1], [1, 0]], 2, 2] },
      { input: 'grid = [[0]], m = 1, n = 1', output: '1', explanation: 'A single cell is already the destination.', args: [[[0]], 1, 1] },
    ],
    cx: 'Time O(m * n), Space O(n).',
    con: ['1 <= m, n <= 100', 'grid[i][j] is 0 for empty and 1 for blocked.'],
    h: [
      'A blocked cell contributes ZERO paths, regardless of its neighbours.',
      'The first row and column have exactly one path each until blocked.',
      'Only the previous row is needed, so a single array suffices.',
    ],
    sig: ['int', 'int[][]', 'int', 'int'],
    fn: ['countUniquePaths', 'grid', 'm', 'n'],
    s: (args) => {
      const grid = args[0];
      const m = args[1];
      const n = args[2];
      // dp[j] is the path count for column j of the current row.
      // The first row can be blocked too, so it is seeded per cell rather
      // than assumed to be all ones.
      const dp = new Array(n).fill(1);
      for (let j = 0; j < n; j++) {
        if (grid[0][j] === 1) dp[j] = 0;
      }
      for (let i = 1; i < m; i++) {
        for (let j = 0; j < n; j++) {
          // A blocked cell admits no paths at all.
          if (grid[i][j] === 1) dp[j] = 0;
          else dp[j] = dp[j] + (j > 0 ? dp[j - 1] : 0);
        }
      }
      return dp[n - 1];
    },
    t: autoTests(
      [
        pub([[0, 0, 0], [0, 1, 0], [0, 0, 0]], 3, 3),
        pub([[0, 0], [0, 0]], 2, 2),
        pub([[0, 1], [1, 0]], 2, 2),
        pub([[0]], 1, 1),
        priv([[0, 0], [0, 1]], 2, 2),
        priv([[0]], 1, 1),
      ],
      (r) => {
        const m = r.int(1, 4);
        const n = r.int(1, 4);
        const grid = [];
        for (let i = 0; i < m; i++) {
          const row = [];
          for (let j = 0; j < n; j++) row.push(r.int(0, 3) === 3 ? 1 : 0);
          grid.push(row);
        }
        return [grid, m, n];
      },
      15,
      903,
    ),
  },
  {
    k: 'dp-edit-distance',
    n: 'Edit Distance Between Two Strings',
    num: 283,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'Given two strings <code>a</code> and <code>b</code>, return the minimum number of operations required to convert <code>a</code> into <code>b</code>, where an operation is an insertion, a deletion or a replacement.',
    ],
    notes: [
      'The classic Levenshtein recurrence compares the prefixes of both strings.',
      'Matching characters cost nothing; otherwise take the cheapest of insert, delete or replace.',
      'The first row and column hold the running length of the other prefix.',
    ],
    approach: [
      'Fill a matrix where cell(i, j) is the distance between a[0..i) and b[0..j).',
      'If the characters match, inherit the diagonal value.',
      'Otherwise take one plus the minimum of the three neighbours.',
    ],
    ex: [
      { input: 'a = "horse", b = "ros"', output: '3', explanation: 'Three edits convert "horse" into "ros".', args: ['horse', 'ros'] },
      { input: 'a = "intention", b = "execution"', output: '5', explanation: 'The LeetCode example takes five edits.', args: ['intention', 'execution'] },
      { input: 'a = "", b = "abc"', output: '3', explanation: 'Inserting three characters.', args: ['', 'abc'] },
      { input: 'a = "abc", b = "abc"', output: '0', explanation: 'Identical strings need no edits.', args: ['abc', 'abc'] },
    ],
    cx: 'Time O(m * n), Space O(n).',
    con: ['0 <= a.length, b.length <= 500', 'a and b consist of lowercase letters.'],
    h: [
      'Matching characters take dp[i-1][j-1] with no added cost.',
      'Insert, delete and replace cost one each on top of a neighbour.',
      'An empty source needs length(b) insertions.',
    ],
    sig: ['int', 'string', 'string'],
    fn: ['editDistance', 'a', 'b'],
    s: (args) => {
      const a = args[0];
      const b = args[1];
      const n = b.length;
      let dp = new Array(n + 1);
      for (let j = 0; j <= n; j++) dp[j] = j;
      for (let i = 1; i <= a.length; i++) {
        const next = new Array(n + 1);
        next[0] = i;
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            // Matching characters need no edit.
            next[j] = dp[j - 1];
          } else {
            // Cheapest of replace, delete or insert.
            next[j] = 1 + Math.min(dp[j - 1], dp[j], next[j - 1]);
          }
        }
        dp = next;
      }
      return dp[n];
    },
    t: autoTests(
      [
        pub('horse', 'ros'),
        pub('intention', 'execution'),
        pub('', 'abc'),
        pub('abc', 'abc'),
        priv('a', 'b'),
        priv('same', 'same'),
      ],
      (r) => {
        const mk = () => r.str(r.int(0, 8), 'abc');
        return [mk(), mk()];
      },
      15,
      904,
    ),
  },
  {
    k: 'dp-coin-change',
    n: 'Minimum Coins Reaching an Amount',
    num: 284,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'Given an array of distinct positive integer denominations <code>coins</code> and an integer <code>amount</code>, return the fewest number of coins that sum to <code>amount</code>.',
      'Return <code>-1</code> if the amount cannot be made.',
      'You have an unlimited number of each coin.',
    ],
    notes: [
      'dp[x] is the fewest coins needed to make exactly x.',
      'For each amount, try every coin as the last one used.',
      'An unreachable amount stays at a large sentinel, which is why the answer may be -1.',
    ],
    approach: [
      'Set dp[0] = 0 and every other entry to a large sentinel.',
      'For each amount from 1 upwards, minimise over the coins that fit.',
      'Return -1 when the final amount is still unreachable.',
    ],
    ex: [
      { input: 'coins = [1,2,5], amount = 11', output: '3', explanation: '5 + 5 + 1 makes 11.', args: [[1, 2, 5], 11] },
      { input: 'coins = [2], amount = 3', output: '-1', explanation: 'An odd amount cannot be made from 2s.', args: [[2], 3] },
      { input: 'coins = [1], amount = 0', output: '0', explanation: 'Zero needs no coins.', args: [[1], 0] },
      { input: 'coins = [5,7], amount = 12', output: '2', explanation: '7 + 5 makes 12.', args: [[5, 7], 12] },
      { input: 'coins = [5,7], amount = 13', output: '-1', explanation: '13 is unreachable: 5s and 7s make only 0, 5, 7, 10, 12, 14 and above.', args: [[5, 7], 13] },
    ],
    cx: 'Time O(amount * coins), Space O(amount).',
    con: ['1 <= coins.length <= 12', '1 <= coins[i] <= amount', '0 <= amount <= 10000'],
    h: [
      'dp[0] = 0 is the base case; every other entry starts unreachable.',
      'Unlimited supply means the coin loop must include coins equal to the amount.',
      'Return -1 rather than the sentinel when unreachable.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['minCoins', 'coins', 'amount'],
    s: (args) => {
      const coins = args[0];
      const amount = args[1];
      const INF = amount + 1;
      const dp = new Array(amount + 1).fill(INF);
      dp[0] = 0;
      for (let x = 1; x <= amount; x++) {
        for (const c of coins) {
          if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1;
        }
      }
      return dp[amount] === INF ? -1 : dp[amount];
    },
    t: autoTests(
      [
        pub([1, 2, 5], 11),
        pub([2], 3),
        pub([1], 0),
        pub([5, 7], 12),
        pub([5, 7], 13),
        priv([1], 5),
        priv([3, 7], 5),
      ],
      (r) => {
        const n = r.int(1, 4);
        const coins = [];
        while (coins.length < n) {
          const c = r.int(1, 12);
          if (coins.indexOf(c) === -1) coins.push(c);
        }
        return [coins, r.int(0, 30)];
      },
      15,
      905,
    ),
  },
  {
    k: 'dp-number-of-lis',
    n: 'Count Maximum Increasing Subsequences',
    num: 286,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'Given an integer array <code>nums</code>, return the number of distinct longest increasing subsequences of <code>nums</code>.',
      'Two subsequences are distinct when they differ in at least one index, even if the value sequences are identical.',
    ],
    notes: [
      'The O(n^2) dynamic program tracks two things per index: the LIS length ending there, and how many subsequences achieve it.',
      'Equal values must NOT extend a subsequence, because the increase has to be strict.',
      'Every index that can end a global LIS contributes its count to the answer.',
    ],
    approach: [
      'For each index compute <code>len[i]</code>, the longest increasing subsequence ending at i.',
      'Count <code>cnt[i]</code>: the number of subsequences of that length ending at i.',
      'Sum the counts over every index whose length equals the global maximum.',
    ],
    ex: [
      { input: 'nums = [1,3,5,4,7]', output: '2', explanation: 'Both [1,3,5,7] and [1,3,4,7] have length 4.', args: [[1, 3, 5, 4, 7]] },
      { input: 'nums = [2,2,2,2,2]', output: '5', explanation: 'Every single element is an increasing subsequence of length 1, and all five are distinct.', args: [[2, 2, 2, 2, 2]] },
      { input: 'nums = []', output: '0', explanation: 'An empty array has no subsequences.', args: [[]] },
    ],
    cx: 'Time O(n^2), Space O(n).',
    con: ['0 <= nums.length <= 1000', '-1000 <= nums[i] <= 1000'],
    h: [
      'Extend only when nums[j] < nums[i]; a strict increase.',
      'When len[j] + 1 equals len[i], add cnt[j] to cnt[i] rather than resetting it.',
      'A single element always has len 1 and count 1.',
    ],
    sig: ['int', 'int[]'],
    fn: ['findLISCount', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length;
      if (n === 0) return 0;
      const len = new Array(n).fill(1);
      const cnt = new Array(n).fill(1);
      let best = 1;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
          // Strict increase only: equal values never extend a subsequence.
          if (nums[j] < nums[i]) {
            if (len[j] + 1 > len[i]) {
              len[i] = len[j] + 1;
              cnt[i] = cnt[j];
            } else if (len[j] + 1 === len[i]) {
              // Another distinct subsequence of the same maximal length.
              cnt[i] += cnt[j];
            }
          }
        }
        if (len[i] > best) best = len[i];
      }
      let total = 0;
      for (let i = 0; i < n; i++) if (len[i] === best) total += cnt[i];
      return total;
    },
    t: autoTests(
      [
        pub([1, 3, 5, 4, 7]),
        pub([2, 2, 2, 2, 2]),
        pub([]),
        priv([1]),
        priv([3, 2, 1]),
      ],
      (r) => {
        // A small value range guarantees heavy repetition, which is where the
        // counting actually matters.
        return [r.nums(r.int(1, 9), 1, 4)];
      },
      15,
      950,
    ),
  },
  {
    k: 'dp-house-robber-ii',
    n: 'House Robber II',
    num: 287,
    d: 'MEDIUM',
    c: 'Dynamic Programming',
    intro: [
      'Given a circular array of non-negative integers representing the money in each house, return the most money you can steal without robbing two adjacent houses.',
      'The first and last houses are neighbours, so they cannot both be robbed.',
    ],
    notes: [
      'The circularity is handled by splitting into two linear cases, not by any special-case state.',
      'Either the first house is taken (so the last must be skipped) or it is not.',
      'Each linear case is the ordinary House Robber recurrence.',
    ],
    approach: [
      'Solve the linear problem on <code>nums[0..n-2]</code>, skipping the last house.',
      'Solve it again on <code>nums[1..n-1]</code>, skipping the first.',
      'Return the larger of the two results.',
    ],
    ex: [
      { input: 'nums = [2,3,2]', output: '3', explanation: 'In a circle of three, 0-1, 1-2 and 2-0 are all adjacent pairs, so only one house can be robbed. The middle house is worth 3.', args: [[2, 3, 2]] },
      { input: 'nums = [1,2,3,1]', output: '4', explanation: 'Robbing houses 0 and 2 (values 1 and 3) gives 4; they are not neighbours.', args: [[1, 2, 3, 1]] },
      { input: 'nums = [1,2,3]', output: '3', explanation: 'All three houses are mutually adjacent, so only the single best one can be taken, worth 3.', args: [[1, 2, 3]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= nums.length <= 400', '0 <= nums[i] <= 1000'],
    h: [
      'Two linear runs cover every valid choice, because the first and last cannot both be robbed.',
      'A single house is its own answer; handle n == 1 before slicing.',
      'The linear recurrence keeps only the last two picks, so space is constant.',
    ],
    sig: ['int', 'int[]'],
    fn: ['robRange', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length;
      if (n === 0) return 0;
      if (n === 1) return nums[0];
      // Best total for a linear run, using only the previous two decisions.
      const linear = (lo, hi) => {
        let prev2 = 0;
        let prev1 = 0;
        for (let i = lo; i <= hi; i++) {
          const take = prev2 + nums[i];
          const skip = prev1;
          const best = take > skip ? take : skip;
          prev2 = prev1;
          prev1 = best;
        }
        return prev1;
      };
      // Either take the first house (skip the last) or skip it (take the last).
      const a = linear(0, n - 2);
      const b = linear(1, n - 1);
      return a > b ? a : b;
    },
    t: autoTests(
      [
        pub([2, 3, 2]),
        pub([1, 2, 3, 1]),
        pub([1, 2, 3]),
        priv([5]),
        priv([0, 0]),
      ],
      (r) => {
        // Zeros and equal values stress the adjacency rule at the seam.
        return [r.nums(r.int(1, 10), 0, 9)];
      },
      15,
      951,
    ),
  },
]);
