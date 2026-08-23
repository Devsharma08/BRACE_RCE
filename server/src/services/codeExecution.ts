import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { saveSubmisssion } from "./submissionEvaluator.js";
import { execFile, execFileSync } from "child_process";
import { promisify } from "util";
const execFileAsync = promisify(execFile);

type SupportedLanguage = "javascript" | "java" | "c" | "cpp" | "python";
type ExecutionMode = "RUN" | "SUBMIT";

type ExecuteBody = {
  code?: unknown;
  language?: unknown;
  oid?: unknown;
  mode?: unknown;
  customInput?: unknown;
  performanceId?: unknown;
};

type TestCaseRecord = {
  input: string;
  expectedOutput: string;
  problemId?: string;
};

type CodeSnippetRecord = {
  language: string;
  wrapperCode?: string | null;
};

type ExecutionDetail = {
  testCaseIndex: number;
  output: string;
  expectedOutput: string;
  passed: boolean;
  problemId?: string;
  runtimeError: string | null;
};

const normalize = (value: string) => (value || "").replace(/\r\n/g, "\n").trim();

const problemIdPayload = (currentCase: TestCaseRecord) => {
  return currentCase.problemId ? { problemId: currentCase.problemId } : {};
};

const getExecutionMode = (mode: unknown): ExecutionMode => {
  return mode === "SUBMIT" ? "SUBMIT" : "RUN";
};

const getLanguage = (language: unknown): SupportedLanguage => {
  switch (language) {
    case 'cpp':
    case 'c++': return 'cpp';
    case 'py':
    case 'python': return 'python';
    case 'javascript':
    case 'js': return 'javascript';
    case 'java': return 'java';
    case 'c': return 'c';
    default: return 'javascript';
  }
};

const getExtension = (language: SupportedLanguage) => {
  const extensionMap = {
    "javascript": "js",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "python": "py",
  };
  return extensionMap[language];
};

const pistonLanguageMap: Record<SupportedLanguage, string> = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "c++",
  c: "c",
};

const getFileName = (language: SupportedLanguage) => {
  if (language === "java") return "Main.java";
  return `main.${getExtension(language)}`;
};

export function prepareFinalCode(
  executionLanguage: SupportedLanguage,
  sourceCode: string,
  snippet?: { code?: string; wrapperCode?: string | null }
): string {
  let wrapperCode = snippet?.wrapperCode || "";

  // ═══════════════════════════════════════════════════════════
  //  SHARED TYPE DETECTION UTILITIES
  // ═══════════════════════════════════════════════════════════
  type TypeKind =
    | 'int' | 'long' | 'double' | 'float' | 'bool' | 'string' | 'char'
    | 'int_array' | 'int_array_2d' | 'string_array' | 'long_array' | 'double_array'
    | 'list_node' | 'tree_node' | 'node' | 'out_size_ptr'
    | 'void' | 'unknown';

  function detectKind(rawType: string): TypeKind {
    const t = rawType
      .replace(/public:|private:|protected:|static|inline|const|virtual/gi, '')
      .replace(/\s+/g, '')
      .toLowerCase();
    if (t === 'void') return 'void';
    if (t.includes('treenode') || t.includes('structtreenode')) return 'tree_node';
    if (t.includes('listnode') || t.includes('structlistnode') || t.includes('node*')) return 'list_node';
    // 2D containers first
    if (t.includes('vector<vector') || t.includes('list<list') || t.includes('[][]') || t.includes('int[][]') || t.includes('integer[][]') || t.includes('int**')) return 'int_array_2d';
    // 1D containers
    if (t.includes('vector<int') || t.includes('vector<integer') || t.includes('int[]') || t.includes('integer[]') || t.includes('list<int') || t.includes('list<integer') || t.includes('int*')) return 'int_array';
    if (t.includes('vector<long') || t.includes('long[]') || t.includes('list<long') || t.includes('long*')) return 'long_array';
    if (t.includes('vector<double') || t.includes('double[]') || t.includes('list<double') || t.includes('double*')) return 'double_array';
    if (t.includes('vector<string') || t.includes('string[]') || t.includes('list<string') || t.includes('char**')) return 'string_array';
    // Primitives
    if (t === 'int' || t === 'integer') return 'int';
    if (t === 'long' || t === 'longlong') return 'long';
    if (t === 'double') return 'double';
    if (t === 'float') return 'float';
    if (t === 'bool' || t === 'boolean') return 'bool';
    if (t.includes('string') || t === 'str' || t.includes('char*')) return 'string';
    if (t === 'char') return 'char';
    return 'unknown';
  }

  interface ParsedParam { rawType: string; name: string; kind: TypeKind; }
  interface ParsedSig { returnKind: TypeKind; funcName: string; params: ParsedParam[]; isVoid: boolean; }

  /** Parse function sig from C++/Java style code: RetType funcName(T1 p1, T2 p2) { */
  function parseCppJavaSig(codeToSearch: string): ParsedSig | null {
    const sigRe = /([\w<>,\s:*&[\]]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+\s*)?\{/g;
    const skip = new Set(['main','Solution','Node','TreeNode','ListNode','if','for','while','catch','else']);
    let m: RegExpExecArray | null;
    while ((m = sigRe.exec(codeToSearch)) !== null) {
      const retRaw = (m[1] ?? '').trim();
      const name = (m[2] ?? '').trim();
      if (!name || skip.has(name) || /^[A-Z]/.test(name)) continue;
      const paramsRaw = (m[3] ?? '').trim();
      const params: ParsedParam[] = [];
      if (paramsRaw) {
        const parts: string[] = [];
        let depth = 0, cur = '';
        for (const ch of paramsRaw) {
          if (ch === '<' || ch === '[') depth++;
          else if (ch === '>' || ch === ']') depth--;
          if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        if (cur.trim()) parts.push(cur.trim());
        for (const part of parts) {
          const tokens = part.replace(/[&*]/g, ' ').trim().split(/\s+/);
          const paramName = tokens[tokens.length - 1] ?? `p${params.length}`;
          let kind = detectKind(part);
          if (paramName.toLowerCase().includes('returnsize') || paramName.toLowerCase().includes('retsize')) kind = 'out_size_ptr';
          params.push({ rawType: part, name: paramName, kind });
        }
      }
      const returnKind = detectKind(retRaw);
      return { returnKind, funcName: name, params, isVoid: returnKind === 'void' };
    }
    return null;
  }

  function parsePythonSig(codeToSearch: string): ParsedSig | null {
    const m = codeToSearch.match(/def\s+(\w+)\s*\((.*?)\)\s*(?:->.*?)?:/);
    if (!m) return null;
    const funcName = m[1] ?? '';
    const rawParams = (m[2] ?? '').split(',').map(p => p.trim()).filter(p => p && p !== 'self');
    const params: ParsedParam[] = rawParams.map((p, i) => {
      const name = (p.split(':')[0] ?? '').split('=')[0]?.trim() ?? `arg${i}`;
      const hint = p.includes(':') ? ((p.split(':')[1] ?? '').split('=')[0]?.trim() ?? '') : '';
      return { rawType: hint, name, kind: detectKind(hint) };
    });
    return { returnKind: 'unknown', funcName, params, isVoid: false };
  }

  // ═══════════════════════════════════════════════════════════
  //  1. JAVASCRIPT
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "javascript") {
    const userFuncMatch = sourceCode.match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)|class\s+Solution\s*\{\s*(\w+)\s*\((.*?)\)/);
    const userFuncName = userFuncMatch ? (userFuncMatch[1] || userFuncMatch[3] || userFuncMatch[5]) : null;

    if (wrapperCode && userFuncName && !wrapperCode.includes(userFuncName)) wrapperCode = "";

    const treeHelpers = `
function ListNode(val, next) {
  this.val = (val===undefined ? 0 : val);
  this.next = (next===undefined ? null : next);
}
function TreeNode(val, left, right) {
  this.val = (val===undefined ? 0 : val);
  this.left = (left===undefined ? null : left);
  this.right = (right===undefined ? null : right);
}
function _Node(val, next, random) {
  this.val = (val===undefined ? 0 : val);
  this.next = (next===undefined ? null : next);
  this.random = (random===undefined ? null : random);
}
function Node(val, left, right, next, random) {
  this.val = (val===undefined ? 0 : val);
  this.left = (left===undefined ? null : left);
  this.right = (right===undefined ? null : right);
  this.next = (next===undefined ? null : next);
  this.random = (random===undefined ? null : random);
}
function arrayToListNode(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const dummy = new ListNode(0);
  let curr = dummy;
  for (let i = 0; i < arr.length; i++) {
    curr.next = new ListNode(arr[i]);
    curr = curr.next;
  }
  return dummy.next;
}
function listNodeToArray(head) {
  if (!head) return [];
  const res = [];
  let curr = head;
  while (curr) {
    res.push(curr.val);
    curr = curr.next;
  }
  return res;
}
function isListNode(obj) {
  return obj && typeof obj === 'object' && ('val' in obj && 'next' in obj && !('left' in obj) && !('random' in obj));
}
function arrayToTree(arr) {
  if (!Array.isArray(arr) || arr.length === 0 || arr[0] === null || arr[0] === undefined) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift();
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) { curr.left = new TreeNode(arr[i]); queue.push(curr.left); }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) { curr.right = new TreeNode(arr[i]); queue.push(curr.right); }
    i++;
  }
  return root;
}
function treeToArray(root) {
  if (!root) return [];
  const result = []; const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) { result.push(node.val); queue.push(node.left); queue.push(node.right); }
    else { result.push(null); }
  }
  while (result.length > 0 && result[result.length - 1] === null) result.pop();
  return result;
}
function isTreeNode(obj) { return obj && typeof obj === 'object' && ('val' in obj && ('left' in obj || 'right' in obj)); }
function arrayToRandomList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const nodes = arr.map(item => { const val = Array.isArray(item) ? item[0] : (item && typeof item === 'object' ? item.val : item); return new _Node(val); });
  for (let i = 0; i < arr.length; i++) {
    if (i < arr.length - 1) nodes[i].next = nodes[i + 1];
    const randIdx = Array.isArray(arr[i]) ? arr[i][1] : null;
    if (randIdx !== null && randIdx !== undefined && nodes[randIdx]) nodes[i].random = nodes[randIdx];
  }
  return nodes[0];
}
function randomListToArray(head) {
  if (!head) return [];
  const nodes = []; const map = new Map(); let curr = head;
  while (curr) { map.set(curr, nodes.length); nodes.push(curr); curr = curr.next; }
  return nodes.map(node => [node.val, node.random && map.has(node.random) ? map.get(node.random) : null]);
}
function isRandomNode(obj) { return obj && typeof obj === 'object' && ('val' in obj && ('random' in obj || ('next' in obj && 'val' in obj))); }
`;

    if (!wrapperCode || wrapperCode.trim() === "// Wrapper" || wrapperCode.includes("module.exports")) {
      const match = (snippet?.code || sourceCode).match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)|class\s+Solution\s*\{\s*(\w+)\s*\((.*?)\)/);
      if (match) {
        const funcName = match[1] || match[3] || match[5];
        const argsStr = (match[2] || match[4] || match[6] || "").trim();
        const argCount = argsStr ? argsStr.split(',').length : 0;
        const isRandomProblem = sourceCode.includes("copyRandomList") || sourceCode.includes("random") || sourceCode.includes("_Node");
        const isTreeProblem = !isRandomProblem && (sourceCode.includes(".left") || sourceCode.includes(".right") || sourceCode.includes("TreeNode"));
        const isListProblem = !isRandomProblem && (sourceCode.includes("ListNode") || sourceCode.includes("partition") || sourceCode.includes("reverseList") || sourceCode.includes("mergeTwoLists") || sourceCode.includes("deleteNode"));
        const paramNames = argsStr.split(',').map(s => s.trim().toLowerCase());

        wrapperCode = `const fs = require('fs');
${treeHelpers}
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);
if (input.length === 0) { throw new Error("TEST CASE ERROR: The input provided is empty."); }
`;
        for (let i = 0; i < argCount; i++) {
          const pNameStr = JSON.stringify(paramNames[i] || '');
          wrapperCode += `const rawArg${i} = input[${i}] !== undefined ? JSON.parse(input[${i}]) : undefined;
`;
          wrapperCode += `const isArgTree${i} = ${isTreeProblem} && Array.isArray(rawArg${i}) && (${pNameStr}.includes('root') || ${pNameStr}.includes('tree') || ${pNameStr}.includes('node') || ${pNameStr} === 'p' || ${pNameStr} === 'q' || ${pNameStr} === 't1' || ${pNameStr} === 't2');
`;
          wrapperCode += `const isArgList${i} = ${isListProblem} && Array.isArray(rawArg${i}) && (${pNameStr}.includes('head') || ${pNameStr}.includes('l1') || ${pNameStr}.includes('l2') || ${pNameStr}.includes('list'));
`;
          wrapperCode += `const arg${i} = (${isRandomProblem} && Array.isArray(rawArg${i})) ? arrayToRandomList(rawArg${i}) : isArgTree${i} ? arrayToTree(rawArg${i}) : isArgList${i} ? arrayToListNode(rawArg${i}) : rawArg${i};
`;
        }
        const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
        wrapperCode += `let res;
try {
  if (typeof Solution !== 'undefined' && typeof (new Solution())['${funcName}'] === 'function') {
    res = (new Solution())['${funcName}'](${callArgs});
  } else if (typeof ${funcName} === 'function') {
    res = ${funcName}(${callArgs});
  }
} catch (e) {
  console.error("EXECUTION ERROR:", e.message || e);
  process.exit(1);
}
`;
        wrapperCode += `const outVal = isListNode(res) ? listNodeToArray(res) : isRandomNode(res) ? randomListToArray(res) : (res === null && ${isRandomProblem}) ? [] : (res === null && (${isTreeProblem} || ${isListProblem})) ? [] : (isTreeNode(res) ? treeToArray(res) : (res !== undefined ? res : (isTreeNode(arg0) ? treeToArray(arg0) : (isListNode(arg0) ? listNodeToArray(arg0) : arg0))));
`;
        wrapperCode += `console.log(JSON.stringify(outVal).replace(/\s/g, ''));`;
      }
    }

    if (wrapperCode) {
      wrapperCode = wrapperCode.replace(
        /const input = fs\.readFileSync\(0, ['"]utf-8['"]\)\.trim\(\)\.split\(['"]\n['"]\);/g,
        `const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);`
      );
      const isListProb = sourceCode.includes("ListNode") || sourceCode.includes("head") || sourceCode.includes("partition");
      if (isListProb && wrapperCode.includes("JSON.parse")) {
        wrapperCode = wrapperCode.replace(
          /(const|let|var)\s+(arg0)\s*=\s*JSON\.parse\((input\[0\])\);/g,
          `let $2 = JSON.parse($3); if (Array.isArray($2) && typeof arrayToListNode === 'function') { $2 = arrayToListNode($2); }`
        );
      }
    }
    return `${treeHelpers}
${sourceCode}
${wrapperCode}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  2. PYTHON
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "python") {
    const pyNodeHelpers = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=0, left=None, right=None, next=None, random=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next
        self.random = random

_Node = Node

def _to_list_node(arr):
    if not isinstance(arr, list): return arr
    dummy = ListNode(0)
    curr = dummy
    for v in arr:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next

def _from_list_node(head):
    if not isinstance(head, ListNode): return [] if head is None else head
    res = []
    curr = head
    while curr:
        res.append(curr.val)
        curr = curr.next
    return res

def _to_tree_node(arr):
    if not isinstance(arr, list) or not arr or arr[0] is None: return None
    root = TreeNode(arr[0])
    q = [root]
    i = 1
    while q and i < len(arr):
        curr = q.pop(0)
        if i < len(arr) and arr[i] is not None:
            curr.left = TreeNode(arr[i])
            q.append(curr.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            curr.right = TreeNode(arr[i])
            q.append(curr.right)
        i += 1
    return root

def _from_tree_node(root):
    if not isinstance(root, TreeNode): return [] if root is None else root
    res = []
    q = [root]
    last_non_none = 0
    while q:
        curr = q.pop(0)
        if curr:
            res.append(curr.val)
            last_non_none = len(res)
            q.append(curr.left)
            q.append(curr.right)
        else:
            res.append(None)
    return res[:last_non_none]
`;

    const isListProblem = sourceCode.includes("ListNode") || sourceCode.includes("head") || sourceCode.includes("partition") || sourceCode.includes("reverseList");
    const isTreeProblem = sourceCode.includes("TreeNode") || sourceCode.includes("root");

    const sig = parsePythonSig(snippet?.code || sourceCode);
    const funcName = sig?.funcName || "solution";
    const isSolutionClass = sourceCode.includes('class Solution');
    const argCount = sig?.params.length || 2;

    let pyWrapper = `
import sys, json, math, collections, heapq, itertools, functools, bisect
`;
    pyWrapper += `input_lines = [line.strip() for line in sys.stdin.read().strip().splitlines() if line.strip() != '']
`;
    pyWrapper += `if len(input_lines) == 0: raise Exception("TEST CASE ERROR: Input is empty.")
`;
    for (let i = 0; i < argCount; i++) {
      pyWrapper += `raw_arg${i} = json.loads(input_lines[${i}]) if ${i} < len(input_lines) else None
`;
      const pName = sig?.params[i]?.name.toLowerCase() || '';
      const isArgTree = isTreeProblem && (pName.includes('root') || pName.includes('tree') || pName.includes('node') || pName === 'p' || pName === 'q' || pName === 't1' || pName === 't2');
      const isArgList = isListProblem && (pName.includes('head') || pName.includes('l1') || pName.includes('l2') || pName.includes('list'));
      if (isArgList) {
        pyWrapper += `arg${i} = _to_list_node(raw_arg${i}) if isinstance(raw_arg${i}, list) else raw_arg${i}\n`;
      } else if (isArgTree) {
        pyWrapper += `arg${i} = _to_tree_node(raw_arg${i}) if isinstance(raw_arg${i}, list) else raw_arg${i}\n`;
      } else {
        pyWrapper += `arg${i} = raw_arg${i}\n`;
      }
    }
    const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
    pyWrapper += `res = None
`;
    if (isSolutionClass) {
      pyWrapper += `sol = Solution()
if hasattr(sol, '${funcName}'): res = getattr(sol, '${funcName}')(${callArgs})
`;
    } else {
      pyWrapper += `if '${funcName}' in globals(): res = globals()['${funcName}'](${callArgs})
`;
    }
    pyWrapper += `out_val = res if res is not None else (arg0 if 'arg0' in locals() else None)
`;
    pyWrapper += `if isinstance(out_val, ListNode): out_val = _from_list_node(out_val)
`;
    pyWrapper += `elif isinstance(out_val, TreeNode): out_val = _from_tree_node(out_val)
`;
    pyWrapper += `print(json.dumps(out_val, separators=(',', ':')))
`;

    return `from typing import *
import sys, json, math, collections, heapq, itertools, functools, bisect
${pyNodeHelpers}
${sourceCode}
${pyWrapper}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  3. JAVA  (reflection-based — handles all types dynamically)
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "java") {
    let sanitizedSource = sourceCode
      .replace(/^package\s+[\w.]+;\s*/gm, "")
      .replace(/public\s+class\s+Solution/g, "class Solution")
      .replace(/^import\s+[\w.*]+;\s*/gm, "")
      .trim();

    if (wrapperCode && !wrapperCode.includes("TODO")) return `${sanitizedSource}
${wrapperCode}`;

    const javaReflectionMain = `import java.util.*;
import java.io.*;
import java.lang.reflect.*;
import java.util.stream.*;

class ListNode {
  public int val;
  public ListNode next;
  public ListNode() {}
  public ListNode(int val) { this.val = val; }
  public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
  public int val;
  public TreeNode left;
  public TreeNode right;
  public TreeNode() {}
  public TreeNode(int val) { this.val = val; }
  public TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    List<String> lines = new ArrayList<>();
    String line;
    while ((line = br.readLine()) != null) {
      line = line.trim();
      if (!line.isEmpty()) lines.add(line);
    }
    String[] inputLines = lines.toArray(new String[0]);
    if (isDesignCase(Solution.class, inputLines)) { runDesignCase(Solution.class, inputLines); return; }
    if (isDesignActionCase(Solution.class, inputLines)) { runDesignActionCase(Solution.class, inputLines); return; }
    Method[] candidates = Arrays.stream(Solution.class.getDeclaredMethods())
        .filter(m -> Modifier.isPublic(m.getModifiers()) && !m.getName().equals("main") && !m.isSynthetic())
        .toArray(Method[]::new);
    InvocationPlan plan = selectInvocation(candidates, inputLines);
    Method target = plan.method;
    Object instance = Modifier.isStatic(target.getModifiers()) ? null : Solution.class.getDeclaredConstructor().newInstance();
    Object result = invokeTarget(target, instance, plan.args);
    if (target.getReturnType() == void.class) {
      if (plan.args.length > 0) System.out.println(format(plan.args[0]));
    } else {
      System.out.println(result != null ? format(result) : "null");
    }
  }
  private static Object invokeTarget(Method m, Object inst, Object[] args) throws Exception {
    try { return m.invoke(inst, args); }
    catch (InvocationTargetException e) {
      Throwable c = e.getCause();
      if (c instanceof Exception) throw (Exception)c;
      if (c instanceof Error) throw (Error)c;
      throw new RuntimeException(c);
    }
  }
  private static class InvocationPlan { final Method method; final Object[] args; InvocationPlan(Method m,Object[] a){method=m;args=a;} }
  private static class ActionCall { final String name; final String rawArgs; ActionCall(String n,String r){name=n;rawArgs=r;} }
  private static InvocationPlan selectInvocation(Method[] candidates, String[] lines) throws Exception {
    if (candidates.length == 0) throw new RuntimeException("No public solution method found");
    Exception last = null;
    for (Method m : candidates) { try { return new InvocationPlan(m, parseArguments(m.getGenericParameterTypes(), lines)); } catch (Exception e) { last = e; } }
    throw new IllegalArgumentException("Could not match input to any method. Last: " + (last == null ? "?" : last.getMessage()));
  }
  private static boolean isDesignCase(Class<?> clazz, String[] lines) {
    if (lines.length < 2) return false;
    List<String> ops; try { ops = parseOperationNames(lines[0]); } catch (Exception e) { return false; }
    if (ops.size() < 2) return false;
    List<String> groups; try { groups = getArrayItems(lines[1]); } catch (Exception e) { return false; }
    if (ops.size() != groups.size()) return false;
    Set<String> methods = Arrays.stream(clazz.getDeclaredMethods()).filter(m->Modifier.isPublic(m.getModifiers())).map(Method::getName).collect(Collectors.toSet());
    for (int i=1;i<ops.size();i++) if (!methods.contains(ops.get(i))) return false;
    return true;
  }
  private static void runDesignCase(Class<?> clazz, String[] lines) throws Exception {
    List<String> ops = parseOperationNames(lines[0]), groups = getArrayItems(lines[1]);
    List<String> outputs = new ArrayList<>();
    Object inst = constructInstance(clazz, groups.get(0)); outputs.add("null");
    for (int i=1;i<ops.size();i++) {
      Method m = findMethod(clazz, ops.get(i), groups.get(i));
      Object[] a = parseArgumentGroup(m.getGenericParameterTypes(), groups.get(i));
      Object r = invokeTarget(m, Modifier.isStatic(m.getModifiers()) ? null : inst, a);
      outputs.add(m.getReturnType()==void.class ? "null" : format(r));
    }
    System.out.println("[" + String.join(",", outputs) + "]");
  }
  private static boolean isDesignActionCase(Class<?> clazz, String[] lines) {
    List<ActionCall> calls = parseActionCalls(lines); if (calls.isEmpty()) return false;
    Set<String> methods = Arrays.stream(clazz.getDeclaredMethods()).filter(m->Modifier.isPublic(m.getModifiers())).map(Method::getName).collect(Collectors.toSet());
    int start = methods.contains(calls.get(0).name) ? 0 : 1;
    if (start==1&&calls.size()==1) return true;
    for (int i=start;i<calls.size();i++) if (!methods.contains(calls.get(i).name)) return false;
    return true;
  }
  private static void runDesignActionCase(Class<?> clazz, String[] lines) throws Exception {
    List<ActionCall> calls = parseActionCalls(lines); List<String> outputs = new ArrayList<>();
    Set<String> methods = Arrays.stream(clazz.getDeclaredMethods()).filter(m->Modifier.isPublic(m.getModifiers())).map(Method::getName).collect(Collectors.toSet());
    int start=0; Object inst;
    if (!calls.isEmpty()&&!methods.contains(calls.get(0).name)){inst=constructInstance(clazz,calls.get(0).rawArgs);outputs.add("null");start=1;}
    else {inst=constructInstance(clazz,"[]");}
    for (int i=start;i<calls.size();i++){
      ActionCall call=calls.get(i); Method m=findMethod(clazz,call.name,call.rawArgs);
      Object[] a=parseArgumentGroup(m.getGenericParameterTypes(),call.rawArgs);
      Object r=invokeTarget(m,Modifier.isStatic(m.getModifiers())?null:inst,a);
      outputs.add(m.getReturnType()==void.class?"null":format(r));
    }
    System.out.println("[" + String.join(",", outputs) + "]");
  }
  private static List<ActionCall> parseActionCalls(String[] lines) {
    String raw = String.join(",", lines).trim(); if (raw.isEmpty()) return Collections.emptyList();
    if (looksLikeArray(raw)) raw = raw.substring(1, raw.length()-1);
    List<ActionCall> calls = new ArrayList<>();
    for (String item : splitTopLevel(raw)) {
      String t=item.trim(); int op=t.indexOf('(');
      if (op<=0||!t.endsWith(")")) return Collections.emptyList();
      String name=t.substring(0,op).trim();
      if (!name.matches("[A-Za-z_\$][A-Za-z0-9_\$]*")) return Collections.emptyList();
      String a=t.substring(op+1,t.length()-1).trim();
      calls.add(new ActionCall(name, a.isEmpty()?"[]":"["+a+"]"));
    }
    return calls;
  }
  private static Object[] parseArguments(Type[] paramTypes, String[] lines) throws Exception {
    if (paramTypes.length>1&&lines.length==1&&looksLikeArray(lines[0])) {
      try { return parseArgumentGroup(paramTypes, lines[0]); } catch (Exception ignored) {}
    }
    Object[] args = new Object[paramTypes.length];
    for (int i=0;i<paramTypes.length;i++) args[i] = i<lines.length ? parseValue(lines[i],paramTypes[i]) : getDefault(paramTypes[i]);
    return args;
  }
  private static Object[] parseArgumentGroup(Type[] paramTypes, String rawArgs) throws Exception {
    List<String> items = getArrayItems(rawArgs);
    if (items.size()!=paramTypes.length) throw new IllegalArgumentException("Expected "+paramTypes.length+" args, got "+items.size());
    Object[] args = new Object[paramTypes.length];
    for (int i=0;i<paramTypes.length;i++) args[i]=parseValue(items.get(i),paramTypes[i]);
    return args;
  }
  private static Object parseValue(String raw, Type type) throws Exception {
    String t = raw.trim();
    if (type instanceof Class<?>) {
      Class<?> c = (Class<?>)type;
      if (isNull(t)&&!c.isPrimitive()) return null;
      if (c==String.class) return unquote(t);
      if (c==int.class||c==Integer.class) return parseInt(t);
      if (c==long.class||c==Long.class) return Long.parseLong(unquote(t).trim());
      if (c==double.class||c==Double.class) return Double.parseDouble(unquote(t).trim());
      if (c==float.class||c==Float.class) return Float.parseFloat(unquote(t).trim());
      if (c==boolean.class||c==Boolean.class) return Boolean.parseBoolean(unquote(t));
      if (c==char.class||c==Character.class){String s=unquote(t);return s.isEmpty()?'\0':s.charAt(0);}
      if (c.isArray()) return parseArray(t, c.getComponentType());
      if (List.class.isAssignableFrom(c)) return parseList(t, Object.class);
      if (c.getSimpleName().equals("ListNode")) return parseListNode(t);
      if (c.getSimpleName().equals("TreeNode")) return parseTreeNode(t);
      if (c.getSimpleName().equals("Node")) return parseNodeVal(t);
      return parseObject(t, c);
    }
    if (type instanceof ParameterizedType) {
      ParameterizedType pt=(ParameterizedType)type; Type raw2=pt.getRawType();
      if (raw2 instanceof Class<?>&&List.class.isAssignableFrom((Class<?>)raw2))
        return parseList(t, pt.getActualTypeArguments()[0]);
    }
    return unquote(t);
  }
  private static Object getDefault(Type type) {
    if (type instanceof Class<?>){Class<?>c=(Class<?>)type;
      if(c==int.class||c==Integer.class)return 0;if(c==long.class||c==Long.class)return 0L;
      if(c==double.class||c==Double.class)return 0.0;if(c==boolean.class||c==Boolean.class)return false;
      if(c.isArray())return Array.newInstance(c.getComponentType(),0);if(List.class.isAssignableFrom(c))return new ArrayList<>();}
    return null;
  }
  private static Object parseArray(String raw, Class<?> comp) throws Exception {
    String t=raw.trim(); if(isNull(t))return null; if(t.equals("[]"))return Array.newInstance(comp,0);
    List<String>items=getArrayItems(t); Object arr=Array.newInstance(comp,items.size());
    for(int i=0;i<items.size();i++)Array.set(arr,i,parseValue(items.get(i),comp)); return arr;
  }
  @SuppressWarnings("unchecked")
  private static List<Object> parseList(String raw, Type elem) throws Exception {
    String t=raw.trim(); if(isNull(t))return null; if(t.equals("[]"))return new ArrayList<>();
    List<String>items=getArrayItems(t); List<Object>list=new ArrayList<>();
    for(String item:items)list.add(parseValue(item,elem)); return list;
  }
  private static Object parseListNode(String raw) throws Exception {
    String t=raw.trim(); if(t.equals("[]")||isNull(t))return null;
    List<String>items=getArrayItems(t); if(items.isEmpty())return null;
    Class<?>cls=Class.forName("ListNode"); Constructor<?>ctor=cls.getConstructor(int.class); Field nf=cls.getField("next");
    Object head=null,curr=null;
    for(String item:items){Object node=ctor.newInstance(parseInt(item));if(head==null){head=node;curr=node;}else{nf.set(curr,node);curr=node;}}
    return head;
  }
  private static Object parseTreeNode(String raw) throws Exception {
    String t=raw.trim(); if(t.equals("[]")||isNull(t))return null;
    List<String>items=getArrayItems(t); if(items.isEmpty()||isNull(items.get(0)))return null;
    Class<?>cls=Class.forName("TreeNode"); Constructor<?>ctor=cls.getConstructor(int.class);
    Field lf=cls.getField("left"),rf=cls.getField("right");
    Object root=ctor.newInstance(parseInt(items.get(0))); Queue<Object>q=new LinkedList<>();q.add(root);
    int i=1;
    while(!q.isEmpty()&&i<items.size()){
      Object curr=q.poll(); String lv=items.get(i++).trim();
      if(!isNull(lv)){Object l=ctor.newInstance(parseInt(lv));lf.set(curr,l);q.add(l);}
      if(i<items.size()){String rv=items.get(i++).trim();if(!isNull(rv)){Object r=ctor.newInstance(parseInt(rv));rf.set(curr,r);q.add(r);}}
    }
    return root;
  }
  private static Object parseNodeVal(String raw) throws Exception {
    String t=raw.trim(); if(t.equals("[]")||t.equals("null"))return null;
    Class<?>cls=Class.forName("Node"); boolean isGraph=false;
    try{cls.getField("neighbors");isGraph=true;}catch(Exception e){}
    List<String>items=getArrayItems(t); if(items.isEmpty())return null;
    if(isGraph){
      Constructor<?>ctor=cls.getConstructor(int.class);Field nf=cls.getField("neighbors");
      int n=items.size(); Object[]nodes=new Object[n]; for(int i=0;i<n;i++)nodes[i]=ctor.newInstance(i+1);
      for(int i=0;i<n;i++){String nb=items.get(i).trim();if(nb.equals("[]"))continue;
        @SuppressWarnings("unchecked")List<Object>nbList=(List<Object>)nf.get(nodes[i]);
        for(String id:getArrayItems(nb))nbList.add(nodes[parseInt(id)-1]);}
      return nodes[0];
    } else {
      Constructor<?>ctor=cls.getConstructor(int.class);Field nextF=cls.getField("next"),randF=cls.getField("random");
      int n=items.size();Object[]nodes=new Object[n];int[]randIdx=new int[n];Arrays.fill(randIdx,-1);
      for(int i=0;i<n;i++){List<String>pair=getArrayItems(items.get(i).trim());nodes[i]=ctor.newInstance(parseInt(pair.get(0)));
        String ri=pair.get(1).trim();if(!isNull(ri))randIdx[i]=parseInt(ri);}
      for(int i=0;i<n;i++){if(i<n-1)nextF.set(nodes[i],nodes[i+1]);if(randIdx[i]!=-1)randF.set(nodes[i],nodes[randIdx[i]]);}
      return nodes[0];
    }
  }
  private static Object parseObject(String raw, Class<?>clazz) throws Exception {
    String t=raw.trim(); if(isNull(t))return null;
    if(looksLikeArray(t)){for(Constructor<?>ctor:clazz.getDeclaredConstructors()){try{ctor.setAccessible(true);return ctor.newInstance(parseArgumentGroup(ctor.getGenericParameterTypes(),t));}catch(Exception ignored){}}}
    try{Constructor<?>c=clazz.getDeclaredConstructor(String.class);c.setAccessible(true);return c.newInstance(unquote(t));}
    catch(Exception e){throw new IllegalArgumentException("Cannot construct "+clazz.getSimpleName()+" from: "+raw);}
  }
  private static String format(Object v) {
    if(v==null)return "null"; Class<?>c=v.getClass();
    if(c.getSimpleName().equals("ListNode"))return formatListNode(v);
    if(c.getSimpleName().equals("TreeNode"))return formatTreeNode(v);
    if(c.getSimpleName().equals("Node"))return formatNode(v);
    if(c.isArray()){int len=Array.getLength(v);List<String>items=new ArrayList<>();for(int i=0;i<len;i++)items.add(format(Array.get(v,i)));return "["+String.join(",",items)+"]";}
    if(v instanceof Collection<?>){List<String>items=new ArrayList<>();for(Object o:(Collection<?>)v)items.add(format(o));return "["+String.join(",",items)+"]";}
    return v.toString();
  }
  private static String formatListNode(Object head){
    try{Class<?>cls=Class.forName("ListNode");Field vf=cls.getField("val"),nf=cls.getField("next");
      List<String>r=new ArrayList<>();Object curr=head;while(curr!=null){r.add(String.valueOf(vf.get(curr)));curr=nf.get(curr);}
      return "["+String.join(",",r)+"]";}catch(Exception e){return "null";}
  }
  private static String formatTreeNode(Object root){
    try{Class<?>cls=Class.forName("TreeNode");Field vf=cls.getField("val"),lf=cls.getField("left"),rf=cls.getField("right");
      List<String>elems=new ArrayList<>();List<Object>q=new ArrayList<>();q.add(root);int lastNN=0,i=0;
      while(i<q.size()){Object curr=q.get(i++);if(curr!=null){elems.add(String.valueOf(vf.get(curr)));lastNN=elems.size();q.add(lf.get(curr));q.add(rf.get(curr));}else elems.add("null");}
      return "["+String.join(",",elems.subList(0,lastNN))+"]";}catch(Exception e){return "[]";}
  }
  private static String formatNode(Object root){
    try{Class<?>cls=Class.forName("Node");boolean isGraph=false;try{cls.getField("neighbors");isGraph=true;}catch(Exception e){}
      if(isGraph){Field nf=cls.getField("neighbors");Map<Object,Integer>nm=new LinkedHashMap<>();List<Object>q=new ArrayList<>();q.add(root);nm.put(root,1);int idx=0;
        while(idx<q.size()){Object curr=q.get(idx++);for(Object nb:(List<?>)nf.get(curr)){if(!nm.containsKey(nb)){nm.put(nb,nm.size()+1);q.add(nb);}}}
        List<String>rep=new ArrayList<>();for(Object curr:q){List<String>ids=new ArrayList<>();for(Object nb:(List<?>)nf.get(curr))ids.add(String.valueOf(nm.get(nb)));rep.add("["+String.join(",",ids)+"]");}
        return "["+String.join(",",rep)+"]";
      }else{Field vf=cls.getField("val"),nextF=cls.getField("next"),randF=cls.getField("random");
        Map<Object,Integer>nm=new LinkedHashMap<>();List<Object>list=new ArrayList<>();Object curr=root;int i=0;
        while(curr!=null){list.add(curr);nm.put(curr,i++);curr=nextF.get(curr);}
        List<String>rep=new ArrayList<>();for(Object node:list){Object rand=randF.get(node);String ri=rand==null?"null":String.valueOf(nm.get(rand));rep.add("["+vf.get(node)+","+ri+"]");}
        return "["+String.join(",",rep)+"]";}}catch(Exception e){return "null";}
  }
  private static boolean looksLikeArray(String s){s=s==null?"":s.trim();return s.startsWith("[")&&s.endsWith("]");}
  private static boolean isNull(String s){return s==null||s.trim().equalsIgnoreCase("null")||s.trim().isEmpty();}
  private static boolean isQuoted(String s){if(s.length()<2)return false;char f=s.charAt(0),l=s.charAt(s.length()-1);return(f=='"'&&l=='"')||(f=='\\''&&l=='\'');}
  private static String unquote(String s){s=s==null?"":s.trim();return isQuoted(s)?s.substring(1,s.length()-1):s;}
  private static int parseInt(String s){String c=unquote(s).trim();if(c.equalsIgnoreCase("INF")||c.equalsIgnoreCase("INTEGER.MAX_VALUE"))return Integer.MAX_VALUE;if(c.equalsIgnoreCase("-INF")||c.equalsIgnoreCase("INTEGER.MIN_VALUE"))return Integer.MIN_VALUE;return Integer.parseInt(c);}
  private static List<String> getArrayItems(String raw){String t=raw==null?"":raw.trim();if(!looksLikeArray(t))throw new IllegalArgumentException("Expected array, got: "+raw);if(t.equals("[]"))return new ArrayList<>();return splitTopLevel(t.substring(1,t.length()-1));}
  private static List<String> splitTopLevel(String raw){List<String>result=new ArrayList<>();int depth=0;boolean inStr=false;char q='\0';StringBuilder sb=new StringBuilder();for(int i=0;i<raw.length();i++){char c=raw.charAt(i);if(inStr){if(c==q)inStr=false;sb.append(c);continue;}if(c=='\\'||c=='"'){inStr=true;q=c;sb.append(c);continue;}if(c=='['||c=='{'||c=='(')depth++;else if(c==']'||c=='}'||c==')')depth--;else if(c==','&&depth==0){result.add(sb.toString().trim());sb.setLength(0);continue;}sb.append(c);}if(sb.length()>0)result.add(sb.toString().trim());return result;}
  private static List<String> parseOperationNames(String raw){List<String>items=getArrayItems(raw);List<String>ops=new ArrayList<>();for(String item:items){String t=item.trim();if(!isQuoted(t))return Collections.emptyList();ops.add(unquote(t));}return ops;}
  private static Object constructInstance(Class<?>clazz,String rawArgs)throws Exception{for(Constructor<?>ctor:clazz.getDeclaredConstructors()){try{ctor.setAccessible(true);return ctor.newInstance(parseArgumentGroup(ctor.getGenericParameterTypes(),rawArgs));}catch(Exception ignored){}}throw new IllegalArgumentException("Cannot construct "+clazz.getSimpleName()+" from: "+rawArgs);}
  private static Method findMethod(Class<?>clazz,String name,String rawArgs)throws Exception{for(Method m:clazz.getDeclaredMethods()){if(!Modifier.isPublic(m.getModifiers())||!m.getName().equals(name))continue;try{parseArgumentGroup(m.getGenericParameterTypes(),rawArgs);return m;}catch(Exception ignored){}}throw new IllegalArgumentException("No matching method: "+name+"("+rawArgs+")");}
}
`;

    return `${javaReflectionMain}${sanitizedSource}`;
  }


  // ═══════════════════════════════════════════════════════════
  //  4. C++
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "cpp") {
    if (wrapperCode && !wrapperCode.includes("TODO") && !wrapperCode.includes("return 0;")) return `${sourceCode}
${wrapperCode}`;

    const sig = parseCppJavaSig(snippet?.code || sourceCode);
    const funcName = sig?.funcName || "solution";
    const params = sig?.params || [];
    const returnKind = sig?.returnKind || 'unknown';
    const isVoid = returnKind === 'void';

    function cppReadArg(kind: TypeKind, varName: string, idx: number): string {
      const safe = `(lines.size()>${idx}?lines[${idx}]:"[]")`;
      const safeInt = `(lines.size()>${idx}?lines[${idx}]:"0")`;
      switch (kind) {
        case 'list_node':    return `    auto ${varName} = parseListNode(${safe});
`;
        case 'tree_node':    return `    auto ${varName} = parseTreeNode(${safe});
`;
        case 'int_array':    return `    auto ${varName} = parseIntVec(${safe});
`;
        case 'long_array':   return `    auto ${varName} = parseLongVec(${safe});
`;
        case 'double_array': return `    auto ${varName} = parseDoubleVec(${safe});
`;
        case 'string_array': return `    auto ${varName} = parseStringVec(${safe});
`;
        case 'int_array_2d': return `    auto ${varName} = parseInt2DVec(${safe});
`;
        case 'string': case 'char': return `    string ${varName} = lines.size()>${idx}?lines[${idx}]:""; if(!${varName}.empty()&&${varName}.front()=='"')${varName}=${varName}.substr(1,${varName}.size()-2);
`;
        case 'bool':   return `    bool ${varName} = (lines.size()>${idx}&&(lines[${idx}]=="true"||lines[${idx}]=="1"));
`;
        case 'long':   return `    long long ${varName} = lines.size()>${idx}?stoll(lines[${idx}]):0LL;
`;
        case 'double': case 'float': return `    double ${varName} = lines.size()>${idx}?stod(lines[${idx}]):0.0;
`;
        default:       return `    int ${varName} = ${safeInt}=="[]"||${safeInt}.empty()?0:stoi(${safeInt});
`;
      }
    }

    function cppPrint(kind: TypeKind, varName: string): string {
      switch (kind) {
        case 'list_node':    return `    printListNode(${varName});
`;
        case 'tree_node':    return `    printTreeNode(${varName});
`;
        case 'int_array': case 'long_array': case 'double_array': case 'string_array': return `    printVec(${varName});
`;
        case 'int_array_2d': return `    print2DVec(${varName});
`;
        case 'bool': return `    cout<<(${varName}?"true":"false")<<endl;
`;
        default:     return `    cout<<${varName}<<endl;
`;
      }
    }

    const stdHeaders = `
#include<iostream>
#include<vector>
#include<string>
#include<sstream>
#include<algorithm>
#include<unordered_map>
#include<unordered_set>
#include<queue>
#include<stack>
#include<cmath>
#include<climits>
#include<set>
#include<map>
#include<numeric>
#include<functional>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`;

    const cppHelpers = `
template<typename T>
void printVec(const vector<T>& v){cout<<"[";for(size_t i=0;i<v.size();i++){cout<<v[i];if(i+1<v.size())cout<<",";}cout<<"]"<<endl;}
template<typename T>
void print2DVec(const vector<vector<T>>& v){cout<<"[";for(size_t i=0;i<v.size();i++){cout<<"[";for(size_t j=0;j<v[i].size();j++){cout<<v[i][j];if(j+1<v[i].size())cout<<",";}cout<<"]";if(i+1<v.size())cout<<",";}cout<<"]"<<endl;}
vector<int> parseIntVec(const string& s){vector<int>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty())try{r.push_back(stoi(tok));}catch(...){};}return r;}
vector<long long> parseLongVec(const string& s){vector<long long>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty())try{r.push_back(stoll(tok));}catch(...){};}return r;}
vector<double> parseDoubleVec(const string& s){vector<double>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty())try{r.push_back(stod(tok));}catch(...){};}return r;}
vector<string> parseStringVec(const string& s){vector<string>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){tok.erase(0,tok.find_first_not_of(" "));if(!tok.empty()&&tok.front()=='"')tok=tok.substr(1,tok.size()-2);r.push_back(tok);}return r;}
vector<vector<int>> parseInt2DVec(const string& s){vector<vector<int>>r;int d=0,st=0;for(int i=0;i<(int)s.size();i++){if(s[i]=='['){if(d==0)st=i;d++;}else if(s[i]==']'){d--;if(d==0)r.push_back(parseIntVec(s.substr(st,i-st+1)));}}return r;}
ListNode* parseListNode(const string& s){vector<int>v=parseIntVec(s);if(v.empty())return nullptr;ListNode* d=new ListNode(0);ListNode* c=d;for(int x:v){c->next=new ListNode(x);c=c->next;}return d->next;}
void printListNode(ListNode* head){cout<<"[";ListNode* c=head;while(c){cout<<c->val;if(c->next)cout<<",";c=c->next;}cout<<"]"<<endl;}
vector<string> parseRawTokens(const string& s){vector<string>r;if(s.size()<2)return r;string inner=s.substr(1,s.size()-2);stringstream ss(inner);string tok;while(getline(ss,tok,',')){while(!tok.empty()&&(tok.front()==' '||tok.front()=='\t'))tok.erase(0,1);while(!tok.empty()&&(tok.back()==' '||tok.back()=='\t'))tok.pop_back();if(!tok.empty())r.push_back(tok);}return r;}
TreeNode* parseTreeNode(const string& s){vector<string>v=parseRawTokens(s);if(v.empty()||v[0]=="null"||v[0]=="None"||v[0]=="[]")return nullptr;TreeNode* root=new TreeNode(stoi(v[0]));queue<TreeNode*>q;q.push(root);size_t i=1;while(!q.empty()&&i<v.size()){TreeNode* c=q.front();q.pop();if(i<v.size()){if(v[i]!="null"&&v[i]!="None"){c->left=new TreeNode(stoi(v[i]));q.push(c->left);}}i++;if(i<v.size()){if(v[i]!="null"&&v[i]!="None"){c->right=new TreeNode(stoi(v[i]));q.push(c->right);}}i++;}return root;}
void printTreeNode(TreeNode* root){if(!root){cout<<"[]"<<endl;return;}cout<<"[";queue<TreeNode*>q;q.push(root);vector<string>r;while(!q.empty()){TreeNode* c=q.front();q.pop();if(c){r.push_back(to_string(c->val));q.push(c->left);q.push(c->right);}else{r.push_back("null");}}while(!r.empty()&&r.back()=="null")r.pop_back();for(size_t i=0;i<r.size();i++){cout<<r[i];if(i+1<r.size())cout<<",";}cout<<"]"<<endl;}
`;

    let cppMain = '';
    cppMain += `int main(){
    vector<string>lines;
    string line;
    while(getline(cin,line)){if(!line.empty()){if(line.back()=='\\r')line.pop_back();lines.push_back(line);}}
`;

    const callArgNames: string[] = [];
    params.forEach((p, i) => {
      const argVar = `arg${i}`;
      callArgNames.push(argVar);
      cppMain += cppReadArg(p.kind, argVar, i);
    });

    const callArgs = callArgNames.join(', ');
    cppMain += `    Solution sol;
`;
    if (isVoid) {
      cppMain += `    sol.${funcName}(${callArgs});
`;
      if (params.length > 0) cppMain += cppPrint(params[0]!.kind, callArgNames[0] ?? 'arg0');
    } else {
      cppMain += `    auto res=sol.${funcName}(${callArgs});
`;
      cppMain += cppPrint(returnKind, 'res');
    }
    cppMain += `    return 0;
}
`;

    return `${stdHeaders}\n${cppHelpers}\n${sourceCode}\n\n${cppMain}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  5. C
  // ═══════════════════════════════════════════════════════════
  if (executionLanguage === "c") {
    if (wrapperCode && !wrapperCode.includes("TODO") && !wrapperCode.includes("return 0;")) return `${wrapperCode}\n${sourceCode}`;

    const cHeaders = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <stddef.h>
#include <math.h>
#include <limits.h>

struct ListNode {
    int val;
    struct ListNode *next;
};
struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};
`;

    const cHelpers = `
static struct ListNode* parseListNode(const char* s) {
    int arr[4096]; int sz = 0;
    char tmp[8192]; strncpy(tmp, s, 8191);
    char* p = tmp; while(*p && *p!='[') p++; if(*p) p++;
    char* e = p; while(*e && *e!=']') e++; *e = '\\0';
    char* t = strtok(p, ",");
    while(t && sz < 4096) { while(*t==' ') t++; if(*t) arr[sz++] = atoi(t); t = strtok(NULL, ","); }
    if (sz == 0) return NULL;
    struct ListNode* head = (struct ListNode*)malloc(sizeof(struct ListNode));
    head->val = arr[0]; head->next = NULL;
    struct ListNode* curr = head;
    for (int i = 1; i < sz; i++) {
        struct ListNode* node = (struct ListNode*)malloc(sizeof(struct ListNode));
        node->val = arr[i]; node->next = NULL;
        curr->next = node;
        curr = node;
    }
    return head;
}
static void printListNode(struct ListNode* head) {
    printf("[");
    struct ListNode* curr = head;
    while(curr) {
        printf("%d", curr->val);
        if (curr->next) printf(",");
        curr = curr->next;
    }
    printf("]\\n");
}
`;

    const sig = parseCppJavaSig(snippet?.code || sourceCode);
    const funcName = sig?.funcName || "";
    const params = sig?.params || [];
    const returnKind = sig?.returnKind || 'unknown';
    const isVoid = returnKind === 'void';

    let cMain = `int main(){
    char buf[131072]={0}; int pos=0,c;
    while((c=getchar())!=EOF&&pos<131071)buf[pos++]=(char)c;
    buf[pos]='\\0';
    char lines[64][8192]; int lineCount=0;
    char* tok=strtok(buf,"\\n");
    while(tok&&lineCount<64){
        while(*tok==' '||*tok=='\\r')tok++;
        strncpy(lines[lineCount++],tok,8191);
        tok=strtok(NULL,"\\n");
    }
`;

    const callArgNames: string[] = [];
    let outSizeVar = "";
    params.forEach((p, i) => {
      const pName = p.name.toLowerCase();
      if (p.kind === 'out_size_ptr') {
        const v = `retSz${i}`;
        outSizeVar = v;
        cMain += `    int ${v} = 0;
`;
        callArgNames.push(`&${v}`);
      } else if (pName.endsWith("size") && i > 0 && params[i-1]!.kind.includes("array")) {
        // Redundant size param for previous array in C - szVar was already added by previous array param
        return;
      } else if (p.kind === 'list_node') {
        const v = `arg${i}`; callArgNames.push(v);
        cMain += `    struct ListNode* ${v} = parseListNode(lineCount>${i}?lines[${i}]:"[]");
`;
      } else if (p.kind === 'int_array') {
        const szV = `sz${i}`, arrV = `arg${i}`;
        callArgNames.push(arrV, szV);
        cMain += `    int ${arrV}[4096]; int ${szV}=0;
    {char tmp[8192];strncpy(tmp,lineCount>${i}?lines[${i}]:"[]",8191);char*p=tmp;while(*p&&*p!='[')p++;if(*p)p++;char*e=p;while(*e&&*e!=']')e++;*e='\\0';char*t=strtok(p,",");while(t&&${szV}<4096){while(*t==' ')t++;if(*t)${arrV}[${szV}++]=atoi(t);t=strtok(NULL,",");}}
`;
      } else if (p.kind === 'string') {
        const v = `arg${i}`; callArgNames.push(v);
        cMain += `    char ${v}[8192]={0};
    {char* p=lineCount>${i}?lines[${i}]:"";if(*p=='"')p++;strncpy(${v},p,8191);int len=strlen(${v});if(len>0&&${v}[len-1]=='"')${v}[len-1]='\\0';}
`;
      } else {
        const v = `arg${i}`; callArgNames.push(v);
        cMain += `    int ${v}=lineCount>${i}?atoi(lines[${i}]):0;
`;
      }
    });

    if (funcName) {
      const callArgs = callArgNames.join(',');
      if (isVoid && params.length > 0 && params[0]!.kind === 'int_array') {
        const szV = callArgNames[1] ?? 'sz0';
        cMain += `    ${funcName}(${callArgs});
    printf("[");for(int _i=0;_i<${szV};_i++){printf("%d",(${callArgNames[0] ?? 'arg0'})[_i]);if(_i+1<${szV})printf(",");}printf("]\\n");
`;
      } else if (returnKind === 'list_node') {
        cMain += `    struct ListNode* res = ${funcName}(${callArgs});
    printListNode(res);
`;
      } else if (returnKind === 'int_array') {
        cMain += `    int* res = ${funcName}(${callArgs});
    int sz = ${outSizeVar ? outSizeVar : '2'};
    printf("[");for(int _i=0;_i<sz;_i++){printf("%d",res[_i]);if(_i+1<sz)printf(",");}printf("]\\n");
`;
      } else if (returnKind === 'bool') {
        cMain += `    printf("%s\\n",${funcName}(${callArgs})?"true":"false");
`;
      } else if (!isVoid) {
        cMain += `    printf("%d\\n",(int)${funcName}(${callArgs}));
`;
      }
    }
    cMain += `    return 0;
}
`;

    return `${cHeaders}\n${cHelpers}\n${sourceCode}\n\n${cMain}`;
  }

  return `${sourceCode}\n${wrapperCode}`;
}



export const executeCode = async (req: Request, res: Response) => {
  const { code, language, oid, mode, customInput } = req.body as ExecuteBody;

  const sourceCode = typeof code === "string" ? code : "";
  const githubOid = typeof oid === "string" ? oid : "";
  const executionMode = getExecutionMode(mode);
  const executionLanguage = getLanguage(language);
  const userCustomInput = typeof customInput === "string" ? customInput : "";

  try {
    let casesToRun: TestCaseRecord[] = [];

    // Fetch test cases and wrapper code from DB if it's a real problem
    let finalCode = sourceCode;
    
    if (githubOid && !githubOid.startsWith("local-")) {
      const fileData = await prisma.problem.findFirst({
        where: { 
          OR: [
            { github_oid: githubOid },
            { id: githubOid }
          ]
        },
        select: { test_cases: true, code_snippets: true }
      });

      const testCases = (fileData?.test_cases ?? []) as TestCaseRecord[];

      if (executionMode === "SUBMIT") {
        casesToRun = testCases;
      } else {
        casesToRun = testCases.slice(0, 1);
      }
      const snippet = fileData?.code_snippets?.find((s: any) => s.language === executionLanguage);
      finalCode = prepareFinalCode(executionLanguage, sourceCode, snippet);

      console.log("EXECUTION LANGUAGE:", executionLanguage);
      console.log("FOUND SNIPPET:", snippet ? "YES" : "NO");
      console.log("FINAL CODE:\n", finalCode);
    }

    // Override if custom input is provided
    if (userCustomInput.length > 0) {
      casesToRun = [{ input: userCustomInput, expectedOutput: "" }];
    }

    if (casesToRun.length === 0) {
      casesToRun = [{ input: "", expectedOutput: "" }];
    }

    const results: ExecutionDetail[] = [];
    let totalPassed = 0;
    let totalRuntimeMs = 0;
    let totalMemoryKb = 0;
    let runCount = 0;

    for (const [index, currentCase] of casesToRun.entries()) {
      const testCaseInput = currentCase.input || "";
      const startTime = performance.now();

      const payload = {
        "language": pistonLanguageMap[executionLanguage] || executionLanguage,
        "version": "*",
        "files": [
          {
            "name": getFileName(executionLanguage),
            "content": finalCode,
          }
        ],
        "stdin": testCaseInput,
        "compile_timeout": 3000,
        "run_timeout": 3000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1
      };

      let data: any;

      try {
        // 1. Try hitting the public Piston API first
        const pistonResponse = await fetch("http://127.0.0.1:2000/api/v2/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!pistonResponse?.ok) {
          const errText = await pistonResponse.text();
          console.error("Piston API error response:", pistonResponse.status, errText);
          throw new Error("Piston API blocked or down: " + pistonResponse.status);
        }
        data = await pistonResponse?.json();

        if (data.message && data.message.includes("runtime is unknown")) {
          throw new Error("Piston runtime unknown: " + data.message);
        }
        if (!data.run) {
          throw new Error("Piston invalid output format: " + JSON.stringify(data));
        }

      } catch (apiError) {
        console.error("Fetch threw:", apiError);
        // 2. FALLBACK: Local execution if Piston fails
        if (executionLanguage === "javascript") {
          try {
            const stdout = execFileSync("node", ["-e", finalCode], {
              input: testCaseInput,
              encoding: "utf-8",
              timeout: 3000
            });
            data = {
              compile: { code: 0 },
              run: { output: stdout, stdout, stderr: "" }
            };
          } catch (localErr: any) {
            data = {
              compile: { code: 0 },
              run: { output: localErr.stdout || localErr.message || "Local Execution Error", stderr: localErr.stderr || localErr.message }
            };
          }
        } else if (executionLanguage === "python") {
          try {
            const stdout = execFileSync("python3", ["-c", finalCode], {
              input: testCaseInput,
              encoding: "utf-8",
              timeout: 3000
            });
            data = {
              compile: { code: 0 },
              run: { output: stdout, stdout, stderr: "" }
            };
          } catch (localErr: any) {
            data = {
              compile: { code: 0 },
              run: { output: localErr.stdout || localErr.message || "Local Execution Error", stderr: localErr.stderr || localErr.message }
            };
          }
        } else {
          results.push({
            testCaseIndex: index,
            output: "",
            expectedOutput: currentCase.expectedOutput,
            passed: false,
            ...problemIdPayload(currentCase),
            runtimeError: `Piston API is down. Fallback only supports JS and Python.`,
          });
          break;
        }
      }

      if (data) {
        const endTime = performance.now();
        let caseRuntimeMs = Math.round(endTime - startTime);
        let caseMemoryKb = 0;

        if (data.run) {
          if (typeof data.run.time === "number") {
            caseRuntimeMs = Math.round(data.run.time * 1000);
          } else if (typeof data.run.time === "string") {
            caseRuntimeMs = Math.round(parseFloat(data.run.time) * 1000);
          }

          if (typeof data.run.memory === "number") {
            caseMemoryKb = Math.round(data.run.memory / 1024);
          } else if (typeof data.run.memory === "string") {
            caseMemoryKb = Math.round(parseFloat(data.run.memory) / 1024);
          }
        }

        totalRuntimeMs += caseRuntimeMs;
        if (caseMemoryKb > 0) totalMemoryKb += caseMemoryKb;
        runCount++;

        const runOutput = data.run?.output || "";
        const compileOutput = data.compile?.output || "";

        if (data.compile && data.compile.code !== 0) {
          results.push({
            testCaseIndex: index,
            output: "",
            expectedOutput: currentCase.expectedOutput,
            passed: false,
            runtimeError: compileOutput || "Compilation Error",
          });
          break;
        }

        const actualOutput = normalize(data.run?.stdout || runOutput);
        const expectedOutput = normalize(currentCase.expectedOutput);

        const isCustomInputRun = userCustomInput.length > 0;
        const passed = isCustomInputRun ? true : (actualOutput === expectedOutput);

        if (passed) totalPassed++;

        results.push({
          testCaseIndex: index,
          output: runOutput,
          expectedOutput: currentCase.expectedOutput,
          passed,
          ...problemIdPayload(currentCase),
          runtimeError: data.run?.stderr || null,
        });

        if (executionMode === "SUBMIT" && !passed && !isCustomInputRun) {
          break;
        }
      }
    }

    const avgRuntimeMs = runCount > 0 ? Math.round(totalRuntimeMs / runCount) : 0;
    const avgMemoryKb = runCount > 0 ? Math.round(totalMemoryKb / runCount) : 0;

    let userPerfId = typeof req.body.performanceId === "string" ? req.body.performanceId : "";
    const userId = (req as any).userId;
    if (!userPerfId && userId) {
      const activePerf = await prisma.userPersonalPerformance.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      if (activePerf) {
        userPerfId = activePerf.id;
      }
    }
    
    if (executionMode === "SUBMIT" && userPerfId) {
      const problemId = casesToRun[0]?.problemId || githubOid;
      if (problemId) {
        await saveSubmisssion({
          performanceId: userPerfId,
          problemId,
          submittedCode: sourceCode,
          language: executionLanguage,
          status: totalPassed === casesToRun.length ? "PASSED" : "FAILED",
          runtimeMs: avgRuntimeMs,
          memoryKb: avgMemoryKb,
          passedCase: totalPassed,
          totalCases: casesToRun.length,
        }).catch(e => console.error("Failed to save submission:", e));
      }
    }

    return res.json({
      mode: executionMode,
      totalCases: casesToRun.length,
      passedCases: totalPassed,
      status: totalPassed === casesToRun.length ? "PASSED" : "FAILED",
      problemId: casesToRun[0]?.problemId || "",
      runtimeMs: avgRuntimeMs,
      memoryKb: avgMemoryKb,
      details: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution failure";
    console.error("System Core Fault:", error);
    return res.status(500).json({ error: "System execution failure", details: message });
  }
};
