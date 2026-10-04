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
    k: 'btk-n-queens',
    n: 'N Queens Puzzle',
    num: 300,
    d: 'HARD',
    c: 'Backtracking',
    intro: [
      'Place n queens on an n x n chessboard so that no two queens share a row, a column, or a diagonal.',
      'Return the number of distinct arrangements, considering rotations and reflections as different.',
    ],
    notes: [
      'Placing one queen per row means only the column and the two diagonals need checking.',
      'A square is attacked if its column is used, or if abs(row - qRow) equals abs(col - qCol) for a placed queen.',
      'The row and column uniqueness come for free, so the diagonal test is the only real constraint.'],
    approach: [
      'Place exactly one queen per row, recursing row by row.',
      'For each column in the current row, test it against every queen already placed.',
      'Backtrack once no column is available in a row.'],
    ex: [
      { input: 'n = 4', output: '2', explanation: 'Four queens have two arrangements.', args: [4] },
      { input: 'n = 1', output: '1', explanation: 'A single queen always fits.', args: [1] },
      { input: 'n = 2', output: '0', explanation: 'Two queens cannot avoid sharing a diagonal.', args: [2] },
      { input: 'n = 3', output: '0', explanation: 'Three queens have no valid arrangement.', args: [3] },
      { input: 'n = 5', output: '10', explanation: 'Five queens have ten arrangements.', args: [5] },
    ],
    cx: 'Time O(n!) in the worst case, Space O(n).',
    // n <= 12 keeps the search fast while giving 12 distinct inputs, which is
    // the minimum the bank requires (n <= 9 would only offer 9 cases).
    con: ['1 <= n <= 12'],
    h: [
      'One queen per row removes the need for a row check.',
      'A diagonal is hit when the row gap equals the column gap.',
      'Use absolute difference for the diagonal test.',
      'Undo the placement before returning so other branches stay valid.',
      'Record a solution as soon as the last row is filled.',
    ],
    sig: ['int', 'int'],
    fn: ['solveNQueens', 'n'],
    s: (args) => {
      const n = args[0];
      const cols = [];
      let count = 0;
      const place = (row) => {
        if (row === n) {
          count++;
          return;
        }
        for (let col = 0; col < n; col++) {
          let safe = true;
          for (let r = 0; r < cols.length; r++) {
            // Equal column, or equal row gap and column gap, means an attack.
            if (cols[r] === col || Math.abs(cols[r] - col) === Math.abs(row - r)) {
              safe = false;
              break;
            }
          }
          if (!safe) continue;
          cols.push(col);
          place(row + 1);
          // Remove the queen again before trying the next column.
          cols.pop();
        }
      };
      place(0);
      return count;
    },
    t: autoTests(
      [
        pub(4),
        pub(1),
        pub(2),
        pub(3),
        pub(5),
        pub(6),
        priv(7),
        priv(8),
      ],
      // Every n from 1 to 12 is a distinct case, so just walk the range.
      (r) => [r.int(1, 12)],
      15,
      300,
    ),
  },
  {
    k: 'btk-combinations',
    n: 'Combinations',
    num: 301,
    d: 'MEDIUM',
    c: 'Backtracking',
    intro: [
      'Given n and k, return all k-element combinations of the numbers 1 through n.',
      'Combinations ignore order, so [1,2] and [2,1] count as the same.',
    ],
    notes: [
      'Build each combination by choosing increasing indices, which automatically avoids duplicates.',
      'Restarting the next pick at i + 1 rather than i is what removes the permutation duplicates.',
      'Stop as soon as the combination has k elements.',
    ],
    approach: [
      'Track a start index and a growing combination.',
      'For every candidate from that start, add it and recurse from the following index.',
      'Once the combination holds k elements, store a copy and stop extending it.',
    ],
    ex: [
      { input: 'n = 4, k = 2', output: '[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]', explanation: 'Every 2-element subset of 1..4.', args: [4, 2] },
      { input: 'n = 3, k = 3', output: '[[1,2,3]]', explanation: 'Only one combination uses all numbers.', args: [3, 3] },
      { input: 'n = 1, k = 1', output: '[[1]]', explanation: 'A single combination.', args: [1, 1] },
      { input: 'n = 4, k = 1', output: '[[1],[2],[3],[4]]', explanation: 'Every singleton.', args: [4, 1] },
    ],
    cx: 'Time O(k * C(n,k)), Space O(k) auxiliary.',
    con: [
      '1 <= n <= 20',
      '1 <= k <= n',
    ],
    h: [
      'Choosing indices in increasing order removes the need for a duplicate check.',
      'Recurse from i + 1 so the same number is never picked twice.',
      'Copy the combination before storing it.',
    ],
    sig: ['int[][]', 'int', 'int'],
    fn: ['combine', 'n', 'k'],
    s: (args) => {
      const n = args[0];
      const k = args[1];
      const out = [];
      const current = [];
      const pick = (start) => {
        if (current.length === k) {
          out.push(current.slice());
          return;
        }
        for (let i = start; i <= n - (k - current.length) + 1; i++) {
          current.push(i);
          // Advancing to i + 1 keeps the picks strictly increasing, so no dedup is needed.
          pick(i + 1);
          current.pop();
        }
      };
      pick(1);
      return out;
    },
    t: autoTests(
      [
        pub(4, 2),
        pub(3, 3),
        pub(1, 1),
        pub(4, 1),
        priv(5, 2),
        priv(6, 6),
      ],
      (r) => {
        const n = r.int(1, 8);
        return [n, r.int(1, n)];
      },
      15,
      301,
    ),
  },
  {
    k: 'btk-permutations',
    n: 'Permutations',
    num: 302,
    d: 'MEDIUM',
    c: 'Backtracking',
    intro: [
      'Given an array nums of distinct elements, return all possible permutations.',
      'Order matters, so [1,2] and [2,1] are different permutations.',
    ],
    notes: [
      'Choosing one unused element at each position enumerates every ordering exactly once.',
      'A "used" flag prevents picking the same index twice.',
      'With distinct elements no duplicate-permutation handling is needed.',
    ],
    approach: [
      'Recurse with a current ordering and a set of used indices.',
      'At each step try every index that has not been used yet.',
      'When the ordering is complete, store a copy.',
    ],
    ex: [
      { input: 'nums = [1,2,3]', output: '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]', explanation: 'Six orderings of three elements.', args: [[1,2,3]] },
      { input: 'nums = [1]', output: '[[1]]', explanation: 'Only one ordering.', args: [[1]] },
      { input: 'nums = [0,1]', output: '[[0,1],[1,0]]', explanation: 'Two orderings.', args: [[0,1]] },
      { input: 'nums = [1,2,3,4]', output: '[[1,2,3,4],[1,2,4,3],[1,3,2,4],[1,3,4,2],[1,4,2,3],[1,4,3,2],[2,1,3,4],[2,1,4,3],[2,3,1,4],[2,3,4,1],[2,4,1,3],[2,4,3,1],[3,1,2,4],[3,1,4,2],[3,2,1,4],[3,2,4,1],[3,4,1,2],[3,4,2,1],[4,1,2,3],[4,1,3,2],[4,2,1,3],[4,2,3,1],[4,3,1,2],[4,3,2,1]]', explanation: 'Twenty-four orderings of four elements.', args: [[1,2,3,4]] },
    ],
    cx: 'Time O(n * n!), Space O(n) auxiliary.',
    con: [
      '1 <= nums.length <= 8',
      '-10^9 <= nums[i] <= 10^9',
      'All elements of nums are distinct.',
    ],
    h: [
      'n distinct elements have n! permutations.',
      'Use a used[] flag so an index cannot be chosen twice in one permutation.',
      'Backtrack by unmarking the index after the recursive call.',
    ],
    sig: ['int[][]', 'int[]'],
    fn: ['permute', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length;
      const out = [];
      const used = new Array(n).fill(false);
      const current = [];
      const pick = () => {
        if (current.length === n) {
          out.push(current.slice());
          return;
        }
        for (let i = 0; i < n; i++) {
          if (used[i]) continue;
          // Claim this index, recurse, then release it for the next branch.
          used[i] = true;
          current.push(nums[i]);
          pick();
          current.pop();
          used[i] = false;
        }
      };
      pick();
      return out;
    },
    t: autoTests(
      [
        pub([1,2,3]),
        pub([1]),
        pub([0,1]),
        pub([1,2,3,4]),
        priv([2,4]),
        priv([-1,0,1]),
      ],
      (r) => {
        // n is capped at 4 on purpose. With n=5 and five DISTINCT values the
        // answer is 5! = 120 permutations, about 1.8 kB, which is past Piston's
        // stdout cap — the sandbox SIGKILLs the process with "stdout length
        // exceeded", so a CORRECT submission is killed and the case can never be
        // passed. At n=4 the worst case is 24 permutations, comfortably inside.
        const n = r.int(1, 4);
        return [r.nums(n, -4, 4)];
      },
      15,
      302,
    ),
  },
  {
    k: 'btk-combination-sum',
    n: 'Combination Sum',
    num: 303,
    d: 'MEDIUM',
    c: 'Backtracking',
    intro: [
      'Given an array nums of distinct positive integers and a target, return all combinations of nums that sum to target.',
      'The same number may be chosen repeatedly, and each combination must be in non-decreasing order.',
    ],
    notes: [
      'Sorting lets you skip branches that cannot reach the target.',
      'Choosing from index i (not i + 1) allows a number to be reused.',
      'Breaking out of the loop when the candidate exceeds the remaining target prunes whole subtrees.',
    ],
    approach: [
      'Sort the candidates so oversized values can terminate a loop.',
      'At each step pick a value and recurse from that same index to allow reuse.',
      'Stop as soon as the remaining target is 0.',
    ],
    ex: [
      { input: 'nums = [2,3,6,7], target = 7', output: '[[2,2,3],[7]]', explanation: '7 and 2+2+3 both work.', args: [[2,3,6,7], 7] },
      { input: 'nums = [2,3,5], target = 8', output: '[[2,2,2,2],[2,3,3],[3,5]]', explanation: 'Three distinct combinations.', args: [[2,3,5], 8] },
      { input: 'nums = [2], target = 1', output: '[]', explanation: 'No combination reaches 1.', args: [[2], 1] },
      { input: 'nums = [2,3], target = 9', output: '[[2,2,2,3],[3,3,3]]', explanation: 'Two combinations.', args: [[2,3], 9] },
    ],
    cx: 'Time O(2^(target/min)) in the worst case, Space O(target/min) auxiliary.',
    con: [
      '1 <= nums.length <= 30',
      '1 <= nums[i] <= 100',
      '1 <= target <= 1000',
      'All elements of nums are distinct.',
    ],
    h: [
      'Reuse is allowed, so recurse from the SAME index rather than i + 1.',
      'Combinations must be non-decreasing, so only look forward.',
      'Sort first; then any candidate above the remaining target ends the loop.',
      'Store a copy before returning from the base case.',
    ],
    sig: ['int[][]', 'int[]', 'int'],
    fn: ['combinationSum', 'nums', 'target'],
    s: (args) => {
      const nums = args[0].slice().sort((a, b) => a - b);
      const target = args[1];
      const out = [];
      const current = [];
      const pick = (start, remaining) => {
        if (remaining === 0) {
          out.push(current.slice());
          return;
        }
        for (let i = start; i < nums.length; i++) {
          // Sorted input means everything from here on is too large too.
          if (nums[i] > remaining) break;
          current.push(nums[i]);
          // Recursing from i (not i + 1) lets the same value be used again.
          pick(i, remaining - nums[i]);
          current.pop();
        }
      };
      pick(0, target);
      return out;
    },
    t: autoTests(
      [
        pub([2,3,6,7], 7),
        pub([2,3,5], 8),
        pub([2], 1),
        pub([2,3], 9),
        priv([2], 4),
        priv([3,4,5], 9),
      ],
      (r) => {
        const n = r.int(1, 5);
        return [r.nums(n, 1, 6), r.int(1, 14)];
      },
      15,
      303,
    ),
  },
  {
    k: 'btk-word-search',
    n: 'Word Search in Grid',
    num: 304,
    d: 'MEDIUM',
    c: 'Backtracking',
    intro: [
      'Given a character grid and a word, return true if the word exists in the grid reading left-to-right or right-to-left.',
      'Each word must occupy consecutive cells; reversing is allowed, but reversing mid-word is not.',
    ],
    notes: [
      'A right-to-left read of a word is a left-to-right read of the reversed word, so checking both strings covers both directions.',
      'Scan every cell as a start position and check the word forwards from there.',
      'Matching the reversal as well is what makes the right-to-left direction work.',
    ],
    approach: [
      'Build the reversed word and treat it as a second candidate.',
      'For each candidate, scan every cell of every row as a start position.',
      'A full match of the word length confirms the word.',
    ],
    ex: [
      { input: 'grid = [["A","B"],["C","D"]], word = "AB"', output: 'true', explanation: '"AB" reads left to right.', args: [[["A","B"],["C","D"]], "AB"] },
      { input: 'grid = [["A","B"],["C","D"]], word = "BA"', output: 'true', explanation: '"BA" reads right to left.', args: [[["A","B"],["C","D"]], "BA"] },
      { input: 'grid = [["A","B"],["C","D"]], word = "AD"', output: 'false', explanation: 'The letters sit on different rows, and a match may not wrap between rows.', args: [[["A", "B"], ["C", "D"]], "AD"] },
      { input: 'grid = [["A","B"],["C","D"]], word = "DX"', output: 'false', explanation: '"DX" is not present in any row.', args: [[["A","B"],["C","D"]], "DX"] },
    ],
    cx: 'Time O(n * m * len(word)), Space O(1).',
    con: [
      '1 <= word.length <= 10',
      '1 <= board.length <= 50',
      '1 <= board[i].length <= 50',
      'board[i][j] is a character',
    ],
    h: [
      'Searching left-to-right for the reversed word covers the right-to-left direction.',
      'A match needs at least word.length cells on the same row.',
      'The word may not wrap from the end of one row onto the next.',
      'Single-character words match if the character appears anywhere.',
      'Return false when the word is longer than every row.',
    ],
    sig: ['bool', 'char[][]', 'string'],
    fn: ['searchWord', 'board', 'word'],
    s: (args) => {
      const board = args[0];
      const word = args[1];
      const m = board.length;
      const n = board[0].length;
      const len = word.length;
      // A right-to-left read is a left-to-right read of the reversed word, so
      // matching both strings covers both directions in a single scan.
      const reversed = word.split('').reverse().join('');
      for (const candidate of [word, reversed]) {
        for (let i = 0; i < m; i++) {
          for (let j = 0; j + len <= n; j++) {
            let k = 0;
            while (k < len && board[i][j + k] === candidate[k]) k++;
            if (k === len) return true;
          }
        }
      }
      return false;
    },
    t: autoTests(
      [
        pub([["A","B"],["C","D"]], "AB"),
        pub([["A","B"],["C","D"]], "BA"),
        pub([["A","B"],["C","D"]], "AD"),
        pub([["A","B"],["C","D"]], "DX"),
        priv([["A"]], "A"),
        priv([["A","B"]], "AB"),
      ],
      (r) => {
        const rows = r.int(1, 3);
        const cols = r.int(1, 3);
        const board = [];
        const letters = 'ABC';
        for (let i = 0; i < rows; i++) {
          const row = [];
          for (let j = 0; j < cols; j++) row.push(letters[r.int(0, 2)]);
          board.push(row);
        }
        const len = r.int(1, 3);
        let word = '';
        for (let i = 0; i < len; i++) word += letters[r.int(0, 2)];
        return [board, word];
      },
      15,
      304,
    ),
  },
]);
