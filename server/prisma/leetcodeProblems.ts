export type SeedLanguage = "javascript" | "java";
export type SeedDifficulty = "EASY" | "MEDIUM" | "HARD";

export type RawSeedTestCase = {
  input: string;
  expectedOutput: string;
  is_public: boolean;
};

export type RawSeedCodeSnippet = {
  language: SeedLanguage;
  code: string;
  wrapperCode: string;
};

export type RawSeedProblem = {
  name: string;
  problem_number: number;
  github_oid: string;
  problem_definition: string;
  problem_hints: string[];
  difficulty_level: SeedDifficulty;
  test_cases: RawSeedTestCase[];
  code_snippets: RawSeedCodeSnippet[];
};

const JAVA_TEST_WRAPPER = `public class Main {
    public static void main(String[] args) {
        // Test wrapper
    }
}`;

const testCase = (input: string, expectedOutput: string, is_public = true): RawSeedTestCase => ({
  input,
  expectedOutput,
  is_public,
});

const snippet = (
  language: SeedLanguage,
  code: string,
  wrapperCode = "// Wrapper",
): RawSeedCodeSnippet => ({
  language,
  code,
  wrapperCode,
});

const java = (code: string, wrapperCode = JAVA_TEST_WRAPPER) => snippet("java", code, wrapperCode);
const javascript = (exportName: string, code: string) =>
  snippet("javascript", code, `module.exports = { ${exportName} };`);

const problem = (
  name: string,
  problem_number: number,
  github_oid: string,
  problem_definition: string,
  problem_hints: string[],
  difficulty_level: SeedDifficulty,
  test_cases: RawSeedTestCase[],
  code_snippets: RawSeedCodeSnippet[],
): RawSeedProblem => ({
  name,
  problem_number,
  github_oid,
  problem_definition,
  problem_hints,
  difficulty_level,
  test_cases,
  code_snippets,
});

export const rawProblems = [
  problem(
    "LeetCode-01E",
    1,
    "67a013521d80b36dba6b2d0b1f9bf2b824c79028",
    "Two Sum - Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
    [
      "Use a hash map for O(n) solution",
      "Consider that each input has exactly one solution",
      "You may not use the same element twice",
    ],
    "EASY",
    [
      testCase("[2,7,11,15]\n9\n", "[0,1]\n"),
      testCase("[3,2,4]\n6\n", "[1,2]\n"),
      testCase("[3,3]\n6\n", "[0,1]\n", false),
    ],
    [
      java(`class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[2];
    }
}`),
      javascript(
        "twoSum",
        `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-02M",
    2,
    "93969c1d8d756ed2f5f1bfc443c0e2186625ff5f",
    "Add Two Numbers - You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
    ["Handle carry propagation", "Consider different lengths of lists", "Watch for the final carry"],
    "MEDIUM",
    [
      testCase("[2,4,3]\n[5,6,4]\n", "[7,0,8]\n"),
      testCase("[0]\n[0]\n", "[0]\n"),
      testCase("[9,9,9,9,9,9,9]\n[9,9,9,9]\n", "[8,9,9,9,0,0,0,1]\n", false),
    ],
    [
      java(`/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        // Your code here
        return null;
    }
}`),
      javascript(
        "addTwoNumbers",
        `/**
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
var addTwoNumbers = function(l1, l2) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-032H",
    3,
    "f49311218cd00ae66358e7849f2207c1bfdcf253",
    "Longest Valid Parentheses - Given a string containing just the characters '(' and ')', find the length of the longest valid (well-formed) parentheses substring.",
    ["Use a stack to track indices", "Consider dynamic programming approach", "Handle edge cases with empty strings"],
    "HARD",
    [
      testCase("(()\n", "2\n"),
      testCase(")()())\n", "4\n"),
      testCase("((()))\n", "6\n", false),
    ],
    [
      java(`class Solution {
    public int longestValidParentheses(String s) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "longestValidParentheses",
        `/**
 * @param {string} s
 * @return {number}
 */
var longestValidParentheses = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-03M",
    4,
    "9d51bad1004d468f0ac051dd468b1afb4118e5d3",
    "Longest Substring Without Repeating Characters - Given a string s, find the length of the longest substring without repeating characters.",
    ["Use sliding window technique", "Keep track of character positions", "Update window when repeats found"],
    "MEDIUM",
    [
      testCase("abcabcbb\n", "3\n"),
      testCase("bbbbb\n", "1\n"),
      testCase("pwwkew\n", "3\n", false),
    ],
    [
      java(`class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "lengthOfLongestSubstring",
        `/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-04H",
    5,
    "8f39117c6921856cf14f210a71b30bed718779c8",
    "Median of Two Sorted Arrays - Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
    [
      "Binary search on the smaller array",
      "Handle even and odd total lengths",
      "O(log(min(m,n))) solution expected",
    ],
    "HARD",
    [
      testCase("[1,3]\n[2]\n", "2.00000\n"),
      testCase("[1,2]\n[3,4]\n", "2.50000\n"),
      testCase("[0,0]\n[0,0]\n", "0.00000\n", false),
    ],
    [
      java(`class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        // Your code here
        return 0.0;
    }
}`),
      javascript(
        "findMedianSortedArrays",
        `/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
var findMedianSortedArrays = function(nums1, nums2) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-05M",
    6,
    "473d9f0eba85b7d488ffd0f8d8c68cdbce0c3a4e",
    "Longest Palindromic Substring - Given a string s, return the longest palindromic substring in s.",
    ["Expand around center approach", "Dynamic programming solution", "Manacher's algorithm for O(n)"],
    "MEDIUM",
    [
      testCase("babad\n", "bab\n"),
      testCase("cbbd\n", "bb\n"),
      testCase("a\n", "a\n", false),
    ],
    [
      java(`class Solution {
    public String longestPalindrome(String s) {
        // Your code here
        return "";
    }
}`),
      javascript(
        "longestPalindrome",
        `/**
 * @param {string} s
 * @return {string}
 */
var longestPalindrome = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-06M",
    7,
    "5ea4280ac4d4ececafcf928cd19c3564ff503b21",
    "Zigzag Conversion - The string 'PAYPALISHIRING' is written in a zigzag pattern on a given number of rows and then read line by line.",
    [
      "Calculate row indices mathematically",
      "Use StringBuilder array",
      "Handle edge cases like numRows=1",
    ],
    "MEDIUM",
    [
      testCase("PAYPALISHIRING\n3\n", "PAHNAPLSIIGYIR\n"),
      testCase("PAYPALISHIRING\n4\n", "PINALSIGYAHRPI\n"),
      testCase("A\n1\n", "A\n", false),
    ],
    [
      java(`class Solution {
    public String convert(String s, int numRows) {
        // Your code here
        return "";
    }
}`),
      javascript(
        "convert",
        `/**
 * @param {string} s
 * @param {number} numRows
 * @return {string}
 */
var convert = function(s, numRows) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-07M",
    8,
    "c18ac110c81fa9996a9cd92cdc146f0b544b4566",
    "Reverse Integer - Given a signed 32-bit integer x, return x with its digits reversed. If reversing x causes the value to go outside the signed 32-bit integer range, return 0.",
    ["Check for overflow before multiplying", "Handle negative numbers", "Use long to detect overflow"],
    "MEDIUM",
    [
      testCase("123\n", "321\n"),
      testCase("-123\n", "-321\n"),
      testCase("120\n", "21\n", false),
    ],
    [
      java(`class Solution {
    public int reverse(int x) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "reverse",
        `/**
 * @param {number} x
 * @return {number}
 */
var reverse = function(x) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-08M",
    9,
    "ea09fcfd4ba3c2e9f50af7834391916a6d62a4ac",
    "String to Integer (atoi) - Implement the myAtoi(string s) function, which converts a string to a 32-bit signed integer.",
    ["Handle whitespace, signs, and overflow", "Stop at non-digit characters", "Return INT_MIN or INT_MAX for overflow"],
    "MEDIUM",
    [
      testCase("42\n", "42\n"),
      testCase("   -42\n", "-42\n"),
      testCase("4193 with words\n", "4193\n", false),
    ],
    [
      java(`class Solution {
    public int myAtoi(String s) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "myAtoi",
        `/**
 * @param {string} s
 * @return {number}
 */
var myAtoi = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-09E",
    10,
    "76b4f0e44fd1ab70e07b77e6e5aae12c886de92b",
    "Palindrome Number - Given an integer x, return true if x is a palindrome, and false otherwise.",
    ["Convert to string and compare", "Reverse half of the number", "Negative numbers are never palindromes"],
    "EASY",
    [
      testCase("121\n", "true\n"),
      testCase("-121\n", "false\n"),
      testCase("10\n", "false\n", false),
    ],
    [
      java(`class Solution {
    public boolean isPalindrome(int x) {
        // Your code here
        return false;
    }
}`),
      javascript(
        "isPalindrome",
        `/**
 * @param {number} x
 * @return {boolean}
 */
var isPalindrome = function(x) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-100E",
    11,
    "bf177a3b497ec4dda51f6d6ac3d73dcd1382918f",
    "Same Tree - Given the roots of two binary trees p and q, write a function to check if they are the same or not.",
    ["Use recursion to compare nodes", "Check both structure and values", "Handle null nodes"],
    "EASY",
    [
      testCase("[1,2,3]\n[1,2,3]\n", "true\n"),
      testCase("[1,2]\n[1,null,2]\n", "false\n"),
      testCase("[]\n[]\n", "true\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public boolean isSameTree(TreeNode p, TreeNode q) {
        // Your code here
        return false;
    }
}`),
      javascript(
        "isSameTree",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} p
 * @param {TreeNode} q
 * @return {boolean}
 */
var isSameTree = function(p, q) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-101E",
    12,
    "6677792a8e2350e0565f57837d91ac367bc66567",
    "Symmetric Tree - Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).",
    ["Recursive comparison of left and right subtrees", "Use BFS with queue", "Compare values in mirrored order"],
    "EASY",
    [
      testCase("[1,2,2,3,4,4,3]\n", "true\n"),
      testCase("[1,2,2,null,3,null,3]\n", "false\n"),
      testCase("[1]\n", "true\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public boolean isSymmetric(TreeNode root) {
        // Your code here
        return false;
    }
}`),
      javascript(
        "isSymmetric",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
var isSymmetric = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-102M",
    13,
    "0669b4fa1d1c306cbdad8fb01811e3365fa614f7",
    "Binary Tree Level Order Traversal - Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    ["Use queue for BFS", "Process each level separately", "Track level sizes"],
    "MEDIUM",
    [
      testCase("[3,9,20,null,null,15,7]\n", "[[3],[9,20],[15,7]]\n"),
      testCase("[1]\n", "[[1]]\n"),
      testCase("[]\n", "[]\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        // Your code here
        return new ArrayList<>();
    }
}`),
      javascript(
        "levelOrder",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
var levelOrder = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-103M",
    14,
    "33eebea19736aaa4d4b38979fb6ed763b4163d93",
    "Binary Tree Zigzag Level Order Traversal - Given the root of a binary tree, return the zigzag level order traversal of its nodes' values. (i.e., from left to right, then right to left for the next level and alternate between).",
    ["Use BFS with direction flag", "Add nodes to front or back based on level", "Track level parity"],
    "MEDIUM",
    [
      testCase("[3,9,20,null,null,15,7]\n", "[[3],[20,9],[15,7]]\n"),
      testCase("[1]\n", "[[1]]\n"),
      testCase("[]\n", "[]\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
        // Your code here
        return new ArrayList<>();
    }
}`),
      javascript(
        "zigzagLevelOrder",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
var zigzagLevelOrder = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-1046E",
    15,
    "4846145de42f910ec91e418b893a82d248718b05",
    "Last Stone Weight - You are given an array of integers stones where stones[i] is the weight of the ith stone. On each turn, we smash the two heaviest stones together and get a new stone weight equal to the difference. Return the weight of the last remaining stone, or 0 if there are none left.",
    ["Use max heap data structure", "Continue until one or zero stones left", "Handle equal weights"],
    "EASY",
    [
      testCase("[2,7,4,1,8,1]\n", "1\n"),
      testCase("[1]\n", "1\n"),
      testCase("[1,1]\n", "0\n", false),
    ],
    [
      java(`class Solution {
    public int lastStoneWeight(int[] stones) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "lastStoneWeight",
        `/**
 * @param {number[]} stones
 * @return {number}
 */
var lastStoneWeight = function(stones) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-104E",
    16,
    "c2f93388b31584a8711a0c2fdac3a8525b33c550",
    "Maximum Depth of Binary Tree - Given the root of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    ["Use recursion for DFS", "Base case when node is null", "Use BFS to count levels"],
    "EASY",
    [
      testCase("[3,9,20,null,null,15,7]\n", "3\n"),
      testCase("[1,null,2]\n", "2\n"),
      testCase("[]\n", "0\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public int maxDepth(TreeNode root) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "maxDepth",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number}
 */
var maxDepth = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-105M",
    17,
    "82ef9da5a49a210430e7d008537ea54f68b9a8a2",
    "Construct Binary Tree from Preorder and Inorder Traversal - Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.",
    ["First element of preorder is root", "Find root in inorder to split subtrees", "Recursively build left and right"],
    "MEDIUM",
    [
      testCase("[3,9,20,15,7]\n[9,3,15,20,7]\n", "[3,9,20,null,null,15,7]\n"),
      testCase("[-1]\n[-1]\n", "[-1]\n"),
      testCase("[1,2,3]\n[2,3,1]\n", "[1,2,null,null,3]\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        // Your code here
        return null;
    }
}`),
      javascript(
        "buildTree",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {number[]} preorder
 * @param {number[]} inorder
 * @return {TreeNode}
 */
var buildTree = function(preorder, inorder) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-1086E",
    18,
    "b0569f56aa4cf9ba2d705c6b63a9399cb6c5ee7a",
    "High Five - Given a list of scores of different students, return the average of each student's top five scores.",
    ["Use map to store scores per student", "Sort scores and take top 5", "Calculate average as integer division"],
    "EASY",
    [
      testCase("[[1,91],[1,92],[2,93],[2,97],[1,60],[2,77],[1,65],[1,87],[1,100],[2,100],[2,76]]\n", "[[1,87],[2,88]]\n"),
      testCase("[[1,100],[1,100],[1,100],[1,100],[1,100]]\n", "[[1,100]]\n"),
      testCase("[]\n", "[]\n", false),
    ],
    [
      java(`class Solution {
    public int[][] highFive(int[][] items) {
        // Your code here
        return new int[0][0];
    }
}`),
      javascript(
        "highFive",
        `/**
 * @param {number[][]} items
 * @return {number[][]}
 */
var highFive = function(items) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-110E",
    19,
    "b661c235fd8fb02321c85c8ea48f39dea0803eb7",
    "Balanced Binary Tree - Given a binary tree, determine if it is height-balanced (the left and right subtrees of every node differ in height by no more than one).",
    ["Recursively check height difference", "Return -1 if unbalanced", "Bottom-up approach"],
    "EASY",
    [
      testCase("[3,9,20,null,null,15,7]\n", "true\n"),
      testCase("[1,2,2,3,3,null,null,4,4]\n", "false\n"),
      testCase("[]\n", "true\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public boolean isBalanced(TreeNode root) {
        // Your code here
        return false;
    }
}`),
      javascript(
        "isBalanced",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
var isBalanced = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-111E",
    20,
    "005df5db1c08fa966717525848a2c8c2aa909aea",
    "Minimum Depth of Binary Tree - Given a binary tree, find its minimum depth. The minimum depth is the number of nodes along the shortest path from the root node down to the nearest leaf node.",
    ["Use BFS for earliest leaf", "Recursive solution with base cases", "Handle single child cases"],
    "EASY",
    [
      testCase("[3,9,20,null,null,15,7]\n", "2\n"),
      testCase("[2,null,3,null,4,null,5,null,6]\n", "5\n"),
      testCase("[1]\n", "1\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public int minDepth(TreeNode root) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "minDepth",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number}
 */
var minDepth = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-114M",
    21,
    "5ec6f69086dd2b69a616c5989b1583d5fb750b79",
    "Flatten Binary Tree to Linked List - Given the root of a binary tree, flatten the tree into a 'linked list' (in-place using the right child pointer).",
    ["Use Morris traversal", "Recursive approach with prev pointer", "Process right subtree first"],
    "MEDIUM",
    [
      testCase("[1,2,5,3,4,null,6]\n", "[1,null,2,null,3,null,4,null,5,null,6]\n"),
      testCase("[]\n", "[]\n"),
      testCase("[0]\n", "[0]\n", false),
    ],
    [
      java(`/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    public void flatten(TreeNode root) {
        // Your code here
    }
}`),
      javascript(
        "flatten",
        `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {void} Do not return anything, modify root in-place instead.
 */
var flatten = function(root) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-118M",
    22,
    "62c2a98cd73fcc985a8d7f7563ed5065bf375763",
    "Pascal's Triangle - Given an integer numRows, return the first numRows of Pascal's triangle.",
    ["Each row starts and ends with 1", "Inner elements sum of two above", "Build row by row"],
    "MEDIUM",
    [
      testCase("5\n", "[[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]\n"),
      testCase("1\n", "[[1]]\n"),
      testCase("0\n", "[]\n", false),
    ],
    [
      java(`class Solution {
    public List<List<Integer>> generate(int numRows) {
        // Your code here
        return new ArrayList<>();
    }
}`),
      javascript(
        "generate",
        `/**
 * @param {number} numRows
 * @return {number[][]}
 */
var generate = function(numRows) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-11M",
    23,
    "470133cae1193c99ca30a7b42496035142a9a4c1",
    "Container With Most Water - Given n non-negative integers where each represents a point at coordinate (i, ai). Find two lines that together with the x-axis form a container that contains the most water.",
    ["Use two pointers approach", "Move the shorter line inward", "Area = min(height[i], height[j]) * (j - i)"],
    "MEDIUM",
    [
      testCase("[1,8,6,2,5,4,8,3,7]\n", "49\n"),
      testCase("[1,1]\n", "1\n"),
      testCase("[4,3,2,1,4]\n", "16\n", false),
    ],
    [
      java(`class Solution {
    public int maxArea(int[] height) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "maxArea",
        `/**
 * @param {number[]} height
 * @return {number}
 */
var maxArea = function(height) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-121E",
    24,
    "abd9bcf674fde34a7cd15f1c2178e37f573fabe3",
    "Best Time to Buy and Sell Stock - You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and a different day in the future to sell that stock.",
    ["Track minimum price seen so far", "Calculate potential profit each day", "Update max profit accordingly"],
    "EASY",
    [
      testCase("[7,1,5,3,6,4]\n", "5\n"),
      testCase("[7,6,4,3,1]\n", "0\n"),
      testCase("[2,4,1]\n", "2\n", false),
    ],
    [
      java(`class Solution {
    public int maxProfit(int[] prices) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "maxProfit",
        `/**
 * @param {number[]} prices
 * @return {number}
 */
var maxProfit = function(prices) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-1249M",
    25,
    "64544e3a7ab794e1679ee94392d86412f0f101cf",
    "Minimum Remove to Make Valid Parentheses - Given a string s of '(' , ')' and lowercase English characters, remove the minimum number of parentheses to make the input string valid.",
    ["Use stack to track unmatched parentheses", "Mark invalid parentheses for removal", "Build result string"],
    "MEDIUM",
    [
      testCase("lee(t(c)o)de)\n", "lee(t(c)o)de\n"),
      testCase("a)b(c)d\n", "ab(c)d\n"),
      testCase("((\n", "\n", false),
    ],
    [
      java(`class Solution {
    public String minRemoveToMakeValid(String s) {
        // Your code here
        return "";
    }
}`),
      javascript(
        "minRemoveToMakeValid",
        `/**
 * @param {string} s
 * @return {string}
 */
var minRemoveToMakeValid = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-125E",
    26,
    "3589b6cae424511420a375ea3d0929cf6d0e473b",
    "Valid Palindrome - A phrase is a palindrome if, after converting all uppercase letters into lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.",
    ["Two pointers approach", "Skip non-alphanumeric characters", "Compare after converting to lowercase"],
    "EASY",
    [
      testCase("A man, a plan, a canal: Panama\n", "true\n"),
      testCase("race a car\n", "false\n"),
      testCase(" \n", "true\n", false),
    ],
    [
      java(`class Solution {
    public boolean isPalindrome(String s) {
        // Your code here
        return false;
    }
}`),
      javascript(
        "isPalindrome",
        `/**
 * @param {string} s
 * @return {boolean}
 */
var isPalindrome = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-127H",
    27,
    "39227058542e0b3fd021d051de01cf9c94726e8c",
    "Word Ladder - A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words where each adjacent pair differs by one letter. Return the length of the shortest transformation sequence.",
    ["BFS is optimal for shortest path", "Use pattern matching for neighbors", "Track visited words"],
    "HARD",
    [
      testCase("hit\ncog\n[\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]\n", "5\n"),
      testCase("hit\ncog\n[\"hot\",\"dot\",\"dog\",\"lot\",\"log\"]\n", "0\n"),
      testCase("a\nc\n[\"a\",\"b\",\"c\"]\n", "2\n", false),
    ],
    [
      java(`class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "ladderLength",
        `/**
 * @param {string} beginWord
 * @param {string} endWord
 * @param {string[]} wordList
 * @return {number}
 */
var ladderLength = function(beginWord, endWord, wordList) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-128M",
    28,
    "a379a13cf8c0a355df45d5aa77171a659a943cc5",
    "Longest Consecutive Sequence - Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.",
    ["Use HashSet for O(1) lookups", "Only start counting from sequence beginnings", "O(n) time complexity"],
    "MEDIUM",
    [
      testCase("[100,4,200,1,3,2]\n", "4\n"),
      testCase("[0,3,7,2,5,8,4,6,0,1]\n", "9\n"),
      testCase("[]\n", "0\n", false),
    ],
    [
      java(`class Solution {
    public int longestConsecutive(int[] nums) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "longestConsecutive",
        `/**
 * @param {number[]} nums
 * @return {number}
 */
var longestConsecutive = function(nums) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-130M",
    29,
    "83dce9b0a118c3f6579e7e749e0b4bbc268b4091",
    "Surrounded Regions - Given an m x n matrix board containing 'X' and 'O', capture all regions that are surrounded by 'X'. A region is captured by flipping all 'O's into 'X's in that surrounded region.",
    ["Start from border 'O's", "Use DFS/BFS to mark safe 'O's", "Flip remaining 'O's to 'X'"],
    "MEDIUM",
    [
      testCase("[[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"O\",\"X\"],[\"X\",\"X\",\"O\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]\n", "[[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]\n"),
      testCase("[[\"X\"]]\n", "[[\"X\"]]\n"),
      testCase("[[\"O\"]]\n", "[[\"O\"]]\n", false),
    ],
    [
      java(`class Solution {
    public void solve(char[][] board) {
        // Your code here
    }
}`),
      javascript(
        "solve",
        `/**
 * @param {character[][]} board
 * @return {void} Do not return anything, modify board in-place instead.
 */
var solve = function(board) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-133M",
    30,
    "40575352f213599ece891e8e0faf1092d0328c01",
    "Clone Graph - Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
    ["Use BFS/DFS with visited map", "Clone nodes as you traverse", "Map original to clone nodes"],
    "MEDIUM",
    [
      testCase("[[2,4],[1,3],[2,4],[1,3]]\n", "[[2,4],[1,3],[2,4],[1,3]]\n"),
      testCase("[[]]\n", "[[]]\n"),
      testCase("[]\n", "[]\n", false),
    ],
    [
      java(`/*
// Definition for a Node.
class Node {
    public int val;
    public List<Node> neighbors;
    public Node() {
        val = 0;
        neighbors = new ArrayList<Node>();
    }
    public Node(int _val) {
        val = _val;
        neighbors = new ArrayList<Node>();
    }
    public Node(int _val, ArrayList<Node> _neighbors) {
        val = _val;
        neighbors = _neighbors;
    }
}
*/
class Solution {
    public Node cloneGraph(Node node) {
        // Your code here
        return null;
    }
}`),
      javascript(
        "cloneGraph",
        `/**
 * // Definition for a Node.
 * function Node(val, neighbors) {
 *    this.val = val === undefined ? 0 : val;
 *    this.neighbors = neighbors === undefined ? [] : neighbors;
 * };
 */
/**
 * @param {Node} node
 * @return {Node}
 */
var cloneGraph = function(node) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-138M",
    31,
    "182b33cc789a2d319d471721952737a9ae71282a",
    "Copy List with Random Pointer - A linked list of length n is given such that each node contains an additional random pointer which could point to any node in the list or null. Return a deep copy of the list.",
    ["Create interweaved list of original and copied nodes", "Use hashmap to map original to copy", "Three-pass approach"],
    "MEDIUM",
    [
      testCase("[[7,null],[13,0],[11,4],[10,2],[1,0]]\n", "[[7,null],[13,0],[11,4],[10,2],[1,0]]\n"),
      testCase("[[1,1],[2,1]]\n", "[[1,1],[2,1]]\n"),
      testCase("[]\n", "[]\n", false),
    ],
    [
      java(`/*
// Definition for a Node.
class Node {
    int val;
    Node next;
    Node random;

    public Node(int val) {
        this.val = val;
        this.next = null;
        this.random = null;
    }
}
*/
class Solution {
    public Node copyRandomList(Node head) {
        // Your code here
        return null;
    }
}`),
      javascript(
        "copyRandomList",
        `/**
 * // Definition for a Node.
 * function Node(val, next, random) {
 *    this.val = val;
 *    this.next = next;
 *    this.random = random;
 * };
 */
/**
 * @param {Node} head
 * @return {Node}
 */
var copyRandomList = function(head) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-13E",
    32,
    "a1858d0975def52ecee7b599c800a6f9cf86ca7d",
    "Roman to Integer - Given a roman numeral, convert it to an integer.",
    ["Process from left to right", "If a smaller value precedes a larger, subtract", "Otherwise add the value"],
    "EASY",
    [
      testCase("III\n", "3\n"),
      testCase("LVIII\n", "58\n"),
      testCase("MCMXCIV\n", "1994\n", false),
    ],
    [
      java(`class Solution {
    public int romanToInt(String s) {
        // Your code here
        return 0;
    }
}`),
      javascript(
        "romanToInt",
        `/**
 * @param {string} s
 * @return {number}
 */
var romanToInt = function(s) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-141E",
    33,
    "2b78191a22170d763bf5955bc621a43e01a9c04f",
    "Linked List Cycle - Given head, the head of a linked list, determine if the linked list has a cycle in it.",
    [
      "Use Floyd's cycle detection (tortoise and hare)",
      "Move slow by 1 and fast by 2 steps",
      "If they meet, there's a cycle",
    ],
    "EASY",
    [
      testCase("[3,2,0,-4]\n1\n", "true\n"),
      testCase("[1,2]\n0\n", "true\n"),
      testCase("[1]\n-1\n", "false\n", false),
    ],
    [
      java(`/**
 * Definition for singly-linked list.
 * class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int x) {
 *         val = x;
 *         next = null;
 *     }
 * }
 */
public class Solution {
    public boolean hasCycle(ListNode head) {
        // Your code here
        return false;
    }
}`),
      javascript(
        "hasCycle",
        `/**
 * Definition for singly-linked list.
 * function ListNode(val) {
 *     this.val = val;
 *     this.next = null;
 * }
 */
/**
 * @param {ListNode} head
 * @return {boolean}
 */
var hasCycle = function(head) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-143M",
    34,
    "23208035cabc7ac98d89c70f621191c16d99686e",
    "Reorder List - You are given the head of a singly linked-list. The list can be represented as L0 -> L1 -> ... -> Ln-1 -> Ln. Reorder the list to be L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 -> ...",
    ["Find middle of list", "Reverse second half", "Merge two halves"],
    "MEDIUM",
    [
      testCase("[1,2,3,4]\n", "[1,4,2,3]\n"),
      testCase("[1,2,3,4,5]\n", "[1,5,2,4,3]\n"),
      testCase("[1]\n", "[1]\n", false),
    ],
    [
      java(`/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public void reorderList(ListNode head) {
        // Your code here
    }
}`),
      javascript(
        "reorderList",
        `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {void} Do not return anything, modify head in-place instead.
 */
var reorderList = function(head) {
    // Your code here
};`,
      ),
    ],
  ),
  problem(
    "LeetCode-230M",
    100,
    "660b86e8902968aa24051e6b2129911af2e1d76f",
    "Kth Smallest Element in a BST - Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.",
    ["In-order traversal gives sorted order", "Use iterative stack for O(H+k) space", "Keep counter while traversing"],
    "MEDIUM",
    [
      testCase("[3,1,4,null,2]\n1\n", "1\n"),
      testCase("[5,3,6,2,4,null,null,1]\n3\n", "3\n"),
      testCase("[1,null,2]\n2\n", "2\n", false),
    ],
    [
      snippet("java", `class Solution {
    public int kthSmallest(TreeNode root, int k) {
        return 0;
    }
}`),
      snippet("javascript", `var kthSmallest = function(root, k) {};`),
    ],
  ),
  problem(
    "LeetCode-232E",
    101,
    "6e5b69ce2ec3fd8384d8fd3b050d5c344c71cd2f",
    "Implement Queue using Stacks - Implement a first in first out (FIFO) queue using only two stacks.",
    ["Use one stack for input, one for output", "Move elements only when needed", "Amortized O(1) operations"],
    "EASY",
    [
      testCase("push(1),push(2),peek(),pop(),empty()\n", "1,1,false\n"),
      testCase("push(1),pop(),empty()\n", "1,true\n"),
    ],
    [
      snippet("java", `class MyQueue {
    public void push(int x) {}
    public int pop() { return 0; }
    public int peek() { return 0; }
    public boolean empty() { return false; }
}`),
      snippet("javascript", `var MyQueue = function() {};
MyQueue.prototype.push = function(x) {};
MyQueue.prototype.pop = function() {};
MyQueue.prototype.peek = function() {};
MyQueue.prototype.empty = function() {};`),
    ],
  ),
  problem(
    "LeetCode-235E",
    102,
    "d61c4012b00bddad64a24a25827a69a093d4559f",
    "Lowest Common Ancestor of a Binary Search Tree - Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given nodes.",
    ["Property of BST helps find split point", "Value determines if nodes are in different subtrees", "Iterative solution is efficient"],
    "EASY",
    [
      testCase("[6,2,8,0,4,7,9,null,null,3,5]\n2\n8\n", "6\n"),
      testCase("[2,1]\n2\n1\n", "2\n"),
    ],
    [
      snippet("java", `class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        return null;
    }
}`),
      snippet("javascript", `var lowestCommonAncestor = function(root, p, q) {};`),
    ],
  ),
  problem(
    "LeetCode-238M",
    103,
    "44e8081fcf0242f7ee5901024e2c6492236a740a",
    "Product of Array Except Self - Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].",
    ["Calculate prefix and suffix products", "O(n) time with O(1) extra space", "Avoid using division operator"],
    "MEDIUM",
    [
      testCase("[1,2,3,4]\n", "[24,12,8,6]\n"),
      testCase("[-1,1,0,-3,3]\n", "[0,0,9,0,0]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] productExceptSelf(int[] nums) {
        return new int[0];
    }
}`),
      snippet("javascript", `var productExceptSelf = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-239H",
    104,
    "825109deae569784805a6f1a116a9a06e8bb0bda",
    "Sliding Window Maximum - You are given an array of integers nums, and a sliding window of size k moving from left to right. Return the max element in each window.",
    ["Use deque to maintain potential max elements", "Remove indices out of window", "O(n) time complexity"],
    "HARD",
    [
      testCase("[1,3,-1,-3,5,3,6,7]\n3\n", "[3,3,5,5,6,7]\n"),
      testCase("[1]\n1\n", "[1]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        return new int[0];
    }
}`),
      snippet("javascript", `var maxSlidingWindow = function(nums, k) {};`),
    ],
  ),
  problem(
    "LeetCode-23H",
    105,
    "3b72d660fb9a1a22a9f049cde998554bc3c99ac1",
    "Merge k Sorted Lists - You are given an array of k linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list.",
    ["Use min-heap for O(N log k) solution", "Divide and conquer merging", "Merge one by one"],
    "HARD",
    [
      testCase("[[1,4,5],[1,3,4],[2,6]]\n", "[1,1,2,3,4,4,5,6]\n"),
      testCase("[]\n", "[]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        return null;
    }
}`),
      snippet("javascript", `var mergeKLists = function(lists) {};`),
    ],
  ),
  problem(
    "LeetCode-242E",
    106,
    "99f2dd626d484af92612163b87225b0f441caf7c",
    "Valid Anagram - Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    ["Use frequency array of size 26", "Sort both strings and compare", "HashMap for Unicode characters"],
    "EASY",
    [
      testCase("anagram\nnagaram\n", "true\n"),
      testCase("rat\ncar\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean isAnagram(String s, String t) {
        return false;
    }
}`),
      snippet("javascript", `var isAnagram = function(s, t) {};`),
    ],
  ),
  problem(
    "LeetCode-25H",
    107,
    "f38b4ad5b156343e0628ffff7732b00c7c00dffa",
    "Reverse Nodes in k-Group - Given a linked list, reverse the nodes of a linked list k at a time and return its modified list.",
    ["Check if k nodes exist", "Reverse k nodes recursively", "Handle remaining nodes"],
    "HARD",
    [
      testCase("[1,2,3,4,5]\n2\n", "[2,1,4,3,5]\n"),
      testCase("[1,2,3,4,5]\n3\n", "[3,2,1,4,5]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode reverseKGroup(ListNode head, int k) {
        return null;
    }
}`),
      snippet("javascript", `var reverseKGroup = function(head, k) {};`),
    ],
  ),
  problem(
    "LeetCode-261M",
    108,
    "c743ec629f994697e660dab815326114c9c68969",
    "Graph Valid Tree - Given n nodes labeled from 0 to n-1 and a list of undirected edges, check if they form a valid tree.",
    ["Tree must have exactly n-1 edges", "Graph must be fully connected", "Union-Find or DFS approach"],
    "MEDIUM",
    [
      testCase("5\n[[0,1],[0,2],[0,3],[1,4]]\n", "true\n"),
      testCase("5\n[[0,1],[1,2],[2,3],[1,3],[1,4]]\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean validTree(int n, int[][] edges) {
        return false;
    }
}`),
      snippet("javascript", `var validTree = function(n, edges) {};`),
    ],
  ),
  problem(
    "LeetCode-2622M",
    109,
    "d9b98023d4484a9d366aae784651ccf7a384ba82",
    "Cache With Time Limit - Write a class that allows getting and setting key-value pairs with a time to live (TTL).",
    ["Store expiration time with each value", "Clean expired keys on access", "Use Map for O(1) operations"],
    "MEDIUM",
    [testCase("set('a',1,100),get('a'),wait(150),get('a')\n", "1,undefined\n")],
    [
      snippet("javascript", `var TimeLimitedCache = function() {};
TimeLimitedCache.prototype.set = function(key, value, duration) {};
TimeLimitedCache.prototype.get = function(key) {};
TimeLimitedCache.prototype.count = function() {};`),
    ],
  ),
  problem(
    "LeetCode-2625M",
    110,
    "9a705ea4c4800c0ce59bd984c51d4c592a5888c3",
    "Flatten Deeply Nested Array - Write a function that flattens a deeply nested array up to a specified depth.",
    ["Use recursion with depth tracking", "Handle non-array elements", "Implement custom flatten"],
    "MEDIUM",
    [
      testCase("[1,2,3,[4,5,6],[7,8,[9,10,11],12],[13,14,15]]\n1\n", "[1,2,3,4,5,6,7,8,[9,10,11],12,13,14,15]\n"),
    ],
    [snippet("javascript", `var flat = function (arr, n) {};`)],
  ),
  problem(
    "LeetCode-2627M",
    111,
    "069e95fce023a95b524c50a69446ed62300f5080",
    "Debounce - Given a function fn and a time in milliseconds, return a debounced version of that function.",
    ["Clear timeout on each call", "Delay execution until after cooldown", "Handle immediate execution flag"],
    "MEDIUM",
    [testCase("debounce(100)\n", "Delayed execution\n")],
    [snippet("javascript", `var debounce = function(fn, t) {};`)],
  ),
  problem(
    "LeetCode-2637M",
    112,
    "463df7b212ea7889edcc1483022def4be7c43ade",
    "Promise Time Limit - Given an asynchronous function fn and a time t, return a new time limited version of the input function.",
    ["Use Promise.race", "Timeout rejects after t milliseconds", "Handle successful resolution"],
    "MEDIUM",
    [testCase("async function,100ms\n", "Result or timeout\n")],
    [snippet("javascript", `var timeLimit = function(fn, t) {};`)],
  ),
  problem(
    "LeetCode-269H",
    113,
    "bb25604623f615856e05d67aaf3bcfe3a9c2c5c9",
    "Alien Dictionary - Given a sorted dictionary of an alien language having some words, find the order of characters in the alien language.",
    ["Build graph from adjacent words", "Topological sort to find order", "Detect cycles for invalidation"],
    "HARD",
    [
      testCase("[\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]\n", "wertf\n"),
      testCase("[\"z\",\"x\"]\n", "zx\n"),
    ],
    [
      snippet("java", `class Solution {
    public String alienOrder(String[] words) {
        return "";
    }
}`),
      snippet("javascript", `var alienOrder = function(words) {};`),
    ],
  ),
  problem(
    "LeetCode-26E",
    114,
    "c357ba4adc6398f3f4b87cb6a400dd50500ea3f2",
    "Remove Duplicates from Sorted Array - Given a sorted array nums, remove the duplicates in-place such that each element appears only once.",
    ["Two-pointer technique", "Slow pointer tracks unique elements", "Return new length"],
    "EASY",
    [
      testCase("[1,1,2]\n", "2\n[1,2,_]\n"),
      testCase("[0,0,1,1,1,2,2,3,3,4]\n", "5\n"),
    ],
    [
      snippet("java", `class Solution {
    public int removeDuplicates(int[] nums) {
        return 0;
    }
}`),
      snippet("javascript", `var removeDuplicates = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-2705M",
    115,
    "9c089fe78fbf32761d2248b24dcec1042c5b5dc9",
    "Compact Object - Given an object or array, recursively remove all falsy values from it.",
    ["Recursively traverse nested structures", "Remove falsy values", "Handle arrays and objects"],
    "MEDIUM",
    [testCase("[null,0,5,[0],[false,16]]\n", "[5,[],[16]]\n")],
    [snippet("javascript", `var compactObject = function(obj) {};`)],
  ),
  problem(
    "LeetCode-271M",
    116,
    "423286cbd0fdba7609e72fca489ed30e21aaa7e4",
    "Encode and Decode Strings - Design an algorithm to encode a list of strings to a string and decode it back to the original list.",
    ["Use length prefix before each string", "Choose delimiter that doesn't conflict", "Handle empty strings"],
    "MEDIUM",
    [
      testCase("[\"Hello\",\"World\"]\n", "[\"Hello\",\"World\"]\n"),
      testCase("[\"\"]\n", "[\"\"]\n"),
    ],
    [
      snippet("java", `public class Codec {
    public String encode(List<String> strs) { return ""; }
    public List<String> decode(String s) { return null; }
}`),
      snippet("javascript", `var encode = function(strs) {};
var decode = function(s) {};`),
    ],
  ),
  problem(
    "LeetCode-2721M",
    117,
    "bbe0cbf9d15ad47ec5196ea95a28c9b30abde62a",
    "Execute Asynchronous Functions in Parallel - Given an array of asynchronous functions, return a new promise that resolves when all have resolved.",
    ["Track completion count", "Handle empty array", "Store results in order"],
    "MEDIUM",
    [testCase("Two async functions\n", "Both resolved\n")],
    [snippet("javascript", `var promiseAll = function(functions) {};`)],
  ),
  problem(
    "LeetCode-2722M",
    118,
    "4813ffb657e5e70364fd4d9258559fc37579d8e2",
    "Join Two Arrays by ID - Write a function that joins two arrays of objects by their id property.",
    ["Use map for O(n) lookup", "Merge objects from both arrays", "Handle missing properties"],
    "MEDIUM",
    [testCase("[{id:1,x:1},{id:2,x:2}]\n[{id:1,y:1},{id:3,y:3}]\n", "[{id:1,x:1,y:1},{id:2,x:2},{id:3,y:3}]\n")],
    [snippet("javascript", `var join = function(arr1, arr2) {};`)],
  ),
  problem(
    "LeetCode-277M",
    119,
    "507a3f8a48e2c27f47afa45e074873e12e7bd3ff",
    "Find the Celebrity - Find the celebrity in a party where everyone knows the celebrity but the celebrity knows nobody.",
    ["Use two-pass algorithm", "First find candidate", "Verify candidate"],
    "MEDIUM",
    [
      testCase("4\n[[1,1,0,0],[0,1,1,0],[0,0,1,0],[1,1,1,1]]\n", "2\n"),
      testCase("2\n[[1,0],[1,1]]\n", "-1\n"),
    ],
    [
      snippet("java", `public class Solution extends Relation {
    public int findCelebrity(int n) {
        return -1;
    }
}`),
      snippet("javascript", `var solution = function(knows) {
    return function(n) {};
};`),
    ],
  ),
  problem(
    "LeetCode-27E",
    120,
    "f70d51f680cf87a89b6f0912f9452d00ccfcb100",
    "Remove Element - Given an array nums and a value val, remove all occurrences of val in-place and return the new length.",
    ["Two-pointer technique", "Elements order can be changed", "Return count of elements != val"],
    "EASY",
    [
      testCase("[3,2,2,3]\n3\n", "2\n[2,2]\n"),
      testCase("[0,1,2,2,3,0,4,2]\n2\n", "5\n"),
    ],
    [
      snippet("java", `class Solution {
    public int removeElement(int[] nums, int val) {
        return 0;
    }
}`),
      snippet("javascript", `var removeElement = function(nums, val) {};`),
    ],
  ),
  problem(
    "LeetCode-286M",
    121,
    "9531f11d3ddb00a1e8c85eee12c069b4df1310bf",
    "Walls and Gates - You are given an m x n grid rooms initialized with INF, -1, or 0. Fill each empty room with the distance to its nearest gate.",
    ["Multi-source BFS from all gates", "Use queue for level order traversal", "Update distances in-place"],
    "MEDIUM",
    [testCase("[[INF,-1,0,INF],[INF,INF,INF,-1],[INF,-1,INF,-1],[0,-1,INF,INF]]\n", "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]\n")],
    [
      snippet("java", `class Solution {
    public void wallsAndGates(int[][] rooms) {}
}`),
      snippet("javascript", `var wallsAndGates = function(rooms) {};`),
    ],
  ),
  problem(
    "LeetCode-287M",
    122,
    "b535afc2af58bc9326fedb689c2ac81c188d937e",
    "Find the Duplicate Number - Given an array of integers nums containing n+1 integers where each integer is in range [1,n], find the duplicate number.",
    ["Floyd's cycle detection", "Treat as linked list with indices", "Binary search on value range"],
    "MEDIUM",
    [
      testCase("[1,3,4,2,2]\n", "2\n"),
      testCase("[3,1,3,4,2]\n", "3\n"),
    ],
    [
      snippet("java", `class Solution {
    public int findDuplicate(int[] nums) {
        return 0;
    }
}`),
      snippet("javascript", `var findDuplicate = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-28E",
    123,
    "2054dced0e638382781f8f5d122c5cedc2bdeede",
    "Find the Index of the First Occurrence in a String - Given two strings haystack and needle, return the index of the first occurrence of needle in haystack.",
    ["Simple sliding window", "KMP algorithm for efficiency", "Built-in indexOf works"],
    "EASY",
    [
      testCase("sadbutsad\nsad\n", "0\n"),
      testCase("leetcode\nleeto\n", "-1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int strStr(String haystack, String needle) {
        return 0;
    }
}`),
      snippet("javascript", `var strStr = function(haystack, needle) {};`),
    ],
  ),
  problem(
    "LeetCode-295M",
    124,
    "380839705e9a30341bcee333bc0575d40e2d194c",
    "Find Median from Data Stream - Find the median of a stream of integers as they come in.",
    ["Use two heaps (max-heap for lower half)", "Maintain size balance", "Median from top elements"],
    "MEDIUM",
    [testCase("addNum(1),addNum(2),findMedian(),addNum(3),findMedian()\n", "1.5,2.0\n")],
    [
      snippet("java", `class MedianFinder {
    public void addNum(int num) {}
    public double findMedian() { return 0.0; }
}`),
      snippet("javascript", `var MedianFinder = function() {};
MedianFinder.prototype.addNum = function(num) {};
MedianFinder.prototype.findMedian = function() {};`),
    ],
  ),
  problem(
    "LeetCode-297H",
    125,
    "bf06c96f2b215e9f96151d765ad5fb8e191e858b",
    "Serialize and Deserialize Binary Tree - Design an algorithm to serialize a binary tree to a string and deserialize it back to the tree.",
    ["Use pre-order traversal with markers for null", "BFS level order also works", "Handle empty nodes"],
    "HARD",
    [
      testCase("[1,2,3,null,null,4,5]\n", "[1,2,3,null,null,4,5]\n"),
      testCase("[]\n", "[]\n"),
    ],
    [
      snippet("java", `public class Codec {
    public String serialize(TreeNode root) { return ""; }
    public TreeNode deserialize(String data) { return null; }
}`),
      snippet("javascript", `var serialize = function(root) {};
var deserialize = function(data) {};`),
    ],
  ),
  problem(
    "LeetCode-29M",
    126,
    "7bf12336f0d1c86390e14dea746db13df212ac2c",
    "Divide Two Integers - Divide two integers without using multiplication, division, and mod operator.",
    ["Use bit manipulation", "Handle overflow cases", "Convert to long for safety"],
    "MEDIUM",
    [
      testCase("10\n3\n", "3\n"),
      testCase("7\n-3\n", "-2\n"),
    ],
    [
      snippet("java", `class Solution {
    public int divide(int dividend, int divisor) {
        return 0;
    }
}`),
      snippet("javascript", `var divide = function(dividend, divisor) {};`),
    ],
  ),
  problem(
    "LeetCode-31M",
    127,
    "b9e3e987e4f396851a23c082647a971b63fd9698",
    "Next Permutation - Implement next permutation that rearranges numbers into the lexicographically next greater permutation.",
    ["Find decreasing element from right", "Swap with next larger", "Reverse suffix"],
    "MEDIUM",
    [
      testCase("[1,2,3]\n", "[1,3,2]\n"),
      testCase("[3,2,1]\n", "[1,2,3]\n"),
    ],
    [
      snippet("java", `class Solution {
    public void nextPermutation(int[] nums) {}
}`),
      snippet("javascript", `var nextPermutation = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-332M",
    128,
    "7a966b0f8ee2b405270930bf06a4097a8c143882",
    "Reconstruct Itinerary - Given tickets represented as pairs of departure and arrival airports, reconstruct the itinerary in order.",
    ["Hierholzer's algorithm for Eulerian path", "Use priority queue for lexical order", "DFS post-order"],
    "MEDIUM",
    [testCase("[[\"MUC\",\"LHR\"],[\"JFK\",\"MUC\"],[\"SFO\",\"SJC\"],[\"LHR\",\"SFO\"]]\n", "[\"JFK\",\"MUC\",\"LHR\",\"SFO\",\"SJC\"]\n")],
    [
      snippet("java", `class Solution {
    public List<String> findItinerary(List<List<String>> tickets) {
        return null;
    }
}`),
      snippet("javascript", `var findItinerary = function(tickets) {};`),
    ],
  ),
  problem(
    "LeetCode-33M",
    129,
    "96ba113133203f50490472bac3db6e45339dec22",
    "Search in Rotated Sorted Array - Search for a target in a rotated sorted array and return its index, or -1 if not found.",
    ["Modified binary search", "Determine which half is sorted", "Check if target in sorted half"],
    "MEDIUM",
    [
      testCase("[4,5,6,7,0,1,2]\n0\n", "4\n"),
      testCase("[4,5,6,7,0,1,2]\n3\n", "-1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int search(int[] nums, int target) {
        return -1;
    }
}`),
      snippet("javascript", `var search = function(nums, target) {};`),
    ],
  ),
  problem(
    "LeetCode-347M",
    130,
    "cca8ca82df69c66c0b5e9a3ffb78562be6a087d6",
    "Top K Frequent Elements - Given an integer array nums and an integer k, return the k most frequent elements.",
    ["Count frequencies with hashmap", "Use bucket sort O(n)", "Use min-heap of size k"],
    "MEDIUM",
    [
      testCase("[1,1,1,2,2,3]\n2\n", "[1,2]\n"),
      testCase("[1]\n1\n", "[1]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        return new int[0];
    }
}`),
      snippet("javascript", `var topKFrequent = function(nums, k) {};`),
    ],
  ),
  problem(
    "LeetCode-34M",
    131,
    "da6741d927c48ae66ce89adb035babf646b19f7a",
    "Find First and Last Position of Element in Sorted Array - Find starting and ending position of a target value in a sorted array.",
    ["Binary search twice", "Find left boundary then right", "Handle target not found"],
    "MEDIUM",
    [
      testCase("[5,7,7,8,8,10]\n8\n", "[3,4]\n"),
      testCase("[5,7,7,8,8,10]\n6\n", "[-1,-1]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] searchRange(int[] nums, int target) {
        return new int[0];
    }
}`),
      snippet("javascript", `var searchRange = function(nums, target) {};`),
    ],
  ),
  problem(
    "LeetCode-355M",
    132,
    "70a1696626439fa4aa529c125479d5b1133c7aa7",
    "Design Twitter - Design a simplified version of Twitter where users can post tweets, follow/unfollow, and see the 10 most recent tweets.",
    ["Use hashmap for users and tweets", "Merge tweet lists from followed users", "Heap for efficient merging"],
    "MEDIUM",
    [testCase("postTweet(1,1),getNewsFeed(1),follow(1,2),postTweet(2,2),getNewsFeed(1)\n", "[1],[2,1]\n")],
    [
      snippet("java", `class Twitter {
    public void postTweet(int userId, int tweetId) {}
    public List<Integer> getNewsFeed(int userId) { return null; }
    public void follow(int followerId, int followeeId) {}
    public void unfollow(int followerId, int followeeId) {}
}`),
      snippet("javascript", `var Twitter = function() {};
Twitter.prototype.postTweet = function(userId, tweetId) {};
Twitter.prototype.getNewsFeed = function(userId) {};
Twitter.prototype.follow = function(followerId, followeeId) {};
Twitter.prototype.unfollow = function(followerId, followeeId) {};`),
    ],
  ),
  problem(
    "LeetCode-35E",
    133,
    "cb433faa56debf60a404f7efaa77d9a54dd81e3b",
    "Search Insert Position - Given a sorted array of distinct integers and a target value, return the index if found, or the index where it would be inserted.",
    ["Binary search O(log n)", "Return low pointer when not found", "Handle edge cases"],
    "EASY",
    [
      testCase("[1,3,5,6]\n5\n", "2\n"),
      testCase("[1,3,5,6]\n2\n", "1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int searchInsert(int[] nums, int target) {
        return 0;
    }
}`),
      snippet("javascript", `var searchInsert = function(nums, target) {};`),
    ],
  ),
  problem(
    "LeetCode-366M",
    134,
    "bee12a4b1f0ef77083dbfd7403a65dece6a404e8",
    "Find Leaves of Binary Tree - Given the root of a binary tree, collect a tree's nodes as if you were doing this: Collect and remove all leaves, repeat until tree is empty.",
    ["Post-order traversal", "Use height to determine removal level", "Recursively build result list"],
    "MEDIUM",
    [
      testCase("[1,2,3,4,5]\n", "[[4,5,3],[2],[1]]\n"),
      testCase("[1]\n", "[[1]]\n"),
    ],
    [
      snippet("java", `class Solution {
    public List<List<Integer>> findLeaves(TreeNode root) {
        return null;
    }
}`),
      snippet("javascript", `var findLeaves = function(root) {};`),
    ],
  ),
  problem(
    "LeetCode-38M",
    135,
    "db34a60d5c80fb8e3016835a680aebc0680bf6ed",
    "Count and Say - The count-and-say sequence is a sequence of digit strings defined by the recursive formula.",
    ["Iterative generation", "Use run-length encoding", "Build each term from previous"],
    "MEDIUM",
    [
      testCase("1\n", "1\n"),
      testCase("4\n", "1211\n"),
    ],
    [
      snippet("java", `class Solution {
    public String countAndSay(int n) {
        return "";
    }
}`),
      snippet("javascript", `var countAndSay = function(n) {};`),
    ],
  ),
  problem(
    "LeetCode-412E",
    136,
    "7c5b013c4d81b731a5293a1ccf652d15ffbec175",
    "Fizz Buzz - Given an integer n, return a string array where multiples of 3 are 'Fizz', multiples of 5 are 'Buzz', and both are 'FizzBuzz'.",
    ["Simple iteration", "String concatenation", "Use modulus operator"],
    "EASY",
    [
      testCase("3\n", "[\"1\",\"2\",\"Fizz\"]\n"),
      testCase("15\n", "Includes FizzBuzz at 15\n"),
    ],
    [
      snippet("java", `class Solution {
    public List<String> fizzBuzz(int n) {
        return null;
    }
}`),
      snippet("javascript", `var fizzBuzz = function(n) {};`),
    ],
  ),
  problem(
    "LeetCode-417M",
    137,
    "a1dd7789fd976d72d96d124c647df211d34ab00f",
    "Pacific Atlantic Water Flow - Given matrix of heights, find cells where water can flow to both Pacific and Atlantic oceans.",
    ["DFS from ocean boundaries", "Track reachable from each ocean", "Find intersection cells"],
    "MEDIUM",
    [testCase("[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]\n", "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]\n")],
    [
      snippet("java", `class Solution {
    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        return null;
    }
}`),
      snippet("javascript", `var pacificAtlantic = function(heights) {};`),
    ],
  ),
  problem(
    "LeetCode-41H",
    138,
    "541decbdabc3c114aaeb191c5d16aa1dafc38896",
    "First Missing Positive - Given an unsorted integer array nums, return the smallest missing positive integer.",
    ["Cycle sort approach", "Place numbers in correct positions", "O(n) time O(1) space"],
    "HARD",
    [
      testCase("[1,2,0]\n", "3\n"),
      testCase("[3,4,-1,1]\n", "2\n"),
    ],
    [
      snippet("java", `class Solution {
    public int firstMissingPositive(int[] nums) {
        return 0;
    }
}`),
      snippet("javascript", `var firstMissingPositive = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-42H",
    139,
    "651e5a763732518d894a3f63b3f8cbba80b343f1",
    "Trapping Rain Water - Given n non-negative integers representing an elevation map, compute how much water it can trap after raining.",
    ["Two-pointer approach", "Track left and right max heights", "Water trapped = min(maxLeft, maxRight) - height[i]"],
    "HARD",
    [
      testCase("[0,1,0,2,1,0,1,3,2,1,2,1]\n", "6\n"),
      testCase("[4,2,0,3,2,5]\n", "9\n"),
    ],
    [
      snippet("java", `class Solution {
    public int trap(int[] height) {
        return 0;
    }
}`),
      snippet("javascript", `var trap = function(height) {};`),
    ],
  ),
  problem(
    "LeetCode-43M",
    140,
    "cfb28f3e1e7d5ed14a55f7e3b0c1d86aa889b39d",
    "Multiply Strings - Given two non-negative integers num1 and num2 represented as strings, return the product as a string.",
    ["Use array for intermediate results", "Handle carry propagation", "Skip leading zeros"],
    "MEDIUM",
    [
      testCase("2\n3\n", "6\n"),
      testCase("123\n456\n", "56088\n"),
    ],
    [
      snippet("java", `class Solution {
    public String multiply(String num1, String num2) {
        return "";
    }
}`),
      snippet("javascript", `var multiply = function(num1, num2) {};`),
    ],
  ),
  problem(
    "LeetCode-49M",
    141,
    "b9990c86ea1980aa4c9e45d1c4f1cf8ffc6022d1",
    "Group Anagrams - Given an array of strings strs, group the anagrams together.",
    ["Sort strings for key", "Use hashmap with sorted string key", "Count frequency array for key"],
    "MEDIUM",
    [
      testCase("[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]\n", "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]\n"),
      testCase("[\"\"]\n", "[[\"\"]]\n"),
    ],
    [
      snippet("java", `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        return null;
    }
}`),
      snippet("javascript", `var groupAnagrams = function(strs) {};`),
    ],
  ),
  problem(
    "LeetCode-50M",
    142,
    "c989c85200fda6ef06ac6616bb7c48f649dc213a",
    "Pow(x, n) - Implement pow(x, n), which calculates x raised to the power n.",
    ["Binary exponentiation", "Handle negative exponents", "Watch for integer overflow"],
    "MEDIUM",
    [
      testCase("2.00000\n10\n", "1024.00000\n"),
      testCase("2.10000\n3\n", "9.26100\n"),
    ],
    [
      snippet("java", `class Solution {
    public double myPow(double x, int n) {
        return 0.0;
    }
}`),
      snippet("javascript", `var myPow = function(x, n) {};`),
    ],
  ),
  problem(
    "LeetCode-543E",
    143,
    "4928680509985c3e338e1e49b0251c210fddd079",
    "Diameter of Binary Tree - Given the root of a binary tree, return the length of the diameter - the longest path between any two nodes.",
    ["Diameter passes through root or not", "Calculate height recursively", "Update max diameter during DFS"],
    "EASY",
    [
      testCase("[1,2,3,4,5]\n", "3\n"),
      testCase("[1,2]\n", "1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int diameterOfBinaryTree(TreeNode root) {
        return 0;
    }
}`),
      snippet("javascript", `var diameterOfBinaryTree = function(root) {};`),
    ],
  ),
  problem(
    "LeetCode-547M",
    144,
    "0e840ac07123ad2924b77eef247c1b7fc838b33b",
    "Number of Provinces - Given a matrix isConnected where isConnected[i][j]=1 indicates cities i and j are directly connected, return the number of provinces.",
    ["DFS/BFS to find connected components", "Union-Find for efficiency", "Track visited cities"],
    "MEDIUM",
    [
      testCase("[[1,1,0],[1,1,0],[0,0,1]]\n", "2\n"),
      testCase("[[1,0,0],[0,1,0],[0,0,1]]\n", "3\n"),
    ],
    [
      snippet("java", `class Solution {
    public int findCircleNum(int[][] isConnected) {
        return 0;
    }
}`),
      snippet("javascript", `var findCircleNum = function(isConnected) {};`),
    ],
  ),
  problem(
    "LeetCode-572E",
    145,
    "67ad5cda9010a14388f66b32c140f32f12dfb9fa",
    "Subtree of Another Tree - Given the roots of two binary trees root and subRoot, return true if subRoot is a subtree of root.",
    ["Check if trees are identical at root", "Recursively check left and right", "Use serialize for string matching"],
    "EASY",
    [
      testCase("[3,4,5,1,2]\n[4,1,2]\n", "true\n"),
      testCase("[3,4,5,1,2,null,null,0]\n[4,1,2]\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean isSubtree(TreeNode root, TreeNode subRoot) {
        return false;
    }
}`),
      snippet("javascript", `var isSubtree = function(root, subRoot) {};`),
    ],
  ),
  problem(
    "LeetCode-57M",
    146,
    "82a3a35ea013b8e5a25208e5dcf218dfd5f5df76",
    "Insert Interval - Given a set of non-overlapping intervals and a new interval, insert the new interval and merge if necessary.",
    ["Find insertion position", "Merge overlapping intervals", "Handle empty list cases"],
    "MEDIUM",
    [
      testCase("[[1,3],[6,9]]\n[2,5]\n", "[[1,5],[6,9]]\n"),
      testCase("[[1,2],[3,5],[6,7],[8,10],[12,16]]\n[4,8]\n", "[[1,2],[3,10],[12,16]]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        return new int[0][0];
    }
}`),
      snippet("javascript", `var insert = function(intervals, newInterval) {};`),
    ],
  ),
  problem(
    "LeetCode-58E",
    147,
    "9764a2fa5b3d23ad682f89c7a4460ef403f96891",
    "Length of Last Word - Given a string s consisting of words and spaces, return the length of the last word.",
    ["Trim trailing spaces", "Split by spaces", "Get last element length"],
    "EASY",
    [
      testCase("Hello World\n", "5\n"),
      testCase("   fly me   to   the moon  \n", "4\n"),
    ],
    [
      snippet("java", `class Solution {
    public int lengthOfLastWord(String s) {
        return 0;
    }
}`),
      snippet("javascript", `var lengthOfLastWord = function(s) {};`),
    ],
  ),
  problem(
    "LeetCode-61M",
    148,
    "6b0cc8b9467beb90d95f1368db186d25dffb1bb1",
    "Rotate List - Given the head of a linked list, rotate the list to the right by k places.",
    ["Calculate length and effective k", "Make list circular", "Break at new head"],
    "MEDIUM",
    [
      testCase("[1,2,3,4,5]\n2\n", "[4,5,1,2,3]\n"),
      testCase("[0,1,2]\n4\n", "[2,0,1]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode rotateRight(ListNode head, int k) {
        return null;
    }
}`),
      snippet("javascript", `var rotateRight = function(head, k) {};`),
    ],
  ),
  problem(
    "LeetCode-621M",
    149,
    "7dd81fe86f6015acc8b7c61a342fb6587d6051b3",
    "Task Scheduler - Given a char array tasks and an integer n, return the minimum number of CPU intervals required to finish all tasks with a cooldown of n between identical tasks.",
    ["Greedy with max frequency", "Calculate idle slots", "Formula: max(countMax-1,0)*(n+1)+freqMax"],
    "MEDIUM",
    [
      testCase("[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]\n2\n", "8\n"),
      testCase("[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"]\n0\n", "6\n"),
    ],
    [
      snippet("java", `class Solution {
    public int leastInterval(char[] tasks, int n) {
        return 0;
    }
}`),
      snippet("javascript", `var leastInterval = function(tasks, n) {};`),
    ],
  ),
  problem(
    "LeetCode-622M",
    150,
    "242e13f4be8c85e6a24b6c72085fee6322c60b3b",
    "Design Circular Queue - Design your implementation of the circular queue.",
    ["Use array with front and rear pointers", "Handle empty and full conditions", "Modulo arithmetic for wrap-around"],
    "MEDIUM",
    [testCase("enQueue(1),enQueue(2),enQueue(3),enQueue(4),enQueue(5),deQueue()\n", "true,true,true,true,false,1\n")],
    [
      snippet("java", `class MyCircularQueue {
    public MyCircularQueue(int k) {}
    public boolean enQueue(int value) { return false; }
    public boolean deQueue() { return false; }
    public int Front() { return 0; }
    public int Rear() { return 0; }
    public boolean isEmpty() { return false; }
    public boolean isFull() { return false; }
}`),
      snippet("javascript", `var MyCircularQueue = function(k) {};
MyCircularQueue.prototype.enQueue = function(value) {};
MyCircularQueue.prototype.deQueue = function() {};
MyCircularQueue.prototype.Front = function() {};
MyCircularQueue.prototype.Rear = function() {};
MyCircularQueue.prototype.isEmpty = function() {};
MyCircularQueue.prototype.isFull = function() {};`),
    ],
  ),
  problem(
    "LeetCode-62M",
    151,
    "89e8e5a4fdc57902c60bbee95d2eee85fc4a0e45",
    "Unique Paths - A robot is located at top-left corner of an m x n grid. It can only move down or right. How many possible unique paths to bottom-right corner?",
    ["DP with 2D array", "Combinatorics: C(m+n-2, m-1)", "Optimize space to O(n)"],
    "MEDIUM",
    [
      testCase("3\n7\n", "28\n"),
      testCase("3\n2\n", "3\n"),
    ],
    [
      snippet("java", `class Solution {
    public int uniquePaths(int m, int n) {
        return 0;
    }
}`),
      snippet("javascript", `var uniquePaths = function(m, n) {};`),
    ],
  ),
  problem(
    "LeetCode-647M",
    152,
    "79a8333b71823d6c5c4b7f044253021694ab4042",
    "Palindromic Substrings - Given a string s, return the number of palindromic substrings in it.",
    ["Expand around center technique", "Count odd and even length palindromes", "O(n^2) time O(1) space"],
    "MEDIUM",
    [
      testCase("abc\n", "3\n"),
      testCase("aaa\n", "6\n"),
    ],
    [
      snippet("java", `class Solution {
    public int countSubstrings(String s) {
        return 0;
    }
}`),
      snippet("javascript", `var countSubstrings = function(s) {};`),
    ],
  ),
  problem(
    "LeetCode-649M",
    153,
    "7cc752a358bac8f2d5ba4b03471f72316c441286",
    "Dota2 Senate - In the world of Dota2, there are two parties: Radiant and Dire. The senate consists of senators coming from these parties. Predict which party will ultimately announce a victory.",
    ["Use two queues for indices", "Simulate banning process", "Senator with smaller index bans the other"],
    "MEDIUM",
    [
      testCase("RD\n", "Radiant\n"),
      testCase("RDD\n", "Dire\n"),
    ],
    [
      snippet("java", `class Solution {
    public String predictPartyVictory(String senate) {
        return "";
    }
}`),
      snippet("javascript", `var predictPartyVictory = function(senate) {};`),
    ],
  ),
  problem(
    "LeetCode-66E",
    154,
    "0264850154fe03024d2f99c2376b7265c3a2bc5d",
    "Plus One - Given a large integer represented as an array of digits, increment the integer by one.",
    ["Add from the end", "Handle carry propagation", "Create new array if needed"],
    "EASY",
    [
      testCase("[1,2,3]\n", "[1,2,4]\n"),
      testCase("[9,9,9]\n", "[1,0,0,0]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] plusOne(int[] digits) {
        return new int[0];
    }
}`),
      snippet("javascript", `var plusOne = function(digits) {};`),
    ],
  ),
  problem(
    "LeetCode-67E",
    155,
    "0029012089ee1a3b6a85ea16cf2947a60bec77b2",
    "Add Binary - Given two binary strings a and b, return their sum as a binary string.",
    ["Process from right to left", "Track carry", "Use StringBuilder"],
    "EASY",
    [
      testCase("11\n1\n", "100\n"),
      testCase("1010\n1011\n", "10101\n"),
    ],
    [
      snippet("java", `class Solution {
    public String addBinary(String a, String b) {
        return "";
    }
}`),
      snippet("javascript", `var addBinary = function(a, b) {};`),
    ],
  ),
  problem(
    "LeetCode-684M",
    156,
    "0a7cbb47fe9ae8c0ed0587a3c5c9d971192d2fb4",
    "Redundant Connection - In this problem, a tree is an undirected graph that is connected and has no cycles. Add one extra edge to the tree. Return the edge that can be removed.",
    ["Union-Find to detect cycle", "Return first edge causing cycle", "Undirected edge processing"],
    "MEDIUM",
    [
      testCase("[[1,2],[1,3],[2,3]]\n", "[2,3]\n"),
      testCase("[[1,2],[2,3],[3,4],[1,4],[1,5]]\n", "[1,4]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] findRedundantConnection(int[][] edges) {
        return new int[0];
    }
}`),
      snippet("javascript", `var findRedundantConnection = function(edges) {};`),
    ],
  ),
  problem(
    "LeetCode-68H",
    157,
    "ce3b7f16d73883a447ac3cdd485d11a95cea30fa",
    "Text Justification - Given an array of words and a width maxWidth, format the text such that each line has exactly maxWidth characters and is fully justified.",
    ["Pack words into lines", "Calculate spaces distribution", "Left justify last line"],
    "HARD",
    [testCase("[\"This\",\"is\",\"an\",\"example\",\"of\",\"text\",\"justification.\"]\n16\n", "Lines justified\n")],
    [
      snippet("java", `class Solution {
    public List<String> fullJustify(String[] words, int maxWidth) {
        return null;
    }
}`),
      snippet("javascript", `var fullJustify = function(words, maxWidth) {};`),
    ],
  ),
  problem(
    "LeetCode-695M",
    158,
    "78efb75628f1e071e4a00e7530a071021e8b77fb",
    "Max Area of Island - Given a 2D binary grid, find the maximum area of an island (connected 1s vertically or horizontally).",
    ["DFS/BFS for each unvisited island", "Count area, track max", "Mark visited cells"],
    "MEDIUM",
    [
      testCase("[[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0]]\n", "4\n"),
      testCase("[[0,0,0,0,0,0,0,0]]\n", "0\n"),
    ],
    [
      snippet("java", `class Solution {
    public int maxAreaOfIsland(int[][] grid) {
        return 0;
    }
}`),
      snippet("javascript", `var maxAreaOfIsland = function(grid) {};`),
    ],
  ),
  problem(
    "LeetCode-69E",
    159,
    "5221588b8c424ce2ab002b66f786d3025502359e",
    "Sqrt(x) - Given a non-negative integer x, return the square root rounded down to the nearest integer.",
    ["Binary search", "Newton's method", "Integer multiplication to avoid overflow"],
    "EASY",
    [
      testCase("4\n", "2\n"),
      testCase("8\n", "2\n"),
    ],
    [
      snippet("java", `class Solution {
    public int mySqrt(int x) {
        return 0;
    }
}`),
      snippet("javascript", `var mySqrt = function(x) {};`),
    ],
  ),
  problem(
    "LeetCode-703E",
    160,
    "d09c3861963ff2673fc8fbe361dbf877c5e0cf90",
    "Kth Largest Element in a Stream - Design a class to find the kth largest element in a stream of numbers.",
    ["Use min-heap of size k", "Always keep k largest elements", "Heap top is kth largest"],
    "EASY",
    [testCase("KthLargest(3,[4,5,8,2])\nadd(3),add(5),add(10),add(9),add(4)\n", "4,5,5,8,8\n")],
    [
      snippet("java", `class KthLargest {
    public KthLargest(int k, int[] nums) {}
    public int add(int val) { return 0; }
}`),
      snippet("javascript", `var KthLargest = function(k, nums) {};
KthLargest.prototype.add = function(val) {};`),
    ],
  ),
  problem(
    "LeetCode-704E",
    161,
    "f4e323242c80d60a67e780a55e100a1bfa364c25",
    "Binary Search - Given a sorted array and a target value, return the index of the target, or -1 if not found.",
    ["Classic binary search", "Find middle, compare", "Update left or right pointers"],
    "EASY",
    [
      testCase("[-1,0,3,5,9,12]\n9\n", "4\n"),
      testCase("[-1,0,3,5,9,12]\n2\n", "-1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int search(int[] nums, int target) {
        return -1;
    }
}`),
      snippet("javascript", `var search = function(nums, target) {};`),
    ],
  ),
  problem(
    "LeetCode-70E",
    162,
    "ba53192ec1631ac2fdedb53f1caae0d82648da6a",
    "Climbing Stairs - You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. How many distinct ways can you climb to the top?",
    ["Fibonacci sequence", "Dynamic programming", "Space optimization O(1)"],
    "EASY",
    [
      testCase("2\n", "2\n"),
      testCase("3\n", "3\n"),
    ],
    [
      snippet("java", `class Solution {
    public int climbStairs(int n) {
        return 0;
    }
}`),
      snippet("javascript", `var climbStairs = function(n) {};`),
    ],
  ),
  problem(
    "LeetCode-716M",
    163,
    "2f89077afa74c4bb1a5e21e1e0d5af1669ca5144",
    "Max Stack - Design a stack that supports push, pop, top, peekMax, and popMax.",
    ["Use two stacks or stack with node", "Track max separately", "Handle duplicate max values"],
    "MEDIUM",
    [testCase("push(5),push(1),push(5),top(),popMax(),top(),peekMax()\n", "5,5,1,5\n")],
    [
      snippet("java", `class MaxStack {
    public void push(int x) {}
    public int pop() { return 0; }
    public int top() { return 0; }
    public int peekMax() { return 0; }
    public int popMax() { return 0; }
}`),
      snippet("javascript", `var MaxStack = function() {};
MaxStack.prototype.push = function(x) {};
MaxStack.prototype.pop = function() {};
MaxStack.prototype.top = function() {};
MaxStack.prototype.peekMax = function() {};
MaxStack.prototype.popMax = function() {};`),
    ],
  ),
  problem(
    "LeetCode-739M",
    164,
    "d9ef9291c88099e43b068cb660142b2ded01d7ae",
    "Daily Temperatures - Given an array of temperatures, return an array such that answer[i] is the number of days until a warmer temperature.",
    ["Monotonic decreasing stack", "Store indices, not values", "O(n) time complexity"],
    "MEDIUM",
    [
      testCase("[73,74,75,71,69,72,76,73]\n", "[1,1,4,2,1,1,0,0]\n"),
      testCase("[30,40,50,60]\n", "[1,1,1,0]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        return new int[0];
    }
}`),
      snippet("javascript", `var dailyTemperatures = function(temperatures) {};`),
    ],
  ),
  problem(
    "LeetCode-743M",
    165,
    "7eba966dbd838ffbddd505f5ff82e873624a2555",
    "Network Delay Time - Given a network of n nodes and travel times as directed edges, find the time it takes for all nodes to receive a signal from node k.",
    ["Dijkstra's algorithm", "Priority queue for min distance", "Track maximum distance to all nodes"],
    "MEDIUM",
    [
      testCase("4\n[[2,1,1],[2,3,1],[3,4,1]]\n2\n", "2\n"),
      testCase("2\n[[1,2,1]]\n2\n", "-1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int networkDelayTime(int[][] times, int n, int k) {
        return 0;
    }
}`),
      snippet("javascript", `var networkDelayTime = function(times, n, k) {};`),
    ],
  ),
  problem(
    "LeetCode-74M",
    166,
    "d9b3368ad9a2f7695565fc6fc631d4c11574c58f",
    "Search a 2D Matrix - Write an efficient algorithm to search for a target value in an m x n matrix. Integers in each row are sorted from left to right, and first integer of each row is greater than last integer of previous row.",
    ["Treat as sorted array", "Binary search on row then column", "Single binary search with index mapping"],
    "MEDIUM",
    [
      testCase("[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3\n", "true\n"),
      testCase("[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n13\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        return false;
    }
}`),
      snippet("javascript", `var searchMatrix = function(matrix, target) {};`),
    ],
  ),
  problem(
    "LeetCode-752M",
    167,
    "a57ed88094419240e355f5efefb6d3b83afefa03",
    "Open the Lock - You have a lock with 4 circular wheels, each labeled '0' to '9'. The lock initially starts at '0000'. Find the minimum number of moves to reach a target combination, avoiding deadends.",
    ["BFS shortest path", "Generate 8 neighbors per state", "Track visited and deadends"],
    "MEDIUM",
    [
      testCase("[\"0201\",\"0101\",\"0102\",\"1212\",\"2002\"]\n\"0202\"\n", "6\n"),
      testCase("[\"8888\"]\n\"0009\"\n", "1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int openLock(String[] deadends, String target) {
        return 0;
    }
}`),
      snippet("javascript", `var openLock = function(deadends, target) {};`),
    ],
  ),
  problem(
    "LeetCode-759H",
    168,
    "983d76a9f2a659676928c28d4293bf19d3f15f1e",
    "Employee Free Time - We are given a list of schedules for employees, where each schedule is a list of non-overlapping intervals. Find the common free time for all employees.",
    ["Flatten all intervals", "Sort by start time", "Merge and find gaps between merged intervals"],
    "HARD",
    [testCase("[[[1,2],[5,6]],[[1,3]],[[4,10]]]\n", "[[3,4]]\n")],
    [
      snippet("java", `class Solution {
    public List<Interval> employeeFreeTime(List<List<Interval>> schedule) {
        return null;
    }
}`),
      snippet("javascript", `var employeeFreeTime = function(schedule) {};`),
    ],
  ),
  problem(
    "LeetCode-75M",
    169,
    "a3123dbf07d90941849d965996f6d361a7c2a851",
    "Sort Colors - Given an array nums with objects colored red, white, or blue (0,1,2), sort them in-place so that objects of the same color are adjacent.",
    ["Dutch national flag algorithm", "Three pointers (low, mid, high)", "Single pass O(n)"],
    "MEDIUM",
    [
      testCase("[2,0,2,1,1,0]\n", "[0,0,1,1,2,2]\n"),
      testCase("[2,0,1]\n", "[0,1,2]\n"),
    ],
    [
      snippet("java", `class Solution {
    public void sortColors(int[] nums) {}
}`),
      snippet("javascript", `var sortColors = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-76H",
    170,
    "bfadf79248666fe26a2719f9bb544936e04596be",
    "Minimum Window Substring - Given two strings s and t, return the minimum window substring of s such that every character in t is included.",
    ["Sliding window with two pointers", "Track character counts", "Shrink window when valid"],
    "HARD",
    [
      testCase("ADOBECODEBANC\nABC\n", "BANC\n"),
      testCase("a\na\n", "a\n"),
    ],
    [
      snippet("java", `class Solution {
    public String minWindow(String s, String t) {
        return "";
    }
}`),
      snippet("javascript", `var minWindow = function(s, t) {};`),
    ],
  ),
  problem(
    "LeetCode-778H",
    171,
    "f51a643efe2476f3f7936f0860a72f38eb1085ef",
    "Swim in Rising Water - In a grid where each cell has a water level, you start at (0,0) and need to reach (n-1,n-1). Find the earliest time when a path exists.",
    ["Binary search on time", "BFS/DFS to check connectivity", "Use priority queue for Dijkstra"],
    "HARD",
    [
      testCase("[[0,2],[1,3]]\n", "3\n"),
      testCase("[[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]\n", "16\n"),
    ],
    [
      snippet("java", `class Solution {
    public int swimInWater(int[][] grid) {
        return 0;
    }
}`),
      snippet("javascript", `var swimInWater = function(grid) {};`),
    ],
  ),
  problem(
    "LeetCode-787",
    172,
    "54a43f57da4392857a122a48ba58db05b4e0f397",
    "Cheapest Flights Within K Stops - Find the cheapest price from src to dst with at most k stops.",
    ["Bellman-Ford algorithm", "DP with K iterations", "Priority queue BFS"],
    "MEDIUM",
    [
      testCase("4\n[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]]\n0\n3\n1\n", "700\n"),
      testCase("3\n[[0,1,100],[1,2,100],[0,2,500]]\n0\n2\n1\n", "200\n"),
    ],
    [
      snippet("java", `class Solution {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        return 0;
    }
}`),
      snippet("javascript", `var findCheapestPrice = function(n, flights, src, dst, k) {};`),
    ],
  ),
  problem(
    "LeetCode-78M",
    173,
    "f684a14fd0394d5519439c5401c54ef34efb5452",
    "Subsets - Given an integer array nums of unique elements, return all possible subsets (the power set).",
    ["Backtracking", "Iterative bit manipulation", "Include/exclude each element"],
    "MEDIUM",
    [
      testCase("[1,2,3]\n", "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]\n"),
      testCase("[0]\n", "[[],[0]]\n"),
    ],
    [
      snippet("java", `class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        return null;
    }
}`),
      snippet("javascript", `var subsets = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode-79M",
    174,
    "81e64be3dc3b50a97bbccfb1f5ed34b76391f220",
    "Word Search - Given an m x n grid of characters and a string word, return true if the word exists in the grid.",
    ["Backtracking DFS", "Mark visited cells", "Try all starting positions"],
    "MEDIUM",
    [
      testCase("[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"ABCCED\"\n", "true\n"),
      testCase("[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"ABCB\"\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean exist(char[][] board, String word) {
        return false;
    }
}`),
      snippet("javascript", `var exist = function(board, word) {};`),
    ],
  ),
  problem(
    "LeetCode-82H",
    175,
    "caabb6fe7ad3f843d03beb8d0cbb5204f8418ab5",
    "Remove Duplicates from Sorted List II - Given the head of a sorted linked list, delete all nodes that have duplicate numbers, leaving only distinct numbers.",
    ["Use dummy node", "Track previous node", "Skip duplicates while iterating"],
    "HARD",
    [
      testCase("[1,2,3,3,4,4,5]\n", "[1,2,5]\n"),
      testCase("[1,1,1,2,3]\n", "[2,3]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode deleteDuplicates(ListNode head) {
        return null;
    }
}`),
      snippet("javascript", `var deleteDuplicates = function(head) {};`),
    ],
  ),
  problem(
    "LeetCode-83E",
    176,
    "0b998c89a0d896eb51470388c7f8bd4901e6c711",
    "Remove Duplicates from Sorted List - Given a sorted linked list, delete all duplicates such that each element appears only once.",
    ["Single pointer iteration", "Compare current with next", "Skip duplicates"],
    "EASY",
    [
      testCase("[1,1,2]\n", "[1,2]\n"),
      testCase("[1,1,2,3,3]\n", "[1,2,3]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode deleteDuplicates(ListNode head) {
        return null;
    }
}`),
      snippet("javascript", `var deleteDuplicates = function(head) {};`),
    ],
  ),
  problem(
    "LeetCode-853M",
    177,
    "03d6624137e3c37301c7b93677e4be4c0bf77052",
    "Car Fleet - Given target position and arrays of position and speed for cars, determine how many car fleets will arrive at the target.",
    ["Sort cars by position", "Calculate time to target", "Monitor slower cars catching up"],
    "MEDIUM",
    [
      testCase("12\n[10,8,0,5,3]\n[2,4,1,1,3]\n", "3\n"),
      testCase("10\n[3]\n[3]\n", "1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int carFleet(int target, int[] position, int[] speed) {
        return 0;
    }
}`),
      snippet("javascript", `var carFleet = function(target, position, speed) {};`),
    ],
  ),
  problem(
    "LeetCode-875M",
    178,
    "684c639c67d991b37cc578fb3d43d457ae84c66d",
    "Koko Eating Bananas - Koko loves to eat bananas. Return the minimum integer k such that she can eat all bananas within h hours.",
    ["Binary search on eating speed", "Calculate hours needed per speed", "Find minimum feasible speed"],
    "MEDIUM",
    [
      testCase("[3,6,7,11]\n8\n", "4\n"),
      testCase("[30,11,23,4,20]\n5\n", "30\n"),
    ],
    [
      snippet("java", `class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        return 0;
    }
}`),
      snippet("javascript", `var minEatingSpeed = function(piles, h) {};`),
    ],
  ),
  problem(
    "LeetCode-876E",
    179,
    "719ebae3b642bd0fba40931012fa5e9585fb9ccd",
    "Middle of the Linked List - Given the head of a singly linked list, return the middle node. If two middle nodes, return the second middle.",
    ["Slow and fast pointers", "Move slow by 1, fast by 2", "Fast reaches end, slow at middle"],
    "EASY",
    [
      testCase("[1,2,3,4,5]\n", "[3,4,5]\n"),
      testCase("[1,2,3,4,5,6]\n", "[4,5,6]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode middleNode(ListNode head) {
        return null;
    }
}`),
      snippet("javascript", `var middleNode = function(head) {};`),
    ],
  ),
  problem(
    "LeetCode-88E",
    180,
    "8403d164dd482eb364bb51e411f6cc0c77323133",
    "Merge Sorted Array - Merge two sorted arrays into the first array, which has enough space.",
    ["Start from the end", "Three pointers (i,j,k)", "Place larger element at end"],
    "EASY",
    [
      testCase("[1,2,3,0,0,0]\n3\n[2,5,6]\n3\n", "[1,2,2,3,5,6]\n"),
      testCase("[1]\n1\n[]\n0\n", "[1]\n"),
    ],
    [
      snippet("java", `class Solution {
    public void merge(int[] nums1, int m, int[] nums2, int n) {}
}`),
      snippet("javascript", `var merge = function(nums1, m, nums2, n) {};`),
    ],
  ),
  problem(
    "LeetCode-92M",
    181,
    "855684d0dfbbe830efa6a0295463cac7d1d817ae",
    "Reverse Linked List II - Given the head of a singly linked list and two positions left and right, reverse the nodes from position left to position right.",
    ["Traverse to left-1 node", "Reverse sublist using pointers", "Connect back to original list"],
    "MEDIUM",
    [
      testCase("[1,2,3,4,5]\n2\n4\n", "[1,4,3,2,5]\n"),
      testCase("[5]\n1\n1\n", "[5]\n"),
    ],
    [
      snippet("java", `class Solution {
    public ListNode reverseBetween(ListNode head, int left, int right) {
        return null;
    }
}`),
      snippet("javascript", `var reverseBetween = function(head, left, right) {};`),
    ],
  ),
  problem(
    "LeetCode-973M",
    182,
    "9ff218f50d90a252c692372a7ace7772a4b36a92",
    "K Closest Points to Origin - Given an array of points where points[i] = [xi, yi], return the k closest points to the origin (0,0).",
    ["Use min-heap with distances", "Quickselect for O(n) average", "Sort by squared distance"],
    "MEDIUM",
    [
      testCase("[[1,3],[-2,2]]\n1\n", "[[-2,2]]\n"),
      testCase("[[3,3],[5,-1],[-2,4]]\n2\n", "[[3,3],[-2,4]]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[][] kClosest(int[][] points, int k) {
        return new int[0][0];
    }
}`),
      snippet("javascript", `var kClosest = function(points, k) {};`, `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (input.length < 2) process.exit(0);\nconst points = JSON.parse(input[0]);\nconst k = parseInt(input[1]);\nconst res = kClosest(points, k);\nconsole.log(JSON.stringify(res).replace(/\\s/g, ''));`),
    ],
  ),
  problem(
    "LeetCode-98M",
    183,
    "33c2d6176b2673d172f115c239d26f6b56832e0f",
    "Validate Binary Search Tree - Given the root of a binary tree, determine if it is a valid binary search tree (BST).",
    ["In-order traversal gives sorted values", "Recursive with min/max bounds", "Check left < root < right"],
    "MEDIUM",
    [
      testCase("[2,1,3]\n", "true\n"),
      testCase("[5,1,4,null,null,3,6]\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean isValidBST(TreeNode root) {
        return false;
    }
}`),
      snippet("javascript", `var isValidBST = function(root) {};`),
    ],
  ),
  problem(
    "LeetCode-994M",
    184,
    "7cef619c4f69a66c0ec4b0b8ca314dfc55c47624",
    "Rotting Oranges - In a given grid, each cell can be empty (0), fresh orange (1), or rotten orange (2). Return the minimum minutes until no fresh orange remains.",
    ["Multi-source BFS", "Track fresh count", "Level order traversal for minutes"],
    "MEDIUM",
    [
      testCase("[[2,1,1],[1,1,0],[0,1,1]]\n", "4\n"),
      testCase("[[2,1,1],[0,1,1],[1,0,1]]\n", "-1\n"),
    ],
    [
      snippet("java", `class Solution {
    public int orangesRotting(int[][] grid) {
        return 0;
    }
}`),
      snippet("javascript", `var orangesRotting = function(grid) {};`),
    ],
  ),
  problem(
    "LeetCode15M",
    185,
    "9e52e6da6686f0f62c9c89647b254f2f29c677d4",
    "3Sum - Given an integer array nums, return all triplets that sum to zero.",
    ["Sort array", "Fix first element, two-pointer for remaining", "Skip duplicates"],
    "MEDIUM",
    [
      testCase("[-1,0,1,2,-1,-4]\n", "[[-1,-1,2],[-1,0,1]]\n"),
      testCase("[0,1,1]\n", "[]\n"),
    ],
    [
      snippet("java", `class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        return null;
    }
}`),
      snippet("javascript", `var threeSum = function(nums) {};`),
    ],
  ),
  problem(
    "LeetCode210M",
    186,
    "d21efbd7241e7d2b31cc32eac299bf3afcef4788",
    "Course Schedule II - Return the ordering of courses to finish all courses given prerequisites, or empty array if impossible.",
    ["Topological sort", "Kahn's algorithm with indegree", "Detect cycle"],
    "MEDIUM",
    [
      testCase("2\n[[1,0]]\n", "[0,1]\n"),
      testCase("4\n[[1,0],[2,0],[3,1],[3,2]]\n", "[0,2,1,3]\n"),
    ],
    [
      snippet("java", `class Solution {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        return new int[0];
    }
}`),
      snippet("javascript", `var findOrder = function(numCourses, prerequisites) {};`),
    ],
  ),
  problem(
    "LeetCode424M",
    187,
    "c89c76f80bc88ce330c3c420ae2a9617fdb0fd35",
    "Longest Repeating Character Replacement - Given a string s and an integer k, find the length of the longest substring containing the same letter after replacing at most k characters.",
    ["Sliding window", "Track most frequent character in window", "Window size - maxCount <= k"],
    "MEDIUM",
    [
      testCase("ABAB\n2\n", "4\n"),
      testCase("AABABBA\n1\n", "4\n"),
    ],
    [
      snippet("java", `class Solution {
    public int characterReplacement(String s, int k) {
        return 0;
    }
}`),
      snippet("javascript", `var characterReplacement = function(s, k) {};`),
    ],
  ),
  problem(
    "LeetCode567M",
    188,
    "52ac031786d093c991b0197e1e7b5fb68ad7e791",
    "Permutation in String - Given two strings s1 and s2, return true if s2 contains a permutation of s1.",
    ["Sliding window with character counts", "Compare frequency arrays", "Window size = len(s1)"],
    "MEDIUM",
    [
      testCase("ab\neidbaooo\n", "true\n"),
      testCase("ab\neidboaoo\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean checkInclusion(String s1, String s2) {
        return false;
    }
}`),
      snippet("javascript", `var checkInclusion = function(s1, s2) {};`),
    ],
  ),
  problem(
    "LeetCode953E",
    189,
    "186c3fad3183a4ec5d2c175800ed4cc324620d8d",
    "Verifying an Alien Dictionary - In an alien language, words are sorted lexicographically according to the order of the alphabet. Check if the given words are sorted.",
    ["Create character order map", "Compare adjacent words", "Check character by character"],
    "EASY",
    [
      testCase("[\"hello\",\"leetcode\"]\n\"hlabcdefgijkmnopqrstuvwxyz\"\n", "true\n"),
      testCase("[\"word\",\"world\",\"row\"]\n\"worldabcefghijkmnpqstuvxyz\"\n", "false\n"),
    ],
    [
      snippet("java", `class Solution {
    public boolean isAlienSorted(String[] words, String order) {
        return false;
    }
}`),
      snippet("javascript", `var isAlienSorted = function(words, order) {};`),
    ],
  ),
] satisfies RawSeedProblem[];
