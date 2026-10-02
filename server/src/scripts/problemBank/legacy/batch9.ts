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
 * Legacy references, batch 9 — custom encodings.
 *
 * Linked lists and trees arrive as ListNode / TreeNode when the wrapper's
 * name heuristic fires and as plain arrays otherwise, so each reference
 * normalises with a local helper rather than assuming one representation.
 */
import type { LegacyEntry } from './types.js';

export const batch9: LegacyEntry[] = [
  {
    number: 2,
    funcName: 'addTwoNumbers',
    argNames: ['l1', 'l2'],
    edge: [
      [[2, 4, 3], [5, 6, 4]],
      [[0], [0]],
      [[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]],
      [[], [1]],
      [[5], [5]],
    ],
    gen: (r) => {
      const mk = () => {
        let v = r.int(1, 9);
        const out = [];
        for (let i = 0; i < r.int(1, 6); i++) {
          out.push(v);
          v = r.int(0, 9);
        }
        return out;
      };
      return [mk(), mk()];
    },
    solve: (args) => {
      // Flatten a node chain (ListNode or TreeNode) to a value array.
      const toValues = (head) => {
        const out = [];
        let cur = head;
        while (cur) {
          out.push(cur.val);
          cur = cur.next;
        }
        return out;
      };
      const a = toValues(args[0]);
      const b = toValues(args[1]);
      const out = [];
      let i = 0;
      let j = 0;
      let carry = 0;
      while (i < a.length || j < b.length || carry) {
        let sum = carry;
        if (i < a.length) sum += a[i++];
        if (j < b.length) sum += b[j++];
        out.push(sum % 10);
        carry = Math.floor(sum / 10);
      }
      return out;
    },
  },
  {
    number: 107,
    funcName: 'reverseKGroup',
    argNames: ['head', 'k'],
    edge: [
      [[1, 2, 3, 4, 5], 2],
      [[1, 2, 3, 4, 5], 3],
      [[1, 2, 3], 1],
      [[1, 2, 3], 4],
      [[], 2],
    ],
    gen: (r) => {
      const n = r.int(0, 9);
      const vals = [];
      for (let i = 0; i < n; i++) vals.push(r.int(1, 99));
      return [vals, r.int(1, 5)];
    },
    solve: (args) => {
      // Flatten a node chain (ListNode or TreeNode) to a value array.
      const toValues = (head) => {
        const out = [];
        let cur = head;
        while (cur) {
          out.push(cur.val);
          cur = cur.next;
        }
        return out;
      };
      const vals = toValues(args[0]);
      const k = args[1];
      const out = vals.slice();
      for (let start = 0; start + k <= out.length; start += k) {
        let lo = start;
        let hi = start + k - 1;
        while (lo < hi) {
          const t = out[lo];
          out[lo] = out[hi];
          out[hi] = t;
          lo++;
          hi--;
        }
      }
      return out;
    },
  },
  {
    number: 110,
    funcName: 'flat',
    argNames: ['arr', 'n'],
    edge: [
      [[1, 2, 3, [4, 5, 6], [7, 8, [9, 10, 11], 12], [13, 14, 15]], 1],
      [[1], 1],
      [[[]], 1],
      [[1, [2, [3, [4]]]], 2],
      [[1, [2]], 0],
    ],
    gen: (r) => {
      const depth = r.int(0, 3);
      const mk = (d) => {
        if (d <= 0 || r.next() < 0.4) return r.int(1, 9);
        const out = [];
        const count = r.int(1, 3);
        for (let i = 0; i < count; i++) out.push(mk(d - 1));
        return out;
      };
      return [[mk(depth)], 1];
    },
    solve: (args) => {
      // Flatten exactly one level of nesting, leaving deeper arrays intact.
      const arr = args[0];
      const out = [];
      for (const item of arr) {
        if (Array.isArray(item)) {
          for (const inner of item) out.push(inner);
        } else {
          out.push(item);
        }
      }
      return out;
    },
  },
  {
    number: 115,
    funcName: 'compactObject',
    argNames: ['obj'],
    edge: [
      [[null, 0, 5, [0], [false, 16]]],
      [[1, [2, [3]]]],
      [[]],
      [[null, null]],
      [[0, false, '', null, 1]],
    ],
    gen: (r) => {
      const mk = (d) => {
        if (d <= 0 || r.next() < 0.5) return r.pick([0, 1, 5, 16, null, false, true, '', 'x']);
        const out = [];
        for (let i = 0; i < r.int(0, 3); i++) out.push(mk(d - 1));
        return out;
      };
      return [[mk(2)]];
    },
    solve: (args) => {
      // Drop falsy values and flatten nested arrays.
      const walk = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) {
          const out = [];
          for (const item of v) out.push(...walk(item));
          return out;
        }
        return [v];
      };
      return walk(args[0]);
    },
  },
  {
    number: 119,
    funcName: 'solution',
    argNames: ['knows'],
    edge: [
      [4, [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [1, 1, 1, 1]]],
      [2, [[1, 0], [1, 1]]],
      [1, [[1]]],
      [3, [[1, 1, 1], [1, 0, 0], [1, 1, 1]]],
      [3, [[1, 0, 1], [1, 1, 0], [1, 0, 1]]],
    ],
    gen: (r) => {
      const n = r.int(1, 5);
      const celebrity = r.int(0, n - 1);
      const matrix = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
          if (i === j) row.push(1);
          // The celebrity knows nobody; everyone else knows the celebrity.
          else if (i === celebrity) row.push(0);
          else row.push(r.next() < 0.6 ? 1 : 0);
        }
        matrix.push(row);
      }
      // The signature takes only the matrix; n comes from its shape.
      return [matrix];
    },
    solve: (args) => {
      // knows[i][j] === 1 means i knows j. n is implied by the matrix.
      const knows = args[0];
      const n = knows.length;
      let candidate = 0;
      // Eliminate everyone the candidate already knows is not the celebrity.
      for (let i = 1; i < n; i++) {
        if (knows[candidate][i]) candidate = i;
      }
      // The candidate must know nobody and be known by everybody.
      for (let i = 0; i < n; i++) {
        if (i === candidate) continue;
        if (knows[candidate][i] || !knows[i][candidate]) return -1;
      }
      return candidate;
    },
  },
  {
    number: 125,
    funcName: 'serialize',
    argNames: ['root'],
    edge: [
      [[1, 2, 3, null, null, 4, 5]],
      [[]],
      [[1]],
      [[1, 2]],
      [[-1, -2, -3]],
    ],
    gen: (r) => [r.tree(r.int(0, 10))],
    solve: (args) => {
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
      // Level-order with null holes, which is the platform's tree encoding.
      const out = [];
      const queue = [root];
      while (queue.length) {
        const node = queue.shift();
        if (node) {
          out.push(node.val);
          queue.push(node.left, node.right);
        } else {
          out.push(null);
        }
      }
      while (out.length && out[out.length - 1] === null) out.pop();
      return out;
    },
  },
  {
    number: 17,
    funcName: 'buildTree',
    argNames: ['preorder', 'inorder'],
    edge: [
      [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]],
      [[-1], [-1]],
      [[1, 2, 3], [2, 3, 1]],
      [[1], [1]],
      [[1, 2], [1, 2]],
    ],
    gen: (r) => {
      const n = r.int(0, 8);
      const keys = [];
      for (let i = 0; i < n; i++) keys.push(r.int(1, 100));
      keys.sort((a, b) => a - b);
      // preorder = root, left, right; inorder = left, root, right.
      const build = (lo, hi) => {
        if (lo > hi) return null;
        const mid = lo + Math.floor((hi - lo) / 2);
        const rootVal = keys[mid];
        const left = build(lo, mid - 1);
        const right = build(mid + 1, hi);
        return [rootVal, left, right];
      };
      const node = build(0, keys.length - 1);
      const preorder = [];
      const inorder = [];
      const walkPre = (n2) => {
        if (!n2) return;
        preorder.push(n2[0]);
        walkPre(n2[1]);
        walkPre(n2[2]);
      };
      const walkIn = (n2) => {
        if (!n2) return;
        walkIn(n2[1]);
        inorder.push(n2[0]);
        walkIn(n2[2]);
      };
      walkPre(node);
      walkIn(node);
      return [preorder, inorder];
    },
    solve: (args) => {
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
      const preorder = args[0];
      const inorder = args[1];
      if (preorder.length === 0) return [];
      const positions = new Map();
      inorder.forEach((v, i) => positions.set(v, i));
      // Reconstruct by recursing over the two traversals.
      const build = (pre, inStart, inEnd) => {
        if (pre.start > pre.end) return null;
        const value = preorder[pre.start];
        const mid = positions.get(value);
        if (mid < inStart || mid > inEnd) return null;
        const node = { val: value, left: null, right: null };
        node.left = build({ start: pre.start + 1, end: mid }, inStart, mid - 1);
        node.right = build({ start: mid + 1, end: pre.end }, mid + 1, inEnd);
        return node;
      };
      const built = build({ start: 0, end: preorder.length - 1 }, 0, inorder.length - 1);
      if (!built) return [];
      const out = [];
      const queue = [built];
      while (queue.length) {
        const cur = queue.shift();
        if (cur) {
          out.push(cur.val);
          queue.push(cur.left, cur.right);
        } else {
          out.push(null);
        }
      }
      while (out.length && out[out.length - 1] === null) out.pop();
      return out;
    },
  },
  {
    number: 21,
    funcName: 'flatten',
    argNames: ['root'],
    edge: [
      [[1, 2, 5, 3, 4, null, 6]],
      [[]],
      [[0]],
      [[1]],
      [[1, 2, 3]],
    ],
    gen: (r) => [r.tree(r.int(0, 10))],
    solve: (args) => {
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
      // Collect nodes in preorder, then relink them as a chain.
      const order = [];
      const walk = (node) => {
        if (!node) return;
        order.push(node);
        walk(node.left);
        walk(node.right);
      };
      walk(root);
      for (let i = 0; i + 1 < order.length; i++) {
        order[i].left = null;
        order[i].right = order[i + 1];
      }
      const last = order[order.length - 1];
      if (last) {
        last.left = null;
        last.right = null;
      }
      return order.map((n) => n.val);
    },
  },
  {
    number: 31,
    funcName: 'copyRandomList',
    argNames: ['head'],
    edge: [
      [[[7, null], [13, 0], [11, 4], [10, 2], [1, 0]]],
      [[[1, 1], [2, 1]]],
      [[]],
      [[[2, null]]],
      [[[1, null], [2, 1], [3, null], [4, 3]]],
    ],
    gen: (r) => {
      const n = r.int(0, 7);
      const out = [];
      for (let i = 0; i < n; i++) {
        // Each entry is [value, randomIndex] or [value, null].
        const target = r.next() < 0.4 ? null : r.int(0, Math.max(0, n - 1));
        out.push([r.int(1, 99), target]);
      }
      // An empty list is encoded as []; [[]] would become a phantom node.
      return [out];
    },
    solve: (args) => {
      // The platform encodes this list as [value, randomIndex] pairs.
      const raw = args[0];
      // An empty array is an empty list; answer it before the node branch,
      // because the wrapper has already turned it into a single node.
      if (Array.isArray(raw) && raw.length === 0) return [];
      const rows = Array.isArray(raw) && Array.isArray(raw[0]) ? raw : null;
      if (rows) {
        // Copying a list with identical value/index pairs is the identity on
        // the encoding, but the indices are re-resolved so self references
        // stay consistent.
        const n = rows.length;
        const out = rows.map((row) => [row[0], row[1] === null ? null : row[1]]);
        for (let i = 0; i < n; i++) {
          const t = out[i][1];
          out[i][1] = t === null ? null : (t >= 0 && t < n ? t : null);
        }
        return out;
      }
      // Node form: walk the chain and read each node's random pointer.
      const nodes = [];
      let cur = raw;
      while (cur) {
        nodes.push(cur);
        cur = cur.next;
      }
      const index = new Map();
      nodes.forEach((n2, i) => index.set(n2, i));
      return nodes.map((n2) => {
        const target = n2.random ? index.get(n2.random) : undefined;
        return [n2.val, target === undefined ? null : target];
      });
    },
  },
];
