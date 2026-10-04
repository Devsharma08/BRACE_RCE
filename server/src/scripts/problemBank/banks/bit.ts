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
    k: 'bit-counting-bits',
    n: 'Number of Set Bits',
    num: 305,
    d: 'EASY',
    c: 'Bit Manipulation',
    intro: [
      'Given a non-negative integer n, return the number of 1 bits in its binary representation.',
    ],
    notes: [
      'Brian Kernighan algorithm repeatedly clears the lowest set bit with n & (n - 1).',
      'Each such operation removes exactly one 1 bit, so counting iterations counts the 1s.',
    ],
    approach: [
      'While n is non-zero, apply n = n & (n - 1).',
      'Count how many times that can be done.',
      'Zero has no set bits, so the loop never runs.',
    ],
    ex: [
      { input: 'n = 11', output: '3', explanation: '1011 in binary has three 1 bits.', args: [11] },
      { input: 'n = 128', output: '1', explanation: '10000000 has one 1 bit.', args: [128] },
      { input: 'n = 0', output: '0', explanation: 'Zero has no set bits.', args: [0] },
      { input: 'n = 4294967295', output: '32', explanation: 'Thirty-two 1 bits.', args: [4294967295] },
    ],
    cx: 'Time O(number of set bits), Space O(1).',
    con: [
      '0 <= n <= 2^32 - 1',
    ],
    h: [
      'n & (n - 1) clears the lowest set bit.',
      'Loop until n becomes 0.',
      'Popcount counts the 1 bits, not the bit length.',
    ],
    sig: ['int', 'int'],
    fn: ['countSetBits', 'n'],
    s: (args) => {
      const n = args[0];
      let value = n;
      let count = 0;
      while (value !== 0) {
        // Subtracting 1 flips the lowest 1 to 0 and the zeros below it to 1, so the
        // AND clears exactly one set bit.
        value = value & (value - 1);
        count++;
      }
      return count;
    },
    t: autoTests(
      [
        pub(11),
        pub(128),
        pub(0),
        pub(4294967295),
        priv(1),
        priv(255),
      ],
      (r) => [r.int(0, 1000000)],
      15,
      305,
    ),
  },
  {
    k: 'bit-reverse-integer',
    n: 'Reverse Integer Bits',
    num: 306,
    d: 'EASY',
    c: 'Bit Manipulation',
    intro: [
      'Given a non-negative integer n, reverse the binary digits of n and return the result.',
      'Leading zeros of the original number are dropped, and leading zeros created by the reversal are ignored.',
    ],
    notes: [
      'Shifting the accumulator left and OR-ing in the low bit walks the bits in reverse order.',
      'Stop when n becomes 0, since the remaining bits are all zeros and cannot change the value.'],
    approach: [
      'Repeatedly take the lowest bit of n.',
      'Shift the accumulator left by one and add that bit.',
      'Shift n right by one and continue until n is 0.',
      'Because n is non-negative, a plain right shift always makes progress.'],
    ex: [
      { input: 'n = 12', output: '3', explanation: '1100 reversed is 0011, which is 3.', args: [12] },
      { input: 'n = 7', output: '7', explanation: '111 reversed is still 111.', args: [7] },
      { input: 'n = 0', output: '0', explanation: 'Zero reverses to zero.', args: [0] },
      { input: 'n = 6', output: '3', explanation: '110 reversed is 011, which is 3.', args: [6] },
      { input: 'n = 1', output: '1', explanation: 'A single bit is unchanged.', args: [1] },
    ],
    cx: 'Time O(log n), Space O(1).',
    con: [
      '0 <= n <= 2^31 - 1',
    ],
    h: [
      'Use n & 1 to grab the lowest bit.',
      'Left-shift the accumulator before adding each bit.',
      'Stop as soon as n reaches 0.',
      'The input is non-negative, so the right shift always terminates.',
    ],
    sig: ['int', 'int'],
    fn: ['reverseBits', 'n'],
    s: (args) => {
      const n = args[0];
      let value = n;
      let result = 0;
      while (value !== 0) {
        // Pull the lowest bit off and append it to the front of the result.
        result = (result << 1) | (value & 1);
        // Non-negative input guarantees this shift makes progress.
        value = value >> 1;
      }
      return result;
    },
    t: autoTests(
      [
        pub(12),
        pub(7),
        pub(0),
        pub(6),
        pub(1),
        priv(255),
      ],
      // Non-negative only: a negative value would make the shift loop forever.
      (r) => [r.int(0, 100000)],
      15,
      306,
    ),
  },
  {
    k: 'bit-single-number',
    n: 'Single Number XOR',
    num: 307,
    d: 'EASY',
    c: 'Bit Manipulation',
    intro: [
      'Given a non-empty array nums where every element appears twice except one, return that single element.',
      'The array may contain negative values.',
    ],
    notes: [
      'a XOR a is 0 and a XOR 0 is a, so duplicated values cancel out completely.',
      'XOR-ing the whole array therefore leaves only the unpaired element.',
      'The operation is associative and commutative, so order does not matter.',
    ],
    approach: [
      'Fold the array with a single XOR accumulator starting at 0.',
      'Every duplicated pair cancels.',
      'Return the accumulator.',
    ],
    ex: [
      { input: 'nums = [4,1,2,1,2]', output: '4', explanation: 'The pairs cancel, leaving 4.', args: [[4,1,2,1,2]] },
      { input: 'nums = [1]', output: '1', explanation: 'A single element is its own answer.', args: [[1]] },
      { input: 'nums = [0,1]', output: '1', explanation: 'Zero cancels out.', args: [[0,1]] },
      { input: 'nums = [-3,-3,7]', output: '7', explanation: 'The negative pair also cancels.', args: [[-3,-3,7]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: [
      '1 <= nums.length <= 30000',
      '-3 * 10^4 <= nums[i] <= 3 * 10^4',
      'Every element appears exactly twice except one.',
    ],
    h: [
      'XOR cancels equal values: x ^ x == 0.',
      'XOR with 0 is the identity.',
      'Order does not matter because XOR is associative and commutative.',
      'No extra data structure is needed.',
    ],
    sig: ['int', 'int[]'],
    fn: ['singleNumber', 'nums'],
    s: (args) => {
      const nums = args[0];
      let acc = 0;
      for (const x of nums) {
        // Every duplicate XORs itself to 0, so only the unpaired value survives.
        acc = acc ^ x;
      }
      return acc;
    },
    t: autoTests(
      [
        pub([4,1,2,1,2]),
        pub([1]),
        pub([0,1]),
        pub([-3,-3,7]),
        priv([5,7,5]),
        priv([2,2,2,2,9]),
      ],
      (r) => {
        // Build a list of duplicated pairs plus exactly one unpaired value.
        const pairs = r.int(0, 6);
        const nums = [];
        const pool = r.nums(pairs * 2 + 1, -9, 9);
        const lone = pool[pairs * 2];
        for (let i = 0; i < pool.length; i++) {
          if (i === pairs * 2) continue;
          nums.push(pool[i], pool[i]);
        }
        nums.push(lone);
        // Shuffle so the odd value is not always last.
        for (let i = nums.length - 1; i > 0; i--) {
          const j = r.int(0, i);
          const t = nums[i];
          nums[i] = nums[j];
          nums[j] = t;
        }
        return [nums];
      },
      15,
      307,
    ),
  },
  {
    k: 'bit-power-of-two',
    n: 'Power of Two Check',
    num: 308,
    d: 'EASY',
    c: 'Bit Manipulation',
    intro: [
      'Given an integer n, return true if it is a power of two, otherwise false.',
      'Zero and negative numbers are never powers of two.',
    ],
    notes: [
      'A positive power of two has exactly one 1 bit, so n & (n - 1) is 0.',
      'For any positive number with more than one bit set, that AND leaves at least one bit behind.',
      'The positivity check is required because -4 also satisfies n & (n - 1) == 0.',
    ],
    approach: [
      'Reject n if it is zero or negative.',
      'Apply n & (n - 1) to clear the lowest set bit.',
      'Exactly one bit was set if and only if the result is 0.',
    ],
    ex: [
      { input: 'n = 1', output: 'true', explanation: 'Two to the power zero.', args: [1] },
      { input: 'n = 16', output: 'true', explanation: 'Two to the power four.', args: [16] },
      { input: 'n = 3', output: 'false', explanation: '11 in binary has two 1 bits.', args: [3] },
      { input: 'n = 0', output: 'false', explanation: 'Zero is not a power of two.', args: [0] },
      { input: 'n = -16', output: 'false', explanation: 'Negative numbers never qualify.', args: [-16] },
    ],
    cx: 'Time O(1), Space O(1).',
    con: [
      '-2^31 <= n <= 2^31 - 1',
    ],
    h: [
      'One set bit means exactly one bit was removed.',
      'Check n > 0 first, since negatives pass the bit trick.',
      'One itself is a power of two.',
      'The result is a boolean, not a number.',
    ],
    sig: ['bool', 'int'],
    fn: ['isPowerOfTwo', 'n'],
    s: (args) => {
      const n = args[0];
      // Negatives and zero must be rejected before the bit test, since -4 also
      // satisfies (n & (n - 1)) === 0.
      if (n <= 0) return false;
      return (n & (n - 1)) === 0;
    },
    t: autoTests(
      [
        pub(1),
        pub(16),
        pub(3),
        pub(0),
        pub(-16),
        priv(1024),
      ],
      (r) => [r.int(-1000, 1000)],
      15,
      308,
    ),
  },
  {
    k: 'bit-count-difference',
    n: 'Bit Difference of Two Numbers',
    num: 309,
    d: 'MEDIUM',
    c: 'Bit Manipulation',
    intro: [
      'Given two integers a and b, return the number of positions where their binary representations differ.',
    ],
    notes: [
      'XOR sets a bit exactly where the two inputs differ.',
      'So the answer is the number of set bits in a ^ b.',
    ],
    approach: [
      'XOR the two numbers.',
      'Count the 1 bits in the result.',
    ],
    ex: [
      { input: 'a = 1, b = 2', output: '2', explanation: '001 vs 010 differ in two positions.', args: [1, 2] },
      { input: 'a = 5, b = 7', output: '1', explanation: '101 vs 111 differ only in the middle bit.', args: [5, 7] },
      { input: 'a = 0, b = 0', output: '0', explanation: 'Identical numbers differ nowhere.', args: [0, 0] },
      { input: 'a = 7, b = 0', output: '3', explanation: '111 vs 000 differ in three positions.', args: [7, 0] },
      { input: 'a = -1, b = 0', output: '32', explanation: 'All thirty-two bits differ.', args: [-1, 0] },
    ],
    cx: 'Time O(1), Space O(1).',
    con: [
      '-2^31 <= a, b <= 2^31 - 1',
    ],
    h: [
      'XOR marks the differing positions.',
      'Counting the set bits of the XOR gives the answer.',
      'Negative inputs work because the arithmetic uses all 32 bits.',
      'Equal inputs give 0.',
    ],
    sig: ['int', 'int', 'int'],
    fn: ['bitDiff', 'a', 'b'],
    s: (args) => {
      const a = args[0];
      const b = args[1];
      // Each differing bit becomes a 1 in the XOR.
      let diff = (a ^ b) >>> 0;
      let count = 0;
      while (diff !== 0) {
        // Clearing one set bit per iteration counts them.
        diff = diff & (diff - 1);
        count++;
      }
      return count;
    },
    t: autoTests(
      [
        pub(1, 2),
        pub(5, 7),
        pub(0, 0),
        pub(7, 0),
        pub(-1, 0),
        priv(10, 5),
      ],
      (r) => [r.int(-500, 500), r.int(-500, 500)],
      15,
      309,
    ),
  },
]);
