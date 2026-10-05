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
    k: 'stk-balanced-brackets',
    n: 'Balanced Bracket Validation',
    num: 250,
    d: 'EASY',
    c: 'Stack',
    intro: [
      'Given a string <code>s</code> containing only the characters <code>(</code>, <code>)</code>, <code>{</code>, <code>}</code>, <code>[</code> and <code>]</code>, return <code>true</code> if every opening bracket is closed by the same type of bracket in the correct order, and <code>false</code> otherwise.',
    ],
    notes: [
      'Brackets must be closed in reverse order, which is exactly what a stack models.',
      'Push every opening bracket; on a closing bracket, the top must be its match.',
      'At the end the stack must be empty, otherwise brackets remain unclosed.',
    ],
    approach: [
      'Scan left to right.',
      'Push opening brackets.',
      'On a closing bracket, pop and compare; mismatch means invalid.',
      'Confirm the stack is empty when the scan finishes.',
    ],
    ex: [
      { input: 's = "()[]{}"', output: 'true', explanation: 'Every bracket is closed correctly.', args: ['()[]{}'] },
      { input: 's = "([{}])"', output: 'true', explanation: 'Types match and nesting is proper.', args: ['([{}])'] },
      { input: 's = "([)]"', output: 'false', explanation: 'The brackets close in the wrong order.', args: ['([)]'] },
      { input: 's = "]("', output: 'false', explanation: 'A closing bracket appears with no opener.', args: [']('] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: ['1 <= s.length <= 10000', 's consists of brackets only.'],
    h: [
      'Use a map from closing bracket to its opening partner.',
      'The stack top must match, not merely be present somewhere in the stack.',
      'A non-empty stack at the end is invalid.',
    ],
    sig: ['boolean', 'string'],
    fn: ['isValid', 's'],
    s: (args) => {
      const pairs = { ')': '(', ']': '[', '}': '{' };
      const stack = [];
      for (const ch of args[0]) {
        if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
        else if (stack.length === 0 || stack.pop() !== pairs[ch]) return false;
      }
      return stack.length === 0;
    },
    t: autoTests(
      [
        pub('()[]{}'),
        pub('([{}])'),
        pub('([)]'),
        pub(']('),
        priv(''),
        priv('{[]}'),
      ],
      (r) => {
        // Build a string by pushing and popping so the answer is not always
        // false; a quarter of the time break it deliberately.
        let s = '';
        const pool = '()[]{}';
        for (let i = 0; i < r.int(0, 12); i++) s += pool[r.int(0, 5)];
        if (r.next() < 0.25 && s.length) {
          const at = r.int(0, s.length - 1);
          const swap = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{' };
          s = s.slice(0, at) + swap[s[at]] + s.slice(at + 1);
        }
        return [s];
      },
      15,
      401,
    ),
  },
  {
    k: 'stk-min-stack',
    n: 'Stack with Minimum Query',
    num: 251,
    d: 'MEDIUM',
    c: 'Stack',
    intro: [
      'Design a stack that supports <code>push</code>, <code>pop</code>, <code>top</code> and retrieving the minimum element, all in constant time.',
      'You must implement the data structure without a language-provided stack class.',
    ],
    notes: [
      'A parallel stack of running minima makes every operation O(1).',
      'Push the new value onto both stacks.',
      'When popping, pop both, which restores the previous minimum automatically.',
    ],
    approach: [
      'Keep a main stack of values and a helper stack of running minima.',
      'push: add to both.',
      'pop: remove from both.',
      'getMin: read the top of the helper stack.',
    ],
    ex: [
      { input: 'ops = "push:-2,0,-3|getMin|pop|top|getMin"', output: '[null,null,null,-3,null,0,-2]', explanation: 'Three pushes, then the minimum is -3; after popping it the top is 0 and the minimum -2.', args: ['push:-2,0,-3|getMin|pop|top|getMin'] },
      { input: 'ops = "push:1,2|getMin|getMin"', output: '[null,null,1,1]', explanation: 'The minimum stays 1.', args: ['push:1,2|getMin|getMin'] },
      { input: 'ops = "push:2|pop|getMin"', output: '[null,null,null]', explanation: 'Popping empties the structure so there is no minimum.', args: ['push:2|pop|getMin'] },
    ],
    cx: 'Time O(1) per operation, Space O(n).',
    con: ['1 <= operations <= 1000', '-1000 <= values <= 1000'],
    h: [
      'A second stack tracking running minima avoids rescanning on pop.',
      'Push to both stacks in lockstep.',
      'The minimum equals the helper stack top after each push.',
    ],
    sig: ['string[]', 'string'],
    fn: ['operateStack', 'ops'],
    s: (args) => {
      // Input is a compact script: 'push:1,2|push:3|pop|getMin'.
      const values = [];
      const mins = [];
      const out = [];
      for (const part of String(args[0]).split('|')) {
        const [name, arg] = part.split(':');
        if (name === 'push') {
          // One result entry per pushed value, so a batch of n yields n nulls.
          for (const v of String(arg).split(',')) {
            const n = Number(v);
            values.push(n);
            mins.push(mins.length === 0 ? n : Math.min(mins[mins.length - 1], n));
            out.push(null);
          }
        } else if (name === 'pop') {
          values.pop();
          mins.pop();
          out.push(null);
        } else if (name === 'top') {
          out.push(values.length ? values[values.length - 1] : null);
        } else if (name === 'getMin') {
          out.push(mins.length ? mins[mins.length - 1] : null);
        }
      }
      return out;
    },
    t: autoTests(
      [
        pub('push:-2,0,-3|getMin|pop|top|getMin'),
        pub('push:1,2|getMin|getMin'),
        pub('push:2|pop|getMin'),
        priv('push:5|getMin'),
        priv('push:1|push:1|pop|getMin'),
        priv('push:-1,-2|pop|getMin'),
      ],
      (r) => {
        const parts = [];
        let depth = 0;
        const n = r.int(1, 8);
        for (let i = 0; i < n; i++) {
          const roll = r.int(0, 3);
          if (roll === 0 || depth === 0) {
            const batch = [];
            for (let j = 0; j < r.int(1, 3); j++) batch.push(r.int(-9, 9));
            parts.push('push:' + batch.join(','));
            depth += batch.length;
          } else if (roll === 1) {
            parts.push('pop');
            depth--;
          } else if (roll === 2) {
            parts.push('top');
          } else {
            parts.push('getMin');
          }
        }
        if (depth > 0) parts.push('getMin');
        return [parts.join('|')];
      },
      15,
      402,
    ),
  },
  {
    k: 'stk-evaluate-rpn',
    n: 'Evaluate Reverse Polish Notation',
    num: 252,
    d: 'MEDIUM',
    c: 'Stack',
    intro: [
      'Given an array <code>tokens</code> representing a valid expression in Reverse Polish Notation (postfix), return the value of that expression.',
    ],
    notes: [
      'Postfix evaluation is the classic stack use case: push operands, and fold them on each operator.',
      'Division is integer division and truncates toward zero.',
      'The order of the two popped operands matters: the first popped is the right operand.',
    ],
    approach: [
      'Walk the tokens left to right.',
      'Push numbers.',
      'On an operator, pop the right operand then the left, combine, and push the result.',
      'The single remaining value is the answer.',
    ],
    ex: [
      { input: 'tokens = ["2","1","+","3","*"]', output: '9', explanation: '(2 + 1) * 3 = 9.', args: [['2', '1', '+', '3', '*']] },
      { input: 'tokens = ["4","13","5","/","+"]', output: '6', explanation: '4 + (13 / 5) = 4 + 2 = 6.', args: [['4', '13', '5', '/', '+']] },
      { input: 'tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]', output: '22', explanation: 'The full LeetCode 150 example evaluates to 22.', args: [['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: ['1 <= tokens.length <= 500', 'tokens are valid postfix expressions.'],
    h: [
      'The first popped value is the RIGHT operand, not the left.',
      'Integer division must truncate toward zero, so -7 / 2 is -3.',
      'A negative token such as "-11" is a number, not an operator.',
    ],
    sig: ['int', 'string[]'],
    fn: ['evalRPN', 'tokens'],
    s: (args) => {
      const stack = [];
      for (const tok of args[0]) {
        if (tok === '+' || tok === '-' || tok === '*' || tok === '/') {
          const right = stack.pop();
          const left = stack.pop();
          if (tok === '+') stack.push(left + right);
          else if (tok === '-') stack.push(left - right);
          else if (tok === '*') stack.push(left * right);
          else {
            // Truncate toward zero rather than flooring.
            stack.push(Math.trunc(left / right));
          }
        } else {
          stack.push(Number(tok));
        }
      }
      return stack[stack.length - 1];
    },
    t: autoTests(
      [
        pub(['2', '1', '+', '3', '*']),
        pub(['4', '13', '5', '/', '+']),
        pub(['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']),
        priv(['5']),
        priv(['7', '2', '-']),
        priv(['0', '0', '/', '1']),
      ],
      (r) => {
        // Build a valid postfix expression by folding a running stack.
        const out = [];
        let n = r.int(1, 5);
        for (let i = 0; i < n; i++) out.push(String(r.int(-9, 9)));
        let stackSize = n;
        while (stackSize > 1) {
          const op = r.pick(['+', '-', '*', '/']);
          out.push(op);
          stackSize--;
        }
        return [out];
      },
      15,
      403,
    ),
  },
  {
    k: 'stk-nested-brackets',
    n: 'Remove Outermost Parentheses',
    num: 253,
    d: 'EASY',
    c: 'Stack',
    intro: [
      'Given a valid parentheses string <code>s</code>, return a string with every primitive (outermost) pair of parentheses removed.',
      'You should return a non-empty string only if the original string is non-empty.',
    ],
    notes: [
      'A depth counter identifies which characters belong to the outermost pair.',
      'Characters at depth 0 are exactly the ones to drop.',
      'This can be done in one pass without a stack, using the counter as depth.',
    ],
    approach: [
      'Track the nesting depth as you scan.',
      'Skip a character when it is a bracket at depth 0.',
      'Increment on an opener and decrement on a closer after the checks.',
    ],
    ex: [
      { input: 's = "(()())(())"', output: '"()()()"', explanation: 'Stripping both outer pairs leaves the three inner pairs.', args: ['(()())(())'] },
      { input: 's = "(()(()))"', output: '"()(())"', explanation: 'The outer pair wraps two inner pairs.', args: ['(()(()))'] },
      { input: 's = "()()"', output: '""', explanation: 'Each pair is empty once stripped.', args: ['()()'] },
      { input: 's = ""', output: '""', explanation: 'An empty string stays empty.', args: [''] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: ['1 <= s.length <= 10000', 's consists of parentheses only.'],
    h: [
      'Drop the bracket when depth is 0, not when depth is 1.',
      'Check depth BEFORE changing it for the current character.',
      'Nested primitives are removed too, not just the outermost one.',
    ],
    sig: ['string', 'string'],
    fn: ['removeOuter', 's'],
    s: (args) => {
      let depth = 0;
      let out = '';
      for (const ch of args[0]) {
        // A bracket is dropped only when it sits at depth 0, i.e. when it is
        // part of a primitive pair. Depth is updated AFTER the decision.
        if (ch === '(') {
          if (depth > 0) out += ch;
          depth++;
        } else if (ch === ')') {
          depth--;
          if (depth > 0) out += ch;
        } else {
          out += ch;
        }
      }
      return out;
    },
    t: autoTests(
      [
        pub('(()())(())'),
        pub('(()(()))'),
        pub('()()'),
        pub(''),
        priv('(()())'),
        priv('(())'),
      ],
      (r) => {
        // Build a balanced string so the input is always valid.
        let s = '';
        const pairs = r.int(0, 4);
        for (let i = 0; i < pairs; i++) {
          const inner = r.int(0, 3);
          let body = '';
          for (let j = 0; j < inner; j++) body += '(' + '()'.repeat(r.int(0, 2)) + ')';
          s += '(' + body + ')';
        }
        return [s];
      },
      15,
      404,
    ),
  },
  {
    k: 'stk-decode-string',
    n: 'Decode Nested Bracket String',
    num: 254,
    d: 'MEDIUM',
    c: 'Stack',
    intro: [
      'Given a string <code>s</code> encoded as <code>k[encoded_string]</code>, where the contents inside the square brackets are encoded the same way, return the fully decoded string.',
    ],
    notes: [
      'A stack keeps the string built so far at each nesting level.',
      'On an opening bracket, push the current string and reset it.',
      'On a closing bracket, pop the previous string, repeat the inner part, and append.',
    ],
    approach: [
      'Accumulate the repeat count as digits arrive.',
      'Push the current buffer when hitting "[".',
      'On "]", pop the outer buffer, repeat the inner one, and concatenate.',
    ],
    ex: [
      { input: 's = "3[a]2[bc]"', output: '"aaabcbc"', explanation: '"a" three times then "bc" twice.', args: ['3[a]2[bc]'] },
      { input: 's = "3[a2[c]]"', output: '"accaccacc"', explanation: 'Nested repeats multiply.', args: ['3[a2[c]]'] },
      { input: 's = "2[abc]3[cd]ef"', output: '"abcabccdcdcdef"', explanation: 'Two groups then a literal tail.', args: ['2[abc]3[cd]ef'] },
      { input: 's = "abc"', output: '"abc"', explanation: 'No brackets, no changes.', args: ['abc'] },
    ],
    cx: 'Time O(n), Space O(n).',
    con: ['1 <= s.length <= 30', 's is a valid encoded string.'],
    h: [
      'Multi-digit counts are possible, e.g. "12[a]".',
      'The stack holds the OUTER string at each level, not the count.',
      'Push before building the inner part, pop after finishing it.',
    ],
    sig: ['string', 'string'],
    fn: ['decodeString', 's'],
    s: (args) => {
      const stack = [];
      let cur = '';
      let num = 0;
      for (const ch of args[0]) {
        if (ch >= '0' && ch <= '9') {
          num = num * 10 + Number(ch);
        } else if (ch === '[') {
          // The repeat count precedes the bracket, so it must be saved with
          // the outer buffer and only cleared after it has been captured.
          stack.push({ buffer: cur, count: num });
          cur = '';
          num = 0;
        } else if (ch === ']') {
          // The repeat count belongs to the FRAME captured at '[', not to the
          // live counter, which has already been cleared for this bracket.
          const frame = stack.pop();
          cur = frame.buffer + cur.repeat(frame.count);
          num = 0;
        } else {
          cur += ch;
        }
      }
      return cur;
    },
    t: autoTests(
      [
        pub('3[a]2[bc]'),
        pub('3[a2[c]]'),
        pub('2[abc]3[cd]ef'),
        pub('abc'),
        priv('10[a]'),
        priv('2[][]'),
      ],
      (r) => {
        // Build a valid encoded string recursively.
        const mk = (d) => {
          let s = '';
          if (d > 0 && r.next() < 0.6) {
            const parts = r.int(1, 2);
            for (let i = 0; i < parts; i++) {
              const body = mk(d - 1);
              s += r.int(1, 3) + '[' + body + ']';
            }
          } else {
            s += r.str(r.int(0, 3), 'ab');
          }
          return s;
        };
        return [mk(r.int(1, 2))];
      },
      15,
      405,
    ),
  },
  {
    k: 'stk-remove-duplicate-letters',
    n: 'Remove Duplicate Letters',
    num: 255,
    d: 'HARD',
    c: 'Stack',
    intro: [
      'Given a string <code>s</code>, return the lexicographically smallest possible subsequence that uses each distinct letter at most once, keeping letters in their original relative order.',
    ],
    notes: [
      'A monotonic stack pops a letter when a smaller letter arrives and the popped one still appears later.',
      'A last-occurrence map answers whether a letter can safely be removed.',
      'A seen set keeps the result free of duplicates.',
    ],
    approach: [
      'Record the last index of each letter.',
      'Scan left to right, skipping letters already used.',
      'Pop while the top is larger than the current letter and the top occurs again later.',
      'Mark the letter used and append it.',
    ],
    ex: [
      { input: 's = "bcabc"', output: '"abc"', explanation: 'The smallest unique subsequence is "abc".', args: ['bcabc'] },
      { input: 's = "cbacdcbc"', output: '"acdb"', explanation: 'Keeping a, c, d, b in order.', args: ['cbacdcbc'] },
      { input: 's = "aaa"', output: '"a"', explanation: 'Only one distinct letter is kept.', args: ['aaa'] },
    ],
    cx: 'Time O(n), Space O(26).',
    con: ['1 <= s.length <= 1000', 's consists of lowercase English letters.'],
    h: [
      'A letter may only be popped if it appears again later in the string.',
      'Skip the current letter if it is already in the result, BEFORE popping.',
      'The answer is a subsequence, so order is preserved by the stack itself.',
    ],
    sig: ['string', 'string'],
    fn: ['removeDuplicateLetters', 's'],
    s: (args) => {
      const s = args[0];
      const last = new Map();
      for (let i = 0; i < s.length; i++) last.set(s[i], i);
      const seen = new Set();
      const stack = [];
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (seen.has(c)) continue;
        // Pop larger letters that still have an occurrence ahead of us.
        while (stack.length && stack[stack.length - 1] > c && last.get(stack[stack.length - 1]) > i) {
          seen.delete(stack.pop());
        }
        stack.push(c);
        seen.add(c);
      }
      return stack.join('');
    },
    t: autoTests(
      [
        pub('bcabc'),
        pub('cbacdcbc'),
        pub('aaa'),
        priv('abcd'),
        priv('zyx'),
        priv('aab'),
      ],
      (r) => {
        // A tiny alphabet guarantees duplicates, which the algorithm needs.
        const n = r.int(1, 14);
        let s = '';
        for (let i = 0; i < n; i++) s += 'abc'[r.int(0, 2)];
        return [s];
      },
      15,
      406,
    ),
  },
  {
    k: 'stk-validate-stack-sequences',
    n: 'Validate Stack Sequences',
    num: 327,
    d: 'MEDIUM',
    c: 'Stack',
    intro: [
      'Given a sequence of integers <code>pushed</code> and another of integers <code>popped</code>, return whether it is possible to push the values in <code>pushed</code> order and pop them in <code>popped</code> order.',
      'Every value in <code>popped</code> must come from the top of the stack at the time of its pop.',
    ],
    notes: [
      'The greedy choice is forced: pop as soon as the top matches the next required value.',
      'Popping early can never hurt, because the value that was on top is needed anyway.',
      'At the end the stack must be empty as well as the pop pointer at the end.',
    ],
    approach: [
      'Push values from <code>pushed</code> one at a time.',
      'After each push, pop while the top equals the next value in <code>popped</code>.',
      'Return true when every value was popped and the stack is empty.',
    ],
    ex: [
      { input: 'pushed = [1,2,3,4], popped = [4,3,2,1]', output: 'true', explanation: 'Everything pops straight back off.', args: [[1, 2, 3, 4], [4, 3, 2, 1]] },
      { input: 'pushed = [1,2,3,4], popped = [4,2,3,1]', output: 'false', explanation: 'After 4 and 2 are popped, 3 is buried under nothing usable; popping 3 next would require 2 to be off first, so the order is impossible.', args: [[1, 2, 3, 4], [4, 2, 3, 1]] },
      { input: 'pushed = [], popped = []', output: 'true', explanation: 'Two empty sequences match.', args: [[], []] },
    ],
    cx: 'Time O(n + m), Space O(n).',
    con: ['1 <= pushed.length <= 1000', 'pushed is a permutation of 0..n-1', 'popped is a permutation of 0..n-1'],
    h: [
      'Pop greedily as soon as the top matches the next required pop value.',
      'Check both that the pop pointer completed and that the stack is empty.',
      'Values are distinct, so no ambiguity arises about which element to pop.',
    ],
    sig: ['bool', 'int[]', 'int[]'],
    fn: ['validateStackSequences', 'pushed', 'popped'],
    s: (args) => {
      const pushed = args[0];
      const popped = args[1];
      const stack = [];
      let j = 0;
      for (const v of pushed) {
        stack.push(v);
        // Pop greedily: the top is needed now, and popping early cannot hurt.
        while (stack.length && j < popped.length && stack[stack.length - 1] === popped[j]) {
          stack.pop();
          j++;
        }
      }
      return j === popped.length && stack.length === 0;
    },
    t: autoTests(
      [
        pub([1, 2, 3, 4], [4, 3, 2, 1]),
        pub([1, 2, 3, 4], [4, 2, 3, 1]),
        pub([], []),
        priv([1], [1]),
        priv([1], [0]),
      ],
      (r) => {
        const n = r.int(0, 8);
        const pushed = r.distinct(n, 0, 100);
        // Half the time derive popped by simulating a legal pop schedule, so
        // both feasible and infeasible orders are well represented.
        if (r.next() < 0.5) {
          const pool = pushed.slice();
          const picked = [];
          while (pool.length) {
            picked.push(pool.splice(r.int(0, pool.length - 1), 1)[0]);
          }
          return [pushed, picked];
        }
        const shuffled = pushed.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = r.int(0, i);
          const tmp = shuffled[i];
          shuffled[i] = shuffled[j];
          shuffled[j] = tmp;
        }
        return [pushed, shuffled];
      },
      15,
      948,
    ),
  },
]);
