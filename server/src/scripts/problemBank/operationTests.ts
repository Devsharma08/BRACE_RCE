/**
 * Test-case generators for the operation-sequence problems.
 *
 * These problems take a scripted call sequence as input, not JSON arguments,
 * so they bypass `expand_test_cases.ts` entirely. Each generator returns the
 * raw script text; the expected output is computed by running the reference
 * through the real pipeline on Piston (see expand_operation_test_cases.ts).
 *
 * Generators aim for a mix: empty/single operations to pin edge behaviour,
 * over-capacity and wrap-around for the bounded structures, and random
 * sequences for the general case.
 */

export type OpGen = (r: import('./helpers.js').Rng) => string;

export interface OperationTestSpec {
  number: number;
  /** Build one input script. */
  gen: OpGen;
}

const seq = (calls: string[]): string => calls.join(',');

export const OPERATION_TESTS: OperationTestSpec[] = [
  {
    number: 101,
    gen: (r) => {
      const ops = [];
      const n = r.int(0, 14);
      for (let i = 0; i < n; i++) {
        const roll = r.int(0, 3);
        if (roll === 0) ops.push(`push(${r.int(1, 50)})`);
        else if (roll === 1) ops.push('peek()');
        else if (roll === 2) ops.push('pop()');
        else ops.push('empty()');
      }
      // Finish on empty() so every case reports the final emptiness.
      ops.push('empty()');
      return seq(ops);
    },
  },
  {
    number: 109,
    gen: (r) => {
      const ops = [];
      const n = r.int(1, 5);
      for (let i = 0; i < n; i++) {
        const key = String.fromCharCode(97 + r.int(0, 3));
        const roll = r.int(0, 2);
        if (roll === 0) {
          // Short durations so a later wait() can expire the entry.
          ops.push(`set('${key}',${r.int(1, 99)},${r.int(5, 40)})`);
        } else if (roll === 1) {
          ops.push(`get('${key}')`);
        } else {
          ops.push('count()');
        }
      }
      // Always finish with a wait long enough to expire everything.
      ops.push('wait(120)');
      ops.push('count()');
      return seq(ops);
    },
  },
  {
    number: 124,
    gen: (r) => {
      const ops = [];
      const n = r.int(1, 12);
      for (let i = 0; i < n; i++) {
        if (r.next() < 0.6 || i === n - 1) ops.push(`findMedian()`);
        else ops.push(`addNum(${r.int(1, 99)})`);
      }
      // findMedian before any addNum is undefined, which prints nothing; start
      // with an addNum so every case has a defined median.
      return seq([ops[0].startsWith('findMedian') ? `addNum(${r.int(1, 99)})` : ops[0], ...ops.slice(1)]);
    },
  },
  {
    number: 132,
    gen: (r) => {
      const ops = [];
      const n = r.int(3, 12);
      let tweet = 1;
      for (let i = 0; i < n; i++) {
        const roll = r.int(0, 3);
        if (roll === 0) ops.push(`postTweet(${r.int(1, 3)},${tweet++})`);
        else if (roll === 1) {
          const a = r.int(1, 3);
          let b = r.int(1, 3);
          // follow(u, u) is defined as a no-op, so allow it deliberately.
          ops.push(`follow(${a},${b})`);
        } else if (roll === 2) ops.push(`unfollow(${r.int(1, 3)},${r.int(1, 3)})`);
        else ops.push(`getNewsFeed(${r.int(1, 3)})`);
      }
      ops.push('getNewsFeed(1)');
      return seq(ops);
    },
  },
  {
    number: 150,
    gen: (r) => {
      // A small capacity makes the full/empty branches actually exercised.
      const k = r.int(1, 4);
      const ops = [`MyCircularQueue(${k})`];
      const n = r.int(1, 10);
      let value = 1;
      for (let i = 0; i < n; i++) {
        const roll = r.int(0, 3);
        if (roll === 0) ops.push(`enQueue(${value++})`);
        else if (roll === 1) ops.push('deQueue()');
        else if (roll === 2) ops.push('Front()');
        else ops.push('Rear()');
      }
      ops.push('isFull()', 'isEmpty()');
      return ops.join('\n');
    },
  },
  {
    number: 160,
    gen: (r) => {
      const k = r.int(1, 4);
      const initial = [];
      for (let i = 0; i < r.int(0, 5); i++) initial.push(r.int(1, 50));
      const ops = [`KthLargest(${k},[${initial.join(',')}])`];
      const n = r.int(1, 8);
      for (let i = 0; i < n; i++) ops.push(`add(${r.int(1, 50)})`);
      return ops.join('\n');
    },
  },
  {
    number: 163,
    gen: (r) => {
      const ops = [];
      const n = r.int(1, 14);
      for (let i = 0; i < n; i++) {
        const roll = r.int(0, 3);
        if (roll === 0) ops.push(`push(${r.int(1, 50)})`);
        else if (roll === 1) ops.push('pop()');
        else if (roll === 2) ops.push('top()');
        else ops.push('peekMax()');
      }
      // Only call popMax on a stack known to be non-empty.
      ops.push('push(99)', 'popMax()');
      return seq(ops);
    },
  },
];
