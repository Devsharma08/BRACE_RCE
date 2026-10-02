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
 * Legacy references, batch 6 — trees and linked lists.
 *
 * Tree parameters arrive as a TreeNode or a level-order array depending on the
 * wrapper's name heuristic, so each tree reference starts with a local
 * asTree(). Linked lists arrive as a flat array of values and are returned the
 * same way.
 */
import type { LegacyEntry } from './types.js';

/** Source for the local asTree() helper, inlined into each tree reference. */
const AS_TREE = `      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };
`;

export const batch6: LegacyEntry[] = [
  {
    number: 14,
    funcName: 'zigzagLevelOrder',
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
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return [];
      const out = [];
      let level = [root];
      while (level.length) {
        out.push(level.map((n) => n.val));
        // Reverse every other row to get the zigzag.
        const next = [];
        for (const node of level) {
          if (node.left) next.push(node.left);
          if (node.right) next.push(node.right);
        }
        next.reverse();
        level = next;
      }
      return out;
    },
  },
  {
    number: 20,
    funcName: 'minDepth',
    argNames: ['root'],
    edge: [
      [[3, 9, 20, null, null, 15, 7]],
      [[2, null, 3, null, 4, null, 5, null, 6]],
      [[]],
      [[1]],
      [[1, 2]],
    ],
    gen: (r) => [r.tree(r.int(0, 12))],
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return 0;
      let best = Infinity;
      const stack = [[root, 1]];
      while (stack.length) {
        const [node, depth] = stack.pop();
        if (!node.left && !node.right) {
          if (depth < best) best = depth;
          continue;
        }
        if (node.right) stack.push([node.right, depth + 1]);
        if (node.left) stack.push([node.left, depth + 1]);
      }
      return best;
    },
  },
  {
    number: 143,
    funcName: 'diameterOfBinaryTree',
    argNames: ['root'],
    edge: [
      [[1, 2, 3, 4, 5]],
      [[1, 2]],
      [[]],
      [[1]],
      [[1, 2, 3, null, null, 4, 5]],
    ],
    gen: (r) => [r.tree(r.int(0, 12))],
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return 0;
      let best = 0;
      // Post-order heights; -1 signals that a subtree can be skipped.
      const height = (node) => {
        if (!node) return 0;
        const l = height(node.left);
        const r = height(node.right);
        const through = l + r;
        if (through > best) best = through;
        return Math.max(l, r) + 1;
      };
      height(root);
      return best;
    },
  },
  {
    number: 183,
    funcName: 'isValidBST',
    argNames: ['root'],
    edge: [
      [[2, 1, 3]],
      [[5, 1, 4, null, null, 3, 6]],
      [[]],
      [[1]],
      [[1, 1]],
    ],
    gen: (r) => [r.bst(r.int(0, 10))],
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return true;
      // Every node must sit strictly inside its subtree's value bounds.
      const check = (node, low, high) => {
        if (!node) return true;
        if (node.val <= low || node.val >= high) return false;
        return check(node.left, low, node.val) && check(node.right, node.val, high);
      };
      return check(root, -Infinity, Infinity);
    },
  },
  {
    number: 100,
    funcName: 'kthSmallest',
    argNames: ['root', 'k'],
    edge: [
      [[3, 1, 4, null, 2], 1],
      [[5, 3, 6, 2, 4, null, null, 1], 3],
      [[1], 1],
      [[], 1],
      [[2, 1, 3], 2],
    ],
    gen: (r) => {
      const bst = r.bst(r.int(1, 10));
      // r.bst returns a level-order array; count its real nodes for a valid k.
      let size = 0;
      for (const v of bst) if (v != null) size++;
      return [bst, r.int(1, Math.max(1, size))];
    },
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      const k = args[1];
      // In-order traversal of a BST visits values in ascending order.
      const stack = [];
      let node = root;
      let count = 0;
      while (stack.length || node) {
        while (node) {
          stack.push(node);
          node = node.left;
        }
        node = stack.pop();
        count++;
        if (count === k) return node.val;
        node = node.right;
      }
      return -1;
    },
  },
  {
    number: 134,
    funcName: 'findLeaves',
    argNames: ['root'],
    edge: [
      [[1, 2, 3]],
      [[1]],
      [[]],
      [[1, 2, 3, null, null, 4, 5]],
      [[3, 9, 20, null, null, 15, 7]],
    ],
    gen: (r) => [r.tree(r.int(0, 12))],
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      if (!root) return [];
      const out = [];
      const walk = (node, depth) => {
        if (!node) return;
        if (!node.left && !node.right) {
          out.push(depth);
          return;
        }
        walk(node.left, depth + 1);
        walk(node.right, depth + 1);
      };
      walk(root, 1);
      return out;
    },
  },
  {
    number: 145,
    funcName: 'isSubtree',
    argNames: ['root', 'subRoot'],
    edge: [
      [[1, 2, 3, 4, 5], [2, 4, 5]],
      [[1, 2, 3], [1, 2]],
      [[], [1]],
      [[1, 1], [1]],
      [[1, 2, 3], [1, 1]],
    ],
    gen: (r) => {
      const big = r.tree(r.int(1, 10));
      const small = r.tree(r.int(1, 3));
      return [big, small];
    },
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };

      const root = asTree(args[0]);
      const subRoot = asTree(args[1]);
      if (!subRoot) return true;
      if (!root) return false;
      // Serialise both trees so a subtree match becomes a substring search.
      const encode = (node) => {
        if (!node) return '#';
        return node.val + '(' + encode(node.left) + ')' + encode(node.right) + ')';
      };
      return encode(root).includes(encode(subRoot));
    },
  },
  {
    number: 179,
    funcName: 'middleNode',
    argNames: ['head'],
    edge: [
      [[1, 2, 3, 4, 5]],
      [[1, 2, 3, 4, 5, 6]],
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
      // Two pointers one step and two steps apart.
      const vals = args[0];
      let slow = 0;
      let fast = 0;
      while (fast < vals.length - 1) {
        slow++;
        fast += 2;
      }
      return vals.slice(slow);
    },
  },
  {
    number: 148,
    funcName: 'rotateRight',
    argNames: ['head', 'k'],
    edge: [
      [[1, 2, 3, 4, 5], 2],
      [[0, 1, 2], 4],
      [[1], 99],
      [[1, 2], 2],
      [[], 3],
    ],
    gen: (r) => {
      const n = r.int(0, 9);
      const vals = [];
      for (let i = 0; i < n; i++) vals.push(r.int(1, 99));
      return [vals, r.int(0, 20)];
    },
    solve: (args) => {
      const vals = args[0];
      const n = vals.length;
      if (n === 0) return vals;
      const k = ((args[1] % n) + n) % n;
      if (k === 0) return vals;
      // The last k elements move to the front, order preserved.
      return vals.slice(n - k).concat(vals.slice(0, n - k));
    },
  },
  {
    number: 175,
    funcName: 'deleteDuplicates',
    argNames: ['head'],
    edge: [
      [[1, 1, 2]],
      [[1, 1, 2, 3, 3]],
      [[1, 1, 1]],
      [[1, 2, 3]],
      [[]],
    ],
    gen: (r) => {
      // Sorted with duplicates, which is what problem 175 requires.
      const n = r.int(0, 9);
      const vals = [];
      let v = r.int(1, 4);
      for (let i = 0; i < n; i++) {
        vals.push(v);
        if (r.next() < 0.5) v += r.int(1, 2);
      }
      return [vals];
    },
    solve: (args) => {
      // Remove every node that repeats, not just the extra copies.
      const vals = args[0];
      const out = [];
      let i = 0;
      while (i < vals.length) {
        const v = vals[i];
        let j = i;
        while (j < vals.length && vals[j] === v) j++;
        if (j - i === 1) out.push(v);
        i = j;
      }
      return out;
    },
  },
  {
    number: 176,
    funcName: 'deleteDuplicates',
    argNames: ['head'],
    edge: [
      [[1, 1, 2]],
      [[1, 1, 2, 3, 3]],
      [[1, 1, 2, 3, 4]],
      [[]],
      [[1]],
    ],
    gen: (r) => {
      // Unsorted, unlike problem 175.
      const n = r.int(0, 10);
      return [r.nums(n, 1, 5)];
    },
    solve: (args) => {
      // Keep only the first occurrence of each value.
      const seen = new Set();
      const out = [];
      for (const v of args[0]) {
        if (seen.has(v)) continue;
        seen.add(v);
        out.push(v);
      }
      return out;
    },
  },
  {
    number: 181,
    funcName: 'reverseBetween',
    argNames: ['head', 'left', 'right'],
    edge: [
      [[1, 2, 3, 4, 5], 2, 4],
      [[1, 2, 3, 4, 5], 1, 5],
      [[5], 1, 1],
      [[1, 2], 2, 2],
      [[1, 2, 3], 1, 3],
    ],
    gen: (r) => {
      const n = r.int(1, 9);
      const vals = [];
      for (let i = 0; i < n; i++) vals.push(i + 1);
      const left = r.int(1, n);
      return [vals, left, r.int(left, n)];
    },
    solve: (args) => {
      const vals = args[0].slice();
      const left = args[1] - 1;
      const right = args[2] - 1;
      let lo = left;
      let hi = right;
      while (lo < hi) {
        const t = vals[lo];
        vals[lo] = vals[hi];
        vals[hi] = t;
        lo++;
        hi--;
      }
      return vals;
    },
  },
];
