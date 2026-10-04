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


/**
 * Graph problems.
 *
 * References are deliberately plain JavaScript (see the header note): they are
 * serialised with Function.prototype.toString and shipped to the sandbox as the
 * user's submission, so TypeScript-only syntax would be emitted verbatim and
 * fail to parse.
 *
 * Every generator stays inside the documented constraints and keeps each
 * expected output well under Piston's 1024-byte stdout cap — an oversized
 * answer is SIGKILLed by the sandbox, which would make the case unwinnable.
 */
const BANK_GRAPH: RawProblem[] = [
  {
    k: 'grf-number-of-islands',
    n: 'Number of Islands',
    num: 315,
    d: 'MEDIUM',
    c: 'Graph',
    intro: [
      'Given an <code>m x n</code> grid of <code>0</code> (water) and <code>1</code> (land), return the number of islands.',
      'An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
    ],
    notes: [
      'Scanning row by row, every unvisited land cell starts a new island and floods its whole connected component.',
      'Flooding marks the island as visited, so no cell is ever counted twice.',
      'A BFS queue and a DFS stack are equivalent; BFS avoids deep recursion on large grids.',
    ],
    approach: [
      'Loop over every cell.',
      'On unvisited land, increment the count and flood-fill from there.',
      'Move in four directions, flipping land to water as it is visited.',
    ],
    ex: [
      { input: 'grid = [[1,1,0],[1,1,0],[0,0,1]]', output: '2', explanation: 'One island in the top-left, one bottom-right.', args: [[[1,1,0],[1,1,0],[0,0,1]]] },
      { input: 'grid = [[1]]', output: '1', explanation: 'A single land cell is one island.', args: [[[1]]] },
      { input: 'grid = [[0,0],[0,0]]', output: '0', explanation: 'No land, no islands.', args: [[[0,0],[0,0]]] },
    ],
    cx: 'Time O(m*n), Space O(m*n) for the queue.',
    con: ['1 <= m, n <= 300', 'grid[i][j] is 0 or 1'],
    h: [
      'Do not BFS from every cell; only from unvisited land.',
      'Mark visited as you enqueue, not when you dequeue, or cells get enqueued repeatedly.',
      'An iterative flood fill avoids stack overflow on a 300x300 grid.',
    ],
    sig: ['int', 'int[][]'],
    fn: ['numIslands', 'grid'],
    s: (args) => {
      const g = args[0];
      if (!g.length || !g[0].length) return 0;
      const R = g.length, C = g[0].length;
      const seen = g.map((row) => row.map(() => false));
      const flood = (r, c) => {
        if (r < 0 || r >= R || c < 0 || c >= C || seen[r][c] || g[r][c] !== 1) return;
        seen[r][c] = true;
        flood(r + 1, c); flood(r - 1, c); flood(r, c + 1); flood(r, c - 1);
      };
      let count = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (g[r][c] === 1 && !seen[r][c]) { count++; flood(r, c); }
      }
      return count;
    },
    t: autoTests(
      [
        pub([[1,1,0],[1,1,0],[0,0,1]]),
        pub([[1]]),
        pub([[0,0],[0,0]]),
        priv([[1,0],[0,1]]),
        priv([[1,1,1]]),
        priv([[1,0,1],[0,0,1]]),
      ],
      (r) => {
        const rows = r.int(1, 5), cols = r.int(1, 5);
        const g = [];
        for (let i = 0; i < rows; i++) g.push(r.nums(cols, 0, 1));
        return [g];
      },
      15,
      315,
    ),
  },
  {
    k: 'grf-flood-fill',
    n: 'Flood Fill',
    num: 316,
    d: 'EASY',
    c: 'Graph',
    intro: [
      'An image is a grid of pixels, each with an integer colour. Start at pixel <code>(sr, sc)</code> and replace its colour with <code>color</code>.',
      'Flood fill continues to all four-directionally connected pixels sharing the original colour.',
    ],
    notes: [
      'Only pixels reachable through the ORIGINAL colour are repainted.',
      'Recording the original colour before mutating the grid prevents the fill from leaking into already-repainted pixels.',
      'If the start pixel already has the target colour, nothing changes.',
    ],
    approach: [
      'Remember the colour being replaced.',
      'Depth-first search from the start pixel.',
      'Repaint matching neighbours as you visit them.',
    ],
    ex: [
      { input: 'image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2', output: '[[2,2,2],[2,2,0],[2,0,1]]', explanation: 'The connected 1s become 2s; the 0 and the diagonal 1 are untouched.', args: [[[1,1,1],[1,1,0],[1,0,1]],1,1,2] },
      { input: 'image = [[0,0,0],[0,1,1]], sr = 1, sc = 1, color = 1', output: '[[0,0,0],[0,1,1]]', explanation: 'The start pixel already has the target colour, so nothing changes.', args: [[[0,0,0],[0,1,1]],1,1,1] },
      { input: 'image = [[1]], sr = 0, sc = 0, color = 0', output: '[[0]]', explanation: 'A single pixel repaints trivially.', args: [[[1]],0,0,0] },
    ],
    cx: 'Time O(m*n), Space O(m*n) for the recursion stack.',
    con: ['1 <= rows, cols <= 100', '0 <= sr, sc < rows / cols', '0 <= colour <= 65535'],
    h: [
      'Capture the original colour before writing the new one.',
      'Check bounds and colour before recursing.',
      'Mutating the grid in place avoids an extra O(m*n) copy.',
    ],
    sig: ['int[][]', 'int[][]', 'int', 'int', 'int'],
    fn: ['floodFill', 'image', 'sr', 'sc', 'color'],
    // Deliberately NON-mutating. The bank evaluates `solve` more than once for
    // the same entry (published examples are asserted against it, then the same
    // arguments feed the test cases). A reference that repaints its input in
    // place returns a different answer the second time, which fails those
    // checks for a reason that has nothing to do with the user's code.
    s: (args) => {
      const src = args[0], sr = args[1], sc = args[2], color = args[3];
      if (!src.length || !src[0].length) return src;
      const img = src.map((row) => row.slice());
      const old = img[sr][sc];
      if (old === color) return img;
      const fill = (r, c) => {
        if (r < 0 || r >= img.length || c < 0 || c >= img[0].length) return;
        if (img[r][c] !== old) return;
        img[r][c] = color;
        fill(r + 1, c); fill(r - 1, c); fill(r, c + 1); fill(r, c - 1);
      };
      fill(sr, sc);
      return img;
    },
    t: autoTests(
      [
        pub([[1,1,1],[1,1,0],[1,0,1]],1,1,2),
        pub([[0,0,0],[0,1,1]],1,1,1),
        pub([[1]],0,0,0),
        priv([[1,1],[1,1]],0,0,3),
        priv([[5,5,5]],0,1,7),
        priv([[1,0,1],[0,1,0],[1,0,1]],1,1,9),
      ],
      (r) => {
        const rows = r.int(1, 4), cols = r.int(1, 4);
        const img = [];
        for (let i = 0; i < rows; i++) img.push(r.nums(cols, 0, 2));
        return [img, r.int(0, rows - 1), r.int(0, cols - 1), r.int(0, 3)];
      },
      15,
      316,
    ),
  },
  {
    k: 'grf-course-schedule',
    // Named to avoid a near-duplicate collision with the existing #186
    // "Course Schedule II", which is a different task (fewest weeks).
    n: 'Course Prerequisites',
    num: 317,
    d: 'MEDIUM',
    c: 'Graph',
    intro: [
      'There are <code>numCourses</code> courses. Each course is identified by <code>0..numCourses-1</code> and takes <code>prerequisites[i]</code> as its prior courses.',
      'Return true if you can finish every course, otherwise false.',
    ],
    notes: [
      'The prerequisite list is a directed edge prerequisite -> course, and finishing everything needs an acyclic graph.',
      'A Kahn topological sort repeatedly removes nodes of in-degree zero; if fewer than n nodes are removed there is a cycle.',
      'Counting removed courses is enough; the order itself is not required.',
    ],
    approach: [
      'Build the edge list and the in-degree of each course.',
      'Enqueue every course with no prerequisites.',
      'Pop, decrement its dependents, and enqueue any that reach in-degree zero.',
      'Compare how many courses were processed with the total.',
    ],
    ex: [
      { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true', explanation: 'Course 1 needs course 0, and there is no cycle.', args: [2,[[1,0]]] },
      { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false', explanation: 'The two courses require each other.', args: [2,[[1,0],[0,1]]] },
      { input: 'numCourses = 1, prerequisites = []', output: 'true', explanation: 'A single course with no prerequisites is trivially fine.', args: [1,[]] },
    ],
    cx: 'Time O(V+E), Space O(V+E).',
    con: ['1 <= numCourses <= 1000', '0 <= prerequisites[i][1] < numCourses', 'prerequisites[i][0] != prerequisites[i][1]'],
    h: [
      'A cycle is exactly what makes finishing impossible.',
      'In-degree counts unmet prerequisites.',
      'If the queue empties before every course is removed, a cycle remains.',
    ],
    sig: ['bool', 'int', 'int[][]'],
    fn: ['canFinish', 'numCourses', 'prerequisites'],
    s: (args) => {
      const n = args[0], pre = args[1] || [];
      const adj = Array.from({ length: n }, () => []);
      const indeg = new Array(n).fill(0);
      for (const [a, b] of pre) { adj[a].push(b); indeg[b]++; }
      const q = [];
      for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
      let done = 0;
      while (q.length) {
        const cur = q.shift(); done++;
        for (const next of adj[cur]) if (--indeg[next] === 0) q.push(next);
      }
      return done === n;
    },
    t: autoTests(
      [
        pub(2,[[1,0]]),
        pub(2,[[1,0],[0,1]]),
        pub(1,[]),
        priv(3,[[0,1],[1,2]]),
        priv(4,[[1,0],[2,0],[3,1],[3,2]]),
        priv(3,[[0,1],[1,2],[2,0]]),
      ],
      (r) => {
        const n = r.int(1, 7);
        const edges = [];
        const tries = r.int(0, 8);
        for (let i = 0; i < tries; i++) {
          const a = r.int(0, n - 1), b = r.int(0, n - 1);
          if (a !== b) edges.push([a, b]);
        }
        return [n, edges];
      },
      15,
      317,
    ),
  },
];

// Exported at the END of the file: `const` is not hoisted-initialised, so calling
// this above the declaration throws a temporal-dead-zone ReferenceError at import
// time. `tsc` does not catch that; running the bank does.
export default bank(BANK_GRAPH);
