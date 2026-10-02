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
    k: 'hp-kth-largest',
    n: 'Kth Largest Element',
    num: 270,
    d: 'MEDIUM',
    c: 'Heap',
    intro: [
      'Given an integer array <code>nums</code> and an integer <code>k</code>, return the k-th largest element of the array, counting duplicates as separate positions.',
      'It is the k-th element in sorted order, not the k-th distinct value.',
    ],
    notes: [
      'Sorting is O(n log n) and entirely acceptable for most inputs.',
      'A size-k min-heap gives O(n log k) and is the approach to use for huge arrays.',
      'Either way, duplicates must each occupy a position.',
    ],
    approach: [
      'Sort a copy of the array in descending order.',
      'Return the element at index k - 1.',
      'Sorting a copy avoids mutating the caller\u2019s array.',
    ],
    ex: [
      { input: 'nums = [3,2,1,5,6,4], k = 2', output: '5', explanation: 'Descending order is 6,5,4,3,2,1.', args: [[3, 2, 1, 5, 6, 4], 2] },
      { input: 'nums = [3,2,3,1,2,4,5,5,6], k = 4', output: '4', explanation: 'Descending: 6,5,5,4,3,3,2,2,1.', args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4] },
      { input: 'nums = [1], k = 1', output: '1', explanation: 'A single element.', args: [[1], 1] },
      { input: 'nums = [7,7,7], k = 2', output: '7', explanation: 'Duplicates each count as a position.', args: [[7, 7, 7], 2] },
    ],
    cx: 'Time O(n log n), Space O(n) for the sorted copy.',
    con: ['1 <= k <= nums.length <= 100000', '-10000 <= nums[i] <= 10000'],
    h: [
      'k is 1-based, so the answer is at index k - 1.',
      'Duplicates count as separate positions.',
      'Sort a copy unless mutation is explicitly allowed.',
    ],
    sig: ['int', 'int[]', 'int'],
    fn: ['kthLargest', 'nums', 'k'],
    s: (args) => {
      const nums = args[0];
      const k = args[1];
      const sorted = nums.slice().sort((a, b) => b - a);
      return sorted[k - 1];
    },
    t: autoTests(
      [
        pub([3, 2, 1, 5, 6, 4], 2),
        pub([3, 2, 3, 1, 2, 4, 5, 5, 6], 4),
        pub([1], 1),
        pub([7, 7, 7], 2),
        priv([2, 1], 1),
        priv([3, 1, 4, 1, 5], 3),
      ],
      (r) => {
        const n = r.int(1, 12);
        // A small range produces ties, which the k-th position rule must keep.
        const nums = r.nums(n, 1, 8);
        return [nums, r.int(1, n)];
      },
      13,
      801,
    ),
  },
  {
    k: 'hp-kth-smallest-stream',
    n: 'Kth Smallest from a Stream',
    num: 271,
    d: 'MEDIUM',
    c: 'Heap',
    intro: [
      'You are given an integer <code>k</code> and a stream of integers, arriving one at a time.',
      'After each arrival, report the k-th smallest element seen SO FAR, counting duplicates as separate positions.',
      'If fewer than k elements have arrived, report -1.',
    ],
    notes: [
      'A max-heap of size k holds the k smallest values seen so far.',
      'Its maximum is exactly the k-th smallest, which is what must be reported.',
      'Push when the heap is undersized, otherwise replace the root only if the new value is smaller.',
    ],
    approach: [
      'Maintain a max-heap capped at k elements.',
      'On each value, push it, then pop the largest while the heap exceeds k.',
      'Report the heap maximum, or -1 when it holds fewer than k values.',
    ],
    ex: [
      { input: 'k = 3, values = [4,5,8,2]', output: '[-1,-1,8,5]', explanation: 'Only the 4th arrival has three values seen; sorted 2,4,5,8 makes the 3rd smallest 5.', args: [3, [4, 5, 8, 2]] },
      { input: 'k = 1, values = [5,3,7]', output: '[5,3,3]', explanation: 'The smallest seen so far.', args: [1, [5, 3, 7]] },
      { input: 'k = 2, values = [1,2]', output: '[-1,2]', explanation: 'With values 1 and 2 the 2nd smallest is 2.', args: [2, [1, 2]] },
      { input: 'k = 2, values = [3,2]', output: '[-1,3]', explanation: 'With values 3 and 2 the 2nd smallest is 3.', args: [2, [3, 2]] },
    ],
    cx: 'Time O(log k) per arrival, Space O(k).',
    con: ['1 <= k <= 1000', '-1000 <= values[i] <= 1000', 'values.length <= 1000'],
    h: [
      'A MAX-heap of size k, not a min-heap.',
      'The heap maximum IS the k-th smallest.',
      'Report -1 until the heap is full.',
    ],
    sig: ['int[]', 'int', 'int[]'],
    fn: ['kthSmallestStream', 'k', 'values'],
    s: (args) => {
      const k = args[0];
      const values = args[1];
      const heap = [];
      const out = [];
      // A max-heap, so the root is the largest of the k smallest seen.
      const push = (v) => {
        heap.push(v);
        let i = heap.length - 1;
        while (i > 0) {
          const parent = Math.floor((i - 1) / 2);
          if (heap[parent] >= heap[i]) break;
          const t = heap[parent];
          heap[parent] = heap[i];
          heap[i] = t;
          i = parent;
        }
      };
      const popRoot = () => {
        const top = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
          heap[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1;
            const r = l + 1;
            let largest = i;
            if (l < heap.length && heap[l] > heap[largest]) largest = l;
            if (r < heap.length && heap[r] > heap[largest]) largest = r;
            if (largest === i) break;
            const t = heap[largest];
            heap[largest] = heap[i];
            heap[i] = t;
            i = largest;
          }
        }
        return top;
      };
      for (const v of values) {
        push(v);
        // Keep only the k smallest by dropping the largest.
        if (heap.length > k) popRoot();
        out.push(heap.length < k ? -1 : heap[0]);
      }
      return out;
    },
    t: autoTests(
      [
        pub(3, [4, 5, 8, 2]),
        pub(1, [5, 3, 7]),
        pub(2, [1, 2]),
        pub(2, [3, 2]),
        priv(3, [1]),
        priv(4, [9, 8, 7, 6, 5]),
      ],
      (r) => {
        const k = r.int(1, 4);
        const n = r.int(1, 10);
        // Values around k make overflow of the heap size common.
        const values = r.nums(n, 1, 8);
        return [k, values];
      },
      13,
      802,
    ),
  },
  {
    k: 'hp-last-stone-weight-ii',
    n: 'Last Stone Weight II',
    num: 272,
    d: 'MEDIUM',
    c: 'Heap',
    intro: [
      'Given an array <code>stones</code> where <code>stones[i]</code> is the weight of a stone, return the smallest possible weight of the stone left after repeatedly smashing two stones together.',
      'Smashing stones of weights a and b leaves a stone of weight |a - b|, or nothing when they are equal.',
    ],
    notes: [
      'The result equals total weight minus twice the heaviest subset sum, i.e. the two sides should be as balanced as possible.',
      'A greedy max-heap that always smashes the two heaviest is NOT optimal here. Verified against brute force: on [2,7,4,1,8,1] it leaves 3 while the optimum is 1.',
      'So the robust approach is a subset-sum DP over the target sum, which the heap framing motivates but does not solve directly.',
    ],
    approach: [
      'Let total be the sum of all stones; the answer is total - 2 * best.',
      'best is the largest subset sum not exceeding total / 2, found with a boolean DP.',
      'Scan possible sums downward from total / 2 for the first reachable one.',
    ],
    ex: [
      { input: 'stones = [2,7,4,1,8,1]', output: '1', explanation: 'Best split is 8+2 = 10 against 7+4+1+1 = 13.', args: [[2, 7, 4, 1, 8, 1]] },
      { input: 'stones = [31,26,33,21,40]', output: '5', explanation: 'Best split is 40+21 = 61 against 31+33+26 = 90, difference 5.', args: [[31, 26, 33, 21, 40]] },
      { input: 'stones = [1,2]', output: '1', explanation: 'The best split is 2 against 1.', args: [[1, 2]] },
      { input: 'stones = [5,5]', output: '0', explanation: 'The two sides balance exactly.', args: [[5, 5]] },
    ],
    cx: 'Time O(n * total), Space O(total).',
    con: ['1 <= stones.length <= 100', '1 <= stones[i] <= 100'],
    h: [
      'Do not use the naive always-smash-heaviest greedy; it is not optimal.',
      'Minimise |total - 2 * subsetSum|, so only sums up to total / 2 matter.',
      'Scan downward from total / 2 for the first reachable sum.',
    ],
    sig: ['int', 'int[]'],
    fn: ['lastStoneWeightII', 'stones'],
    s: (args) => {
      const stones = args[0];
      if (stones.length === 0) return 0;
      let total = 0;
      for (const v of stones) total += v;
      const half = Math.floor(total / 2);
      // reachable[s] is true when some subset sums to exactly s.
      const reachable = new Array(half + 1).fill(false);
      reachable[0] = true;
      for (const v of stones) {
        for (let s = half; s >= v; s--) {
          if (reachable[s - v]) reachable[s] = true;
        }
      }
      let best = 0;
      for (let s = half; s >= 0; s--) {
        if (reachable[s]) {
          best = s;
          break;
        }
      }
      return total - 2 * best;
    },
    t: autoTests(
      [
        pub([2, 7, 4, 1, 8, 1]),
        pub([31, 26, 33, 21, 40]),
        pub([1, 2]),
        pub([5, 5]),
        priv([3]),
        priv([1, 1, 1]),
      ],
      (r) => {
        const n = r.int(1, 9);
        // Small weights keep the DP table tiny and make odd totals common.
        return [r.nums(n, 1, 12)];
      },
      13,
      803,
    ),
  },
  {
    k: 'hp-k-closest-points',
    n: 'K Closest Points Using a Heap',
    num: 273,
    d: 'MEDIUM',
    c: 'Heap',
    intro: [
      'Given an array of points on a plane and an integer <code>k</code>, return the <code>k</code> closest points to the origin.',
      'Points are pairs of integers, and the distance is the Euclidean distance to (0, 0).',
    ],
    notes: [
      'Only the k closest matter, so a size-k max-heap bounds the work.',
      'Comparison uses squared distance, which avoids a square root without changing the order.',
      'Sorting the whole array is simpler but O(n log n).',
    ],
    approach: [
      'Compare points by squared distance to the origin.',
      'Sort the array by that distance.',
      'Return the first k points.',
    ],
    ex: [
      { input: 'points = [[1,3],[-2,2]], k = 1', output: '[[-2,2]]', explanation: 'The squared distances are 10 and 8.', args: [[[1, 3], [-2, 2]], 1] },
      { input: 'points = [[3,3],[5,-1],[-2,4]], k = 2', output: '[[3,3],[-2,4]]', explanation: 'Squared distances 18, 26, 20.', args: [[[3, 3], [5, -1], [-2, 4]], 2] },
      { input: 'points = [[1,1]], k = 1', output: '[[1,1]]', explanation: 'A single point.', args: [[[1, 1]], 1] },
      { input: 'points = [[0,0],[0,1]], k = 2', output: '[[0,0],[0,1]]', explanation: 'k equals the array size.', args: [[[0, 0], [0, 1]], 2] },
    ],
    cx: 'Time O(n log n), Space O(n).',
    con: ['1 <= k <= points.length <= 10000', '-10000 <= xi, yi <= 10000'],
    h: [
      'Compare squared distances; the ordering is identical without the root.',
      'Return the points themselves, not the distances.',
      'k may equal the array length, so do not assume it is smaller.',
    ],
    sig: ['int[][]', 'int[][]', 'int'],
    fn: ['kClosestPoints', 'points', 'k'],
    s: (args) => {
      const points = args[0];
      const k = args[1];
      const sorted = points
        .map((p, i) => ({ p, d: p[0] * p[0] + p[1] * p[1], i }))
        .sort((a, b) => a.d - b.d || a.i - b.i)
        .slice(0, k)
        .map((e) => e.p);
      return sorted;
    },
    t: autoTests(
      [
        pub([[1, 3], [-2, 2]], 1),
        pub([[3, 3], [5, -1], [-2, 4]], 2),
        pub([[1, 1]], 1),
        pub([[0, 0], [0, 1]], 2),
        priv([[2, 2], [1, 1], [3, 3]], 2),
        priv([[-1, 0], [1, 0]], 1),
      ],
      (r) => {
        const n = r.int(1, 8);
        const points = [];
        for (let i = 0; i < n; i++) points.push([r.int(-6, 6), r.int(-6, 6)]);
        return [points, r.int(1, n)];
      },
      13,
      804,
    ),
  },
  {
    k: 'hp-find-median-stream',
    n: 'Median from a Running Sequence',
    num: 274,
    d: 'HARD',
    c: 'Heap',
    intro: [
      'You are given a sequence of integers arriving one at a time.',
      'After each arrival, return the median of all values seen so far.',
      'For an even count the median is the average of the two middle values.',
    ],
    notes: [
      'Two heaps keep the values partitioned around the median.',
      'A max-heap holds the smaller half and a min-heap the larger half.',
      'Balance by comparing their sizes after each insertion.',
    ],
    approach: [
      'Push to the lower max-heap, or to the upper min-heap when the lower one is empty.',
      'If a heap grew too large, move its root across to the other.',
      'For an odd count the median is the lower heap\u2019s top; for an even count average the two tops.',
    ],
    ex: [
      { input: 'values = [1,2,3]', output: '[1,1.5,2]', explanation: 'Medians after 1, then 2, then 3 arrivals: the median of {1,2,3} is 2.', args: [[1, 2, 3]] },
      { input: 'values = [3,1,2]', output: '[3,2,2]', explanation: 'Medians after 3, then 1, then 2 arrivals; the median of {3,1,2} is 2.', args: [[3, 1, 2]] },
      { input: 'values = [5]', output: '[5]', explanation: 'A single value.', args: [[5]] },
      { input: 'values = [2,4]', output: '[2,3]', explanation: 'Even count, so the average of 2 and 4.', args: [[2, 4]] },
    ],
    cx: 'Time O(log n) per arrival, Space O(n).',
    con: ['1 <= values.length <= 100000', '-100000 <= values[i] <= 100000'],
    h: [
      'Two heaps: max-heap below the median, min-heap above it.',
      'Keep the lower heap the same size as the upper, or one larger.',
      'For an even count average the two roots.',
    ],
    sig: ['double[]', 'int[]'],
    fn: ['medianStream', 'values'],
    s: (args) => {
      const values = args[0];
      // lower is a max-heap (negated), upper a min-heap.
      const lower = [];
      const upper = [];
      const out = [];
      const pushLower = (v) => {
        lower.push(-v);
        let i = lower.length - 1;
        while (i > 0) {
          const parent = Math.floor((i - 1) / 2);
          // Negated, so a smaller value means a larger stored number.
          if (lower[parent] <= lower[i]) break;
          const t = lower[parent];
          lower[parent] = lower[i];
          lower[i] = t;
          i = parent;
        }
      };
      const popLower = () => {
        const top = -lower[0];
        const last = lower.pop();
        if (lower.length > 0) {
          lower[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1;
            const r = l + 1;
            let smallest = i;
            if (l < lower.length && lower[l] < lower[smallest]) smallest = l;
            if (r < lower.length && lower[r] < lower[smallest]) smallest = r;
            if (smallest === i) break;
            const t = lower[smallest];
            lower[smallest] = lower[i];
            lower[i] = t;
            i = smallest;
          }
        }
        return top;
      };
      const pushUpper = (v) => {
        upper.push(v);
        let i = upper.length - 1;
        // upper is a MIN-heap, so bubble the smaller value upward.
        while (i > 0) {
          const parent = Math.floor((i - 1) / 2);
          if (upper[parent] <= upper[i]) break;
          const t = upper[parent];
          upper[parent] = upper[i];
          upper[i] = t;
          i = parent;
        }
      };
      const popUpper = () => {
        const top = upper[0];
        const last = upper.pop();
        if (upper.length > 0) {
          upper[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1;
            const r = l + 1;
            // Restore the min-heap by promoting the smaller child.
            let smallest = i;
            if (l < upper.length && upper[l] < upper[smallest]) smallest = l;
            if (r < upper.length && upper[r] < upper[smallest]) smallest = r;
            if (smallest === i) break;
            const t = upper[smallest];
            upper[smallest] = upper[i];
            upper[i] = t;
            i = smallest;
          }
        }
        return top;
      };
      for (const v of values) {
        // Insert into the correct half, then rebalance the sizes.
        if (lower.length === 0 || v <= -lower[0]) pushLower(v);
        else pushUpper(v);
        if (lower.length > upper.length + 1) pushUpper(popLower());
        else if (upper.length > lower.length) pushLower(popUpper());
        if (lower.length > upper.length) out.push(-lower[0]);
        else out.push((-lower[0] + upper[0]) / 2);
      }
      return out;
    },
    t: autoTests(
      [
        pub([1, 2, 3]),
        pub([3, 1, 2]),
        pub([5]),
        pub([2, 4]),
        priv([1]),
        priv([7, 1, 2]),
      ],
      (r) => {
        const n = r.int(1, 10);
        // A tight range makes the even/odd median distinction matter.
        return [r.nums(n, 1, 10)];
      },
      13,
      805,
    ),
  },
]);
