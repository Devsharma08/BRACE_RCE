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
 * Legacy references, batch 2 — binary trees and linked lists.
 *
 * Trees and lists are passed in the platform's JSON encoding (level-order
 * arrays with null holes for trees, flat value arrays for lists), which is what
 * the execution wrapper converts into nodes. The reference therefore works on
 * that encoding directly and returns the same encoding, so the reference and a
 * user submission agree without depending on the wrapper's helper functions.
 */
import { Rng } from '../helpers.js';
import type { LegacyEntry } from './types.js';

export const batch2: LegacyEntry[] = [
  {
    number: 11,
    funcName: 'isSameTree',
    argNames: ['p', 'q'],
    edge: [
      [[1, 2, 3], [1, 2, 3]],
      [[1, 2], [1, null, 2]],
      [[], []],
      [[1], [1, 2]],
      [[1, 2, 1], [1, 1, 2]],
    ],
    gen: (r) => {
      const t = r.tree(r.int(0, 9));
      if (r.next() < 0.5) return [t, t.slice()];
      const u = r.tree(r.int(0, 9));
      return [t, u];
    },
    solve: (args) => {
      // Accept either a TreeNode or a level-order array (see the note on the
      // wrapper's tree-detection heuristic below).
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const buildQ = [nodes[0]];
        while (buildQ.length) {
          const cur = buildQ.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) buildQ.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      // The wrapper hands us TreeNode objects (the param names p/q trigger
      // arrayToTree), so compare structurally.
      const stack = [[asTree(args[0]), asTree(args[1])]];
      while (stack.length) {
        const pair = stack.pop();
        const x = pair[0];
        const y = pair[1];
        if (!x && !y) continue;
        if (!x || !y) return false;
        if (x.val !== y.val) return false;
        stack.push([x.left, y.left]);
        stack.push([x.right, y.right]);
      }
      return true;
    },
  },
  {
    number: 12,
    funcName: 'isSymmetric',
    argNames: ['root'],
    edge: [
      [[1, 2, 2, 3, 4, 4, 3]],
      [[1, 2, 2, null, 3, null, 3]],
      [[]],
      [[1]],
      [[9, -1, -1]],
    ],
    gen: (r) => {
      const n = r.int(0, 8);
      const t = r.tree(n);
      // Half the time, mirror the tree so the answer is genuinely true.
      if (r.next() < 0.5 && t.length > 0) return [mirror(t)];
      return [t];
    },
    solve: (args) => {
      // Accept either a TreeNode or a level-order array (see the note on the
      // wrapper's tree-detection heuristic below).
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const buildQ = [nodes[0]];
        while (buildQ.length) {
          const cur = buildQ.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) buildQ.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return true;
      const stack = [[root.left, root.right]];
      while (stack.length) {
        const [a, b] = stack.pop();
        if (!a && !b) continue;
        if (!a || !b) return false;
        if (a.val !== b.val) return false;
        stack.push([a.left, b.right]);
        stack.push([a.right, b.left]);
      }
      return true;
    },
  },
  {
    number: 13,
    funcName: 'levelOrder',
    argNames: ['root'],
    edge: [
      [[3, 9, 20, null, null, 15, 7]],
      [[1]],
      [[]],
      [[1, 2, 3, 4, 5]],
      [[1, 2, 3, null, null, 4, 5]],
    ],
    gen: (r) => [r.tree(r.int(0, 12))],
    solve: (args) => {
      // Accept either a TreeNode or a level-order array (see the note on the
      // wrapper's tree-detection heuristic below).
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const buildQ = [nodes[0]];
        while (buildQ.length) {
          const cur = buildQ.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) buildQ.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return [];
      const out = [];
      const q = [root];
      while (q.length) {
        const level = [];
        const size = q.length;
        for (let k = 0; k < size; k++) {
          const cur = q.shift();
          level.push(cur.val);
          if (cur.left) q.push(cur.left);
          if (cur.right) q.push(cur.right);
        }
        out.push(level);
      }
      return out;
    },
  },
  {
    number: 16,
    funcName: 'maxDepth',
    argNames: ['root'],
    edge: [
      [[3, 9, 20, null, null, 15, 7]],
      [[1, null, 2]],
      [[]],
      [[1]],
      [[1, 2, 3, 4, 5, null, null, 6]],
    ],
    gen: (r) => [r.tree(r.int(0, 12))],
    solve: (args) => {
      // Accept either a TreeNode or a level-order array (see the note on the
      // wrapper's tree-detection heuristic below).
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const buildQ = [nodes[0]];
        while (buildQ.length) {
          const cur = buildQ.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) buildQ.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return 0;
      // Iterative depth: track (node, depth) pairs.
      let best = 0;
      const stack = [[root, 1]];
      while (stack.length) {
        const [node, depth] = stack.pop();
        if (depth > best) best = depth;
        if (node.right) stack.push([node.right, depth + 1]);
        if (node.left) stack.push([node.left, depth + 1]);
      }
      return best;
    },
  },
  {
    number: 19,
    funcName: 'isBalanced',
    argNames: ['root'],
    edge: [
      [[3, 9, 20, null, null, 15, 7]],
      [[1, 2, 2, 3, 3, null, null, 4, 4]],
      [[]],
      [[1, 2]],
      [[1, 2, 3]],
    ],
    gen: (r) => {
      const n = r.int(0, 10);
      if (r.next() < 0.5) {
        // Perfectly balanced shapes should always verify true.
        const vals = [];
        let width = 1;
        let count = 0;
        while (count + width <= n) {
          for (let i = 0; i < width; i++) vals.push(++count);
          width *= 2;
        }
        return [toLevelOrder(vals)];
      }
      return [r.tree(n)];
    },
    solve: (args) => {
      // Accept either a TreeNode or a level-order array (see the note on the
      // wrapper's tree-detection heuristic below).
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const buildQ = [nodes[0]];
        while (buildQ.length) {
          const cur = buildQ.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) buildQ.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return true;
      // Post-order heights, reporting false as soon as a subtree is unbalanced.
      const walk = (node) => {
        if (!node) return 0;
        const l = walk(node.left);
        if (l === -1) return -1;
        const r = walk(node.right);
        if (r === -1) return -1;
        if (Math.abs(l - r) > 1) return -1;
        return Math.max(l, r) + 1;
      };
      return walk(root) !== -1;
    },
  },
  {
    number: 26,
    funcName: 'isPalindrome',
    argNames: ['s'],
    edge: [
      ['A man, a plan, a canal: Panama'],
      ['race a car'],
      [' '],
      [''],
      ['.,'],
    ],
    gen: (r) => {
      const n = r.int(0, 14);
      const pool = 'abAB ,.!?';
      let s = '';
      for (let i = 0; i < n; i++) s += pool[r.int(0, pool.length - 1)];
      return [s];
    },
    solve: (args) => {
      // Compare only alphanumerics, case-insensitively, from both ends.
      let s = args[0];
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      let i = 0;
      let j = clean.length - 1;
      while (i < j) {
        if (clean[i] !== clean[j]) return false;
        i++;
        j--;
      }
      return true;
    },
  },
  {
    number: 34,
    funcName: 'reorderList',
    argNames: ['head'],
    edge: [
      [[1, 2, 3, 4]],
      [[1, 2, 3, 4, 5]],
      [[1]],
      [[1, 2]],
      [[]],
    ],
    gen: (r) => {
      const n = r.int(0, 9);
      const vals = [];
      for (let i = 0; i < n; i++) vals.push(r.int(1, 99));
      return [vals];
    },
    solve: (args) => {
      const vals = args[0].slice();
      const n = vals.length;
      if (n < 2) return vals;
      // Find the midpoint, then weave the two halves together.
      const mid = Math.floor(n / 2);
      const out = [];
      let i = 0;
      let j = mid;
      while (i < mid || j < n) {
        if (i < mid) out.push(vals[i++]);
        if (j < n) out.push(vals[j++]);
      }
      return out;
    },
  },
  {
    number: 104,
    funcName: 'maxSlidingWindow',
    argNames: ['nums', 'k'],
    edge: [
      [[1, 3, -1, -3, 5, 3, 6, 7], 3],
      [[1], 1],
      [[1, -1], 1],
      [[9, 11], 2],
      [[7, 2, 4], 2],
    ],
    gen: (r) => {
      const n = r.int(1, 12);
      const nums = r.nums(n, -20, 20);
      return [nums, r.int(1, n)];
    },
    solve: (args) => {
      const nums = args[0];
      const k = args[1];
      const out = [];
      for (let i = 0; i + k <= nums.length; i++) {
        let m = nums[i];
        for (let j = i + 1; j < i + k; j++) if (nums[j] > m) m = nums[j];
        out.push(m);
      }
      return out;
    },
  },
  {
    number: 123,
    funcName: 'strStr',
    argNames: ['haystack', 'needle'],
    edge: [
      ['hello', 'll'],
      ['aaaaa', 'bba'],
      ['', ''],
      ['a', ''],
      ['mississippi', 'issip'],
    ],
    gen: (r) => {
      const a = r.str(r.int(0, 16), 'ab');
      if (r.next() < 0.5 && a.length >= 2) {
        const start = r.int(0, a.length - 2);
        const len = r.int(1, Math.min(3, a.length - start));
        return [a, a.slice(start, start + len)];
      }
      return [a, r.str(r.int(0, 3), 'ab')];
    },
    solve: (args) => {
      const h = args[0];
      const n = args[1];
      if (n.length === 0) return 0;
      if (n.length > h.length) return -1;
      outer: for (let i = 0; i + n.length <= h.length; i++) {
        for (let j = 0; j < n.length; j++) {
          if (h[i + j] !== n[j]) continue outer;
        }
        return i;
      }
      return -1;
    },
  },
  {
    number: 23,
    funcName: 'maxArea',
    argNames: ['height'],
    edge: [
      [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
      [[1, 1]],
      [[4, 3, 2, 1, 4]],
      [[1, 2, 1]],
      [[2, 3, 4, 5, 18, 17, 6]],
    ],
    gen: (r) => [r.nums(r.int(2, 12), 0, 20)],
    solve: (args) => {
      const h = args[0];
      let lo = 0;
      let hi = h.length - 1;
      let best = 0;
      while (lo < hi) {
        const area = Math.min(h[lo], h[hi]) * (hi - lo);
        if (area > best) best = area;
        // Move the shorter wall, since it is the limiting factor.
        if (h[lo] < h[hi]) lo++;
        else hi--;
      }
      return best;
    },
  },
];

/** Mirror a level-order tree so it is trivially symmetric. */
function mirror(arr: (number | null)[]): (number | null)[] {
  if (arr.length === 0) return [];
  const nodes = arr.map((v) => (v == null ? null : { val: v, left: null, right: null }));
  let i = 1;
  const build = [nodes[0]];
  while (build.length) {
    const cur = build.shift();
    for (const key of ['left', 'right']) {
      if (i < nodes.length) {
        cur[key] = nodes[i];
        if (nodes[i]) build.push(nodes[i]);
        i++;
      }
    }
  }
  const flip = (node) => {
    if (!node) return null;
    node.left = flip(node.right);
    node.right = flip(node.left);
    return node;
  };
  flip(nodes[0]);
  return toLevelOrderFlat(nodes[0]);
}

/** Serialise a node graph back to the platform's level-order encoding. */
function toLevelOrderFlat(root: any): (number | null)[] {
  const out: (number | null)[] = [];
  const q = [root];
  while (q.length) {
    const cur = q.shift();
    if (cur) {
      out.push(cur.val);
      q.push(cur.left, cur.right);
    } else {
      out.push(null);
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

/** Build the level-order encoding for a list of values filled level by level. */
function toLevelOrder(vals: number[]): (number | null)[] {
  if (vals.length === 0) return [];
  const nodes = vals.map((v) => ({ val: v, left: null as any, right: null as any }));
  let i = 1;
  const q = [nodes[0]];
  while (q.length) {
    const cur = q.shift();
    if (i < nodes.length) {
      cur.left = nodes[i++];
      q.push(cur.left);
    }
    if (i < nodes.length) {
      cur.right = nodes[i++];
      q.push(cur.right);
    }
  }
  return toLevelOrderFlat(nodes[0]);
}
