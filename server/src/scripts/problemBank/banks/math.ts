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
    k: 'math-gcd',
    n: 'Greatest Common Divisor',
    num: 240,
    d: 'EASY',
    c: 'Math',
    intro: [
      'Given two positive integers <code>a</code> and <code>b</code>, return their greatest common divisor.',
    ],
    notes: [
      'The Euclidean algorithm replaces (a, b) with (b, a mod b) until b becomes zero.',
      'The last non-zero remainder is the GCD.',
      'Each step shrinks the larger number dramatically, giving logarithmic time.',
    ],
    approach: [
      'While b is non-zero, set (a, b) = (b, a mod b).',
      'Return the remaining a.',
    ],
    ex: [
      { input: 'a = 12, b = 18', output: '6', explanation: 'The largest number dividing both 12 and 18 is 6.', args: [12, 18] },
      { input: 'a = 5, b = 7', output: '1', explanation: 'Consecutive integers are coprime.', args: [5, 7] },
      { input: 'a = 9, b = 9', output: '9', explanation: 'The GCD of a number with itself is the number.', args: [9, 9] },
    ],
    cx: 'Time O(log(min(a, b))), Space O(1).',
    con: ['1 <= a, b <= 1000000000'],
    h: [
      'The modulo operator repeatedly reduces the problem size.',
      'The answer is whatever remains in a when b finally reaches zero.',
      'Order does not matter, so no normalisation is needed.',
    ],
    sig: ['int', 'int', 'int'],
    fn: ['gcd', 'a', 'b'],
    s: (args) => {
      let a = args[0];
      let b = args[1];
      while (b !== 0) {
        const t = b;
        b = a % b;
        a = t;
      }
      return a;
    },
    t: autoTests(
      [
        pub(12, 18),
        pub(5, 7),
        pub(9, 9),
        priv(1, 1),
        priv(100, 75),
        priv(17, 5),
      ],
      (r) => [r.int(1, 100000), r.int(1, 100000)],
      15,
      601,
    ),
  },
  {
    k: 'math-power',
    n: 'Power with Integer Exponent',
    num: 241,
    d: 'MEDIUM',
    c: 'Math',
    intro: [
      'Given two integers <code>a</code> and <code>b</code>, compute <code>a</code> raised to the power of <code>b</code>.',
      'The exponent may be negative, in which case the result is a reciprocal.',
      'Results that are not integers must be truncated toward zero when returned as an integer.',
    ],
    notes: [
      'Repeated multiplication takes O(b) time, which is far too slow for large b.',
      'Exponentiation by squaring halves the exponent at every step, giving O(log b).',
      'If b is even, a^b = (a^(b/2))^2; if b is odd, a^b = a * (a^(b/2))^2.',
    ],
    approach: [
      'Halve the exponent repeatedly, squaring the accumulated base.',
      'Multiply in the base whenever an exponent bit is set.',
      'Handle a negative exponent by inverting at the end.',
    ],
    ex: [
      { input: 'a = 2, b = 10', output: '1024', explanation: '2^10 = 1024.', args: [2, 10] },
      { input: 'a = 3, b = -2', output: '0', explanation: '3^-2 = 1/9 truncates to 0.', args: [3, -2] },
      { input: 'a = 5, b = 0', output: '1', explanation: 'Any non-zero number to the zeroth power is 1.', args: [5, 0] },
    ],
    cx: 'Time O(log |b|), Space O(1).',
    con: ['-10 <= a <= 10', '-20 <= b <= 20', 'The result always fits in a 32-bit integer.'],
    h: [
      'Halving the exponent is what turns a linear loop into a logarithmic one.',
      'Squaring the base each round keeps the magnitude correct.',
      'A negative exponent means a reciprocal, which usually truncates to 0.',
    ],
    sig: ['int', 'int', 'int'],
    fn: ['power', 'a', 'b'],
    s: (args) => {
      const a = args[0];
      const b = args[1];
      if (a === 0 && b < 0) return 0;
      let exp = b;
      let neg = false;
      if (exp < 0) {
        neg = true;
        exp = -exp;
      }
      let result = 1;
      let base = a;
      while (exp > 0) {
        if (exp % 2 === 1) result *= base;
        base *= base;
        exp = Math.floor(exp / 2);
      }
      if (neg) {
        // Only an exact reciprocal of 1 survives truncation to an integer.
        return result === 1 ? 1 : 0;
      }
      return result;
    },
    t: autoTests(
      [
        pub(2, 10),
        pub(3, -2),
        pub(5, 0),
        priv(1, 100),
        priv(-2, 4),
        priv(1, 0),
      ],
      (r) => [r.int(-4, 4), r.int(-8, 8)],
      15,
      602,
    ),
  },
  {
    k: 'math-prime-count',
    n: 'Count Primes in a Range',
    num: 242,
    d: 'MEDIUM',
    c: 'Math',
    intro: [
      'Given two integers <code>left</code> and <code>right</code>, return the number of prime numbers in the inclusive range <code>[left, right]</code>.',
    ],
    notes: [
      'Trial division up to sqrt(n) per number is too slow for a wide range.',
      'The Sieve of Eratosthenes marks multiples of each prime as composite once.',
      'Only primes up to sqrt(right) can be sieving primes, so stop there.',
    ],
    approach: [
      'Sieve every number up to right, crossing out multiples of each prime.',
      'Count the primes that are still unmarked and fall inside the range.',
    ],
    ex: [
      { input: 'left = 10, right = 20', output: '4', explanation: 'The primes are 11, 13, 17 and 19.', args: [10, 20] },
      { input: 'left = 1, right = 10', output: '4', explanation: 'The primes are 2, 3, 5 and 7.', args: [1, 10] },
    ],
    cx: 'Time O(right log log right), Space O(right).',
    con: ['1 <= left <= right <= 1000000'],
    h: [
      '0 and 1 are not prime.',
      'Start crossing out from p*p, since smaller multiples are already handled.',
      'Sieve only up to sqrt(right) for the marking phase.',
    ],
    sig: ['int', 'int', 'int'],
    fn: ['countPrimes', 'left', 'right'],
    s: (args) => {
      const left = args[0];
      const right = args[1];
      const sieve = new Array(right + 1).fill(true);
      sieve[0] = false;
      if (right >= 1) sieve[1] = false;
      let p = 2;
      while (p * p <= right) {
        if (sieve[p]) {
          let m = p * p;
          while (m <= right) {
            sieve[m] = false;
            m += p;
          }
        }
        p++;
      }
      let count = 0;
      for (let i = left; i <= right; i++) if (sieve[i]) count++;
      return count;
    },
    t: autoTests(
      [
        pub(10, 20),
        pub(1, 10),
        priv(1, 2),
        priv(2, 2),
        priv(1, 3),
        priv(4, 4),
      ],
      (r) => {
        const left = r.int(1, 60);
        return [left, left + r.int(0, 60)];
      },
      15,
      603,
    ),
  },
  {
    k: 'math-trailing-zeros',
    n: 'Trailing Zeros in Factorial',
    num: 243,
    d: 'EASY',
    c: 'Math',
    intro: [
      'Given an integer <code>n</code>, return the number of trailing zeros in <code>n!</code> (the factorial of n).',
    ],
    notes: [
      'A trailing zero comes from a factor of 10 = 2 x 5.',
      'Factors of 2 are plentiful, so the count of 5s is what limits the zeros.',
      'Count multiples of 5, then multiples of 25, then 125, and so on.',
    ],
    approach: [
      'Repeatedly divide n by 5 and accumulate the quotients.',
      'The accumulated total is the number of trailing zeros.',
    ],
    ex: [
      { input: 'n = 3', output: '0', explanation: '3! = 6 has no trailing zeros.', args: [3] },
      { input: 'n = 5', output: '1', explanation: '5! = 120 ends in one zero.', args: [5] },
      { input: 'n = 25', output: '6', explanation: 'There are six factors of 5 in 25!.', args: [25] },
    ],
    cx: 'Time O(log_5 n), Space O(1).',
    con: ['0 <= n <= 10000'],
    h: [
      'You never need to compute the factorial itself.',
      'Multiples of 25 contribute a second factor of 5, so keep dividing.',
      'Factors of 2 never run out, so only count 5s.',
    ],
    sig: ['int', 'int'],
    fn: ['trailingZeros', 'n'],
    s: (args) => {
      let n = args[0];
      let zeros = 0;
      while (n > 0) {
        n = Math.floor(n / 5);
        zeros += n;
      }
      return zeros;
    },
    t: autoTests(
      [
        pub(3),
        pub(5),
        pub(25),
        priv(0),
        priv(1),
        priv(100),
      ],
      (r) => [r.int(0, 5000)],
      15,
      604,
    ),
  },
  {
    k: 'math-reverse-number',
    n: 'Reverse Digits of a Number',
    num: 244,
    d: 'EASY',
    c: 'Math',
    intro: [
      'Given a signed 32-bit integer <code>x</code>, return its digits reversed. If reversing causes the value to go outside the signed 32-bit range, return 0.',
    ],
    notes: [
      'Arithmetic reversal keeps working with numbers rather than strings.',
      'Track the sign and restore it at the end.',
      'Repeatedly dividing by 10 shifts one digit off the front.',
    ],
    approach: [
      'Remember the sign, then take the absolute value.',
      'Build the reversed number one digit at a time using remainder and floor division.',
      'Restore the sign and clamp out-of-range results to 0.',
    ],
    ex: [
      { input: 'x = 123', output: '321', explanation: 'The digits are reversed.', args: [123] },
      { input: 'x = -123', output: '-321', explanation: 'The sign is preserved.', args: [-123] },
      { input: 'x = 120', output: '21', explanation: 'Trailing zeros vanish when reversed.', args: [120] },
      { input: 'x = 1534236469', output: '0', explanation: 'The reversal overflows a 32-bit integer.', args: [1534236469] },
    ],
    cx: 'Time O(log |x|), Space O(1).',
    con: ['-2147483648 <= x <= 2147483647'],
    h: [
      'x % 10 gives the last digit and Math.floor(x / 10) removes it.',
      'Watch the negative range: -2147483648 has no positive counterpart.',
      'A reversed value beyond 32 bits must return 0.',
    ],
    sig: ['int', 'int'],
    fn: ['reverseInteger', 'x'],
    s: (args) => {
      const x = args[0];
      const sign = x < 0 ? -1 : 1;
      let rest = Math.abs(x);
      let rev = 0;
      while (rest > 0) {
        rev = rev * 10 + (rest % 10);
        rest = Math.floor(rest / 10);
      }
      const out = sign * rev;
      if (out > 2147483647 || out < -2147483648) return 0;
      return out;
    },
    t: autoTests(
      [
        pub(123),
        pub(-123),
        pub(120),
        pub(1534236469),
        priv(0),
        priv(-100),
      ],
      (r) => [r.int(-99999999, 99999999)],
      15,
      605,
    ),
  },
  {
    k: 'math-base-conversion',
    n: 'Convert Integer to Base',
    num: 245,
    d: 'MEDIUM',
    c: 'Math',
    intro: [
      'Given a non-negative integer <code>n</code> and a base <code>b</code> between 2 and 36, return its representation in base <code>b</code> as a string.',
      'Digits above 9 use uppercase letters, so 10 is represented as A, 11 as B, and so on.',
    ],
    notes: [
      'Repeatedly dividing by the base yields the digits from least to most significant.',
      'Those digits must then be reversed to read correctly.',
      'Zero is a special case that produces a single 0 digit.',
    ],
    approach: [
      'Take n mod b for the next digit.',
      'Replace n with floor(n / b) and continue until n is zero.',
      'Map each digit to its character and reverse the collected list.',
    ],
    ex: [
      { input: 'n = 255, b = 16', output: '"FF"', explanation: '255 is FF in hexadecimal.', args: [255, 16] },
      { input: 'n = 5, b = 2', output: '"101"', explanation: '5 is 101 in binary.', args: [5, 2] },
      { input: 'n = 0, b = 2', output: '"0"', explanation: 'Zero is a single digit.', args: [0, 2] },
    ],
    cx: 'Time O(log_b n), Space O(log_b n).',
    con: ['0 <= n <= 1000000000', '2 <= b <= 36'],
    h: [
      'Collect digits least-significant first, then reverse.',
      'Digits 10 and above become A..Z.',
      'Handle n = 0 before entering the loop.',
    ],
    sig: ['string', 'int', 'int'],
    fn: ['toBase', 'n', 'b'],
    s: (args) => {
      const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let n = args[0];
      const b = args[1];
      if (n === 0) return '0';
      let out = '';
      while (n > 0) {
        out = digits[n % b] + out;
        n = Math.floor(n / b);
      }
      return out;
    },
    t: autoTests(
      [
        pub(255, 16),
        pub(5, 2),
        pub(0, 2),
        priv(35, 36),
        priv(100, 10),
        priv(1, 2),
      ],
      (r) => [r.int(0, 1000000), r.int(2, 16)],
      15,
      606,
    ),
  },
  {
    k: 'math-missing-sum',
    n: 'Missing Number from a Sum Range',
    num: 246,
    d: 'EASY',
    c: 'Math',
    intro: [
      'Given an array <code>nums</code> containing every integer from <code>1</code> to <code>n</code> exactly once except for one value, return that missing value.',
      'Here <code>n</code> is always <code>nums.length + 1</code>, so the array always has exactly one value absent from its own range.',
    ],
    notes: [
      'The arithmetic series formula n(n+1)/2 gives the total of the full range in O(1).',
      'Subtracting the actual sum of the array leaves exactly the missing value.',
      'No searching or sorting is needed.',
    ],
    approach: [
      'Let n = nums.length + 1, the size of the complete range.',
      'Compute the expected total n * (n + 1) / 2.',
      'Subtract the sum of the array to isolate the missing value.',
    ],
    ex: [
      { input: 'nums = [1,2,4]', output: '3', explanation: 'n = 4, so the range 1..4 is missing 3.', args: [[1, 2, 4]] },
      { input: 'nums = [2,3]', output: '1', explanation: 'n = 3, so the range 1..3 is missing 1.', args: [[2, 3]] },
      { input: 'nums = [1]', output: '2', explanation: 'n = 2, so the range 1..2 is missing 2.', args: [[1]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: ['1 <= nums.length <= 1000', '1 <= nums[i] <= 1001'],
    h: [
      'The range always has one more element than the array, so n = nums.length + 1.',
      'The total of 1..n is n * (n + 1) / 2.',
      'One pass over the array is enough.',
    ],
    sig: ['int', 'int[]'],
    fn: ['missingFromSum', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length + 1;
      let expected = (n * (n + 1)) / 2;
      for (const v of nums) expected -= v;
      return expected;
    },
    t: autoTests(
      [
        pub([1, 2, 4]),
        pub([2, 3]),
        pub([1]),
        priv([3, 4]),
        priv([1, 2, 3, 4]),
        priv([5]),
      ],
      (r) => {
        const n = r.int(2, 11);
        const all = [];
        for (let i = 1; i <= n; i++) all.push(i);
        all.splice(r.int(0, n - 1), 1);
        for (let i = all.length - 1; i > 0; i--) {
          const j = r.int(0, i);
          const tmp = all[i];
          all[i] = all[j];
          all[j] = tmp;
        }
        return [all];
      },
      15,
      607,
    ),
  },
  {
    k: 'math-modular-exponent',
    n: 'Modular Exponentiation',
    num: 247,
    d: 'MEDIUM',
    c: 'Math',
    intro: [
      'Given three integers <code>base</code>, <code>exp</code> and <code>mod</code>, compute <code>base</code> raised to <code>exp</code> modulo <code>mod</code>.',
    ],
    notes: [
      'The naive power can overflow, so reduce modulo at every multiplication.',
      'Exponentiation by squaring still applies, now working entirely in the modular ring.',
      'Reducing intermediate results keeps every value bounded by mod.',
    ],
    approach: [
      'Reduce the base modulo mod first.',
      'Square and accumulate while halving the exponent.',
      'Take the modulus of every product.',
    ],
    ex: [
      { input: 'base = 2, exp = 10, mod = 1000', output: '24', explanation: '1024 mod 1000 = 24.', args: [2, 10, 1000] },
      { input: 'base = 3, exp = 5, mod = 11', output: '1', explanation: '243 mod 11 = 1.', args: [3, 5, 11] },
      { input: 'base = 7, exp = 0, mod = 5', output: '1', explanation: 'Any non-zero base to the zeroth power is 1.', args: [7, 0, 5] },
    ],
    cx: 'Time O(log exp), Space O(1).',
    con: ['1 <= mod <= 1000000007', '0 <= exp <= 1000000000', '0 <= base <= 1000000000'],
    h: [
      'Take the modulus after every multiplication to stay in range.',
      'The halving loop is the same as for plain exponentiation.',
      'An exponent of zero yields 1 for any non-zero base.',
    ],
    sig: ['int', 'int', 'int', 'int'],
    fn: ['modPow', 'base', 'exp', 'mod'],
    s: (args) => {
      let base = args[0];
      let exp = args[1];
      const mod = args[2];
      if (mod === 1) return 0;
      base = base % mod;
      let result = 1;
      while (exp > 0) {
        if (exp % 2 === 1) result = (result * base) % mod;
        base = (base * base) % mod;
        exp = Math.floor(exp / 2);
      }
      return result;
    },
    t: autoTests(
      [
        pub(2, 10, 1000),
        pub(3, 5, 11),
        pub(7, 0, 5),
        priv(2, 100, 13),
        priv(0, 5, 7),
        priv(5, 1, 3),
      ],
      (r) => [r.int(0, 30), r.int(0, 30), r.int(2, 1000)],
      15,
      608,
    ),
  },
]);
