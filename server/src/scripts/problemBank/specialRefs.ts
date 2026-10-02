/**
 * Reference implementations for the four bespoke-driver problems.
 *
 * Written the way a competitor would submit them, and executed through the
 * real `prepareFinalCode` pipeline so the stored expected outputs are exactly
 * what the wrapper prints.
 */
export const SPECIAL_REFS: Record<number, string> = {
  30: `
var cloneGraph = function(node) {
  if (!node) return null;
  const map = new Map();
  const copy = function (n) {
    if (!n) return null;
    if (map.has(n)) return map.get(n);
    const c = new Node(n.val, []);
    map.set(n, c);
    for (const nb of n.neighbors) c.neighbors.push(copy(nb));
    return c;
  };
  return copy(node);
};`,
  111: `
// Debounce: return a wrapper that fires at most once per t milliseconds.
var debounce = function(fn, t) {
  let timer = null;
  return function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { fn(); }, t);
  };
};`,
  112: `
// Race the function against the limit; reject if the limit wins.
var timeLimit = function(fn, t) {
  return new Promise(function (resolve, reject) {
    let settled = false;
    const timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      reject(new Error('Time Limit Exceeded'));
    }, t);
    Promise.resolve().then(fn).then(function (v) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    }, function (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
  });
};`,
  117: `
var promiseAll = function(functions) {
  return Promise.all(functions.map(function (f) { return f(); }));
};`,
};
