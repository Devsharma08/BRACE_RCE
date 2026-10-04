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
    k: 'll-add-two-numbers',
    n: 'Add Two Numbers Representing Reversed Linked Lists',
    num: 260,
    d: 'MEDIUM',
    c: 'Linked List',
    intro: [
      'You are given two non-empty linked lists, where each node holds a single digit and the digits are stored in REVERSE order, so the head is the least significant digit.',
      'Return their sum as a new linked list in the same reverse order.',
    ],
    notes: [
      'This is ordinary column addition performed while walking both lists.',
      'Advance whichever list still has a node, adding with carry.',
      'Continue while either list has nodes or a carry remains.',
    ],
    approach: [
      'Keep a running sum and a carry.',
      'At each step add the current value from each list, defaulting to 0.',
      'Append the digit and continue until both lists end and carry is 0.',
    ],
    ex: [
      { input: 'l1 = [2,4,3], l2 = [5,6,4]', output: '[7,0,8]', explanation: '342 + 465 = 807.', args: [[2, 4, 3], [5, 6, 4]] },
      { input: 'l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]', output: '[8,9,9,9,0,0,0,1]', explanation: 'A long carry produces an extra digit.', args: [[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]] },
      { input: 'l1 = [0], l2 = [0]', output: '[0]', explanation: 'Zero plus zero.', args: [[0], [0]] },
      { input: 'l1 = [5], l2 = [5]', output: '[0,1]', explanation: '5 + 5 = 10, stored reversed.', args: [[5], [5]] },
    ],
    cx: 'Time O(max(m, n)), Space O(max(m, n)) for the result.',
    con: ['0 <= lists.length <= 50', 'Each node holds 0-9.', 'Lists contain at least one node.'],
    h: [
      'The digits are reversed, so no digit reversal is needed.',
      'Keep going while either list has a node OR the carry is set.',
      'A missing node contributes 0.',
    ],
    sig: ['int[]', 'int[]', 'int[]'],
    fn: ['addTwoNumbers', 'l1', 'l2'],
    s: (args) => {
      const a = args[0];
      const b = args[1];
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
    t: autoTests(
      [
        pub([2, 4, 3], [5, 6, 4]),
        pub([9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]),
        pub([0], [0]),
        pub([5], [5]),
        priv([1], [9]),
        priv([9, 9], [1]),
      ],
      (r) => {
        // Trailing 9s are what force an extra carry digit.
        const mk = () => {
          const n = r.int(1, 7);
          const out = [];
          for (let i = 0; i < n; i++) out.push(r.int(0, 9));
          if (r.next() < 0.3) for (let i = out.length - 1; i >= 0 && out[i] === 9; i--) out[i] = 9;
          return out;
        };
        return [mk(), mk()];
      },
      15,
      601,
    ),
  },
  {
    k: 'll-cycle-detection',
    n: 'Detect a Cycle in a Linked List',
    num: 261,
    d: 'EASY',
    c: 'Linked List',
    intro: [
      'Given the head of a linked list, return <code>true</code> if the list contains a cycle and <code>false</code> otherwise.',
      'The nodes are supplied as a value array plus the index at which the list closes into a cycle, or <code>-1</code> when it is acyclic.',
    ],
    notes: [
      'Floyd\'s tortoise and hare use two pointers moving at different speeds.',
      'If they ever meet there must be a cycle, since both start inside it.',
      'A simpler alternative is a visited set of node positions.',
    ],
    approach: [
      'Walk with a slow pointer (one step) and a fast pointer (two steps).',
      'If the pointers meet, a cycle exists.',
      'If the fast pointer reaches the end, the list is acyclic.',
    ],
    ex: [
      { input: 'values = [3,2,0,-4], cycleIndex = 1', output: 'true', explanation: 'The last node points back to index 1.', args: [[3, 2, 0, -4], 1] },
      { input: 'values = [1,2], cycleIndex = 0', output: 'true', explanation: 'A self-loop at the head.', args: [[1, 2], 0] },
      { input: 'values = [1], cycleIndex = -1', output: 'false', explanation: 'No cycle.', args: [[1], -1] },
      { input: 'values = [], cycleIndex = -1', output: 'false', explanation: 'An empty list has no cycle.', args: [[], -1] },
    ],
    cx: 'Time O(n), Space O(1) with Floyd, O(n) with a set.',
    con: ['0 <= values.length <= 1000', 'cycleIndex is -1 or a valid index.'],
    h: [
      'Two pointers at different speeds guarantee a meeting inside a cycle.',
      'Remember the empty-list case before touching the first node.',
      'A visited set is simpler and uses O(n) space.',
    ],
    sig: ['boolean', 'int[]', 'int'],
    fn: ['hasCycle', 'values', 'cycleIndex'],
    s: (args) => {
      const n = args[0].length;
      const idx = args[1];
      // A cycle exists exactly when the list is non-empty and closes.
      return n > 0 && idx >= 0;
    },
    t: autoTests(
      [
        pub([3, 2, 0, -4], 1),
        pub([1, 2], 0),
        pub([1], -1),
        pub([], -1),
        priv([1, 2, 3], 2),
        priv([5], -1),
      ],
      (r) => {
        const n = r.int(0, 8);
        const values = [];
        for (let i = 0; i < n; i++) values.push(r.int(1, 50));
        const idx = n === 0 || r.next() < 0.4 ? -1 : r.int(0, n - 1);
        return [values, idx];
      },
      15,
      602,
    ),
  },
  {
    k: 'll-palindrome-check',
    n: 'Palindrome Linked List',
    num: 262,
    d: 'MEDIUM',
    c: 'Linked List',
    intro: [
      'Given the head of a singly linked list, return <code>true</code> if the list is a palindrome and <code>false</code> otherwise.',
    ],
    notes: [
      'Reversing the second half in place lets you compare it against the first half.',
      'Finding the midpoint with slow and fast pointers is the first step.',
      'Odd and even lengths need slightly different midpoints.',
    ],
    approach: [
      'Find the middle with slow and fast pointers.',
      'Reverse the second half.',
      'Compare node by node; restore the list is not required.',
    ],
    ex: [
      { input: 'values = [1,2,2,1]', output: 'true', explanation: 'Reads the same forwards and backwards.', args: [[1, 2, 2, 1]] },
      { input: 'values = [1,2]', output: 'false', explanation: 'Two different values.', args: [[1, 2]] },
      { input: 'values = [1]', output: 'true', explanation: 'A single node is trivially a palindrome.', args: [[1]] },
      { input: 'values = []', output: 'true', explanation: 'An empty list is a palindrome.', args: [[]] },
    ],
    cx: 'Time O(n), Space O(1) with in-place reversal.',
    con: ['0 <= values.length <= 10000'],
    h: [
      'For odd lengths skip the middle node when comparing.',
      'Reversing a slice uses O(n) extra space; reversing in place does not.',
      'An empty list counts as a palindrome.',
    ],
    sig: ['boolean', 'int[]'],
    fn: ['isPalindrome', 'values'],
    s: (args) => {
      const a = args[0];
      // Compare from both ends, which is what a reversal would achieve.
      let lo = 0;
      let hi = a.length - 1;
      while (lo < hi) {
        if (a[lo] !== a[hi]) return false;
        lo++;
        hi--;
      }
      return true;
    },
    t: autoTests(
      [
        pub([1, 2, 2, 1]),
        pub([1, 2]),
        pub([1]),
        pub([]),
        priv([1, 2, 1]),
        priv([1, 1, 2]),
      ],
      (r) => {
        // Build real palindromes half the time.
        if (r.next() < 0.5) {
          const half = [];
          const n = r.int(0, 5);
          for (let i = 0; i < n; i++) half.push(r.int(1, 9));
          return [half.concat(half.slice().reverse())];
        }
        return [r.nums(r.int(0, 10), 1, 4)];
      },
      15,
      603,
    ),
  },
  {
    k: 'll-remove-nth-from-end',
    n: 'Remove Nth Node From the End',
    num: 263,
    d: 'MEDIUM',
    c: 'Linked List',
    intro: [
      'Given the head of a singly linked list and an integer <code>n</code>, remove the n-th node from the end of the list and return the head.',
      'You may assume <code>n</code> is always valid.',
    ],
    notes: [
      'Two pointers separated by n nodes reach the target simultaneously.',
      'The classic trick advances the fast pointer first, then moves both.',
      'A dummy head removes the need to special-case removing the first node.',
    ],
    approach: [
      'Move one pointer n steps ahead.',
      'Advance both pointers until the first reaches the end.',
      'The second pointer now sits just before the node to remove.',
    ],
    ex: [
      { input: 'values = [1,2,3,4,5], n = 2', output: '[1,2,3,5]', explanation: 'Removing the 4.', args: [[1, 2, 3, 4, 5], 2] },
      { input: 'values = [1], n = 1', output: '[]', explanation: 'Removing the only node.', args: [[1], 1] },
      { input: 'values = [1,2], n = 1', output: '[1]', explanation: 'Removing the last node.', args: [[1, 2], 1] },
      { input: 'values = [1,2], n = 2', output: '[2]', explanation: 'Removing the first node.', args: [[1, 2], 2] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= values.length <= 5000', '1 <= n <= values.length'],
    h: [
      'A dummy head avoids special-casing when the head itself is removed.',
      'Advance the fast pointer n steps BEFORE moving both.',
      'The slow pointer ends one node before the target.',
    ],
    sig: ['int[]', 'int[]', 'int'],
    fn: ['removeNth', 'values', 'n'],
    s: (args) => {
      const a = args[0];
      const n = args[1];
      // The n-th node from the end sits at index length - n (0-based). The old
      // guard `n >= length` wrongly rejected n === length, which removes the
      // first node and should leave the rest.
      const idx = a.length - n;
      if (idx < 0) return a.slice();
      return a.slice(0, idx).concat(a.slice(idx + 1));
    },
    t: autoTests(
      [
        pub([1, 2, 3, 4, 5], 2),
        pub([1], 1),
        pub([1, 2], 1),
        pub([1, 2], 2),
        priv([1, 2, 3], 3),
        priv([9, 8, 7], 1),
      ],
      (r) => {
        const n = r.int(1, 10);
        const values = [];
        for (let i = 0; i < n; i++) values.push(r.int(1, 99));
        return [values, r.int(1, n)];
      },
      15,
      604,
    ),
  },
  {
    k: 'll-odd-even-grouping',
    n: 'Odd and Even Position Grouping',
    num: 264,
    d: 'EASY',
    c: 'Linked List',
    intro: [
      'Given the head of a linked list, return a list with all the nodes at ODD indices first, followed by all the nodes at EVEN indices, where the head is position 1.',
    ],
    notes: [
      'Two tails, one for the odd group and one for the even group, avoid repeated traversal.',
      'Appending at the tail preserves the relative order within each group.',
      'Joining the groups at the end produces the result.',
    ],
    approach: [
      'Walk the list once, alternating between an odd tail and an even tail.',
      'Append each node to the appropriate tail.',
      'Link the even tail to the end of the odd group.',
    ],
    ex: [
      { input: 'values = [1,2,3,4,5]', output: '[1,3,5,2,4]', explanation: 'Odd positions then even positions.', args: [[1, 2, 3, 4, 5]] },
      { input: 'values = [2,1,3,5,6,4,7]', output: '[2,3,6,7,1,5,4]', explanation: 'Same rule on a longer list.', args: [[2, 1, 3, 5, 6, 4, 7]] },
      { input: 'values = []', output: '[]', explanation: 'Nothing to group.', args: [[]] },
      { input: 'values = [1]', output: '[1]', explanation: 'A single node stays put.', args: [[1]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['0 <= values.length <= 10000'],
    h: [
      'Positions are 1-based, so the head belongs to the ODD group.',
      'Track two tails rather than prepending, or order is lost.',
      'Remember to link the even tail to null.',
    ],
    sig: ['int[]', 'int[]'],
    fn: ['oddEvenGroup', 'values'],
    s: (args) => {
      const a = args[0];
      const odd = [];
      const even = [];
      // 1-based positions: index 0 is odd, index 1 is even.
      for (let i = 0; i < a.length; i++) {
        if (i % 2 === 0) odd.push(a[i]);
        else even.push(a[i]);
      }
      return odd.concat(even);
    },
    t: autoTests(
      [
        pub([1, 2, 3, 4, 5]),
        pub([2, 1, 3, 5, 6, 4, 7]),
        pub([]),
        pub([1]),
        priv([1, 2]),
        priv([8, 7, 6, 5]),
      ],
      (r) => [r.nums(r.int(0, 12), 1, 99)],
      15,
      605,
    ),
  },
]);
