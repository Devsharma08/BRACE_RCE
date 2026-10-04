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


const BANK_FENWICK: RawProblem[] = [
  {
    k: 'fnt-range-sum-query-immutable',
    n: 'Range Sum Query - Immutable',
    num: 323,
    d: 'EASY',
    c: 'Fenwick Tree',
    intro: [
      'Given an immutable array <code>nums</code> and an index <code>i</code>, return the sum of <code>nums[0..i]</code> inclusive.',
    ],
    notes: [
      'Nothing ever changes, so each prefix sum can be precomputed once in O(n) and then read off in O(1).',
      'A Fenwick tree reaches the same result while also supporting updates, at a slightly worse constant.',
      'The prefix array is shifted by one so prefix[0] can hold the empty sum without a bounds check.',
    ],
    approach: [
      'Build prefix where prefix[k] is the sum of the first k elements.',
      'Return prefix[i + 1].',
    ],
    ex: [
      { input: 'nums = [-2,0,3,-5,2,-1], i = 3', output: '-4', explanation: '-2 + 0 + 3 + -5 = -4.', args: [[-2,0,3,-5,2,-1],3] },
      { input: 'nums = [1], i = 0', output: '1', explanation: 'A single element is its own prefix.', args: [[1],0] },
      { input: 'nums = [5,-1,4], i = 0', output: '5', explanation: 'Only the first element is included.', args: [[5,-1,4],0] },
    ],
    cx: 'Time O(n) to build then O(1) per query, Space O(n).',
    con: ['1 <= nums.length <= 100', '-100 <= nums[i] <= 100', '0 <= i <= nums.length - 1'],
    h: [
      'prefix is offset by one: prefix[k] covers the first k elements.',
      'The array never changes, so build the table once rather than per query.',
      'i is already inclusive — do not subtract 1 twice.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['prefixSum', 'nums', 'i'],
    s: (args) => {
      const nums = args[0] || [], i = args[1];
      const prefix = [0];
      for (let k = 0; k < nums.length; k++) prefix.push(prefix[k] + nums[k]);
      return prefix[i + 1];
    },
    t: autoTests(
      [
        pub([-2,0,3,-5,2,-1],3),
        pub([1],0),
        pub([5,-1,4],0),
        priv([1,2,3,4,5],4),
        priv([-1,-2,-3],2),
        priv([100],0),
      ],
      (r) => {
        const n = r.int(1, 9);
        const nums = r.nums(n, -20, 20);
        return [nums, r.int(0, n - 1)];
      },
      15,
      323,
    ),
  },
];

// Exported last: `const` is not hoisted-initialised.
export default bank(BANK_FENWICK);
