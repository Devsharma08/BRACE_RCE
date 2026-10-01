/**
 * Helpers shared by the generated problem bank.
 *
 * CRITICAL: these mirror `server/src/services/codeExecution.ts` exactly.
 * The wrapper serializes user output with
 *     JSON.stringify(result).replace(/\s/g, '')
 * and parses stdin as one JSON value per line. Any mismatch here would make
 * every generated test case fail for correct user submissions.
 */

/**
 * Format an expected output exactly as the execution wrapper prints it.
 *
 * The wrapper emits `JSON.stringify(result).replace(/\s/g, '')`, i.e. ALL
 * whitespace is stripped from the serialized JSON. (This mirrors
 * `server/src/services/codeExecution.ts`; note that the source must double the
 * backslash so the emitted regex is `\s` and not a literal `s`.)
 */
export const fmtOut = (value: unknown): string =>
  `${JSON.stringify(value).replace(/\s/g, '')}\n`;

/** Build the stdin payload: one compact JSON argument per line. */
export const fmtIn = (args: unknown[]): string =>
  `${args.map((a) => JSON.stringify(a)).join('\n')}\n`;

// ---------------------------------------------------------------------------
// Binary tree helpers (LeetCode level-order, `null` for missing children).
// Mirrors arrayToTree / treeToArray in codeExecution.ts.
// ---------------------------------------------------------------------------

export interface TNode {
  val: number;
  left: TNode | null;
  right: TNode | null;
}

export const node = (val: number): TNode => ({ val, left: null, right: null });

export function arrayToTree(arr: (number | null)[]): TNode | null {
  if (!arr.length || arr[0] == null) return null;
  const root = node(arr[0] as number);
  const queue: TNode[] = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const cur = queue.shift()!;
    if (i < arr.length && arr[i] != null) {
      cur.left = node(arr[i] as number);
      queue.push(cur.left);
    }
    i++;
    if (i < arr.length && arr[i] != null) {
      cur.right = node(arr[i] as number);
      queue.push(cur.right);
    }
    i++;
  }
  return root;
}

export function treeToArray(root: TNode | null): (number | null)[] {
  if (!root) return [];
  const out: (number | null)[] = [];
  const queue: (TNode | null)[] = [root];
  while (queue.length) {
    const cur = queue.shift();
    if (cur) {
      out.push(cur.val);
      queue.push(cur.left, cur.right);
    } else {
      out.push(null);
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

// ---------------------------------------------------------------------------
// Linked list helpers (mirrors arrayToListNode / listNodeToArray).
// ---------------------------------------------------------------------------

export interface LNode {
  val: number;
  next: LNode | null;
}

export function arrayToList(arr: number[]): LNode | null {
  let head: LNode | null = null;
  let tail: LNode | null = null;
  for (const v of arr) {
    const n: LNode = { val: v, next: null };
    if (head) tail!.next = n;
    else head = n;
    tail = n;
  }
  return head;
}

export function listToArray(head: LNode | null): number[] {
  const out: number[] = [];
  let cur = head;
  while (cur) {
    out.push(cur.val);
    cur = cur.next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random generator, so the bank is reproducible.
// ---------------------------------------------------------------------------

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    // xorshift32
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  /** Random array with optional duplicates (small value range ⇒ duplicates). */
  nums(n: number, min = -100, max = 100): number[] {
    return Array.from({ length: n }, () => this.int(min, max));
  }
  /** Random array with all-distinct values. */
  distinct(n: number, min = -1000, max = 1000): number[] {
    const seen = new Set<number>();
    const out: number[] = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 200) {
      const v = this.int(min, max);
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }
  str(len: number, alphabet = 'abcdefghijklmnopqrstuvwxyz'): string {
    return Array.from({ length: len }, () => this.pick([...alphabet])).join('');
  }
  words(n: number, minLen = 1, maxLen = 8): string[] {
    return Array.from({ length: n }, () => this.str(this.int(minLen, maxLen)));
  }
  /** Random tree in level-order form, guaranteed to have no trailing nulls. */
  tree(n: number): (number | null)[] {
    if (n <= 0) return [];
    const vals = Array.from({ length: n }, (_, i) => i + 1);
    // Shuffle so shapes are not trivially complete.
    for (let i = vals.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    return treeToArray(arrayToTree(vals));
  }
  /** Random BST in level-order form, built from a random sorted key set. */
  bst(n: number): (number | null)[] {
    if (n <= 0) return [];
    const keys = this.distinct(n, 1, 1000).sort((a, b) => a - b);
    const build = (lo: number, hi: number): TNode | null => {
      if (lo > hi) return null;
      const mid = this.int(lo, hi);
      return {
        val: keys[mid],
        left: build(lo, mid - 1),
        right: build(mid + 1, hi),
      };
    };
    return treeToArray(build(0, keys.length - 1));
  }
  /** Random undirected adjacency list with n nodes and m edges (0-based). */
  graph(n: number, m: number): number[][] {
    const adj: number[][] = Array.from({ length: n }, () => []);
    const seen = new Set<string>();
    let guard = 0;
    while (seen.size < m && guard++ < m * 50) {
      const a = this.int(0, n - 1);
      const b = this.int(0, n - 1);
      if (a === b) continue;
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      adj[a].push(b);
      adj[b].push(a);
    }
    for (const list of adj) list.sort((x, y) => x - y);
    return adj;
  }
}