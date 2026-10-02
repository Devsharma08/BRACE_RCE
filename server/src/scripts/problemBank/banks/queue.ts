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
    k: 'que-bfs-shortest-path',
    n: 'Shortest Path in an Unweighted Graph',
    num: 256,
    d: 'MEDIUM',
    c: 'Queue',
    intro: [
      'Given an adjacency list <code>graph</code> of <code>n</code> nodes and a source node <code>start</code>, return the shortest distance from <code>start</code> to every other node.',
      'Return <code>-1</code> for nodes that cannot be reached.',
    ],
    notes: [
      'Unweighted graphs are exactly where BFS gives shortest paths, because each level adds one edge.',
      'A distance array of -1 doubles as the visited set.',
      'Mark a node visited when it is ENQUEUED, not when dequeued, or it is added twice.',
    ],
    approach: [
      'Set the source distance to 0 and enqueue it.',
      'Dequeue, then enqueue each unvisited neighbour with distance + 1.',
      'Leave unreachable nodes at -1.',
    ],
    ex: [
      { input: 'graph = [[1],[2],[0],[]], start = 0', output: '[0,1,2,-1]', explanation: '1 is one hop away and 2 is two; node 3 is unreachable. Edges are directed.', args: [[[1], [2], [0], []], 0] },
      { input: 'graph = [[1,2],[],[]], start = 0', output: '[0,1,1]', explanation: '0 points at both 1 and 2.', args: [[[1, 2], [], []], 0] },
      { input: 'graph = [[],[],[]], start = 0', output: '[0,-1,-1]', explanation: 'No edges at all.', args: [[[], [], []], 0] },
      { input: 'graph = [[1],[0]], start = 1', output: '[1,0]', explanation: 'Starting at 1, its edge points to 0, so 0 is reached.', args: [[[1], [0]], 1] },
    ],
    cx: 'Time O(n + e), Space O(n).',
    con: ['1 <= n <= 10000', '0 <= start < n', 'graph[i] contains no duplicate nodes and no self-loops.'],
    h: [
      'Mark visited on enqueue, not dequeue, to avoid duplicate entries.',
      'The distance array doubles as the visited marker.',
      'Isolated nodes keep a distance of -1.',
    ],
    sig: ['int[]', 'int[][]', 'int'],
    fn: ['bfsDistances', 'graph', 'start'],
    s: (args) => {
      const graph = args[0];
      const start = args[1];
      const dist = new Array(graph.length).fill(-1);
      if (start < 0 || start >= graph.length) return dist;
      dist[start] = 0;
      const queue = [start];
      let head = 0;
      while (head < queue.length) {
        const node = queue[head++];
        for (const nb of graph[node]) {
          if (dist[nb] !== -1) continue;
          dist[nb] = dist[node] + 1;
          queue.push(nb);
        }
      }
      return dist;
    },
    t: autoTests(
      [
        pub([[2], [3], [4], []], 0),
        pub([[1, 2], [], []], 0),
        pub([[], [], []], 0),
        pub([[1], [0]], 1),
        priv([[]], 0),
        priv([[], [1]], 1),
      ],
      (r) => {
        // Build a connected component, then attach unreachable extra nodes.
        const n = r.int(1, 8);
        const graph: number[][] = [];
        for (let i = 0; i < n; i++) graph.push([]);
        for (let i = 1; i < r.int(1, n + 1); i++) {
          const a = r.int(0, i - 1);
          let b = r.int(0, n - 1);
          if (b === a) continue;
          graph[a].push(b);
          graph[b].push(a);
        }
        for (const list of graph) list.sort((x, y) => x - y);
        return [graph, r.int(0, n - 1)];
      },
      13,
      501,
    ),
  },
  {
    k: 'que-monotonic-window-max',
    n: 'Windowed Maximum via Monotonic Queue',
    num: 257,
    d: 'HARD',
    c: 'Queue',
    intro: [
      'Given an integer array <code>nums</code> and an integer <code>k</code>, return the maximum value in each window of size <code>k</code>.',
      'Each window must be exactly size <code>k</code>.',
    ],
    notes: [
      'A max heap is the simplest approach and gives O(n log k).',
      'A monotonic deque gives O(n): keep candidates in decreasing order and drop those the new element dominates.',
      'The deque holds indices, so expired elements can be removed from the front.',
    ],
    approach: [
      'Push index, dropping any smaller or equal values from the back.',
      'Remove indices from the front that have left the window.',
      'Once the window is full, the front is that window maximum.',
    ],
    ex: [
      { input: 'nums = [1,3,-1,-3,5,3,6,7], k = 3', output: '[3,3,5,5,6,7]', explanation: 'Each window maximum in order.', args: [[1, 3, -1, -3, 5, 3, 6, 7], 3] },
      { input: 'nums = [1], k = 1', output: '[1]', explanation: 'A single-element window.', args: [[1], 1] },
      { input: 'nums = [9,11], k = 2', output: '[11]', explanation: 'One window covering both.', args: [[9, 11], 2] },
      { input: 'nums = [4,-2], k = 2', output: '[4]', explanation: 'The maximum is the first element.', args: [[4, -2], 2] },
    ],
    cx: 'Time O(n), Space O(k).',
    con: ['1 <= nums.length <= 100000', '1 <= k <= nums.length', '-2^31 <= nums[i] <= 2^31 - 1'],
    h: [
      'Keep INDICES in the deque, not values, so you can detect expiry.',
      'Remove from the front any index <= i - k.',
      'The deque must be strictly decreasing for this to work.',
    ],
    sig: ['int[]', 'int[]', 'int'],
    fn: ['slidingMax', 'nums', 'k'],
    s: (args) => {
      const nums = args[0];
      const k = args[1];
      const out = [];
      const deque = [];
      for (let i = 0; i < nums.length; i++) {
        // Drop values dominated by the new one; they can never win again.
        while (deque.length && nums[deque[deque.length - 1]] <= nums[i]) deque.pop();
        deque.push(i);
        // Drop indices that have slid out of the window.
        if (deque[0] <= i - k) deque.shift();
        if (i >= k - 1) out.push(nums[deque[0]]);
      }
      return out;
    },
    t: autoTests(
      [
        pub([1, 3, -1, -3, 5, 3, 6, 7], 3),
        pub([1], 1),
        pub([9, 11], 2),
        pub([4, -2], 2),
        priv([1, 2, 3], 1),
        priv([7, 2, 4], 2),
      ],
      (r) => {
        const n = r.int(1, 12);
        // A narrow value range produces ties, which the tie-break must handle.
        return [r.nums(n, -5, 12), r.int(1, n)];
      },
      13,
      502,
    ),
  },
  {
    k: 'que-task-scheduler',
    n: 'Task Scheduler with Cooldown',
    num: 258,
    d: 'MEDIUM',
    c: 'Queue',
    intro: [
      'Given a list of tasks where each task is represented by a character and an integer <code>n</code> denoting the cooldown time between identical tasks, return the minimum number of time units required to finish all tasks.',
    ],
    notes: [
      'Only the MOST FREQUENT tasks determine the total length.',
      'Think of the most frequent task as a frame of width n+1, with the other tasks filling the gaps.',
      'The answer is max(total tasks, (maxFreq - 1) * (n + 1) + maxKindsOfThatFrequency).',
    ],
    approach: [
      'Count each task type.',
      'Find the highest frequency and how many types reach it.',
      'Take the larger of the total count and the frame formula.',
    ],
    ex: [
      { input: 'tasks = ["A","A","A","B","B","C"], n = 2', output: '7', explanation: 'A A _ B A _ B A C uses 7 units.', args: [['A', 'A', 'A', 'B', 'B', 'C'], 2] },
      { input: 'tasks = ["A","A","A","B","B","C","B","B"], n = 1', output: '8', explanation: 'A B A B A B C B fits 8.', args: [['A', 'A', 'A', 'B', 'B', 'C', 'B', 'B'], 1] },
      { input: 'tasks = ["A","B","C","D"], n = 0', output: '4', explanation: 'No cooldown, so one unit each.', args: [['A', 'B', 'C', 'D'], 0] },
      { input: 'tasks = ["A","A","A","B","B","C"], n = 0', output: '6', explanation: 'Still one unit per task.', args: [['A', 'A', 'A', 'B', 'B', 'C'], 0] },
    ],
    cx: 'Time O(m), Space O(1) for the alphabet.',
    con: ['1 <= tasks.length <= 10000', '1 <= n <= 1000', 'tasks consist of uppercase English letters.'],
    h: [
      'Only the most frequent task frequency drives the layout.',
      'maxKinds matters: several equally frequent tasks share the last frame.',
      'The total task count is a lower bound, so take the maximum of the two.',
    ],
    sig: ['int', 'char[]', 'int'],
    fn: ['leastInterval', 'tasks', 'n'],
    s: (args) => {
      const tasks = args[0];
      const n = args[1];
      if (tasks.length === 0) return 0;
      const counts = new Map();
      for (const t of tasks) counts.set(t, (counts.get(t) ?? 0) + 1);
      let maxCount = 0;
      for (const c of counts.values()) if (c > maxCount) maxCount = c;
      let maxKinds = 0;
      for (const c of counts.values()) if (c === maxCount) maxKinds++;
      // Each of the (maxCount - 1) full frames holds n + 1 slots; the last one
      // holds only the tasks that reach the maximum frequency.
      const frame = (maxCount - 1) * (n + 1) + maxKinds;
      return Math.max(tasks.length, frame);
    },
    t: autoTests(
      [
        pub(['A', 'A', 'A', 'B', 'B', 'C'], 2),
        pub(['A', 'A', 'A', 'B', 'B', 'C', 'B', 'B'], 1),
        pub(['A', 'B', 'C', 'D'], 0),
        pub(['A', 'A', 'A', 'B', 'B', 'C'], 0),
        priv(['A'], 3),
        priv(['A', 'A', 'A', 'A'], 2),
      ],
      (r) => {
        const kinds = r.int(1, 4);
        const pool = ['A', 'B', 'C', 'D'].slice(0, kinds);
        const total = r.int(1, 12);
        const tasks = [];
        for (let i = 0; i < total; i++) tasks.push(r.pick(pool));
        return [tasks, r.int(0, 4)];
      },
      13,
      503,
    ),
  },  {
    k: 'que-level-traversal',
    n: 'Level Order Grouping',
    num: 259,
    d: 'MEDIUM',
    c: 'Queue',
    intro: [
      'Given a binary tree represented as a level-order array with <code>null</code> holes, return its nodes grouped by level, each group being a list of node values.',
    ],
    notes: [
      'BFS processes one level per iteration, so snapshot the frontier size first.',
      'Reading the queue length BEFORE processing is what separates the levels.',
      'A null marker means the node is absent, so it contributes no value.',
    ],
    approach: [
      'Rebuild the node graph from the level-order encoding.',
      'Start a frontier with the root.',
      'Emit the frontier values, then build the next frontier from its children.',
    ],
    ex: [
      { input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]', explanation: 'One group per level.', args: [[3, 9, 20, null, null, 15, 7]] },
      { input: 'root = [1]', output: '[[1]]', explanation: 'A single level.', args: [[1]] },
      { input: 'root = []', output: '[]', explanation: 'An empty tree has no levels.', args: [[]] },
      { input: 'root = [1,2,3,4,null,null,5]', output: '[[1],[2,3],[4,5]]', explanation: 'Nulls are skipped, not emitted.', args: [[1, 2, 3, 4, null, null, 5]] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: ['0 <= root.length <= 2000', 'root is a valid level-order encoding.'],
    h: [
      'Process a snapshot of the frontier so levels do not merge.',
      'Skip null entries rather than emitting them.',
      'An empty array must return an empty list, not [[]].',
    ],
    sig: ['int[][]', 'int[]'],
    fn: ['levelGroups', 'root'],
    s: (args) => {
      // The wrapper converts a parameter named `root` into a TreeNode, so this
      // must accept either a node graph or a level-order array.
      let root = args[0];
      if (Array.isArray(root)) {
        if (root.length === 0 || root[0] == null) return [];
        const nodes = root.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let i = 1;
        const build = [nodes[0]];
        while (build.length) {
          const cur = build.shift();
          for (const key of ['left', 'right']) {
            if (i < nodes.length) {
              cur[key] = nodes[i];
              if (nodes[i]) build.push(nodes[i]);
              i++;
            }
          }
        }
        root = nodes[0];
      }
      if (!root) return [];
      // One group per level, with a fresh frontier each time.
      const out = [];
      let level = [root];
      while (level.length) {
        const values = [];
        const next = [];
        for (const node of level) {
          values.push(node.val);
          if (node.left) next.push(node.left);
          if (node.right) next.push(node.right);
        }
        out.push(values);
        level = next;
      }
      return out;
    },
    t: autoTests(
      [
        pub([3, 9, 20, null, null, 15, 7]),
        pub([1]),
        pub([]),
        pub([1, 2, 3, 4, null, null, 5]),
        priv([1, 2]),
        priv([1, null, 2]),
      ],
      (r) => [r.tree(r.int(0, 10))],
      13,
      504,
    ),
  },
]);
