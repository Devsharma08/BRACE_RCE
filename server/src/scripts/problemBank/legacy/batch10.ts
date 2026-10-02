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
 * Legacy references, batch 10 — the last four with workable encodings.
 *
 * Linked List Cycle passes the index at which the list closes into a cycle
 * (or -1 for an acyclic list) as a second argument, which is what makes the
 * cycle representable in a flat value array at all.
 */
import type { LegacyEntry } from './types.js';

export const batch10: LegacyEntry[] = [
  {
    number: 33,
    funcName: 'hasCycle',
    argNames: ['head', 'cycleIndex'],
    edge: [
      [[3, 2, 0, -4], 1],
      [[1, 2], 0],
      [[1], -1],
      [[], -1],
      [[1, 2], -1],
    ],
    gen: (r) => {
      const n = r.int(0, 8);
      const vals = [];
      for (let i = 0; i < n; i++) vals.push(r.int(1, 50));
      // -1 means acyclic; otherwise the last node points back to this index.
      const idx = n === 0 || r.next() < 0.4 ? -1 : r.int(0, n - 1);
      return [vals, idx];
    },
    solve: (args) => {
      const n = args[0].length;
      const idx = args[1];
      // A cycle exists exactly when the list is non-empty and closes.
      return n > 0 && idx >= 0 ? true : false;
    },
  },
  {
    number: 122,
    funcName: 'findDuplicate',
    argNames: ['nums'],
    edge: [
      [[1, 3, 4, 2, 2]],
      [[3, 1, 3, 4, 2]],
      [[1, 1]],
      [[2, 2]],
      [[1, 1, 2]],
    ],
    gen: (r) => {
      const n = r.int(2, 9);
      const dup = r.int(1, n);
      const nums = [];
      for (let i = 1; i <= n; i++) nums.push(i);
      // Overwrite one slot with the duplicate. Values stay within 1..n, so
      // index-based traversal never leaves the array.
      nums[r.int(0, n - 1)] = dup;
      return [nums];
    },
    solve: (args) => {
      // The duplicate is the value appearing more than once.
      const seen = new Set();
      for (const v of args[0]) {
        if (seen.has(v)) return v;
        seen.add(v);
      }
      return -1;
    },
  },
  {
    number: 116,
    funcName: 'encode',
    argNames: ['strs'],
    edge: [
      [['Hello', 'World']],
      [['']],
      [['Hi']],
      [[]],
      [['a', 'bb', 'ccc']],
    ],
    gen: (r) => {
      const n = r.int(0, 5);
      const strs = [];
      for (let i = 0; i < n; i++) strs.push(r.str(r.int(0, 8), 'abc'));
      return [strs];
    },
    solve: (args) => {
      // Round-trip encode then decode: the platform compares the result with
      // the input, so the reference returns the decoded array.
      const strs = args[0];
      const encoded = strs.map((s) => s + ':' + s.length).join('');
      const out = [];
      let i = 0;
      while (i < encoded.length) {
        const colon = encoded.indexOf(':', i);
        const len = Number(encoded.slice(colon + 1));
        out.push(encoded.slice(i, colon));
        i = colon + 1 + String(len).length;
      }
      return out;
    },
  },
  {
    number: 118,
    funcName: 'join',
    argNames: ['arr1', 'arr2'],
    edge: [
      [[{ id: 1, x: 1 }, { id: 2, x: 2 }], [{ id: 1, y: 1 }, { id: 3, y: 3 }]],
      [[{ id: 1 }], [{ id: 1, a: 1 }]],
      [[{ id: 1 }], []],
      [[], [{ id: 1, b: 2 }]],
      [[{ id: 5, v: 1 }], [{ id: 5, w: 2 }]],
    ],
    gen: (r) => {
      // Distinct ids in each array, with disjoint extras so the merge is clear.
      const a = [];
      const b = [];
      const n = r.int(1, 4);
      for (let i = 0; i < n; i++) a.push({ id: r.int(1, 6), x: r.int(1, 9) });
      const m = r.int(1, 4);
      for (let i = 0; i < m; i++) b.push({ id: r.int(1, 6), y: r.int(1, 9) });
      return [a, b];
    },
    solve: (args) => {
      // Merge on id, preserving first-array order then second-only entries.
      const byId = new Map();
      for (const item of args[0]) byId.set(item.id, { ...item });
      for (const item of args[1]) {
        const existing = byId.get(item.id);
        if (existing) Object.assign(existing, item);
        else byId.set(item.id, { ...item });
      }
      return [...byId.values()];
    },
  },
];
