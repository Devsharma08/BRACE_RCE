/**
 * Generates the starter-code snippets stored in Problem.code_snippets.
 *
 * Only `javascript` and `java` are produced, matching the 124 existing rows
 * (124 javascript + 117 java snippets). The wrapper for Java is the same
 * placeholder Main class already used by the seeded problems; the execution
 * engine detects the signature from `class Solution` and injects a real
 * reader, so a placeholder keeps every language consistent.
 *
 * The JavaScript wrapper is `module.exports = { fnName }` — deliberately, so
 * `prepareFinalCode` treats it as "needs generation" (it skips snippets whose
 * wrapper contains `module.exports`) and builds the stdin-reading wrapper.
 */

import type { ProblemSignature } from './types.js';

const JS_TYPES: Record<string, string> = {
  int: 'number',
  long: 'number',
  double: 'number',
  boolean: 'boolean',
  bool: 'boolean',
  string: 'string',
  char: 'string',
  'int[]': 'number[]',
  'long[]': 'number[]',
  'double[]': 'number[]',
  'string[]': 'string[]',
  'char[]': 'string',
  'int[][]': 'number[][]',
  'string[][]': 'string[][]',
  'ListNode': 'ListNode',
  'TreeNode': 'TreeNode',
  'Node': 'Node',
};

const JAVA_TYPES: Record<string, string> = {
  int: 'int',
  long: 'long',
  double: 'double',
  boolean: 'boolean',
  string: 'String',
  char: 'char',
  'int[]': 'int[]',
  'long[]': 'long[]',
  'double[]': 'double[]',
  'string[]': 'String[]',
  'char[]': 'char[]',
  'int[][]': 'int[][]',
  'string[][]': 'String[][]',
  'ListNode': 'ListNode',
  'TreeNode': 'TreeNode',
  'Node': 'Node',
};

const NODE_DOCS: Record<string, string> = {
  TreeNode: `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */`,
  ListNode: `/**
 * Definition for a singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */`,
};

const JAVA_NODE_DOCS: Record<string, string> = {
  TreeNode: `/**
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
 */`,
  ListNode: `/**
 * Definition for a singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */`,
};

/** Placeholder return statement so the snippet is valid, compilable code. */
const javaReturn = (type: string): string => {
  if (type === 'void') return '';
  if (type === 'int' || type === 'long') return '        return 0;';
  if (type === 'double') return '        return 0.0;';
  if (type === 'boolean') return '        return false;';
  if (type === 'char') return "        return '\\0';";
  if (type === 'String') return '        return "";';
  if (type.endsWith('[]')) return '        return null;';
  return '        return null;';
};

export function buildSnippets(sig: ProblemSignature): {
  language: string;
  code: string;
  wrapperCode: string;
}[] {
  const argNames = sig.args.map((a) => a.name);

  // ---- JavaScript -------------------------------------------------------
  const jsDocs: string[] = [];
  for (const a of sig.args) {
    const t = JS_TYPES[a.type] ?? 'any';
    jsDocs.push(` * @param {${t}} ${a.name}`);
  }
  jsDocs.push(` * @return {${JS_TYPES[sig.returnType] ?? 'any'}}`);

  const nodeDoc = sig.args
    .map((a) => NODE_DOCS[a.type])
    .find(Boolean);

  const jsParts: string[] = [];
  if (nodeDoc) jsParts.push(nodeDoc);
  jsParts.push('/**');
  jsParts.push(...jsDocs);
  jsParts.push(' */');
  jsParts.push(`var ${sig.funcName} = function(${argNames.join(', ')}) {`);
  jsParts.push('    // Your code here');
  jsParts.push('};');

  const jsCode = jsParts.join('\n');

  // ---- Java -------------------------------------------------------------
  const javaParts: string[] = [];
  const javaNodeDoc = sig.args
    .map((a) => JAVA_NODE_DOCS[a.type])
    .find(Boolean);
  if (javaNodeDoc) javaParts.push(javaNodeDoc);

  const javaParams = sig.args
    .map((a) => `${JAVA_TYPES[a.type] ?? 'Object'} ${a.name}`)
    .join(', ');
  javaParts.push('class Solution {');
  javaParts.push(
    `    public ${JAVA_TYPES[sig.returnType] ?? 'Object'} ${sig.funcName}(${javaParams}) {`,
  );
  javaParts.push('        // Your code here');
  const ret = javaReturn(sig.returnType);
  if (ret) javaParts.push(ret);
  javaParts.push('    }');
  javaParts.push('}');

  const javaCode = javaParts.join('\n');

  return [
    {
      language: 'javascript',
      code: jsCode,
      wrapperCode: `module.exports = { ${sig.funcName} };`,
    },
    {
      language: 'java',
      code: javaCode,
      wrapperCode:
        'public class Main {\n    public static void main(String[] args) {\n        // Test wrapper\n    }\n}',
    },
  ];
}