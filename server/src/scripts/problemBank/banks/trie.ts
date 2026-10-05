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
    k: 'trie-shortest-key',
    n: 'Shortest Word Containing All Letters of a Substring',
    num: 190,
    d: 'EASY',
    c: 'Trie',
    intro: [
      'Given two strings <code>s1</code> and <code>s2</code>, return the shortest substring of <code>s1</code> such that it contains every character of <code>s2</code>, including duplicates.',
      'If no such substring exists, return an empty string.',
    ],
    notes: [
      'A sliding window needs O(1) "do we cover everything" checks, which a frequency array provides.',
      'The required letter set is small and fixed, so a map beats a trie here.',
    ],
    approach: [
      'Count the required letters from <code>s2</code>.',
      'Expand the right edge, lowering the missing count when a needed letter is added.',
      'While the window is still valid, shrink from the left and keep the shortest candidate.',
    ],
    ex: [
      { input: 's1 = "abba", s2 = "ab"', output: '"ab"', explanation: 'The first "ab" already covers both letters.', args: ['abba', 'ab'] },
      { input: 's1 = "abba", s2 = "bb"', output: '"bb"', explanation: 'Only the middle "bb" covers two b characters.', args: ['abba', 'bb'] },
    ],
    cx: 'Time O(n + m), Space O(1) for the alphabet.',
    con: ['1 <= s1.length, s2.length <= 100', 's1 and s2 consist of lowercase English letters.'],
    h: [
      'Track how many required characters are still missing.',
      'Shrink the window only while it remains valid.',
      'Compare candidates by length and keep the earliest on ties.',
    ],
    sig: ['string', 'string', 'string'],
    fn: ['shortestSubstring', 's1', 's2'],
    s: (args) => {
      const [s1, s2] = args as [string, string];
      if (!s2.length) return '';
      const need = new Map<string, number>();
      for (const c of s2) need.set(c, (need.get(c) ?? 0) + 1);
      const cnt = new Map<string, number>();
      let missing = s2.length;
      let left = 0;
      let bestStart = -1;
      let bestLen = Infinity;
      for (let r = 0; r < s1.length; r++) {
        const c = s1[r];
        cnt.set(c, (cnt.get(c) ?? 0) + 1);
        if (need.has(c) && cnt.get(c)! <= need.get(c)!) missing--;
        while (missing === 0) {
          const len = r - left + 1;
          if (len < bestLen) {
            bestLen = len;
            bestStart = left;
          }
          const lc = s1[left];
          cnt.set(lc, (cnt.get(lc) ?? 1) - 1);
          if (need.has(lc) && cnt.get(lc)! < need.get(lc)!) missing++;
          left++;
        }
      }
      return bestStart === -1 ? '' : s1.slice(bestStart, bestStart + bestLen);
    },
    t: autoTests(
      [
        pub('abba', 'ab'),
        pub('abba', 'bb'),
        priv('a', 'a'),
        priv('abc', 'd'),
        priv('', 'a'),
      ],
      (r) => [r.str(r.int(1, 12)), r.str(r.int(1, 3))],
      15,
      201,
    ),
  },
  {
    k: 'trie-design-add-search',
    n: 'Design Add and Search Words',
    num: 191,
    d: 'MEDIUM',
    c: 'Trie',
    intro: [
      'Design a data structure supporting word insertion and search, where <code>search</code> also supports the wildcard character <code>.</code> matching any single letter.',
      'Both operations should run in O(L) time for a word of length L on average.',
    ],
    notes: [
      'Insertion is a plain trie insert.',
      'A wildcard branches over every child, and the trie prunes as soon as a path dead-ends.',
      'Without the trie, wildcard search would compare 26^L candidate strings.',
    ],
    approach: [
      'Insert each word into a trie.',
      'Search: walk the query, recursing into every child on a dot.',
      'Succeed only when the query is fully consumed on an end-of-word node.',
    ],
    ex: [
      { input: 'words = ["bad","dad","mad"], query = "pad"', output: 'false', explanation: 'No stored word begins with p.', args: [['bad', 'dad', 'mad'], 'pad'] },
      { input: 'words = ["bad","dad","mad"], query = "..d"', output: 'true', explanation: 'Two wildcards then d match every stored word.', args: [['bad', 'dad', 'mad'], '..d'] },
    ],
    cx: 'Insert O(L); wildcard search O(26^L) worst case, O(L) when the query has no dot.',
    con: ['1 <= words.length <= 25', '1 <= words[i].length <= 100', 'query contains lowercase letters and dots.'],
    h: [
      'A dot means "try every child", not "skip a character".',
      'Consuming the whole query is not enough — the final node must be end-of-word.',
      'Memoising failed (node, index) pairs removes repeated wildcard work.',
    ],
    sig: ['boolean', 'string[]', 'string'],
    fn: ['search', 'words', 'query'],
    // NOTE: the reference must be self-contained. `buildUserSolution` serializes
    // this function with Function.prototype.toString, so it cannot close over
    // module-scope helpers like `buildTrie` — they would be undefined in the
    // sandboxed submission. Build the trie inline instead.
    s: (args) => {
      const words = args[0];
      const query = args[1];
      const root = { ch: new Map(), end: false };
      for (const w of words) {
        let cur = root;
        for (const c of w) {
          if (!cur.ch.has(c)) cur.ch.set(c, { ch: new Map(), end: false });
          cur = cur.ch.get(c);
        }
        cur.end = true;
      }
      const go = (node, i) => {
        if (i === query.length) return node.end;
        const c = query[i];
        if (c === '.') {
          for (const child of node.ch.values()) if (go(child, i + 1)) return true;
          return false;
        }
        const child = node.ch.get(c);
        return child ? go(child, i + 1) : false;
      };
      return go(root, 0);
    },
    t: autoTests(
      [
        pub(['bad', 'dad', 'mad'], 'pad'),
        pub(['bad', 'dad', 'mad'], '..d'),
        priv(['a'], 'a'),
        priv(['a'], 'b'),
        priv(['hello'], 'h.llo'),
        priv([], 'a'),
      ],
      (r) => {
        const words = Array.from({ length: r.int(1, 5) }, () => r.str(r.int(1, 4)));
        const q = Array.from({ length: r.int(1, 4) }, () =>
          r.next() < 0.3 ? '.' : r.str(1),
        ).join('');
        return [words, q];
      },
      15,
      202,
    ),
  },
  {
    k: 'trie-shortest-unique-prefix',
    n: 'Shortest Unique Prefix',
    num: 192,
    d: 'MEDIUM',
    c: 'Trie',
    intro: [
      'Given an array of distinct words, return the length of the shortest prefix that uniquely identifies each word.',
      'If no prefix of a word is unique, return <code>-1</code> for that word.',
    ],
    notes: [
      'A prefix is unique exactly when it is a prefix of only one word.',
      'A trie node storing how many words pass through it gives that count for free.',
      'The shortest unique prefix is the SHORTEST prefix on the path that is unique, which is why the first count-1 node wins.',
    ],
    approach: [
      'Insert every word into a trie, incrementing a pass count on each node visited.',
      'For each word walk its own path from the root.',
      'Return the length of the first node whose pass count is 1, or -1 if none is.',
    ],
    ex: [
      { input: 'words = ["apple","app"]', output: '[4,-1]', explanation: '"appl" prefixes only "apple", so it is unique at length 4. "app" prefixes both words, so neither has a unique prefix.', args: [['apple', 'app']] },
      { input: 'words = ["dog","dogdog","dodge"]', output: '[-1,4,3]', explanation: '"dog" is a prefix of the other two words, so it never becomes unique. "dogd" prefixes only "dogdog", and "dogg" prefixes only "dodge".', args: [['dog', 'dogdog', 'dodge']] },
    ],
    cx: 'Time O(sum of word lengths), Space O(sum of word lengths).',
    con: ['1 <= words.length <= 1000', '1 <= words[i].length <= 20', 'words[i] consists of lowercase English letters.'],
    h: [
      'Store a pass count per node rather than a terminal flag.',
      'Take the FIRST count-1 node on the path: that is the shortest unique prefix.',
      'A word that is a proper prefix of another never reaches count 1 and returns -1.',
    ],
    sig: ['int[]', 'string[]'],
    fn: ['shortestUniquePrefixes', 'words'],
    s: (args) => {
      const words = args[0];
      // Every node counts how many inserted words pass through it.
      const root = { count: 0, kids: new Map() };
      for (const w of words) {
        let node = root;
        for (const ch of w) {
          if (!node.kids.has(ch)) node.kids.set(ch, { count: 0, kids: new Map() });
          node = node.kids.get(ch);
          node.count++;
        }
      }
      const out = [];
      for (const w of words) {
        let node = root;
        let ans = -1;
        for (let i = 0; i < w.length; i++) {
          if (!node.kids.has(w[i])) break;
          node = node.kids.get(w[i]);
          // First unique prefix on the path wins; do not keep scanning past it.
          if (node.count === 1) {
            ans = i + 1;
            break;
          }
        }
        out.push(ans);
      }
      return out;
    },
    t: autoTests(
      [
        pub(['apple', 'app']),
        pub(['dog', 'dogdog', 'dodge']),
        pub(['a']),
        priv([]),
        priv(['abc', 'abd']),
      ],
      (r) => {
        // A two-letter alphabet makes shared prefixes common, which is the
        // interesting case here.
        const n = r.int(1, 5);
        const words = [];
        for (let i = 0; i < n; i++) words.push(r.str(r.int(1, 4), 'ab'));
        return [words];
      },
      15,
      932,
    ),
  },
]);