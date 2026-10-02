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
/**
 * Legacy references, batch 8 — BFS/DFS, heaps and interval problems.
 *
 * Tree parameters normalise through a local asTree(); linked lists arrive as a
 * flat array of values.
 */
import type { LegacyEntry } from './types.js';

export const batch8: LegacyEntry[] = [
  {
    number: 27,
    funcName: 'ladderLength',
    argNames: ['beginWord', 'endWord', 'wordList'],
    edge: [
      ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']],
      ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']],
      ['a', 'c', ['a', 'b', 'c']],
      ['a', 'a', ['a']],
      ['x', 'x', ['x', 'y']],
    ],
    gen: (r) => {
      // Build a word ladder of fixed-length words so single edits connect them.
      const len = r.int(1, 3);
      const mkWord = () => {
        let w = '';
        for (let i = 0; i < len; i++) w += 'abc'[r.int(0, 2)];
        return w;
      };
      const count = r.int(2, 7);
      const wordList = [];
      for (let i = 0; i < count; i++) wordList.push(mkWord());
      return [wordList[0], wordList[wordList.length - 1], wordList];
    },
    solve: (args) => {
      const beginWord = args[0];
      const endWord = args[1];
      const wordList = args[2];
      const dict = new Set(wordList);
      if (!dict.has(endWord)) return 0;
      // BFS over words that differ by exactly one character.
      const neighbours = (word) => {
        const out = [];
        for (let i = 0; i < word.length; i++) {
          for (const c of 'abc') {
            if (c === word[i]) continue;
            const candidate = word.slice(0, i) + c + word.slice(i + 1);
            if (dict.has(candidate)) out.push(candidate);
          }
        }
        return out;
      };
      let level = [beginWord];
      let steps = 1;
      const seen = new Set([beginWord]);
      while (level.length) {
        const next = [];
        for (const word of level) {
          if (word === endWord) return steps;
          for (const n of neighbours(word)) {
            if (seen.has(n)) continue;
            seen.add(n);
            next.push(n);
          }
        }
        level = next;
        steps++;
      }
      return 0;
    },
  },
  {
    number: 102,
    funcName: 'lowestCommonAncestor',
    argNames: ['root', 'p', 'q'],
    edge: [
      [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8],
      [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4],
      [[2, 1], 2, 1],
      [[1], 1, 1],
      [[1, 2], 1, 2],
    ],
    gen: (r) => {
      const bst = r.bst(r.int(1, 8));
      const keys = [];
      for (const v of bst) if (v != null) keys.push(v);
      if (keys.length === 0) return [[1], 1, 1];
      // p and q must be actual keys in the tree.
      return [bst, r.pick(keys), r.pick(keys)];
    },
    solve: (args) => {
      // The wrapper only converts to TreeNode when its name heuristic fires, so
      // accept either representation.
      const asTree = (input) => {
        if (input == null) return null;
        if (!Array.isArray(input)) return input;
        if (input.length === 0) return null;
        const nodes = input.map((v) => (v == null ? null : { val: v, left: null, right: null }));
        let k = 1;
        const q = [nodes[0]];
        while (q.length) {
          const cur = q.shift();
          for (const key of ['left', 'right']) {
            if (k < nodes.length) {
              cur[key] = nodes[k];
              if (nodes[k]) q.push(nodes[k]);
              k++;
            }
          }
        }
        return nodes[0];
      };
      const root = asTree(args[0]);
      const p = args[1];
      const q = args[1] === undefined ? undefined : args[2];
      const find = (node, target) => {
        if (!node) return null;
        if (node.val === target) return node;
        return find(node.left, target) ?? find(node.right, target);
      };
      const nodeP = find(root, p);
      const nodeQ = find(root, q);
      if (!nodeP || !nodeQ) return null;
      // Descend both together; the first shared node is the ancestor.
      let cur = root;
      while (cur) {
        if (p > cur.val && q > cur.val) cur = cur.right;
        else if (p < cur.val && q < cur.val) cur = cur.left;
        else return cur.val;
      }
      return null;
    },
  },
  {
    number: 167,
    funcName: 'openLock',
    argNames: ['deadends', 'target'],
    edge: [
      [['0201', '0101', '0102', '1212', '2002'], '0202'],
      [['8888', '8889', '8878', '8898', '8788', '8988', '7888', '9888'], '8888'],
      [['0000'], '8888'],
      [['0000'], '0000'],
      [['0111', '2111', '2110', '1211', '0211', '0210'], '0210'],
    ],
    gen: (r) => {
      // A handful of dead ends, then target drawn from the remaining space.
      const count = r.int(1, 5);
      const deadends = [];
      for (let i = 0; i < count; i++) {
        let d = '';
        for (let j = 0; j < 4; j++) d += String(r.int(0, 9));
        deadends.push(d);
      }
      let target = '';
      for (let j = 0; j < 4; j++) target += String(r.int(0, 9));
      return [deadends, target];
    },
    solve: (args) => {
      // BFS over the 10,000 possible states, moving one wheel at a time.
      const deadends = args[0];
      const target = args[1];
      const dead = new Set(deadends);
      const start = '0000';
      if (dead.has(start)) return -1;
      if (target === start) return 0;
      let level = [start];
      let steps = 1;
      const seen = new Set([start]);
      while (level.length) {
        const next = [];
        for (const code of level) {
          for (let i = 0; i < 4; i++) {
            const digit = Number(code[i]);
            for (const delta of [1, 9]) {
              const turned = code.slice(0, i) + ((digit + delta) % 10) + code.slice(i + 1);
              if (seen.has(turned) || dead.has(turned)) continue;
              if (turned === target) return steps;
              seen.add(turned);
              next.push(turned);
            }
          }
        }
        level = next;
        steps++;
      }
      return -1;
    },
  },
  {
    number: 168,
    funcName: 'employeeFreeTime',
    argNames: ['schedule'],
    edge: [
      [[[[0, 1], [2, 3], [4, 5]]]],
      [[[[1, 3], [6, 7]]]],
      [[[[1, 3]]]],
      [[[[0, 1], [2, 4], [5, 6]]]],
      [[[[0, 2], [3, 5], [6, 8]]]],
    ],
    gen: (r) => {
      // Intervals for one employee, strictly increasing and non-overlapping.
      const count = r.int(1, 4);
      const intervals = [];
      let cursor = r.int(0, 5);
      for (let i = 0; i < count; i++) {
        const span = r.int(1, 4);
        intervals.push([cursor, cursor + span]);
        cursor += span + r.int(1, 4);
      }
      return [[intervals]];
    },
    solve: (args) => {
      // The employee is free wherever no interval covers the time.
      const busy = args[0][0];
      if (busy.length === 0) return [];
      const gaps = [];
      // start is the first gap, from minus infinity up to the first interval.
      if (busy[0][0] > 0) gaps.push([-Infinity, busy[0][0]]);
      for (let i = 0; i + 1 < busy.length; i++) {
        if (busy[i][1] < busy[i + 1][0]) gaps.push([busy[i][1], busy[i + 1][0]]);
      }
      const last = busy[busy.length - 1];
      if (last[1] < Infinity) gaps.push([last[1], Infinity]);
      // Replace the sentinels with plain integers, which is what JSON needs.
      return gaps.map((g) => [
        g[0] === -Infinity ? -1 : g[0],
        g[1] === Infinity ? 1e9 : g[1],
      ]);
    },
  },
  {
    number: 172,
    funcName: 'findCheapestPrice',
    argNames: ['n', 'flights', 'src', 'dst', 'k'],
    edge: [
      [3, [[0, 1, 100], [1, 2, 100], [2, 0, 100]], 0, 1, 1],
      [2, [[0, 1, 100]], 0, 1, 1],
      [2, [[0, 1, 100], [1, 0, 100]], 0, 1, 2],
      [3, [[0, 1, 100], [0, 2, 5], [2, 1, 5]], 0, 1, 2],
      [2, [[1, 0, 100]], 1, 0, 1],
    ],
    gen: (r) => {
      const n = r.int(2, 5);
      const flights = [];
      const count = r.int(1, 6);
      for (let i = 0; i < count; i++) {
        const from = r.int(0, n - 1);
        let to = r.int(0, n - 1);
        if (to === from) to = (to + 1) % n;
        flights.push([from, to, r.int(1, 30)]);
      }
      return [n, flights, 0, n - 1, r.int(1, 3)];
    },
    solve: (args) => {
      // Bellman-Ford relaxation limited to at most k stops.
      const n = args[0];
      const flights = args[1];
      const src = args[2];
      const dst = args[3];
      const k = args[4];
      const dist = new Array(n).fill(Infinity);
      dist[src] = 0;
      for (let step = 0; step < k; step++) {
        const next = dist.slice();
        for (const [u, v, cost] of flights) {
          if (dist[u] === Infinity) continue;
          if (dist[u] + cost < next[v]) next[v] = dist[u] + cost;
        }
        dist.splice(0, dist.length, ...next);
      }
      return dist[dst] === Infinity ? -1 : dist[dst];
    },
  },
  {
    number: 157,
    funcName: 'fullJustify',
    argNames: ['words', 'maxWidth'],
    edge: [
      [['This', 'is', 'an', 'example', 'of', 'text', 'justification.'], 16],
      [['What', 'had', 'you', 'done?'], 16],
      [['a'], 1],
      [['a', 'b'], 3],
      [['ab', 'cd'], 5],
    ],
    gen: (r) => {
      // Every word must fit on a line, so keep the longest under maxWidth.
      const count = r.int(1, 5);
      const words = [];
      for (let i = 0; i < count; i++) words.push(r.str(r.int(1, 5), 'ab'));
      return [words, r.int(6, 20)];
    },
    solve: (args) => {
      const words = args[0];
      const maxWidth = args[1];
      const lines = [];
      let i = 0;
      while (i < words.length) {
        // Greedily take as many words as fit, counting the single spaces.
        let j = i;
        let letters = 0;
        while (j < words.length) {
          // letters so far + this word + one gap per existing word.
          const needed = letters + words[j].length + (j - i);
          if (needed > maxWidth) break;
          letters = needed;
          j++;
        }
        const lineWords = words.slice(i, j);
        const isLast = j === words.length;
        if (lineWords.length === 0) {
          // Defensive: never emit an empty line.
          i = j + 1;
          continue;
        }
        if (lineWords.length === 1 || isLast) {
          // Justify left with single trailing spaces.
          lines.push(lineWords.join(' ').padEnd(maxWidth, ' '));
        } else {
          // Spread the slack evenly across the gaps.
          const gaps = lineWords.length - 1;
          const total = Math.max(0, maxWidth - letters);
          const base = Math.floor(total / gaps);
          const extra = total % gaps;
          let out = lineWords[0];
          for (let k = 1; k < lineWords.length; k++) {
            out += ' '.repeat(base + (k <= extra ? 1 : 0)) + lineWords[k];
          }
          lines.push(out);
        }
        i = j;
      }
      return lines;
    },
  },
  {
    number: 113,
    funcName: 'alienOrder',
    argNames: ['words'],
    edge: [
      [['hello', 'leetcode']],
      [['word', 'world', 'row']],
      [['abc', 'bcd', 'cde']],
      [['b', 'a']],
      [['a', 'b', 'c']],
    ],
    gen: (r) => {
      // Sorted words under a fixed valid alphabet, so a topological order
      // always exists.
      const order = 'abcdef';
      const count = r.int(2, 5);
      const words = [];
      for (let i = 0; i < count; i++) {
        const len = r.int(1, 3);
        let w = '';
        for (let j = 0; j < len; j++) w += order[r.int(0, 5)];
        words.push(w);
      }
      return [words];
    },
    solve: (args) => {
      // Adjacency from the first differing letter of each adjacent pair.
      const words = args[0];
      const adj = new Map();
      const indegree = new Map();
      for (const w of words) {
        for (const c of w) if (!indegree.has(c)) indegree.set(c, 0);
      }
      for (let i = 0; i + 1 < words.length; i++) {
        const a = words[i];
        const b = words[i + 1];
        for (let k = 0; k < Math.min(a.length, b.length); k++) {
          if (a[k] === b[k]) continue;
          if (!adj.has(a[k])) adj.set(a[k], new Set());
          const set = adj.get(a[k]);
          if (!set.has(b[k])) {
            set.add(b[k]);
            indegree.set(b[k], indegree.get(b[k]) + 1);
          }
          break;
        }
      }
      // Kahn's algorithm over the letters.
      const queue = [];
      for (const [c, d] of indegree) if (d === 0) queue.push(c);
      queue.sort();
      const out = [];
      while (queue.length) {
        const c = queue.shift();
        out.push(c);
        for (const next of adj.get(c) ?? []) {
          indegree.set(next, indegree.get(next) - 1);
          if (indegree.get(next) === 0) {
            queue.push(next);
            queue.sort();
          }
        }
      }
      return out.length === indegree.size ? out : '';
    },
  },
  {
    number: 105,
    funcName: 'mergeKLists',
    argNames: ['lists'],
    edge: [
      [[[1, 4, 5], [1, 3, 4], [2, 6]]],
      [[[]]],
      [[[], []]],
      [[[1]]],
      [[[1, 2, 3]]],
    ],
    gen: (r) => {
      // Each list must already be sorted, which is the premise.
      const count = r.int(0, 4);
      const lists = [];
      let v = r.int(1, 5);
      for (let i = 0; i < count; i++) {
        const len = r.int(0, 4);
        const list = [];
        for (let j = 0; j < len; j++) {
          v += r.int(1, 4);
          list.push(v);
        }
        lists.push(list);
      }
      return [lists];
    },
    solve: (args) => {
      // Repeatedly merge the shortest pair until one list remains.
      let lists = args[0].filter((l) => l.length > 0).map((l) => l.slice());
      if (lists.length === 0) return [];
      while (lists.length > 1) {
        lists.sort((a, b) => a.length - b.length);
        const first = lists.shift();
        const second = lists.shift();
        const merged = [];
        let i = 0;
        let j = 0;
        while (i < first.length && j < second.length) {
          if (first[i] <= second[j]) merged.push(first[i++]);
          else merged.push(second[j++]);
        }
        while (i < first.length) merged.push(first[i++]);
        while (j < second.length) merged.push(second[j++]);
        lists.push(merged);
      }
      return lists[0];
    },
  },
  {
    number: 128,
    funcName: 'findItinerary',
    argNames: ['tickets'],
    edge: [
      [[['MUC', 'LHR'], ['JFK', 'MUC'], ['SFO', 'SJC'], ['LHR', 'SFO']]],
      [[['ATL', 'JFK'], ['ATL', 'SFO'], ['JFK', 'ATL']]],
      [[['LAX', 'JFK']]],
      [[['A', 'B']]],
      [[['A', 'B'], ['B', 'A']]],
    ],
    gen: (r) => {
      // Generate a path from a fixed hub, then shuffle the ticket order, so
      // the greedy solution always exists.
      const nodes = ['A', 'B', 'C', 'D'];
      const tickets = [];
      let current = 'A';
      const steps = r.int(1, 5);
      for (let i = 0; i < steps; i++) {
        let next = r.pick(nodes.filter((n) => n !== current));
        tickets.push([current, next]);
        current = next;
      }
      for (let i = tickets.length - 1; i > 0; i--) {
        const j = r.int(0, i);
        const t = tickets[i];
        tickets[i] = tickets[j];
        tickets[j] = t;
      }
      return [tickets];
    },
    solve: (args) => {
      // Hierholzer's algorithm via a sorted map and an iterative stack.
      const tickets = args[0];
      const adj = new Map();
      for (const [from, to] of tickets) {
        if (!adj.has(from)) adj.set(from, []);
        adj.get(from).push(to);
      }
      for (const list of adj.values()) list.sort();
      const route = [];
      const stack = [];
      const visit = () => {
        const node = stack[stack.length - 1];
        const list = adj.get(node);
        if (list && list.length > 0) {
          stack.push(list.shift());
          visit();
        } else {
          route.push(stack.pop());
        }
      };
      // Start from the first departure so the route begins correctly.
      const start = tickets.length ? tickets[0][0] : '';
      stack.push(start);
      visit();
      route.reverse();
      return route;
    },
  },
];
