import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const problems = [
  {
    name: "LeetCode-01E.java",
    problem_number: 1,
    github_oid: "67a013521d80b36dba6b2d0b1f9bf2b824c79028",
    difficulty_level: "EASY" as const,
    problem_definition: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.`,
    problem_hints: ["Use a hash map."],
    test_cases: [
      { input: "4\n2 7 11 15\n9", expectedOutput: "0 1", is_public: true },
      { input: "3\n3 2 4\n6", expectedOutput: "1 2", is_public: true },
      { input: "2\n3 3\n6", expectedOutput: "0 1", is_public: false },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var twoSum = function(nums, target) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (!input[0]) process.exit(0);\nconst n = parseInt(input[0]);\nconst nums = input.slice(1, n + 1).map(Number);\nconst target = parseInt(input[n + 1]);\nconst res = twoSum(nums, target);\nconsole.log(res.join(" "));`
      },
      {
        language: "java",
        code: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n        return new int[]{};\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        int target = sc.nextInt();\n        Solution sol = new Solution();\n        int[] res = sol.twoSum(nums, target);\n        System.out.print(res[0] + " " + res[1]);\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-02M.java",
    problem_number: 2,
    github_oid: "93969c1d8d756ed2f5f1bfc443c0e2186625ff5f",
    difficulty_level: "MEDIUM" as const,
    problem_definition: `Add two numbers represented as linked lists.`,
    problem_hints: ["Keep track of the carry."],
    test_cases: [
      { input: "3\n2 4 3\n3\n5 6 4", expectedOutput: "7 0 8", is_public: true },
      { input: "1\n0\n1\n0", expectedOutput: "0", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\nvar addTwoNumbers = function(l1, l2) {\n    \n};`,
        wrapperCode: `function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (!input[0]) process.exit(0);\nlet ptr = 0;\nconst n1 = parseInt(input[ptr++]);\nlet l1 = null, tail1 = null;\nfor(let i=0; i<n1; i++) { const node = new ListNode(parseInt(input[ptr++])); if(!l1) { l1=node; tail1=node; } else { tail1.next=node; tail1=node; } }\nconst n2 = parseInt(input[ptr++]);\nlet l2 = null, tail2 = null;\nfor(let i=0; i<n2; i++) { const node = new ListNode(parseInt(input[ptr++])); if(!l2) { l2=node; tail2=node; } else { tail2.next=node; tail2=node; } }\nlet res = addTwoNumbers(l1, l2);\nconst out = [];\nwhile(res) { out.push(res.val); res = res.next; }\nconsole.log(out.join(" "));`
      },
      {
        language: "java",
        code: `/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n        return null;\n    }\n}`,
        wrapperCode: `class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\npublic class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int n1 = sc.nextInt();\n        ListNode l1 = null, tail1 = null;\n        for(int i=0; i<n1; i++) {\n            ListNode node = new ListNode(sc.nextInt());\n            if(l1 == null) { l1 = node; tail1 = node; } else { tail1.next = node; tail1 = node; }\n        }\n        int n2 = sc.nextInt();\n        ListNode l2 = null, tail2 = null;\n        for(int i=0; i<n2; i++) {\n            ListNode node = new ListNode(sc.nextInt());\n            if(l2 == null) { l2 = node; tail2 = node; } else { tail2.next = node; tail2 = node; }\n        }\n        Solution sol = new Solution();\n        ListNode res = sol.addTwoNumbers(l1, l2);\n        while(res != null) {\n            System.out.print(res.val + (res.next != null ? " " : ""));\n            res = res.next;\n        }\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-03M.java",
    problem_number: 3,
    github_oid: "9d51bad1004d468f0ac051dd468b1afb4118e5d3",
    difficulty_level: "MEDIUM" as const,
    problem_definition: `Find the length of the longest substring without repeating characters.`,
    problem_hints: ["Use a sliding window."],
    test_cases: [
      { input: "abcabcbb", expectedOutput: "3", is_public: true },
      { input: "bbbbb", expectedOutput: "1", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var lengthOfLongestSubstring = function(s) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');\nconsole.log(lengthOfLongestSubstring(input));`
      },
      {
        language: "java",
        code: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextLine()) return;\n        String s = sc.nextLine();\n        Solution sol = new Solution();\n        System.out.print(sol.lengthOfLongestSubstring(s));\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-04H.java",
    problem_number: 4,
    github_oid: "8f39117c6921856cf14f210a71b30bed718779c8",
    difficulty_level: "HARD" as const,
    problem_definition: `Find the median of two sorted arrays.`,
    problem_hints: ["Binary search."],
    test_cases: [
      { input: "2\n1 3\n1\n2", expectedOutput: "2.00000", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var findMedianSortedArrays = function(nums1, nums2) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (!input[0]) process.exit(0);\nlet ptr = 0;\nconst m = parseInt(input[ptr++]);\nconst nums1 = input.slice(ptr, ptr + m).map(Number);\nptr += m;\nconst n = parseInt(input[ptr++]);\nconst nums2 = input.slice(ptr, ptr + n).map(Number);\nconsole.log(findMedianSortedArrays(nums1, nums2).toFixed(5));`
      },
      {
        language: "java",
        code: `class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        return 0.0;\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int m = sc.nextInt();\n        int[] nums1 = new int[m];\n        for(int i=0; i<m; i++) nums1[i] = sc.nextInt();\n        int n = sc.nextInt();\n        int[] nums2 = new int[n];\n        for(int i=0; i<n; i++) nums2[i] = sc.nextInt();\n        Solution sol = new Solution();\n        System.out.printf("%.5f", sol.findMedianSortedArrays(nums1, nums2));\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-05M.java",
    problem_number: 5,
    github_oid: "473d9f0eba85b7d488ffd0f8d8c68cdbce0c3a4e",
    difficulty_level: "MEDIUM" as const,
    problem_definition: `Return the longest palindromic substring in s.`,
    problem_hints: ["Expand around center."],
    test_cases: [
      { input: "babad", expectedOutput: "bab", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var longestPalindrome = function(s) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');\nconsole.log(longestPalindrome(input));`
      },
      {
        language: "java",
        code: `class Solution {\n    public String longestPalindrome(String s) {\n        return "";\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextLine()) return;\n        String s = sc.nextLine();\n        Solution sol = new Solution();\n        System.out.print(sol.longestPalindrome(s));\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-20E.java",
    problem_number: 20,
    github_oid: "8b0b86420efb5693e0b9a5b71a237fac503d4641",
    difficulty_level: "EASY" as const,
    problem_definition: `Determine if the input string is valid.`,
    problem_hints: ["Use a stack."],
    test_cases: [
      { input: "()[]{}", expectedOutput: "true", is_public: true },
      { input: "(]", expectedOutput: "false", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var isValid = function(s) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');\nconsole.log(isValid(input));`
      },
      {
        language: "java",
        code: `class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextLine()) return;\n        String s = sc.nextLine();\n        Solution sol = new Solution();\n        System.out.print(sol.isValid(s));\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-21E.java",
    problem_number: 21,
    github_oid: "975cabd5e3ed98ab0b9046dc9a67486ee7f7c1be",
    difficulty_level: "EASY" as const,
    problem_definition: `Merge two sorted linked lists.`,
    problem_hints: ["Use a dummy head."],
    test_cases: [
      { input: "3\n1 2 4\n3\n1 3 4", expectedOutput: "1 1 2 3 4 4", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var mergeTwoLists = function(list1, list2) {\n    \n};`,
        wrapperCode: `function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (!input[0]) process.exit(0);\nlet ptr = 0;\nconst n1 = parseInt(input[ptr++]);\nlet l1 = null, tail1 = null;\nfor(let i=0; i<n1; i++) { const node = new ListNode(parseInt(input[ptr++])); if(!l1) { l1=node; tail1=node; } else { tail1.next=node; tail1=node; } }\nconst n2 = parseInt(input[ptr++]);\nlet l2 = null, tail2 = null;\nfor(let i=0; i<n2; i++) { const node = new ListNode(parseInt(input[ptr++])); if(!l2) { l2=node; tail2=node; } else { tail2.next=node; tail2=node; } }\nlet res = mergeTwoLists(l1, l2);\nconst out = [];\nwhile(res) { out.push(res.val); res = res.next; }\nconsole.log(out.join(" "));`
      },
      {
        language: "java",
        code: `class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        return null;\n    }\n}`,
        wrapperCode: `class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\npublic class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int n1 = sc.nextInt();\n        ListNode l1 = null, tail1 = null;\n        for(int i=0; i<n1; i++) {\n            ListNode node = new ListNode(sc.nextInt());\n            if(l1 == null) { l1 = node; tail1 = node; } else { tail1.next = node; tail1 = node; }\n        }\n        int n2 = sc.nextInt();\n        ListNode l2 = null, tail2 = null;\n        for(int i=0; i<n2; i++) {\n            ListNode node = new ListNode(sc.nextInt());\n            if(l2 == null) { l2 = node; tail2 = node; } else { tail2.next = node; tail2 = node; }\n        }\n        Solution sol = new Solution();\n        ListNode res = sol.mergeTwoLists(l1, l2);\n        while(res != null) {\n            System.out.print(res.val + (res.next != null ? " " : ""));\n            res = res.next;\n        }\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-121E.java",
    problem_number: 121,
    github_oid: "abd9bcf674fde34a7cd15f1c2178e37f573fabe3",
    difficulty_level: "EASY" as const,
    problem_definition: `Maximize your profit by choosing a single day to buy and a different day to sell.`,
    problem_hints: ["Track the minimum price seen so far."],
    test_cases: [
      { input: "6\n7 1 5 3 6 4", expectedOutput: "5", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var maxProfit = function(prices) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (!input[0]) process.exit(0);\nconst n = parseInt(input[0]);\nconst prices = input.slice(1, n + 1).map(Number);\nconsole.log(maxProfit(prices));`
      },
      {
        language: "java",
        code: `class Solution {\n    public int maxProfit(int[] prices) {\n        return 0;\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] prices = new int[n];\n        for(int i=0; i<n; i++) prices[i] = sc.nextInt();\n        Solution sol = new Solution();\n        System.out.print(sol.maxProfit(prices));\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-704E.java",
    problem_number: 704,
    github_oid: "f4e323242c80d60a67e780a55e100a1bfa364c25",
    difficulty_level: "EASY" as const,
    problem_definition: `Binary Search algorithm.`,
    problem_hints: ["Maintain left and right pointers."],
    test_cases: [
      { input: "6\n-1 0 3 5 9 12\n9", expectedOutput: "4", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var search = function(nums, target) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (!input[0]) process.exit(0);\nconst n = parseInt(input[0]);\nconst nums = input.slice(1, n + 1).map(Number);\nconst target = parseInt(input[n + 1]);\nconsole.log(search(nums, target));`
      },
      {
        language: "java",
        code: `class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        int target = sc.nextInt();\n        Solution sol = new Solution();\n        System.out.print(sol.search(nums, target));\n    }\n}`
      }
    ],
  },
  {
    name: "LeetCode-125E.java",
    problem_number: 125,
    github_oid: "3589b6cae424511420a375ea3d0929cf6d0e473b",
    difficulty_level: "EASY" as const,
    problem_definition: `Return true if string is a valid palindrome.`,
    problem_hints: ["Use two pointers."],
    test_cases: [
      { input: "A man, a plan, a canal: Panama", expectedOutput: "true", is_public: true },
      { input: "race a car", expectedOutput: "false", is_public: true },
    ],
    code_snippets: [
      {
        language: "javascript",
        code: `var isPalindrome = function(s) {\n    \n};`,
        wrapperCode: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');\nconsole.log(isPalindrome(input));`
      },
      {
        language: "java",
        code: `class Solution {\n    public boolean isPalindrome(String s) {\n        return false;\n    }\n}`,
        wrapperCode: `public class Main {\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        if(!sc.hasNextLine()) return;\n        String s = sc.nextLine();\n        Solution sol = new Solution();\n        System.out.print(sol.isPalindrome(s));\n    }\n}`
      }
    ],
  },
];

async function main() {
  console.log("🌱 Starting seed for LeetCode problems...\n");
  console.log("📡 Connecting to:", process.env.DIRECT_URL?.replace(/:([^@]+)@/, ":***@"));

  console.log("🗑️  Wiping old records...");
  await prisma.problem.deleteMany();

  for (const p of problems) {
    const { test_cases, code_snippets, ...problemData } = p;

    const problem = await prisma.problem.upsert({
      where: { problem_number: problemData.problem_number },
      update: problemData,
      create: problemData,
    });

    await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
    await prisma.codeSnippet.deleteMany({ where: { problemId: problem.id } });

    await prisma.testCase.createMany({
      data: test_cases.map((tc) => ({ ...tc, problemId: problem.id })),
    });
    await prisma.codeSnippet.createMany({
      data: code_snippets.map((cs) => ({ ...cs, problemId: problem.id })),
    });

    console.log(`✅ Seeded: [#${problem.problem_number}] ${problem.name} (${problem.difficulty_level})`);
  }

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
