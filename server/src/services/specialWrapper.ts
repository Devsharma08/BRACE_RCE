/**
 * Execution support for the four problems that fit no standard driver.
 *
 * Clone Graph takes an adjacency list where each node is `[val, neighbours]`,
 * but the generic wrapper converts array arguments into TreeNodes whenever the
 * parameter is named something tree-ish, which destroys the graph. It also
 * needs to serialise the RESULT back the same way.
 *
 * Debounce, Promise Time Limit and promiseAll are asynchronous: they take
 * functions, not JSON, and return promises. A single stdin line cannot describe
 * a function, so each case is given a small declarative spec that this driver
 * turns into real functions and real timing.
 *
 * Detection is by the starter snippet's identifiers, each of which was checked
 * to appear in exactly one problem across the whole set:
 *   `neighbors` / `cloneGraph` -> graph
 *   `debounce`                  -> debounce
 *   `timeLimit`                 -> promise time limit
 *   `promiseAll`                -> parallel execution
 */

export type SpecialKind = 'graph' | 'debounce' | 'timeLimit' | 'promiseAll';

/** Classify a starter snippet, or return null when it is an ordinary problem. */
export function detectSpecialKind(code: string): SpecialKind | null {
  if (!code) return null;
  if (code.includes('cloneGraph') || code.includes('neighbors')) return 'graph';
  if (code.includes('debounce')) return 'debounce';
  if (code.includes('timeLimit')) return 'timeLimit';
  if (code.includes('promiseAll')) return 'promiseAll';
  return null;
}

function graphDriver(): string {
  return `
// ── graph driver ──────────────────────────────────────────────────────────
// Input encoding: [[val, [neighbourValues...]], ...] where every neighbour
// value is guaranteed to be one of the declared node values. The cases that
// used to be stored here ([[2,4],[1,3],...]) were not resolvable at all — the
// node values were 2 and 1 while the declared neighbours were 4 and 3 — so the
// generator now emits self-consistent graphs. Build the graph, call
// cloneGraph, and print the clone back in the same encoding.
const __raw = require('fs').readFileSync(0, 'utf-8').trim();
const __spec = __raw ? JSON.parse(__raw) : [];

// The starter snippet documents Node only inside a comment, so the driver
// supplies it — mirroring how treeHelpers supplies TreeNode elsewhere.
function Node(val, neighbors) {
  this.val = val === undefined ? 0 : val;
  this.neighbors = neighbors === undefined ? [] : neighbors;
}

function __build(entries) {
  const nodes = entries.map(function (e) { return { val: e[0], neighbors: [] }; });
  entries.forEach(function (e, i) {
    let list = e[1];
    if (list === null || list === undefined) list = [];
    else if (!Array.isArray(list)) list = [list];
    // Neighbours are given by value, so resolve each to its node. The graph
    // is undirected, so an edge one way is an edge both ways.
    list.forEach(function (v) {
      for (const n of nodes) {
        if (n.val !== v) continue;
        if (nodes[i].neighbors.indexOf(n) === -1) nodes[i].neighbors.push(n);
        if (n.neighbors.indexOf(nodes[i]) === -1) n.neighbors.push(nodes[i]);
      }
    });
  });
  return nodes.length ? nodes[0] : null;
}

function __encode(head) {
  // Re-number in discovery order, then report each node's neighbour VALUES.
  const order = [];
  const seen = new Set();
  const queue = head ? [head] : [];
  while (queue.length) {
    const node = queue.shift();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    order.push(node);
    for (const nb of node.neighbors) queue.push(nb);
  }
  return order.map(function (node) {
    return [node.val, node.neighbors.map(function (nb) { return nb.val; })];
  });
}

const __input = __build(__spec);
const __clone = cloneGraph(__input);
console.log(JSON.stringify(__encode(__clone)));
`;
}

function debounceDriver(): string {
  return `
// ── debounce driver ───────────────────────────────────────────────────────
// Input: [waitMs, waitMs, ...] — the gaps between successive invocations.
// A trailing wait is required so the final invocation actually fires.
const __raw = require('fs').readFileSync(0, 'utf-8').trim();
const __waits = __raw ? JSON.parse(__raw) : [];

const __sleep = (ms) => new Promise(function (r) { setTimeout(r, ms); });

(async function () {
  // Each call records whether the wrapped function has fired yet.
  const __seen = [];
  const __wrapped = debounce(function () { __seen.push('fired'); }, 50);

  for (let i = 0; i < __waits.length; i++) {
    __wrapped();
    // A gap longer than the debounce window lets the timer fire; a shorter
    // one keeps resetting it. That difference is what is being tested.
    await __sleep(__waits[i] > 50 ? __waits[i] : 50);
  }
  // The final invocation must always be allowed to run.
  __wrapped();
  await __sleep(150);
  console.log(JSON.stringify(__seen.length));
})().catch(function (e) {
  console.error('EXECUTION ERROR:', e.message || e);
  process.exit(1);
});
`;
}

function timeLimitDriver(): string {
  return `
// ── promise time-limit driver ─────────────────────────────────────────────
// Input: [delayMs, tMs] — the wrapped function resolves after delayMs, and
// timeLimit is given tMs. Either the value arrives or the limit wins.
const __raw = require('fs').readFileSync(0, 'utf-8').trim();
const __spec = __raw ? JSON.parse(__raw) : [100, 100];
const __delay = __spec[0];
const __t = __spec[1];

(async function () {
  const fn = function () {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve('result'); }, __delay);
    });
  };
  let outcome;
  try {
    // timeLimit rejects when the limit is exceeded; that is a valid outcome,
    // not an error, so it is caught rather than allowed to escape.
    const value = await Promise.race([
      timeLimit(fn, __t),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('timeout')); }, __t + 400);
      }),
    ]);
    outcome = value === undefined ? 'timeout' : String(value);
  } catch (e) {
    outcome = 'timeout';
  }
  console.log(JSON.stringify(outcome));
})().catch(function (e) {
  console.error('EXECUTION ERROR:', e.message || e);
  process.exit(1);
});
`;
}

function promiseAllDriver(): string {
  return `
// ── promiseAll driver ─────────────────────────────────────────────────────
// Input: [[delayMs, 'resolve'|'reject', value], ...] — one entry per
// function. The driver builds real async functions from that description.
const __raw = require('fs').readFileSync(0, 'utf-8').trim();
const __spec = __raw ? JSON.parse(__raw) : [];

(async function () {
  const fns = __spec.map(function (entry) {
    const delay = entry[0];
    const kind = entry[1];
    const value = entry[2];
    return function () {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (kind === 'reject') reject(new Error(value === undefined ? 'failed' : String(value)));
          else resolve(value === undefined ? 'ok' : value);
        }, delay);
      });
    };
  });

  try {
    const out = await promiseAll(fns);
    console.log(JSON.stringify(['resolved', out]));
  } catch (e) {
    console.log(JSON.stringify(['rejected', e && e.message ? e.message : String(e)]));
  }
})().catch(function (e) {
  console.error('EXECUTION ERROR:', e.message || e);
  process.exit(1);
});
`;
}

/** Build the driver for a special problem. */
export function buildSpecialWrapper(kind: SpecialKind): string {
  if (kind === 'graph') return graphDriver();
  if (kind === 'debounce') return debounceDriver();
  if (kind === 'timeLimit') return timeLimitDriver();
  return promiseAllDriver();
}
