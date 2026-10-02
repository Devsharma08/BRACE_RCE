/**
 * Test-case generators for the four problems with bespoke drivers.
 *
 * Each generator returns the raw stdin text for one case; the expected output
 * is produced by running the reference through the real pipeline (see
 * expand_special_test_cases.ts).
 */
import type { Rng } from '../helpers.js';

export interface SpecialTestSpec {
  number: number;
  gen: (r: Rng) => string;
}

let __t112 = 0;

export const SPECIAL_TESTS: SpecialTestSpec[] = [
  {
    number: 30,
    gen: (r) => {
      // A connected graph over distinct values, emitted as
      // [[val, [neighbourValues]], ...] so every edge resolves.
      const n = r.int(1, 5);
      // Node values MUST be distinct: the encoding identifies neighbours by
      // value, so duplicates make an edge ambiguous.
      const vals = [];
      while (vals.length < n) {
        const v = r.int(1, 30);
        if (vals.indexOf(v) === -1) vals.push(v);
      }
      const neighbors = vals.map(() => new Set<number>());
      // Chain first so the graph is always connected.
      for (let i = 1; i < n; i++) {
        neighbors[i - 1].add(vals[i]);
        neighbors[i].add(vals[i - 1]);
      }
      for (let extra = 0; extra < r.int(0, 3); extra++) {
        const a = r.int(0, n - 1);
        let b = r.int(0, n - 1);
        if (a === b) continue;
        neighbors[a].add(vals[b]);
        neighbors[b].add(vals[a]);
      }
      const rows = vals.map((v, i) => [v, [...neighbors[i]]]);
      return JSON.stringify(rows);
    },
  },
  {
    number: 111,
    gen: (r) => {
      // Gaps around the 50ms window: under it, calls collapse; over it, each
      // one fires. The driver always settles the final call.
      const count = r.int(1, 4);
      const waits = [];
      for (let i = 0; i < count; i++) waits.push(r.next() < 0.6 ? r.int(5, 30) : r.int(70, 110));
      return JSON.stringify(waits);
    },
  },
  {
    number: 112,
    gen: (r) => {
      // The deterministic RNG's branches are not evenly spread, so alternate
      // on a per-problem counter: even indices finish inside the limit, odd
      // indices let the limit win. Both outcomes are then guaranteed.
      __t112 += 1;
      const t = r.int(20, 90);
      const wins = __t112 % 2 === 1;
      const delay = wins ? t + r.int(20, 80) : r.int(1, Math.max(1, t - 10));
      return JSON.stringify([delay, t]);
    },
  },
  {
    number: 117,
    gen: (r) => {
      // Mix of resolutions and a possible rejection.
      // Every third case rejects, so the rejection path is always covered.
      const n = r.int(1, 4);
      const entries = [];
      for (let i = 0; i < n; i++) {
        const delay = r.int(5, 60);
        entries.push([delay, 'resolve', 'v' + (i + 1)]);
      }
      if (r.int(0, 2) === 0) {
        const at = r.int(0, entries.length - 1);
        entries[at] = [entries[at][0], 'reject', 'boom'];
      }
      return JSON.stringify(entries);
    },
  },
];
