import { describe, it, test, expect, jest } from "@jest/globals";

// Mock Prisma client to avoid ESM import.meta issues during test execution
jest.mock("../Lib/prisma.js", () => ({
  prisma: {
    problem: {
      findUnique: jest.fn(),
    },
  },
}));

import { prepareFinalCode } from "./codeExecution.js";

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
