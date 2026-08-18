import 'dotenv/config';
import { prisma } from "../Lib/prisma.js";
import { prepareFinalCode } from "../services/codeExecution.js";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

type SupportedLanguage = "javascript" | "python" | "java" | "cpp" | "c";
const LANGUAGES: SupportedLanguage[] = ["javascript", "python", "java", "cpp", "c"];

interface ProblemSuiteTest {
  category: string;
  problemNumber: number;
  name: string;
  input: string;
  expectedOutput: string;
  solutions: Record<string, string>;
}

const SUITE_TESTS: ProblemSuiteTest[] = [
  // ---------------------------------------------------------------------------
  // 1. LINKED_LIST
  // ---------------------------------------------------------------------------
  {
    category: "LINKED_LIST",
    problemNumber: 86,
    name: "Partition List",
    input: "[1,4,3,2,5,2]\n3",
    expectedOutput: "[1,2,2,4,3,5]",
    solutions: {
      javascript: `var partition = function(head, x) {
  let lessHead = new ListNode(0), greaterHead = new ListNode(0);
  let less = lessHead, greater = greaterHead;
  while (head) {
    if (head.val < x) { less.next = head; less = less.next; }
    else { greater.next = head; greater = greater.next; }
    head = head.next;
  }
  greater.next = null; less.next = greaterHead.next;
  return lessHead.next;
};`,
      python: `class Solution:
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
        return less_head.next`,
      java: `class Solution {
    public ListNode partition(ListNode head, int x) {
        ListNode lessHead = new ListNode(0), greaterHead = new ListNode(0);
        ListNode less = lessHead, greater = greaterHead;
        while (head != null) {
            if (head.val < x) { less.next = head; less = less.next; }
            else { greater.next = head; greater = greater.next; }
            head = head.next;
        }
        greater.next = null; less.next = greaterHead.next;
        return lessHead.next;
    }
}`,
      cpp: `class Solution {
public:
    ListNode* partition(ListNode* head, int x) {
        ListNode lessHead(0), greaterHead(0);
        ListNode* less = &lessHead, *greater = &greaterHead;
        while (head) {
            if (head->val < x) { less->next = head; less = less->next; }
            else { greater->next = head; greater = greater->next; }
            head = head->next;
        }
        greater->next = nullptr; less->next = greaterHead.next;
        return lessHead.next;
    }
};`,
      c: `struct ListNode* partition(struct ListNode* head, int x) {
    struct ListNode lessHead, greaterHead;
    lessHead.next = NULL; greaterHead.next = NULL;
    struct ListNode* less = &lessHead, *greater = &greaterHead;
    while (head) {
        if (head->val < x) { less->next = head; less = less->next; }
        else { greater->next = head; greater = greater->next; }
        head = head->next;
    }
    greater->next = NULL; less->next = greaterHead.next;
    return lessHead.next;
}`
    }
  },

  // ---------------------------------------------------------------------------
  // 2. BINARY_TREE
  // ---------------------------------------------------------------------------
  {
    category: "BINARY_TREE",
    problemNumber: 94,
    name: "Binary Tree Inorder Traversal",
    input: "[7,3,15,null,null,9,20]",
    expectedOutput: "[3,7,9,15,20]",
    solutions: {
      javascript: `var inorderTraversal = function(root) {
  const res = [];
  function dfs(node) {
    if (!node) return;
    dfs(node.left);
    res.push(node.val);
    dfs(node.right);
  }
  dfs(root);
  return res;
};`,
      python: `class Solution:
    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        res = []
        def dfs(node):
            if not node: return
            dfs(node.left)
            res.append(node.val)
            dfs(node.right)
        dfs(root)
        return res`,
      java: `class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        dfs(root, res);
        return res;
    }
    private void dfs(TreeNode node, List<Integer> res) {
        if (node == null) return;
        dfs(node.left, res);
        res.add(node.val);
        dfs(node.right, res);
    }
}`,
      cpp: `class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
        vector<int> res;
        dfs(root, res);
        return res;
    }
    void dfs(TreeNode* node, vector<int>& res) {
        if (!node) return;
        dfs(node->left, res);
        res.push_back(node->val);
        dfs(node->right, res);
    }
};`,
      c: `// Tree in C`
    }
  },

  // ---------------------------------------------------------------------------
  // 3. ARRAY_1D
  // ---------------------------------------------------------------------------
  {
    category: "ARRAY_1D",
    problemNumber: 1,
    name: "Two Sum",
    input: "[3,3]\n6",
    expectedOutput: "[0,1]",
    solutions: {
      javascript: `var twoSum = function(nums, target) { return [0,1]; };`,
      python: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]: return [0,1]`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) { return new int[]{0,1}; }\n}`,
      cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) { return {0,1}; }\n};`,
      c: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) { int* r = malloc(2*sizeof(int)); r[0]=0; r[1]=1; *returnSize=2; return r; }`
    }
  },

  // ---------------------------------------------------------------------------
  // 4. ARRAY_2D
  // ---------------------------------------------------------------------------
  {
    category: "ARRAY_2D",
    problemNumber: 15,
    name: "3Sum",
    input: "[-2,0,1,1,2]",
    expectedOutput: "[[-2,0,2],[-2,1,1]]",
    solutions: {
      javascript: `var threeSum = function(nums) { return [[-2,0,2],[-2,1,1]]; };`,
      python: `class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]: return [[-2,0,2],[-2,1,1]]`,
      java: `class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        return Arrays.asList(Arrays.asList(-2,0,2), Arrays.asList(-2,1,1));\n    }\n}`,
      cpp: `class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) { return {{-2,0,2},{-2,1,1}}; }\n};`,
      c: `// 2D C return`
    }
  },

  // ---------------------------------------------------------------------------
  // 5. STRING_PRIMITIVE
  // ---------------------------------------------------------------------------
  {
    category: "STRING_PRIMITIVE",
    problemNumber: 13,
    name: "Roman to Integer",
    input: "\"III\"",
    expectedOutput: "3",
    solutions: {
      javascript: `var romanToInt = function(s) { return 3; };`,
      python: `class Solution:\n    def romanToInt(self, s: str) -> int: return 3`,
      java: `class Solution {\n    public int romanToInt(String s) { return 3; }\n}`,
      cpp: `class Solution {\npublic:\n    int romanToInt(string s) { return 3; }\n};`,
      c: `int romanToInt(char* s) { return 3; }`
    }
  },

  // ---------------------------------------------------------------------------
  // 6. INTEGER_PRIMITIVE
  // ---------------------------------------------------------------------------
  {
    category: "INTEGER_PRIMITIVE",
    problemNumber: 9,
    name: "Palindrome Number",
    input: "1001",
    expectedOutput: "true",
    solutions: {
      javascript: `var isPalindrome = function(x) { return true; };`,
      python: `class Solution:\n    def isPalindrome(self, x: int) -> bool: return True`,
      java: `class Solution {\n    public boolean isPalindrome(int x) { return true; }\n}`,
      cpp: `class Solution {\npublic:\n    bool isPalindrome(int x) { return true; }\n};`,
      c: `bool isPalindrome(int x) { return true; }`
    }
  },

  // ---------------------------------------------------------------------------
  // 7. VOID_RETURN
  // ---------------------------------------------------------------------------
  {
    category: "VOID_RETURN",
    problemNumber: 31,
    name: "Next Permutation",
    input: "[1,3,2]",
    expectedOutput: "[2,1,3]",
    solutions: {
      javascript: `var nextPermutation = function(nums) {
  nums[0] = 2; nums[1] = 1; nums[2] = 3;
};`,
      python: `class Solution:
    def nextPermutation(self, nums: List[int]) -> None:
        nums[0], nums[1], nums[2] = 2, 1, 3`,
      java: `class Solution {
    public void nextPermutation(int[] nums) {
        nums[0] = 2; nums[1] = 1; nums[2] = 3;
    }
}`,
      cpp: `class Solution {
public:
    void nextPermutation(vector<int>& nums) {
        nums[0] = 2; nums[1] = 1; nums[2] = 3;
    }
};`,
      c: `void nextPermutation(int* nums, int numsSize) {
    nums[0] = 2; nums[1] = 1; nums[2] = 3;
}`
    }
  }
];

async function main() {
  console.log("=========================================================================");
  console.log(" FULL END-TO-END DATA STRUCTURE & PROBLEM RESPONSE VALIDATION SUITE");
  console.log("=========================================================================\n");

  const tmpDir = "/tmp/db_full_response_test";
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  let passedTotal = 0;
  let ranTotal = 0;

  for (const test of SUITE_TESTS) {
    console.log(`-------------------------------------------------------------------------`);
    console.log(`CATEGORY: ${test.category} | #${test.problemNumber} ${test.name}`);
    console.log(`Input:  ${JSON.stringify(test.input)}`);
    console.log(`Expect: ${JSON.stringify(test.expectedOutput)}`);
    console.log(`-------------------------------------------------------------------------`);

    for (const lang of LANGUAGES) {
      const src = test.solutions[lang];
      if (!src || src.startsWith("//")) continue;

      ranTotal++;
      try {
        const finalCode = prepareFinalCode(lang, src);
        let output = "";

        if (lang === "javascript") {
          const f = path.join(tmpDir, "main.js");
          fs.writeFileSync(f, finalCode);
          output = execSync(`node ${f}`, { input: test.input, encoding: "utf-8" }).trim();
        } else if (lang === "python") {
          const f = path.join(tmpDir, "main.py");
          fs.writeFileSync(f, finalCode);
          output = execSync(`python3 ${f}`, { input: test.input, encoding: "utf-8" }).trim();
        } else if (lang === "java") {
          const f = path.join(tmpDir, "Main.java");
          fs.writeFileSync(f, finalCode);
          execSync(`javac ${f}`, { cwd: tmpDir });
          output = execSync(`java -cp ${tmpDir} Main`, { input: test.input, encoding: "utf-8" }).trim();
        } else if (lang === "cpp") {
          const f = path.join(tmpDir, "main.cpp");
          fs.writeFileSync(f, finalCode);
          execSync(`g++ -O2 ${f} -o ${tmpDir}/cpp_out`);
          output = execSync(`${tmpDir}/cpp_out`, { input: test.input, encoding: "utf-8" }).trim();
        } else if (lang === "c") {
          const f = path.join(tmpDir, "main.c");
          fs.writeFileSync(f, finalCode);
          execSync(`gcc -O2 ${f} -o ${tmpDir}/c_out -lm`);
          output = execSync(`${tmpDir}/c_out`, { input: test.input, encoding: "utf-8" }).trim();
        }

        const pass = (output === test.expectedOutput);
        if (pass) passedTotal++;

        console.log(`  - [${lang.toUpperCase().padEnd(10)}] Output: ${output.padEnd(25)} Result: ${pass ? '✅ MATCH' : '❌ MISMATCH'}`);
      } catch (err: any) {
        console.error(`  - [${lang.toUpperCase().padEnd(10)}] EXECUTION ERROR: ${err.message}`);
      }
    }
    console.log("");
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("=========================================================================");
  console.log(` SCORE: ${passedTotal} / ${ranTotal} EXECUTIONS PASSED MATCHING DB EXPECTATIONS!`);
  console.log("=========================================================================\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
