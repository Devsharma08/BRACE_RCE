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

// @ts-nocheck
//
// References are single self-contained arrow functions: buildUserSolution inlines
// solve.toString() into the program shipped to the sandbox, so a reference
// cannot close over anything in this file. Generators are not serialized and may
// share the helpers below.


/** Random BST serialised as a LeetCode level-order array. */
function randBST(r, maxNodes: number, lo = -30, hi = 30): (number | null)[] {
  const root: any = { val: 0, left: null, right: null };
  const insert = (n, v) => {
    if (v < n.val) { if (!n.left) n.left = { val: v, left: null, right: null }; else insert(n.left, v); }
    else { if (!n.right) n.right = { val: v, left: null, right: null }; else insert(n.right, v); }
  };
  const count = r.int(1, maxNodes);
  const used = new Set<number>();
  root.val = r.int(lo, hi); used.add(root.val);
  for (let i = 1; i < count; i++) {
    let v = r.int(lo, hi);
    let guard = 0;
    while (used.has(v) && guard++ < 200) v = r.int(lo, hi);
    if (used.has(v)) break;
    used.add(v);
    insert(root, v);
  }
  const out: (number | null)[] = [];
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (n) { out.push(n.val); q.push(n.left); q.push(n.right); } else out.push(null);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

const BANK_BST: RawProblem[] = [
  {
    k: 'bst-lowest-common-ancestor',
    n: 'Lowest Common Ancestor of a BST',
    num: 322,
    d: 'MEDIUM',
    c: 'Binary Search Tree',
    intro: [
      'Given the root of a <b>binary search tree</b> and two integers <code>p</code> and <code>q</code> that both exist in the tree, return their lowest common ancestor.',
      'A node is an ancestor of itself, so if <code>p</code> or <code>q</code> is the root the answer is the root.',
    ],
    notes: [
      'Both values are guaranteed present, so no "not found" case is needed.',
      'The BST ordering lets one node decide: if p and q fall on the same side, that side contains the answer.',
      'This is the same shape as the general binary-tree LCA, but only one comparison per level instead of two subtrees.',
    ],
    approach: [
      'Walk down from the root.',
      'While the current value is strictly below both, go right; strictly above both, go left.',
      'Otherwise the current node is the ancestor.',
    ],
    ex: [
      { input: 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8', output: '6', explanation: '2 is left of 6 and 8 is right of it, so 6 is the lowest node containing both.', args: [[6,2,8,0,4,7,9,null,null,3,5],2,8] },
      { input: 'root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 5', output: '2', explanation: 'Both 2 and 5 are in the left subtree, whose root is 2.', args: [[6,2,8,0,4,7,9,null,null,3,5],2,5] },
      { input: 'root = [2,1,3], p = 1, q = 3', output: '2', explanation: '1 and 3 sit on opposite sides of the root.', args: [[2,1,3],1,3] },
    ],
    cx: 'Time O(h), Space O(1) with the iterative walk.',
    con: ['1 <= number of nodes <= 10^4', '0 <= p, q <= 10^4', 'p and q both exist in the tree'],
    h: [
      'The BST ordering is what makes this O(h) — do not search both subtrees.',
      'The loop must stop when cur.val falls BETWEEN p and q, not when it equals either.',
      'p == q is legal; the same value is its own ancestor.',
    ],
    sig: ['int', 'TreeNode', 'int', 'int'],
    fn: ['lowestCommonAncestor', 'root', 'p', 'q'],
    s: (args) => {
      const p = args[1], q = args[2];
      // Accepts EITHER a level-order array or an already-built TreeNode: at
      // seed time solve receives the raw args, but in the sandbox the generated
      // wrapper converts the TreeNode-typed argument before calling it.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const root = { val: input[0], left: null, right: null };
        const bfs = [root];
        let i = 1;
        while (bfs.length && i < input.length) {
          const c = bfs.shift();
          if (input[i] != null) { c.left = { val: input[i], left: null, right: null }; bfs.push(c.left); }
          i++;
          if (input[i] != null) { c.right = { val: input[i], left: null, right: null }; bfs.push(c.right); }
          i++;
        }
        return root;
      };
      let cur = asTree(args[0]);
      if (!cur) return p;
      const lo = Math.min(p, q), hi = Math.max(p, q);
      while (cur && cur.val !== lo && cur.val !== hi) {
        if (cur.val < lo) cur = cur.right;
        else if (cur.val > hi) cur = cur.left;
        else break;
      }
      return cur ? cur.val : p;
    },
    t: autoTests(
      [
        pub([6,2,8,0,4,7,9,null,null,3,5],2,8),
        pub([6,2,8,0,4,7,9,null,null,3,5],2,5),
        pub([2,1,3],1,3),
        priv([2,1],1,1),
        priv([2,1,3],2,3),
        priv([0,-5,3],-5,3),
      ],
      (r) => {
        const lv = randBST(r, 9);
        const vals = lv.filter((v) => v !== null) as number[];
        if (vals.length < 2) return [lv, vals[0] ?? 0, vals[0] ?? 0];
        const i = r.int(0, vals.length - 1);
        let j = r.int(0, vals.length - 1);
        if (j === i) j = (j + 1) % vals.length;
        return [lv, vals[i], vals[j]];
      },
      15,
      322,
    ),
  },
];

// Exported last: `const` is not hoisted-initialised.
export default bank(BANK_BST);
