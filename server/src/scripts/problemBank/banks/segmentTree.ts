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


const BANK_SEGMENT: RawProblem[] = [
  {
    k: 'seg-range-sum-query-mutable',
    n: 'Range Sum Query - Mutable',
    num: 324,
    d: 'MEDIUM',
    c: 'Segment Tree',
    intro: [
      'You are given an array <code>nums</code>. For each call set <code>nums[index]</code> to <code>value</code>, then return the sum of <code>nums[0..index]</code> inclusive.',
    ],
    notes: [
      'A plain prefix array is wrong here: a single update invalidates every later prefix.',
      'A segment tree stores the sum of each aligned range, so a point update and a prefix query are both O(log n).',
      'Because the array never shrinks, the tree size can be fixed at seed time.',
    ],
    approach: [
      'Build the tree once over the initial array.',
      'Write value to the leaf for index, then recompute the sums on the way back up.',
      'Walk down the tree, adding left-child sums while the range still lies right of index.',
    ],
    ex: [
      { input: 'nums = [1,3,5], index = 1, value = 2', output: '3', explanation: 'nums becomes [1,2,5] and the prefix to index 1 is 1 + 2 = 3.', args: [[1,3,5],1,2] },
      { input: 'nums = [-2,0,3], index = 2, value = -1', output: '-3', explanation: 'nums becomes [-2,0,-1] and the prefix up to index 2 is -2 + 0 + -1 = -3.', args: [[-2,0,3],2,-1] },
      { input: 'nums = [4], index = 0, value = 9', output: '9', explanation: 'The single element is replaced.', args: [[4],0,9] },
    ],
    cx: 'Time O(log n) per update-plus-query, Space O(n).',
    con: ['1 <= nums.length <= 1000', '0 <= index <= nums.length - 1', '-1000 <= nums[i], value <= 1000'],
    h: [
      'Every call performs an update FIRST, then the query.',
      'Recompute the ancestors after writing the leaf, or stale sums are queried.',
      'A Fenwick tree is shorter here; the segment tree is the general form.',
    ],
    sig: ['int', 'int[]', 'int', 'int'],
    fn: ['update', 'nums', 'index', 'value'],
    s: (args) => {
      const nums = (args[0] || []).slice(), index = args[1], value = args[2];
      const n = nums.length;
      let size = 1;
      while (size < n) size <<= 1;
      const tree = new Array(size * 2).fill(0);
      for (let i = 0; i < n; i++) tree[size + i] = nums[i];
      for (let i = size - 1; i >= 1; i--) tree[i] = tree[2 * i] + tree[2 * i + 1];
      tree[size + index] = value;
      for (let i = (size + index) >> 1; i >= 1; i >>= 1) tree[i] = tree[2 * i] + tree[2 * i + 1];
      // Standard iterative range sum over [size, size + index + 1), which is
      // exactly the prefix nums[0..index]. The earlier hand-rolled "walk up from
      // the leaf" version returned 0 for every input.
      let sum = 0;
      let l = size, r = size + index + 1;
      while (l < r) {
        if (l % 2 === 1) sum += tree[l++];
        if (r % 2 === 1) sum += tree[--r];
        l = Math.floor(l / 2);
        r = Math.floor(r / 2);
      }
      return sum;
    },
    t: autoTests(
      [
        pub([1,3,5],1,2),
        pub([-2,0,3],2,-1),
        pub([4],0,9),
        priv([1,2,3,4],0,10),
        priv([1,2,3,4],3,-5),
        priv([0,0,0,0,0],2,7),
      ],
      (r) => {
        const n = r.int(1, 10);
        const nums = r.nums(n, -20, 20);
        return [nums, r.int(0, n - 1), r.int(-20, 20)];
      },
      15,
      324,
    ),
  },
];

// Exported last: `const` is not hoisted-initialised.
export default bank(BANK_SEGMENT);
