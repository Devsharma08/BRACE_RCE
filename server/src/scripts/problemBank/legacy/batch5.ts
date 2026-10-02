/**
 * Legacy references, batch 5 — graphs, linked lists and trees.
 *
 * Linked lists arrive as a flat array of values. Trees arrive either as a
 * level-order array or as a TreeNode, depending on the wrapper's name
 * heuristic, so tree references normalise with a local asTree().
 */
import type { LegacyEntry } from './types.js';

export const batch5: LegacyEntry[] = [
  {
    number: 108,
    funcName: 'validTree',
    argNames: ['n', 'edges'],
    edge: [
      [4, [[0, 1], [0, 2], [1, 3]]],
      [3, [[0, 1], [1, 2], [2, 0]]],
      [2, [[0, 1]]],
      [1, []],
      [3, [[0, 1], [1, 2]]],
    ],
    gen: (r) => {
      const n = r.int(2, 7);
      // Half the time build a real tree (n-1 edges, acyclic, connected).
      if (r.next() < 0.5) {
        const edges = [];
        for (let v = 1; v < n; v++) {
          const u = r.int(0, v - 1);
          edges.push(r.next() < 0.5 ? [u, v] : [v, u]);
        }
        return [n, edges];
      }
      // Otherwise a random edge set, usually invalid.
      const edges = [];
      const count = r.int(1, n);
      for (let i = 0; i < count; i++) {
        const a = r.int(0, n - 1);
        let b = r.int(0, n - 1);
        if (b === a) b = (a + 1) % n;
        edges.push([a, b]);
      }
      return [n, edges];
    },
    solve: (args) => {
      // A valid tree has n-1 edges, is connected, and has no cycle.
      const n = args[0];
      const edges = args[1];
      if (edges.length !== n - 1) return false;
      const parent = [];
      for (let i = 0; i < n; i++) parent.push(i);
      const find = (x) => {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      };
      for (const [a, b] of edges) {
        const ra = find(a);
        const rb = find(b);
        // Joining two nodes already in the same component closes a cycle.
        if (ra === rb) return false;
        parent[ra] = rb;
      }
      let root = 0;
      for (let i = 1; i < n; i++) if (find(i) !== find(root)) return false;
      return true;
    },
  },
  {
    number: 144,
    funcName: 'findCircleNum',
    argNames: ['isConnected'],
    edge: [
      [[[1, 1, 0], [1, 1, 0], [0, 0, 1]]],
      [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]],
      [[[1]]],
      [[[0, 1], [1, 0]]],
      [[[1, 1], [0, 1]]],
    ],
    gen: (r) => {
      const n = r.int(1, 4);
      const rows = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(r.int(0, 1));
        rows.push(row);
      }
      return [rows];
    },
    solve: (args) => {
      // BFS from (0,0) counting how many cells are reachable.
      const grid = args[0];
      const n = grid.length;
      const seen = [];
      for (let i = 0; i < n; i++) seen.push(new Array(n).fill(false));
      let count = 0;
      const stack = [[0, 0]];
      while (stack.length) {
        const [r, c] = stack.pop();
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        if (seen[r][c] || grid[r][c] === 0) continue;
        seen[r][c] = true;
        count++;
        stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
      }
      return count;
    },
  },
  {
    number: 156,
    funcName: 'findRedundantConnection',
    argNames: ['edges'],
    edge: [
      [[[1, 2], [1, 3], [2, 3]]],
      [[[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]],
      [[[2, 1], [3, 1], [4, 2], [1, 4]]],
      [[[1, 2], [2, 3]]],
      [[[3, 4], [1, 2], [2, 3]]],
    ],
    gen: (r) => {
      // Start from a tree, then add one edge that closes a cycle.
      const nodes = r.int(3, 6);
      const edges = [];
      for (let v = 2; v <= nodes; v++) edges.push([r.int(1, v - 1), v]);
      const a = r.int(1, nodes);
      const b = r.int(1, nodes);
      edges.push([a, b]);
      return [edges];
    },
    solve: (args) => {
      // Union-find: the edge that joins two already-connected nodes is the one.
      const edges = args[0];
      const parent = new Map();
      const find = (x) => {
        while (parent.get(x) !== x) {
          parent.set(x, parent.get(parent.get(x)));
          x = parent.get(x);
        }
        return x;
      };
      for (const [a, b] of edges) {
        if (!parent.has(a)) parent.set(a, a);
        if (!parent.has(b)) parent.set(b, b);
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return [a, b];
        parent.set(ra, rb);
      }
      return [];
    },
  },
  {
    number: 165,
    funcName: 'networkDelayTime',
    argNames: ['times', 'n', 'k'],
    edge: [
      [[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 1],
      [[[1, 2, 1]], 2, 1],
      [[[1, 2, 1]], 2, 2],
      [[[1, 2, 1], [2, 3, 1]], 3, 1],
      [[[1, 2, 1]], 3, 1],
    ],
    gen: (r) => {
      const n = r.int(2, 5);
      const times = [];
      const count = r.int(1, 6);
      for (let i = 0; i < count; i++) {
        const u = r.int(1, n);
        let v = r.int(1, n);
        if (v === u) v = (v % n) + 1;
        times.push([u, v, r.int(1, 9)]);
      }
      return [times, n, r.int(1, n)];
    },
    solve: (args) => {
      // Dijkstra over the weighted directed graph from node k.
      const times = args[0];
      const n = args[1];
      const k = args[2];
      const adj = new Map();
      for (const [u, v, w] of times) {
        if (!adj.has(u)) adj.set(u, []);
        adj.get(u).push([v, w]);
      }
      const dist = new Array(n + 1).fill(Infinity);
      dist[k] = 0;
      const visited = new Array(n + 1).fill(false);
      for (let iter = 0; iter < n; iter++) {
        let best = -1;
        for (let i = 1; i <= n; i++) {
          if (!visited[i] && (best === -1 || dist[i] < dist[best])) best = i;
        }
        if (best === -1 || dist[best] === Infinity) break;
        visited[best] = true;
        for (const [v, w] of adj.get(best) ?? []) {
          if (dist[best] + w < dist[v]) dist[v] = dist[best] + w;
        }
      }
      let worst = 0;
      for (let i = 1; i <= n; i++) {
        if (dist[i] === Infinity) return -1;
        if (dist[i] > worst) worst = dist[i];
      }
      return worst;
    },
  },
  {
    number: 171,
    funcName: 'swimInWater',
    argNames: ['grid'],
    edge: [
      [[[0, 2], [1, 3]]],
      [[[3, 6], [2, 4]]],
      [[[0, 1, 2, 3, 4], [24, 23, 22, 21, 5], [12, 13, 14, 15, 16], [11, 17, 18, 19, 20], [10, 9, 8, 7, 6]]],
      [[[0]]],
      [[[1, 0]]],
    ],
    gen: (r) => {
      const n = r.int(2, 4);
      const grid = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(r.int(0, 9));
        grid.push(row);
      }
      return [grid];
    },
    solve: (args) => {
      // Minimax: at time t you may enter any cell whose value is <= t.
      const grid = args[0];
      const n = grid.length;
      let lo = 0;
      let hi = 0;
      for (const row of grid) for (const v of row) if (v > hi) hi = v;
      const canReach = (limit) => {
        if (grid[0][0] > limit) return false;
        const seen = [];
        for (let i = 0; i < n; i++) seen.push(new Array(n).fill(false));
        const stack = [[0, 0]];
        seen[0][0] = true;
        while (stack.length) {
          const [r, c] = stack.pop();
          if (r === n - 1 && c === n - 1) return true;
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            if (seen[nr][nc] || grid[nr][nc] > limit) continue;
            seen[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
        return false;
      };
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (canReach(mid)) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
  },
  {
    number: 184,
    funcName: 'orangesRotting',
    argNames: ['grid'],
    edge: [
      [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]],
      [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]],
      [[[0, 2]]],
      [[[0]]],
      [[[1]]],
    ],
    gen: (r) => {
      const n = r.int(2, 4);
      const grid = [];
      for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) row.push(r.int(0, 2));
        grid.push(row);
      }
      return [grid];
    },
    solve: (args) => {
      // Layer-by-layer BFS from every rotten orange.
      const grid = args[0];
      const n = grid.length;
      let fresh = 0;
      const queue = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (grid[i][j] === 2) queue.push([i, j]);
          else if (grid[i][j] === 1) fresh++;
        }
      }
      let minutes = 0;
      while (queue.length && fresh > 0) {
        const size = queue.length;
        for (let k = 0; k < size; k++) {
          const [r, c] = queue.shift();
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            if (grid[nr][nc] === 1) {
              grid[nr][nc] = 2;
              fresh--;
              queue.push([nr, nc]);
            }
          }
        }
        minutes++;
      }
      return fresh === 0 ? minutes : -1;
    },
  },
  {
    number: 158,
    funcName: 'maxAreaOfIsland',
    argNames: ['grid'],
    edge: [
      [[[0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0], [0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]]],
      [[[0, 0, 0, 0, 0, 0, 0, 0]]],
      [[[1]]],
      [[[0]]],
      [[[1, 1], [1, 0]]],
    ],
    gen: (r) => {
      const rows = r.int(1, 4);
      const cols = r.int(1, 4);
      const grid = [];
      for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) row.push(r.int(0, 1));
        grid.push(row);
      }
      return [grid];
    },
    solve: (args) => {
      // Flood fill each island, tracking the largest.
      const grid = args[0];
      const rows = grid.length;
      const cols = grid[0].length;
      let best = 0;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (grid[i][j] !== 1) continue;
          let area = 0;
          const stack = [[i, j]];
          grid[i][j] = 0;
          while (stack.length) {
            const [r, c] = stack.pop();
            area++;
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
              if (grid[nr][nc] === 1) {
                grid[nr][nc] = 0;
                stack.push([nr, nc]);
              }
            }
          }
          if (area > best) best = area;
        }
      }
      return best;
    },
  },
  {
    number: 186,
    funcName: 'findOrder',
    argNames: ['numCourses', 'prerequisites'],
    edge: [
      [2, [[1, 0]]],
      [1, []],
      [4, [[1, 0], [2, 0], [3, 1], [3, 2]]],
      [2, [[1, 0], [0, 1]]],
      [3, [[0, 1], [1, 2]]],
    ],
    gen: (r) => {
      const n = r.int(1, 6);
      const edges = [];
      const count = r.int(0, 6);
      for (let i = 0; i < count; i++) {
        const a = r.int(0, n - 1);
        const b = r.int(0, n - 1);
        if (a !== b) edges.push([a, b]);
      }
      return [n, edges];
    },
    solve: (args) => {
      // Kahn's algorithm: the first time a node's indegree hits zero, emit it.
      const n = args[0];
      const edges = args[1];
      const adj = [];
      for (let i = 0; i < n; i++) adj.push([]);
      const indegree = new Array(n).fill(0);
      for (const [a, b] of edges) {
        adj[a].push(b);
        indegree[b]++;
      }
      const queue = [];
      for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i);
      const out = [];
      while (queue.length) {
        const node = queue.shift();
        out.push(node);
        for (const next of adj[node]) {
          indegree[next]--;
          if (indegree[next] === 0) queue.push(next);
        }
      }
      return out.length === n ? out : [];
    },
  },
];
