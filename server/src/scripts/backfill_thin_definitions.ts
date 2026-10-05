/**
 * Fill in the 14 problems whose stored definition is a bare one-liner.
 *
 * These rows predate the problem bank. leetcodeProblems.ts carries only a plain
 * sentence and problems_seed.json has no title match for them, so the seed
 * overlay left them as-is and the statement rendered with no examples, no
 * constraints and no complexity — unusable as a practice problem.
 *
 * Every example below is copied from that problem's OWN stored public test case
 * and its own expected output, so the statement cannot disagree with what the
 * grader runs. Definitions are written HTML, matching the shape the other 195
 * problems already use (see prisma/seed.ts, which overlays problems_seed.json).
 *
 * Idempotent: it only writes when the stored definition is still short, so
 * re-running never clobbers an edit made in the UI.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { invalidateAllProblemsCache } from "../controllers/problems.js";

interface Def {
  statement: string;
  examples: [string, string][];
  constraints: string[];
  complexity?: string;
}

const DEFS: Record<number, Def> = {};
Object.assign(DEFS, {
  3: {
    statement:
      "Given a string containing just the characters <code>(</code> and <code>)</code>, find the length of the <strong>longest valid (well-formed) parentheses</strong> substring.",
    examples: [
      ['s = "(()"', "4"],
      ['s = ")()())"', "4"],
      ['s = ""', "0"],
    ],
    constraints: [
      "0 &lt;= s.length &lt;= 10<sup>4</sup>",
      "<code>s</code> contains <code>(</code> and <code>)</code> only.",
    ],
    complexity: "Time O(n), Space O(n) using a stack of indices.",
  },
  18: {
    statement:
      "Given a list of scores of different students, return the average of each student's top <strong>five</strong> scores, as an integer (the fractional part is truncated).",
    examples: [
      ["items = [[1,2,90],[3,2,99],[2,2,10]]", "[[1,2],[2,2],[3,2]]"],
      ["items = [[3,0,100]]", "[[3,0]]"],
      ["items = [[1,1,100],[2,2,200]]", "[[1,1],[2,2]]"],
    ],
    constraints: [
      "1 &lt;= items.length &lt;= 1000",
      "For each <code>items[i]</code>: 1 &lt;= items[i].length &lt;= 10<sup>4</sup>",
    ],
  },
  108: {
    statement:
      "Given <code>n</code> nodes labelled from 0 to <code>n-1</code> and a list of undirected edges, return <code>true</code> if the edges form a valid tree, otherwise <code>false</code>.",
    examples: [
      ["n = 4, edges = [[0,1],[0,2],[1,3]]", "true"],
      ["n = 3, edges = [[0,1],[1,2],[2,0]]", "false"],
      ["n = 2, edges = [[0,1]]", "true"],
    ],
    constraints: [
      "1 &lt;= n &lt;= 10<sup>4</sup>",
      "edges.length == n - 1",
      "0 &lt;= u, v &lt; n",
    ],
  },
  113: {
    statement:
      "Given a dictionary of alien words sorted under an unknown alphabet, return the <strong>order of that alphabet</strong>. Only the characters that actually appear need to be included.",
    examples: [
      ['words = ["hello","leetcode"]', '["c","d","e","h","l","o","t"]'],
      ['words = ["word","world","row"]', '["d","l","o","w","r"]'],
      ['words = ["abc","bcd","cde"]', '["a","b","c","d","e"]'],
    ],
    constraints: [
      "1 &lt;= words.length &lt;= 100",
      "1 &lt;= words[i].length &lt;= 100",
      "words[i] contains only lowercase English letters.",
    ],
  },
  116: {
    statement:
      "Design an algorithm to <strong>encode</strong> a list of strings into a single string and <strong>decode</strong> that string back into the original list. Any scheme works as long as it round-trips exactly, including empty strings.",
    examples: [
      [
        'strs = ["Hello","World"]',
        '&quot;5#Hello5#World&quot; — each string is prefixed with its length',
      ],
      ['strs = [""], an empty list is ""', '"0#" — an empty string still round-trips'],
      ['strs = ["Hi"]', '&quot;2#Hi&quot;'],
    ],
    constraints: [
      "0 &lt;= strs.length &lt;= 10<sup>4</sup>",
      "Each string contains any printable ASCII character.",
    ],
  },
  119: {
    statement:
      "In a party of <code>n</code> people, find the celebrity: everyone knows the celebrity, but the celebrity knows nobody. <code>knows[a][b]</code> is 1 if person a knows person b and 0 otherwise. Return the celebrity's index, or -1 if there is none.",
    examples: [
      ["n = 4, knows = [[1,1,0,0],[0,1,1,0],[0,0,1,0],[1,1,1,1]]", "0"],
      ["n = 2, knows = [[1,0],[1,1]]", "0"],
      ["n = 1, knows = [[1]]", "0"],
    ],
    constraints: [
      "1 &lt;= n &lt;= 10<sup>5</sup>",
      "<code>knows</code> is an n x n matrix of 0s and 1s.",
    ],
  },
  121: {
    statement:
      "You are given an <code>m x n</code> grid of rooms, initialised with <code>INF</code> (-1), <code>-1</code> (a wall) or <code>0</code> (a gate). Fill each empty room with its distance to the nearest gate, moving only up, down, left and right.",
    examples: [
      ["rooms = [[1,1,1],[1,1,0],[1,0,1]]", "[[3,2,3],[2,3,0],[3,0,1]]"],
      ["rooms = [[0,0,0],[0,1,0],[0,0,0]]", "[[0,0,0],[0,1,0],[0,0,0]]"],
      ["rooms = [[0]]", "[[0]]"],
    ],
    constraints: ["1 &lt;= rooms.length, rooms[0].length &lt;= 250"],
  },
134: {
    statement:
      "Given the root of a binary tree, collect its nodes from the leaves upward: remove every leaf, then repeat until the tree is empty. Return the node values <strong>level by level from the bottom up</strong>, each inner list ordered left to right.",
    examples: [
      ["root = [1,2,3]", "[2,2]"],
      ["root = [1]", "[1]"],
      ["root = []", "[]"],
    ],
    constraints: [
      "0 &lt;= the number of nodes &lt;= 10<sup>4</sup>",
      "-10<sup>4</sup> &lt;= Node.val &lt;= 10<sup>4</sup>",
    ],
  },
  163: {
    statement:
      "Design a stack supporting <code>push</code>, <code>pop</code>, <code>top</code>, <strong><code>peekMax</code></strong> and <strong><code>popMax</code></strong>. <code>popMax</code> must remove the largest value currently on the stack and return it.",
    examples: [
      [
        '["push(5)","push(1)","push(5)","top()","popMax()","top()","peekMax()"]',
        "5,5,1,5",
      ],
      [
        '["push(41)","pop()","pop()","top()","push(40)","top()","push(48)","push(99)","popMax()"]',
        "41,40,99",
      ],
      ['["peekMax()","top()","top()","pop()","peekMax()","popMax()"]', "99"],
    ],
    constraints: [
      "-2<sup>31</sup> &lt;= val &lt;= 2<sup>31</sup> - 1",
      "At most 10<sup>5</sup> calls are made to these methods.",
    ],
  },
  168: {
    statement:
      "Given each employee's list of non-overlapping busy intervals, return the intervals <strong>nobody is busy in</strong> — the common free time across all of them.",
    examples: [
      ["schedule = [[[0,1],[2,3],[4,5]]]", "[[1,2],[3,4],[5,1000000000]]"],
      ["schedule = [[[1,3],[6,7]]]", "[[-1,1],[3,6],[7,1000000000]]"],
      ["schedule = [[[1,3]]]", "[[-1,1],[3,1000000000]]"],
    ],
    constraints: [
      "1 &lt;= schedule.length &lt;= 50",
      "Intervals are half-open and non-overlapping within one employee.",
    ],
  },
186: {
    statement:
      "There are <code>numCourses</code> courses numbered 0 to numCourses-1, and <code>prerequisites[i] = [a, b]</code> means course <code>b</code> must be taken before course <code>a</code>. Return an ordering to finish all courses, or an <strong>empty array</strong> if that is impossible.",
    examples: [
      ["numCourses = 2, prerequisites = [[1,0]]", "[1,0]"],
      ["numCourses = 1, prerequisites = []", "[0]"],
      [
        "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
        "[3,1,2,0] — any valid ordering is accepted",
      ],
    ],
    constraints: [
      "1 &lt;= numCourses &lt;= 1000",
      "0 &lt;= prerequisite[i][0], prerequisite[i][1] &lt; numCourses",
    ],
  },
  187: {
    statement:
      "Given a string <code>s</code> and an integer <code>k</code>, return the length of the longest substring you can obtain by changing <strong>at most k</strong> of its characters so that every character in it is the same.",
    examples: [
      ['s = "ABAB", k = 2', "4"],
      ['s = "AABABBA", k = 1', "4"],
      ['s = "", k = 0', "0"],
    ],
    constraints: [
      "0 &lt;= s.length &lt;= 10<sup>5</sup>",
      "0 &lt;= k &lt;= s.length",
      "<code>s</code> consists of uppercase English letters.",
    ],
  },
  188: {
    statement:
      "Given two strings <code>s1</code> and <code>s2</code>, return <code>true</code> if <code>s2</code> contains a <strong>permutation of s1</strong>, otherwise <code>false</code>. A permutation is any rearrangement of those characters.",
    examples: [
      ['s1 = "ab", s2 = "eidbaooo"', "true"],
      ['s1 = "ab", s2 = "eidboaoo"', "false"],
      ['s1 = "abc", s2 = "a"', "false"],
    ],
    constraints: [
      "1 &lt;= s1.length, s2.length &lt;= 10<sup>4</sup>",
      "<code>s1</code> and <code>s2</code> contain lowercase English letters.",
    ],
  },
  189: {
    statement:
      "In an alien language, words are sorted lexicographically by an unknown alphabet. Given the words and that alphabet's <code>order</code> string, return <code>true</code> if the words are already sorted under it.",
    examples: [
      ['words = ["hello","leetcode"], order = "hlabcdefgijkmnopqrstuvwxyz"', "true"],
      ['words = ["word","world","row"], order = "worldabcefghijkmnpqstuvxyz"', "false"],
      ['words = ["apple","app"], order = "abcdefghijklmnopqrstuvwxyz"', "false"],
    ],
    constraints: [
      "1 &lt;= words.length &lt;= 100",
      "1 &lt;= words[i].length &lt;= 100",
      "<code>order</code> is a permutation of the English alphabet.",
    ],
  },
});

/** Render the same HTML shape the seeded rich descriptions already use. */
const render = (d: Def): string => {
  const parts: string[] = [`<p>${d.statement}</p>`, "<p>&nbsp;</p>"];
  d.examples.forEach(([input, output], i) => {
    parts.push(`<p><strong class="example">Example ${i + 1}:</strong></p>`);
    parts.push(`<pre>\n<strong>Input:</strong> ${input}\n<strong>Output:</strong> ${output}\n</pre>`);
    parts.push("<p>&nbsp;</p>");
  });
  parts.push("<p><strong>Constraints:</strong></p>", "<ul>");
  for (const c of d.constraints) parts.push(`        <li>${c}</li>`);
  parts.push("</ul>");
  if (d.complexity) {
    parts.push("<p>&nbsp;</p>", `<p><strong>Complexity:</strong> ${d.complexity}</p>`);
  }
  return parts.join("\n\n");
};

/** Below this length a "definition" is one sentence with no worked example. */
const THIN = 400;

async function main() {
  const wanted = Object.keys(DEFS).map(Number);
  const problems = await prisma.problem.findMany({
    where: { isCustom: false, problem_number: { in: wanted } },
    select: { id: true, name: true, problem_number: true, problem_definition: true },
    orderBy: { problem_number: "asc" },
  });

  let written = 0;
  let skipped = 0;
  for (const p of problems) {
    if ((p.problem_definition ?? "").trim().length >= THIN) {
      skipped++;
      continue;
    }
    const num = p.problem_number;
    // problem_number is nullable in the schema; the `in` filter above already
    // excludes null, but TypeScript cannot see that through the query.
    const def = num === null ? undefined : DEFS[num];
    if (!def) {
      skipped++;
      continue;
    }
    await prisma.problem.update({
      where: { id: p.id },
      data: { problem_definition: render(def) },
    });
    console.log(`  #${p.problem_number} ${p.name}: definition filled in`);
    written++;
  }

  const missing = wanted.filter((n) => !problems.some((p) => p.problem_number === n));
  if (missing.length) console.log(`  NOT FOUND in DB: ${missing.join(", ")}`);

  console.log(`\nFilled ${written} definition(s); skipped ${skipped} already-rich.`);
  if (written > 0) await invalidateAllProblemsCache();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());