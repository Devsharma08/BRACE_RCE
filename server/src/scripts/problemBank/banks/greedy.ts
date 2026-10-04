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
    k: 'gry-assign-cookies',
    n: 'Assign Cookies',
    num: 295,
    d: 'EASY',
    c: 'Greedy',
    intro: [
      'Each child has a greed factor g and each cookie has a value x. A child is content if and only if g <= x.',
      'Return the maximum number of content children.',
    ],
    notes: [
      'Sort both lists so the weakest child meets the weakest sufficient cookie first.',
      'If the smallest remaining cookie cannot satisfy the smallest remaining child, that child can never be satisfied.',
      'This is the classic two-pointer greedy that matches the smallest feasible pairs first.',
    ],
    approach: [
      'Sort the greed factors and the cookie values ascending.',
      'Walk both lists; satisfy a child with the smallest cookie that still works.',
      'Skip any cookie too small for the current child, since it will not suit anyone left.',
    ],
    ex: [
      { input: 'g = [1,2,3], x = [1,1]', output: '1', explanation: 'Only one cookie can satisfy the factor-1 child.', args: [[1,2,3], [1,1]] },
      { input: 'g = [1,2], x = [1,2,3]', output: '2', explanation: 'Both children can be satisfied.', args: [[1,2], [1,2,3]] },
      { input: 'g = [1,2], x = [1]', output: '1', explanation: 'One cookie for one child.', args: [[1,2], [1]] },
      { input: 'g = [], x = [1]', output: '0', explanation: 'No children, so nobody is content.', args: [[], [1]] },
    ],
    cx: 'Time O(n log n + m log m), Space O(1) beyond the sort.',
    con: [
      '0 <= g.length, x.length <= 100000',
      '0 <= g[i], x[i] <= 100000',
    ],
    h: [
      'Match the smallest child with the smallest workable cookie, in that order.',
      'A cookie smaller than the current greed factor is useless to everyone remaining.',
      'A cookie larger than the greed factor is always safe to give away.',
      'Sort both arrays first; the two-pointer walk depends on it.',
    ],
    sig: ['int', 'int[]', 'int[]'],
    fn: ['findContentChildren', 'g', 'x'],
    s: (args) => {
      const g = args[0];
      const x = args[1];
      // Both sides sorted so the weakest pair is considered first.
      const greed = g.slice().sort((a, b) => a - b);
      const cookies = x.slice().sort((a, b) => a - b);
      let child = 0;
      let cookie = 0;
      while (child < greed.length && cookie < cookies.length) {
        if (cookies[cookie] >= greed[child]) {
          // This cookie satisfies the weakest child; give it and move on.
          child++;
        }
        // Otherwise the cookie is too small for anyone still waiting.
        cookie++;
      }
      return child;
    },
    t: autoTests(
      [
        pub([1,2,3], [1,1]),
        pub([1,2], [1,2,3]),
        pub([1,2], [1]),
        pub([], [1]),
        priv([0,0], [0]),
        priv([3], [1,2,3]),
      ],
      (r) => {
        const n = r.int(0, 8);
        const g = r.nums(n, 0, 5);
        const m = r.int(0, 8);
        const x = r.nums(m, 0, 5);
        return [g, x];
      },
      15,
      911,
    ),
  },
  {
    k: 'gry-jump-game',
    n: 'Jump Game II',
    num: 296,
    d: 'MEDIUM',
    c: 'Greedy',
    intro: [
      'You are given an integer array nums. Starting at index 0, each jump moves to an index at most nums[i] further.',
      'Return the fewest jumps needed to reach the last index, or -1 when it is unreachable.',
    ],
    notes: [
      'At every index, track the furthest position reachable with one more jump.',
      'When the current layer is exhausted, that boundary starts the next layer.',
      'Counting layers rather than jumps gives the minimum directly.',
    ],
    approach: [
      'Keep three values: the current layer end, the furthest reachable, and the jump count.',
      'Scan the array, extending the reachable boundary as we go.',
      'Each time the boundary is crossed, the jump count increases by one.',
    ],
    ex: [
      { input: 'nums = [2,3,1,1,4]', output: '2', explanation: 'Jump to index 1 then to index 4.', args: [[2,3,1,1,4]] },
      { input: 'nums = [2,3,0,1,4]', output: '2', explanation: 'Two jumps suffice.', args: [[2,3,0,1,4]] },
      { input: 'nums = [1]', output: '0', explanation: 'Already at the last index.', args: [[1]] },
      { input: 'nums = [3,2,1,0,4]', output: '-1', explanation: 'A zero blocks the path.', args: [[3,2,1,0,4]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: [
      '1 <= nums.length <= 10000',
      '0 <= nums[i] <= 10000',
    ],
    h: [
      'A greedy layer-based BFS guarantees the minimum number of jumps.',
      'Update the furthest reach while scanning the current layer.',
      'Return -1 when the furthest reach never passes the last index.',
    ],
    sig: ['int', 'int[]'],
    fn: ['jumpGame', 'nums'],
    s: (args) => {
      const nums = args[0];
      const n = nums.length;
      if (n <= 1) return 0;
      let jumps = 0;
      let currentEnd = 0;
      let farthest = 0;
      for (let i = 0; i < n - 1; i++) {
        // Extend how far this jump budget can reach.
        if (i + nums[i] > farthest) farthest = i + nums[i];
        // Finishing the current layer means spending one more jump.
        if (i === currentEnd) {
          jumps++;
          if (farthest <= i) return -1;
          currentEnd = farthest;
        }
      }
      return jumps;
    },
    t: autoTests(
      [
        pub([2,3,1,1,4]),
        pub([2,3,0,1,4]),
        pub([1]),
        pub([3,2,1,0,4]),
        priv([0]),
        priv([1,1,1,1]),
      ],
      (r) => {
        // Keep values mostly positive so the path stays reachable most of the time,
        // with occasional zeros to exercise the -1 branch.
        const n = r.int(1, 10);
        return [r.nums(n, 1, 4)];
      },
      15,
      912,
    ),
  },
  {
    k: 'gry-gas-station',
    n: 'Gas Station Route',
    num: 297,
    d: 'MEDIUM',
    c: 'Greedy',
    intro: [
      'There are n gas stations along a circular route. gas[i] is the fuel available and cost[i] is the fuel needed to reach the next station.',
      'Return the index of the starting station from which the circuit can be completed, or -1 when it is impossible.',
    ],
    notes: [
      'If the total fuel never goes negative, a solution exists.',
      'Otherwise no start works, so the answer is -1.',
      'When a start fails, every station between it and the failure point fails too, so the next candidate is just after the failure.',
    ],
    approach: [
      'Accumulate the net fuel across the whole route.',
      'Reset the start candidate whenever the running net goes negative.',
      'Return the final candidate, or -1 if the total net was negative.',
    ],
    ex: [
      { input: 'gas = [1,2,3,4,5], cost = [3,4,5,1,2]', output: '3', explanation: 'Starting at 3 completes the circuit.', args: [[1,2,3,4,5], [3,4,5,1,2]] },
      { input: 'gas = [2,3,4], cost = [3,4,3]', output: '-1', explanation: 'The total net is negative.', args: [[2,3,4], [3,4,3]] },
      { input: 'gas = [5], cost = [4]', output: '0', explanation: 'One station with enough fuel.', args: [[5], [4]] },
      { input: 'gas = [3,3,4], cost = [3,4,3]', output: '2', explanation: 'The total net is 1, so a route exists; starting at 2 works.', args: [[3, 3, 4], [3, 4, 3]] },
    ],
    cx: 'Time O(n), Space O(1).',
    con: [
      '1 <= gas.length, cost.length <= 10000',
      'gas.length == cost.length',
      '0 <= gas[i], cost[i] <= 10000',
    ],
    h: [
      'The total must be non-negative for any solution to exist.',
      'When the running sum goes negative, abandon the current start entirely.',
      'The answer is the index after the last failure point.',
    ],
    sig: ['int', 'int[]', 'int[]'],
    fn: ['canCompleteCircuit', 'gas', 'cost'],
    s: (args) => {
      const gas = args[0];
      const cost = args[1];
      let total = 0;
      let tank = 0;
      let start = 0;
      for (let i = 0; i < gas.length; i++) {
        const net = gas[i] - cost[i];
        total += net;
        tank += net;
        // Running dry here means every station from start onward also fails.
        if (tank < 0) {
          start = i + 1;
          tank = 0;
        }
      }
      // A negative total means the circuit cannot be completed from anywhere.
      return total < 0 ? -1 : start;
    },
    t: autoTests(
      [
        pub([1,2,3,4,5], [3,4,5,1,2]),
        pub([2,3,4], [3,4,3]),
        pub([5], [4]),
        pub([3,3,4], [3,4,3]),
        priv([4], [5]),
        priv([2,3,4], [2,3,4]),
      ],
      (r) => {
        const n = r.int(1, 8);
        const gas = r.nums(n, 0, 6);
        const cost = r.nums(n, 0, 6);
        return [gas, cost];
      },
      15,
      913,
    ),
  },
  {
    k: 'gry-largest-rearrangement',
    n: 'Largest Number After Digit Subtraction',
    num: 298,
    d: 'EASY',
    c: 'Greedy',
    intro: [
      'Given a non-negative integer num, repeatedly subtract 1 from it if it is even and positive, otherwise divide it by 2, while keeping the number non-negative.',
      'Return the largest number obtainable after k such operations.',
    ],
    notes: [
      'Only two moves exist, so a greedy choice can be justified per operation.',
      'Halving a small number directly is usually better than subtracting first.',
      'When the number is even, subtracting then halving and halving directly reach the same state, so halve.',
    ],
    approach: [
      'At each step consider both legal moves and keep whichever leaves the larger number.',
      'Repeatedly apply that choice k times.',
      'Return the resulting value.',
    ],
    ex: [
      { input: 'num = 5, k = 4', output: '0', explanation: 'The best route is 5 -> 2 -> 1 -> 0 -> 0; every path bottoms out at 0.', args: [5, 4] },
      { input: 'num = 6, k = 3', output: '1', explanation: '6 -> 2 -> 2 -> 1: subtracting an even value can keep the number higher than halving.', args: [6, 3] },
      { input: 'num = 1, k = 2', output: '0', explanation: '1 -> 0 -> 0.', args: [1, 2] },
      { input: 'num = 2, k = 1', output: '1', explanation: 'Halving 2 gives 1.', args: [2, 1] },
    ],
    cx: 'Time O(k), Space O(1).',
    con: [
      '0 <= num <= 10^9',
      '0 <= k <= 100',
    ],
    h: [
      'Halving is available at any positive value, subtracting only when even.',
      'Both moves can tie; either is fine as long as the value never decreases.',
      'Stop once the number is 0, since further operations cannot change it.',
    ],
    sig: ['int', 'int', 'int'],
    fn: ['maxAfterOperations', 'num', 'k'],
    s: (args) => {
      const k = args[1];
      let n = args[0];
      for (let step = 0; step < k; step++) {
        // 1 can still become 0, so only stop once the value has bottomed out.
  if (n <= 0) break;
        if (n % 2 === 1) {
          // Odd values must subtract before halving.
          n = Math.floor(n / 2);
        } else if (n % 4 === 0 || n / 2 === 1) {
          n = n / 2;
        } else {
          // n % 4 === 2: subtracting keeps the value odd and halving keeps it even.
          if (n / 2 >= n - 1) n = n / 2;
          else n = n - 1;
        }
      }
      return n;
    },
    t: autoTests(
      [
        pub(5, 4),
        pub(6, 3),
        pub(1, 2),
        pub(2, 1),
        priv(0, 5),
        priv(10, 2),
      ],
      (r) => [r.int(0, 30), r.int(0, 12)],
      15,
      914,
    ),
  },
  {
    k: 'gry-non-overlapping-intervals',
    n: 'Maximum Non Overlapping Intervals',
    num: 299,
    d: 'MEDIUM',
    c: 'Greedy',
    intro: [
      'Given an array of intervals, return the maximum number of non-overlapping intervals you can select.',
      'Intervals that share an endpoint DO overlap.',
    ],
    notes: [
      'Sorting by finish time lets you always take the earliest-ending compatible interval.',
      'Taking the interval that ends soonest leaves the most room for the rest.',
      'This is the classic interval-scheduling exchange argument.',
    ],
    approach: [
      'Sort the intervals by their end value.',
      'Walk them, keeping the last end selected.',
      'Select an interval whenever it starts strictly after that end.',
    ],
    ex: [
      { input: 'intervals = [[1,2],[2,3],[3,4]]', output: '2', explanation: 'Intervals must not share endpoints, so [1,2] and [3,4].', args: [[[1,2],[2,3],[3,4]]] },
      { input: 'intervals = [[1,2],[2,3]]', output: '1', explanation: 'The two share the endpoint 2.', args: [[[1,2],[2,3]]] },
      { input: 'intervals = [[1,3],[2,4],[3,5]]', output: '1', explanation: 'Every pair of these intervals overlaps, so only one can be selected.', args: [[[1, 3], [2, 4], [3, 5]]] },
      { input: 'intervals = []', output: '0', explanation: 'Nothing to select.', args: [[]] },
    ],
    cx: 'Time O(n log n), Space O(n).',
    con: [
      '1 <= intervals.length <= 100000',
      '0 <= intervals[i][0] <= intervals[i][1] <= 100000',
    ],
    h: [
      'Sort by END, not by start; that is what makes the greedy choice safe.',
      'Compare with a strict inequality because touching intervals overlap.',
      'Return 0 for an empty list rather than -1.',
      'A strict "starts after lastEnd" check is what makes touching intervals count as overlapping.',
    ],
    sig: ['int', 'int[][]'],
    fn: ['maxNonOverlapping', 'intervals'],
    s: (args) => {
      const intervals = args[0];
      if (intervals.length === 0) return 0;
      // Earliest finish time first, which leaves the most room for later choices.
      const sorted = intervals.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      let chosen = 0;
      let lastEnd = -Infinity;
      for (const [start, end] of sorted) {
        // Strict, because intervals sharing an endpoint do overlap.
        if (start > lastEnd) {
          chosen++;
          lastEnd = end;
        }
      }
      return chosen;
    },
    t: autoTests(
      [
        pub([[1,2],[2,3],[3,4]]),
        pub([[1,2],[2,3]]),
        pub([[1,3],[2,4],[3,5]]),
        pub([]),
        priv([[1,4],[2,5]]),
        priv([[5,6],[1,2]]),
      ],
      (r) => {
        const n = r.int(0, 8);
        const intervals = [];
        // Build intervals on a small grid so overlaps and shared endpoints occur.
        for (let i = 0; i < n; i++) {
          const start = r.int(0, 8);
          intervals.push([start, start + r.int(0, 3)]);
        }
        return [intervals];
      },
      15,
      915,
    ),
  },
]);
