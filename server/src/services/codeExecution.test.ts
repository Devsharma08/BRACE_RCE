import { describe, it, test, expect, jest } from "@jest/globals";

// Mock Prisma client to avoid ESM import.meta issues during test execution
jest.mock("../lib/prisma.js", () => ({
  prisma: {
    problem: {
      findUnique: jest.fn(),
    },
  },
}));

import { prepareFinalCode, isValidTopologicalOrder } from "./codeExecution.js";

describe("codeExecution - prepareFinalCode wrapper generation across languages", () => {

  // ══════════════════════════════════════════════════════════════════════════
  // 1. JAVASCRIPT
  // ══════════════════════════════════════════════════════════════════════════
  describe("JavaScript Wrappers", () => {
    it("should generate valid wrapper for void return / in-place array modification (Rotate Array)", () => {
      const code = `var rotate = function(nums, k) {
  k = k % nums.length;
  nums.unshift(...nums.splice(nums.length - k));
};`;
      const finalCode = prepareFinalCode("javascript", code);
      expect(finalCode).toContain("arrayToTree");
      expect(finalCode).toContain("rotate");
      expect(finalCode).toContain("outVal");
    });

    it("should generate valid wrapper for Partition List (ListNode)", () => {
      const code = `var partition = function(head, x) {
  let lessHead = new ListNode(0), greaterHead = new ListNode(0);
  let less = lessHead, greater = greaterHead;
  while (head) {
    if (head.val < x) { less.next = head; less = less.next; }
    else { greater.next = head; greater = greater.next; }
    head = head.next;
  }
  greater.next = null;
  less.next = greaterHead.next;
  return lessHead.next;
};`;
      const finalCode = prepareFinalCode("javascript", code);
      expect(finalCode).toContain("arrayToListNode");
      expect(finalCode).toContain("listNodeToArray");
      expect(finalCode).toContain("ListNode");
      expect(finalCode).toContain("partition");
    });

    it("should generate valid wrapper for Random List problem (copyRandomList)", () => {
      const code = `var copyRandomList = function(head) {
  if (!head) return null;
  return head;
};`;
      const finalCode = prepareFinalCode("javascript", code);
      expect(finalCode).toContain("arrayToRandomList");
      expect(finalCode).toContain("randomListToArray");
      expect(finalCode).toContain("_Node");
    });

    it("should generate valid wrapper for Binary Tree problem (invertTree)", () => {
      const code = `var invertTree = function(root) {
  if (!root) return null;
  let tmp = root.left;
  root.left = root.right;
  root.right = tmp;
  return root;
};`;
      const finalCode = prepareFinalCode("javascript", code);
      expect(finalCode).toContain("arrayToTree");
      expect(finalCode).toContain("treeToArray");
      expect(finalCode).toContain("TreeNode");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. PYTHON
  // ══════════════════════════════════════════════════════════════════════════
  describe("Python Wrappers", () => {
    it("should generate valid wrapper for Partition List (ListNode)", () => {
      const code = `class Solution:
    def partition(self, head: Optional[ListNode], x: int) -> Optional[ListNode]:
        less_head, greater_head = ListNode(0), ListNode(0)
        less, greater = less_head, greater_head
        while head:
            if head.val < x:
                less.next = head
                less = less.next
            else:
                greater.next = head
                greater = greater.next
            head = head.next
        greater.next = None
        less.next = greater_head.next
        return less_head.next`;
      const finalCode = prepareFinalCode("python", code);
      expect(finalCode).toContain("class ListNode:");
      expect(finalCode).toContain("_to_list_node");
      expect(finalCode).toContain("_from_list_node");
      expect(finalCode).toContain("partition");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. JAVA
  // ══════════════════════════════════════════════════════════════════════════
  describe("Java Wrappers", () => {
    it("should define ListNode top-level class and generate Main for Partition List", () => {
      const code = `class Solution {
    public ListNode partition(ListNode head, int x) {
        ListNode lessHead = new ListNode(0), greaterHead = new ListNode(0);
        ListNode less = lessHead, greater = greaterHead;
        while (head != null) {
            if (head.val < x) { less.next = head; less = less.next; }
            else { greater.next = head; greater = greater.next; }
            head = head.next;
        }
        greater.next = null;
        less.next = greaterHead.next;
        return lessHead.next;
    }
}`;
      const finalCode = prepareFinalCode("java", code);
      expect(finalCode).toContain("class ListNode {");
      expect(finalCode).toContain("public class Main");
      expect(finalCode).toContain("formatListNode");
      expect(finalCode).not.toContain("(f==''&&l=='')");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. C++
  // ══════════════════════════════════════════════════════════════════════════
  describe("C++ Wrappers", () => {
    it("should define ListNode struct BEFORE Solution class and handle partition", () => {
      const code = `class Solution {
public:
    ListNode* partition(ListNode* head, int x) {
        ListNode lessHead(0), greaterHead(0);
        ListNode* less = &lessHead;
        ListNode* greater = &greaterHead;
        while (head) {
            if (head->val < x) { less->next = head; less = less->next; }
            else { greater->next = head; greater = greater->next; }
            head = head->next;
        }
        greater->next = nullptr;
        less->next = greaterHead.next;
        return lessHead.next;
    }
};`;
      const finalCode = prepareFinalCode("cpp", code);
      const structIdx = finalCode.indexOf("struct ListNode {");
      const classIdx = finalCode.indexOf("class Solution");
      expect(structIdx).toBeGreaterThan(-1);
      expect(classIdx).toBeGreaterThan(-1);
      expect(structIdx).toBeLessThan(classIdx);
      expect(finalCode).toContain("parseListNode");
      expect(finalCode).toContain("printListNode");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. C
  // ══════════════════════════════════════════════════════════════════════════
  describe("C Wrappers", () => {
    it("should define struct ListNode BEFORE user partition function", () => {
      const code = `struct ListNode* partition(struct ListNode* head, int x) {
    struct ListNode lessHead;
    struct ListNode greaterHead;
    lessHead.next = NULL;
    greaterHead.next = NULL;
    struct ListNode* less = &lessHead;
    struct ListNode* greater = &greaterHead;
    while (head) {
        if (head->val < x) { less->next = head; less = less->next; }
        else { greater->next = head; greater = greater->next; }
        head = head.next;
    }
    greater->next = NULL;
    less->next = greaterHead.next;
    return lessHead.next;
}`;
      const finalCode = prepareFinalCode("c", code);
      const structIdx = finalCode.indexOf("struct ListNode {");
      const funcIdx = finalCode.indexOf("struct ListNode* partition");
      expect(structIdx).toBeGreaterThan(-1);
      expect(funcIdx).toBeGreaterThan(-1);
      expect(structIdx).toBeLessThan(funcIdx);
      expect(finalCode).toContain("parseListNode");
      expect(finalCode).toContain("printListNode");
    });
  });
});

describe("Polyglot Code Execution Service", () => {
  test("should inject JavaScript TreeNode helper when processing tree problems", () => {
    const sourceCode = `var invertTree = function(root) { return root; };`;
    const finalCode = prepareFinalCode("javascript", sourceCode);

    expect(finalCode).toContain("function TreeNode(val, left, right)");
    expect(finalCode).toContain("var invertTree = function(root)");
  });

  test("should inject Python ListNode deserialization helper", () => {
    const sourceCode = `def reverseList(head):\n    return head`;
    const finalCode = prepareFinalCode("python", sourceCode);

    expect(finalCode).toContain("class ListNode:");
    expect(finalCode).toContain("def reverseList(head):");
  });

  test("should preserve custom wrapper code if provided in problem snippet", () => {
    const sourceCode = `function solve(arr) { return arr; }`;
    const customSnippet = {
      code: sourceCode,
      wrapperCode: `const res = solve([1,2,3]); console.log(res);`,
    };
    const finalCode = prepareFinalCode("javascript", sourceCode, customSnippet);

    expect(finalCode).toContain("const res = solve([1,2,3]);");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Tolerant argument parsing (raw-string inputs must not crash the sandbox)
//
// Regression guard for the bug where a stored input that is a bare word
// (e.g. `abcabcbb` for "Longest Substring Without Repeating Characters")
// crashed the sandbox: the generated wrapper called `JSON.parse(input[i])`
// unconditionally, which threw a SyntaxError at the top of the wrapper —
// before the user's function ran and outside any try/catch — so the sandbox
// exited 1 and dumped the raw error. The wrapper must now parse defensively
// and fall back to the raw string.
// ══════════════════════════════════════════════════════════════════════════════
describe("codeExecution - tolerant argument parsing (raw-string inputs)", () => {
  it("JavaScript wrapper must NOT crash on a bare-word (non-JSON) input", () => {
    // "Longest Substring Without Repeating Characters" — single string arg.
    const code = `var lengthOfLongestSubstring = function(s) {
  let seen = new Set(), l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    while (seen.has(s[r])) seen.delete(s[l++]);
    seen.add(s[r]);
    best = Math.max(best, r - l + 1);
  }
  return best;
};`;
    const finalCode = prepareFinalCode("javascript", code);

    // The argument must be parsed inside a try/catch that falls back to the
    // raw string — never a bare `JSON.parse(input[0])` that can throw.
    expect(finalCode).toContain("try { return JSON.parse(input[0]); }");
    expect(finalCode).toContain("catch (e) { return input[0]; }");
    // No raw, unguarded JSON.parse of an argument line remains.
    expect(finalCode).not.toMatch(/rawArg\d+\s*=\s*input\[\d+\][^?]*\?\s*JSON\.parse\(input\[\d+\]\)\s*:/);
  });

  it("Python wrapper must NOT crash on a bare-word (non-JSON) input", () => {
    const code = `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        return len(set(s))`;
    const finalCode = prepareFinalCode("python", code);

    // json.loads must be wrapped so a raw string does not raise.
    expect(finalCode).toContain("try: raw_arg0 = json.loads(input_lines[0])");
    expect(finalCode).toMatch(/except \(ValueError, TypeError\): raw_arg0 = input_lines\[0\]/);
    // No unguarded json.loads of an argument line remains.
    expect(finalCode).not.toMatch(/^raw_arg\d+ = json\.loads\(input_lines\[\d+\]\)/m);
  });

  it("still parses valid JSON arguments normally (Two Sum)", () => {
    const code = `var twoSum = function(nums, target) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] + nums[j] === target) return [i, j];
  return [];
};`;
    const finalCode = prepareFinalCode("javascript", code);

    // Arrays still go through JSON.parse (valid JSON), just defensively.
    expect(finalCode).toContain("try { return JSON.parse(input[0]); }");
    expect(finalCode).toContain("try { return JSON.parse(input[1]); }");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Signature detection must ignore functions declared inside JSDoc comments
//
// Regression guard: the LeetCode starter for linked-list / tree problems opens
// with a JSDoc block that contains a *commented-out* `function ListNode(...)`
// / `function TreeNode(...)`. The old signature regex matched that comment, so
// the generated wrapper called `ListNode(arg0, arg1)` instead of the real
// solution `addTwoNumbers(l1, l2)` — a correct submission was graded against
// the wrong function and always failed. Comments must be stripped first.
// ══════════════════════════════════════════════════════════════════════════════
describe("codeExecution - signature detection ignores JSDoc comments", () => {
  it("calls addTwoNumbers, not the ListNode declared in the JSDoc comment", () => {
    const code = `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
var addTwoNumbers = function (l1, l2) {
    const dummyHead = new ListNode(0);
    let current = dummyHead;
    let carry = 0;
    while (l1 !== null || l2 !== null || carry > 0) {
        const val1 = l1 !== null ? l1.val : 0;
        const val2 = l2 !== null ? l2.val : 0;
        const sum = val1 + val2 + carry;
        carry = Math.floor(sum / 10);
        current.next = new ListNode(sum % 10);
        current = current.next;
        if (l1 !== null) l1 = l1.next;
        if (l2 !== null) l2 = l2.next;
    }
    return dummyHead.next;
};`;
    const finalCode = prepareFinalCode("javascript", code);

    // The wrapper must invoke the real solution...
    expect(finalCode).toContain("addTwoNumbers(arg0, arg1)");
    // ...and must NOT invoke the ListNode helper as if it were the solution.
    expect(finalCode).not.toMatch(/res\s*=\s*ListNode\(arg0/);
    expect(finalCode).not.toContain("(new Solution())['ListNode']");
  });

  it("does not mistake a commented-out function for the solution (Python)", () => {
    const code = `# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def addTwoNumbers(self, l1, l2):
        return l1`;
    const finalCode = prepareFinalCode("python", code);
    // The driver must call addTwoNumbers, not a name scraped from a comment.
    expect(finalCode).toContain("addTwoNumbers");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Linked-list detection must fire from the parameter NAME, not just keywords
//
// Regression guard: Reorder List (#34) is a void, in-place problem whose body
// uses only the canonical parameter `head` and none of the method-name
// keywords (ListNode/partition/reverseList/...). The old detection missed it,
// so the JSON array was passed to the function UNCONVERTED — the in-place
// mutation did nothing and the untouched original was graded, so a correct
// solution always failed. The arg must be converted with arrayToListNode.
// ══════════════════════════════════════════════════════════════════════════════
describe("codeExecution - linked-list detection via parameter name", () => {
  it("detects a list problem from the `head` parameter (Reorder List)", () => {
    const code = `var reorderList = function(head) {
  if (!head) return;
  let slow = head, fast = head;
  while (fast.next && fast.next.next) { slow = slow.next; fast = fast.next.next; }
};`;
    const finalCode = prepareFinalCode("javascript", code);
    // The first argument must be run through arrayToListNode (list conversion).
    expect(finalCode).toContain("arrayToListNode(rawArg0)");
    expect(finalCode).toContain("listNodeToArray");
  });

  it("detects a list problem from l1/l2 parameters (Add Two Numbers)", () => {
    const code = `var addTwoNumbers = function(l1, l2) {
  const d = new ListNode(0);
  return d.next;
};`;
    const finalCode = prepareFinalCode("javascript", code);
    expect(finalCode).toContain("arrayToListNode(rawArg0)");
    expect(finalCode).toContain("arrayToListNode(rawArg1)");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Course Schedule II (#186): any valid topological ordering is correct, so
// exact-string grading rejects a right answer that breaks ties differently
// from the stored one (e.g. [0,1,2,3] vs stored [0,2,1,3]). The semantic
// grader must accept any ordering that covers every course exactly once and
// respects every prerequisite, and reject everything else.
// ══════════════════════════════════════════════════════════════════════════════
describe("codeExecution - topological order semantic grading (#186)", () => {
  // Stored case #1: 4 courses, edges 0->1, 0->2, 1->3, 2->3.
  const input1 = "4\n[[1,0],[2,0],[3,1],[3,2]]\n";
  const stored1 = "[0,2,1,3]\n";
  // Stored case #0: 2 courses, edge 0->1.
  const input0 = "2\n[[1,0]]\n";
  const stored0 = "[0,1]\n";

  it("accepts the stored expected ordering (no regression)", () => {
    expect(isValidTopologicalOrder(input1, "[0,2,1,3]", stored1)).toBe(true);
    expect(isValidTopologicalOrder(input0, "[0,1]", stored0)).toBe(true);
  });

  it("accepts an alternative valid ordering (the #186 regression)", () => {
    // [0,1,2,3] and [0,2,1,3] are the only two valid orderings here; exact-match
    // grading wrongly rejected the first when the second was stored.
    expect(isValidTopologicalOrder(input1, "[0,1,2,3]", stored1)).toBe(true);
    expect(isValidTopologicalOrder(input1, "[0,2,1,3]", stored1)).toBe(true);
  });

  it("tolerates whitespace differences in the output", () => {
    expect(isValidTopologicalOrder(input1, "[0, 1, 2, 3]", stored1)).toBe(true);
  });

  it("rejects an ordering that violates a prerequisite", () => {
    // 0 must precede 1 and 2; putting 1 first breaks [1,0].
    expect(isValidTopologicalOrder(input1, "[1,0,2,3]", stored1)).toBe(false);
    // 3 must follow both 1 and 2; putting 3 second breaks [3,1].
    expect(isValidTopologicalOrder(input1, "[0,3,1,2]", stored1)).toBe(false);
  });

  it("rejects orderings that do not cover every course exactly once", () => {
    expect(isValidTopologicalOrder(input1, "[0,1,2]", stored1)).toBe(false); // missing 3
    expect(isValidTopologicalOrder(input1, "[0,1,2,3,4]", stored1)).toBe(false); // extra
    expect(isValidTopologicalOrder(input1, "[0,1,1,2]", stored1)).toBe(false); // duplicate
    expect(isValidTopologicalOrder(input1, "[]", stored1)).toBe(false); // empty but feasible
  });

  it("rejects non-array / unparseable output", () => {
    expect(isValidTopologicalOrder(input1, "not json", stored1)).toBe(false);
    expect(isValidTopologicalOrder(input1, "0", stored1)).toBe(false);
    expect(isValidTopologicalOrder(input1, "", stored1)).toBe(false);
  });

  it("accepts [] only when a cycle makes ordering impossible", () => {
    // 2 courses with a cycle 0->1->0: [] is the only correct answer.
    const cyclic = "2\n[[1,0],[0,1]]\n";
    expect(isValidTopologicalOrder(cyclic, "[]", "[]")).toBe(true);
    // A non-empty ordering cannot exist for a cyclic graph.
    expect(isValidTopologicalOrder(cyclic, "[0,1]", "[]")).toBe(false);
    // An acyclic graph must NOT be answered with [].
    expect(isValidTopologicalOrder(input1, "[]", stored1)).toBe(false);
  });

  it("keeps exact-string equality as a safe fast path", () => {
    // Even if input is malformed, an exact match against expected passes.
    expect(isValidTopologicalOrder("garbage", stored1, stored1)).toBe(true);
  });
});
