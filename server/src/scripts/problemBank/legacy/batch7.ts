/**
 * Legacy references, batch 7 — the straightforward remainder.
 *
 * Includes Median of Two Sorted Arrays (#5), whose stored expected outputs
 * were "2.00000" — a LeetCode display format that JSON.stringify can never
 * produce. A correct submission returns the number 2 and the wrapper prints
 * "2", so those cases were unreachable. The expected outputs are now computed
 * from the reference, which yields 2.
 */
import type { LegacyEntry } from './types.js';

export const batch7: LegacyEntry[] = [
  {
    number: 5,
    funcName: 'findMedianSortedArrays',
    argNames: ['nums1', 'nums2'],
    edge: [
      [[1, 3], [2]],
      [[1, 2], [3, 4]],
      [[], [1]],
      [[2], []],
      [[0, 0], [0, 0]],
    ],
    gen: (r) => {
      const m = r.int(0, 8);
      const n = r.int(1, 8);
      const a = [];
      for (let i = 0; i < m; i++) a.push(r.int(-20, 20));
      const b = [];
      for (let i = 0; i < n; i++) b.push(r.int(-20, 20));
      // Both inputs must be sorted, which is the problem's premise.
      return [a.sort((x, y) => x - y), b.sort((x, y) => x - y)];
    },
    solve: (args) => {
      // Merge the two sorted arrays, then take the middle element(s).
      const a = args[0];
      const b = args[1];
      const merged = [];
      let i = 0;
      let j = 0;
      while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) merged.push(a[i++]);
        else merged.push(b[j++]);
      }
      while (i < a.length) merged.push(a[i++]);
      while (j < b.length) merged.push(b[j++]);
      const total = merged.length;
      if (total % 2 === 1) return merged[Math.floor(total / 2)];
      return (merged[total / 2 - 1] + merged[total / 2]) / 2;
    },
  },
  {
    number: 7,
    funcName: 'convert',
    argNames: ['s', 'numRows'],
    edge: [
      ['PAYPALISHIRING', 3],
      ['PAYPALISHIRING', 4],
      ['AB', 1],
      ['AB', 2],
      ['A', 1],
    ],
    gen: (r) => {
      const s = r.str(r.int(1, 14), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      return [s, r.int(1, 6)];
    },
    solve: (args) => {
      // Zigzag by row index; the direction alternates on each bounce.
      const s = args[0];
      const numRows = args[1];
      const rows = [];
      for (let i = 0; i < numRows; i++) rows.push('');
      let row = 0;
      let step = 1;
      for (const ch of s) {
        rows[row] += ch;
        if (row === 0) step = 1;
        else if (row === numRows - 1) step = -1;
        row += step;
      }
      return rows.join('');
    },
  },
  {
    number: 29,
    funcName: 'solve',
    argNames: ['board'],
    edge: [
      [[['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']]],
      [[['X']]],
      [[['O']]],
      [[['X', 'X'], ['X', 'X']]],
      [[['O', 'O', 'O', 'O'], ['O', 'O', 'O', 'O'], ['O', 'O', 'O', 'O'], ['O', 'O', 'O', 'O']]],
    ],
    gen: (r) => {
      const rows = r.int(1, 4);
      const cols = r.int(1, 4);
      const board = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) row.push(r.pick(['O', 'X']));
        board.push(row);
      }
      return [board];
    },
    solve: (args) => {
      // Flood fill from the border, then flip every unreached O to X.
      const board = args[0];
      const rows = board.length;
      const cols = board[0].length;
      const seen = [];
      for (let i = 0; i < rows; i++) seen.push(new Array(cols).fill(false));
      const stack = [];
      for (let i = 0; i < rows; i++) {
        stack.push([i, 0]);
        stack.push([i, cols - 1]);
      }
      for (let j = 0; j < cols; j++) {
        stack.push([0, j]);
        stack.push([rows - 1, j]);
      }
      while (stack.length) {
        const [r, c] = stack.pop();
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        if (seen[r][c] || board[r][c] !== 'O') continue;
        seen[r][c] = true;
        stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
      }
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (board[i][j] === 'O' && !seen[i][j]) board[i][j] = 'X';
        }
      }
      return board;
    },
  },
  {
    number: 121,
    funcName: 'wallsAndGates',
    argNames: ['rooms'],
    edge: [
      [[[1, 1, 1], [1, 1, 0], [1, 0, 1]]],
      [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]],
      [[[0]]],
      [[[1]]],
      [[[0, 0], [0, 1]]],
    ],
    gen: (r) => {
      const n = r.int(1, 4);
      const rooms = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(r.int(0, 2));
        rooms.push(row);
      }
      return [rooms];
    },
    solve: (args) => {
      // Multi-source BFS outward from every gate (0).
      const rooms = args[0];
      const n = rooms.length;
      const queue = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) if (rooms[i][j] === 0) queue.push([i, j]);
      }
      while (queue.length) {
        const [r, c] = queue.shift();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
          // Only pass through empty rooms (1), never through walls (2).
          if (rooms[nr][nc] !== 1) continue;
          rooms[nr][nc] = rooms[r][c] + 1;
          queue.push([nr, nc]);
        }
      }
      return rooms;
    },
  },
  {
    number: 137,
    funcName: 'pacificAtlantic',
    argNames: ['heights'],
    edge: [
      [[[1, 2, 2, 3, 1], [3, 2, 3, 4, 3], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]],
      [[[1]]],
      [[[0, 0], [0, 0]]],
      [[[1, 2]]],
      [[[3, 3, 3]]],
    ],
    gen: (r) => {
      const rows = r.int(1, 4);
      const cols = r.int(1, 4);
      const heights = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) row.push(r.int(0, 4));
        heights.push(row);
      }
      return [heights];
    },
    solve: (args) => {
      // A cell reaches an ocean if a non-increasing path reaches that edge.
      const heights = args[0];
      const rows = heights.length;
      const cols = heights[0].length;
      const pacific = [];
      const atlantic = [];
      for (let i = 0; i < rows; i++) {
        pacific.push(new Array(cols).fill(false));
        atlantic.push(new Array(cols).fill(false));
      }
      const drain = (cell, seen) => {
        const stack = [cell];
        seen[cell[0]][cell[1]] = true;
        while (stack.length) {
          const [r, c] = stack.pop();
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (seen[nr][nc]) continue;
            if (heights[nr][nc] > heights[r][c]) continue;
            seen[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      };
      for (let i = 0; i < rows; i++) {
        drain([i, 0], pacific);
        drain([i, cols - 1], atlantic);
      }
      for (let j = 0; j < cols; j++) {
        drain([0, j], pacific);
        drain([rows - 1, j], atlantic);
      }
      const out = [];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (pacific[i][j] && atlantic[i][j]) out.push([i, j]);
        }
      }
      return out;
    },
  },
  {
    number: 139,
    funcName: 'trap',
    argNames: ['height'],
    edge: [
      [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
      [[4, 2, 0, 3, 2, 5]],
      [[]],
      [[5]],
      [[3, 2, 1]],
    ],
    gen: (r) => [r.nums(r.int(0, 12), 0, 8)],
    solve: (args) => {
      // Two pointers walking inwards, keeping the taller wall on each side.
      const h = args[0];
      let lo = 0;
      let hi = h.length - 1;
      let leftMax = 0;
      let rightMax = 0;
      let water = 0;
      while (lo <= hi) {
        if (h[lo] < h[hi]) {
          if (h[lo] >= leftMax) leftMax = h[lo];
          else water += leftMax - h[lo];
          lo++;
        } else {
          if (h[hi] >= rightMax) rightMax = h[hi];
          else water += rightMax - h[hi];
          hi--;
        }
      }
      return water;
    },
  },
  {
    number: 161,
    funcName: 'search',
    argNames: ['nums', 'target'],
    edge: [
      [[-1, 0, 3, 5, 9, 12], 9],
      [[-1, 0, 3, 5, 9, 12], 2],
      [[], 1],
      [[1], 1],
      [[1, 3], 3],
    ],
    gen: (r) => {
      const n = r.int(0, 10);
      const nums = [];
      for (let i = 0; i < n; i++) nums.push(r.int(0, 6));
      nums.sort((a, b) => a - b);
      return [nums, r.int(0, 7)];
    },
    solve: (args) => {
      const nums = args[0];
      const target = args[1];
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (nums[mid] === target) return true;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return false;
    },
  },
  {
    number: 166,
    funcName: 'searchMatrix',
    argNames: ['matrix', 'target'],
    edge: [
      [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3],
      [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13],
      [[[]], 1],
      [[[1]], 1],
      [[[1]], 2],
    ],
    gen: (r) => {
      // Row-major sorted with strictly increasing values, as required.
      const rows = r.int(1, 4);
      const cols = r.int(1, 4);
      const flat = [];
      let v = r.int(-10, 0);
      for (let i = 0; i < rows * cols; i++) {
        flat.push(v);
        v += r.int(1, 5);
      }
      const matrix = [];
      for (let i = 0; i < rows; i++) matrix.push(flat.slice(i * cols, (i + 1) * cols));
      return [matrix, v + r.int(-6, 6)];
    },
    solve: (args) => {
      // Treat the matrix as one sorted array and binary search it.
      const matrix = args[0];
      const target = args[1];
      if (matrix.length === 0 || matrix[0].length === 0) return false;
      const cols = matrix[0].length;
      let lo = 0;
      let hi = matrix.length * cols - 1;
      while (lo <= hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        const value = matrix[Math.floor(mid / cols)][mid % cols];
        if (value === target) return true;
        if (value < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return false;
    },
  },
  {
    number: 170,
    funcName: 'minWindow',
    argNames: ['s', 't'],
    edge: [
      ['ADOBECODEBANC', 'ABC'],
      ['a', 'a'],
      ['a', 'aa'],
      ['', 'a'],
      ['ab', 'b'],
    ],
    gen: (r) => {
      const s = r.str(r.int(1, 14), 'abc');
      const t = r.str(r.int(1, 3), 'abc');
      return [s, t];
    },
    solve: (args) => {
      // Sliding window holding the characters still needed from t.
      const s = args[0];
      const t = args[1];
      if (t.length > s.length) return '';
      const need = new Map();
      for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
      let missing = t.length;
      let left = 0;
      let best = '';
      let bestLen = Infinity;
      for (let right = 0; right < s.length; right++) {
        const c = s[right];
        if (need.has(c)) {
          if (need.get(c) > 0) missing--;
          need.set(c, need.get(c) - 1);
        }
        while (missing === 0) {
          const len = right - left + 1;
          if (len < bestLen) {
            bestLen = len;
            best = s.slice(left, right + 1);
          }
          const lc = s[left];
          if (need.has(lc)) {
            need.set(lc, need.get(lc) + 1);
            if (need.get(lc) > 0) missing++;
          }
          left++;
        }
      }
      return best;
    },
  },
  {
    number: 174,
    funcName: 'exist',
    argNames: ['board', 'word'],
    edge: [
      [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCCED'],
      [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'SEE'],
      [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCB'],
      [[], 'A'],
      [[['A']], 'A'],
    ],
    gen: (r) => {
      const rows = r.int(1, 3);
      const cols = r.int(1, 3);
      const board = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) row.push(r.pick(['A', 'B', 'C']));
        board.push(row);
      }
      // A one or two letter word is usually findable on such a small board.
      const len = r.int(1, 2);
      let word = '';
      for (let i = 0; i < len; i++) word += 'ABC'[r.int(0, 2)];
      return [board, word];
    },
    solve: (args) => {
      // DFS in four directions, marking the cell used at each step.
      const board = args[0];
      const word = args[1];
      if (board.length === 0 || board[0].length === 0) return false;
      if (word.length === 0) return true;
      const rows = board.length;
      const cols = board[0].length;
      const walk = (r, c, k) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        if (board[r][c] !== word[k]) return false;
        if (k === word.length - 1) return true;
        const ch = board[r][c];
        board[r][c] = '#';
        const found =
          walk(r + 1, c, k + 1) ||
          walk(r - 1, c, k + 1) ||
          walk(r, c + 1, k + 1) ||
          walk(r, c - 1, k + 1);
        board[r][c] = ch;
        return found;
      };
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (walk(i, j, 0)) return true;
        }
      }
      return false;
    },
  },
  {
    number: 177,
    funcName: 'carFleet',
    argNames: ['target', 'position', 'speed'],
    edge: [
      [12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]],
      [10, [3], [3]],
      [100, [0, 2, 4], [4, 2, 1]],
      [1, [0], [1]],
      [10, [5, 4, 3], [1, 1, 1]],
    ],
    gen: (r) => {
      const n = r.int(1, 6);
      const position = [];
      for (let i = 0; i < n; i++) position.push(r.int(0, 20));
      // Positions must be distinct; the fleet logic depends on ordering.
      const distinct = [...new Set(position)].sort((a, b) => b - a);
      const speed = [];
      for (let i = 0; i < distinct.length; i++) speed.push(r.int(1, 5));
      return [r.int(10, 40), distinct, speed];
    },
    solve: (args) => {
      // Cars sorted by position; a car joins the fleet ahead when it cannot
      // catch it before the target.
      const target = args[0];
      const positions = args[1];
      const speeds = args[2];
      const order = positions
        .map((p, i) => ({ p, i }))
        .sort((a, b) => b.p - a.p);
      let fleets = 0;
      let slowest = 0;
      for (const entry of order) {
        const time = (target - entry.p) / speeds[entry.i];
        if (time > slowest) {
          fleets++;
          slowest = time;
        }
      }
      return fleets;
    },
  },
  {
    number: 178,
    funcName: 'minEatingSpeed',
    argNames: ['piles', 'h'],
    edge: [
      [[3, 6, 7, 11], 8],
      [[30, 11, 23, 4, 20], 5],
      [[30, 11, 23, 4, 20], 6],
      [[1], 1],
      [[1, 1], 1],
    ],
    gen: (r) => {
      const n = r.int(1, 6);
      const piles = [];
      for (let i = 0; i < n; i++) piles.push(r.int(1, 20));
      return [piles, r.int(1, 10)];
    },
    solve: (args) => {
      // Binary search the smallest speed satisfying the hour budget.
      const piles = args[0];
      const h = args[1];
      let lo = 1;
      let hi = Math.max(...piles);
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        let hours = 0;
        for (const p of piles) hours += Math.ceil(p / mid);
        if (hours <= h) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
  },
  {
    number: 189,
    funcName: 'isAlienSorted',
    argNames: ['words', 'order'],
    edge: [
      [['hello', 'leetcode'], 'hlabcdefgijkmnopqrstuvwxyz'],
      [['word', 'world', 'row'], 'worldabcefghijkmnpqstuvxyz'],
      [['apple', 'app'], 'abcdefghijklmnopqrstuvwxyz'],
      [['app', 'apple'], 'abcdefghijklmnopqrstuvwxyz'],
      [['a'], 'b'],
    ],
    gen: (r) => {
      const pool = ['abc'];
      // Build an order string that is actually a valid ranking of the letters.
      const letters = ['a', 'b', 'c', 'd'];
      const shuffled = letters.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = r.int(0, i);
        const t = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = t;
      }
      const order = shuffled.join('');
      void pool;
      const count = r.int(1, 4);
      const words = [];
      for (let i = 0; i < count; i++) {
        let w = '';
        const len = r.int(1, 4);
        for (let k = 0; k < len; k++) w += letters[r.int(0, 3)];
        words.push(w);
      }
      return [words, order];
    },
    solve: (args) => {
      // Each word must be non-decreasing under the given alphabet.
      const words = args[0];
      const order = args[1];
      const rank = new Map();
      for (let i = 0; i < order.length; i++) rank.set(order[i], i);
      // Lexicographic comparison under the given alphabet.
      const compare = (a, b) => {
        const n = Math.min(a.length, b.length);
        for (let i = 0; i < n; i++) {
          const x = rank.get(a[i]) ?? 0;
          const y = rank.get(b[i]) ?? 0;
          if (x !== y) return x - y;
        }
        return a.length - b.length;
      };
      for (let i = 1; i < words.length; i++) {
        if (compare(words[i - 1], words[i]) > 0) return false;
      }
      return true;
    },
  },
  {
    number: 153,
    funcName: 'predictPartyVictory',
    argNames: ['senate'],
    edge: [
      ['RDD'],
      ['DDRRRD'],
      ['R'],
      ['D'],
      ['DR'],
    ],
    gen: (r) => {
      const n = r.int(1, 12);
      let s = '';
      for (let i = 0; i < n; i++) s += r.pick(['R', 'D']);
      return [s];
    },
    solve: (args) => {
      // Queue the turn order of each faction's remaining senators.
      let senate = args[0];
      const n = senate.length;
      const rad = [];
      const dirt = [];
      for (let i = 0; i < n; i++) {
        if (senate[i] === 'R') rad.push(i);
        else dirt.push(i);
      }
      let offset = n;
      while (rad.length && dirt.length) {
        const r = rad.shift();
        const d = dirt.shift();
        // Whoever acts first bans the other; the loser returns next round.
        if (r < d) rad.push(offset + r);
        else dirt.push(offset + d);
      }
      return rad.length ? 'Radiant' : 'Dire';
    },
  },
];
