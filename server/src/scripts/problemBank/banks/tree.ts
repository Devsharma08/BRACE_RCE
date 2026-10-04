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
import { bank, type RawProblem } from '../dsl.js';
import { autoTests, pub, priv } from '../tests.js';

/**
 * Binary tree problems.
 *
 * Trees are passed as LeetCode LEVEL-ORDER arrays with `null` for a missing
 * child — the encoding the execution wrappers already parse.
 *
 * Every reference below is a single self-contained arrow function. That is not
 * stylistic: `buildUserSolution` inlines `solve.toString()` into the program
 * shipped to the sandbox, so a reference cannot close over anything in this
 * file. Each one rebuilds the tree inline.
 *
 * The generators below are NOT serialized, so they may share the helpers here.
 */
const BANK_TREE: RawProblem[] = [

  {
    k: 'tre-inorder-traversal',
    n: 'Binary Tree Inorder Traversal',
    num: 320,
    d: 'EASY',
    c: 'Tree',
    intro: [
      'Given the root of a binary tree, return the inorder traversal of its nodes.',
      'Inorder visits <b>left</b> subtree, then the node, then the <b>right</b> subtree.',
    ],
    notes: [
      'A recursive inorder is the three-line version.',
      'An iterative version pushes the whole left spine onto a stack, which avoids deep recursion on a skewed tree.',
      'The result is built in visit order, so no sorting is involved.',
    ],
    approach: [
      'Push the root, then keep pushing its left child.',
      'Pop the deepest node — it is the next in the sequence — and record it.',
      'Move to its right child and repeat.',
    ],
    ex: [
      { input: 'root = [1,null,2,3]', output: '[1,3,2]', explanation: 'Left subtree is empty, so 1 comes first, then 3 then 2.', args: [[1,null,2,3]] },
      { input: 'root = [4,2,6,1,3,5,7]', output: '[1,2,3,4,5,6,7]', explanation: 'A complete tree visits in sorted order by chance.', args: [[4,2,6,1,3,5,7]] },
      { input: 'root = []', output: '[]', explanation: 'An empty tree has no nodes to visit.', args: [[]] },
    ],
    cx: 'Time O(n), Space O(h).',
    con: ['0 <= number of nodes <= 100', '-100 <= node.val <= 100'],
    h: [
      'Inorder is left, node, right — not left, right, node.',
      'The iterative version needs the left spine pushed before the first pop.',
      'An empty tree must return [], not null.',
    ],
    sig: ['int[]', 'TreeNode'],
    fn: ['inorderTraversal', 'root'],
    s: (args) => {
      const lv = args[0] || [];
      if (!lv.length) return [];
      // BFS level-order construction, matching `arrayToTree` in the execution
      // wrapper exactly. Heap indexing (child of i is 2i+1 / 2i+2) is WRONG for
      // anything but a complete tree: in [1,null,2,3] the 3 is 2's LEFT child,
      // but heap indexing strands it and the traversal drops it.
      const build = () => {
        const root = { val: lv[0], left: null, right: null };
        const q = [root];
        let i = 1;
        while (q.length && i < lv.length) {
          const c = q.shift();
          if (lv[i] !== null && lv[i] !== undefined) { c.left = { val: lv[i], left: null, right: null }; q.push(c.left); }
          i++;
          if (lv[i] !== null && lv[i] !== undefined) { c.right = { val: lv[i], left: null, right: null }; q.push(c.right); }
          i++;
        }
        return root;
      };
      const root = build();
      const out = [];
      const stack = [];
      let cur = root;
      while (cur || stack.length) {
        while (cur) { stack.push(cur); cur = cur.left; }
        cur = stack.pop();
        out.push(cur.val);
        cur = cur.right;
      }
      return out;
    },
    t: autoTests(
      [
        pub([1,null,2,3]),
        pub([4,2,6,1,3,5,7]),
        pub([]),
        priv([1]),
        priv([5,3,1,0,2]),
        priv([7,3,15,null,null,9,20]),
      ],
      (r) => [randLevelOrder(r, 8)],
      15,
      320,
    ),
  },
  {
    k: 'tre-maximum-path-sum',
    n: 'Binary Tree Maximum Path Sum',
    num: 321,
    d: 'HARD',
    c: 'Tree',
    intro: [
      'Given the root of a binary tree, return the largest possible sum of any <b>path</b> from a leaf up to a leaf.',
      'A path may start and end anywhere, and passes through at most one node from each level.',
    ],
    notes: [
      'The best path through a node joins its best downward left and right branches.',
      'A path can only ever pass through the root, so the running maximum is tracked outside the recursion.',
      'A negative branch is dropped: a downward contribution of zero beats continuing into it.',
    ],
    approach: [
      'Return, from each node, the best non-negative sum descending into its subtree.',
      'That is node value plus the larger of its two downward contributions.',
      'Separately, node value plus BOTH contributions is a candidate for the global answer.',
    ],
    ex: [
      { input: 'root = [1,2,3]', output: '6', explanation: '2 -> 1 -> 3 sums to 6.', args: [[1,2,3]] },
      { input: 'root = [-10,9,20,null,null,15,7]', output: '42', explanation: 'The whole tree 9 -> -10 -> 20 -> 15 -> 7 sums to 42.', args: [[-10,9,20,null,null,15,7]] },
      { input: 'root = [-3]', output: '-3', explanation: 'A single negative node cannot be escaped, so the path is -3.', args: [[-3]] },
    ],
    cx: 'Time O(n), Space O(h).',
    con: ['1 <= number of nodes <= 3 * 10^4', '-1000 <= node.val <= 1000'],
    h: [
      'The downward sum and the global answer are different quantities — do not return the global one.',
      'Clamp a downward branch at 0 so a negative subtree is not forced into the path.',
      'A node with all-negative children still has value node.val as its own best downward sum.',
    ],
    sig: ['int', 'TreeNode'],
    fn: ['maxPathSum', 'root'],
    s: (args) => {
      const lv = args[0] || [];
      if (!lv.length) return 0;
      // BFS level-order construction, matching `arrayToTree` in the execution
      // wrapper exactly. Heap indexing (child of i is 2i+1 / 2i+2) is WRONG for
      // anything but a complete tree: in [1,null,2,3] the 3 is 2's LEFT child,
      // but heap indexing strands it and the traversal drops it.
      const build = () => {
        const root = { val: lv[0], left: null, right: null };
        const q = [root];
        let i = 1;
        while (q.length && i < lv.length) {
          const c = q.shift();
          if (lv[i] !== null && lv[i] !== undefined) { c.left = { val: lv[i], left: null, right: null }; q.push(c.left); }
          i++;
          if (lv[i] !== null && lv[i] !== undefined) { c.right = { val: lv[i], left: null, right: null }; q.push(c.right); }
          i++;
        }
        return root;
      };
      const root = build();
      let best = -Infinity;
      const down = (n) => {
        if (!n) return 0;
        const l = Math.max(0, down(n.left));
        const r = Math.max(0, down(n.right));
        if (n.val + l + r > best) best = n.val + l + r;
        return n.val + Math.max(l, r);
      };
      down(root);
      return best;
    },
    t: autoTests(
      [
        pub([1,2,3]),
        pub([-10,9,20,null,null,15,7]),
        pub([-3]),
        priv([-2,-1]),
        priv([2,-1]),
        priv([1,null,2]),
      ],
      (r) => [randLevelOrder(r, 8, -20, 20)],
      15,
      321,
    ),
  },
];

/**
 * Random binary tree, serialised as a LeetCode level-order array with `null`
 * for missing children. Runs at seed time only — it is never shipped to the
 * sandbox, so unlike the references it may use shared code.
 */
function randLevelOrder(r, maxNodes: number, lo = -20, hi = 20): (number | null)[] {
  const grow = (n: number): any => {
    if (n <= 0) return null;
    return {
      val: r.int(lo, hi),
      left: grow(r.int(0, n - 1)),
      right: grow(r.int(0, n - 1)),
    };
  };
  const root = grow(r.int(1, maxNodes));
  if (!root) return [];
  const out: (number | null)[] = [];
  const queue = [root];
  while (queue.length) {
    const n = queue.shift();
    if (n) { out.push(n.val); queue.push(n.left); queue.push(n.right); }
    else out.push(null);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

// Exported last: `const` is not hoisted-initialised, so calling bank() above the
// declaration throws a temporal-dead-zone ReferenceError at import time.
export default bank(BANK_TREE);
