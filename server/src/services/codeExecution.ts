import type { Request, Response } from "express";
import { prisma } from "../Lib/prisma.js";
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

function prepareFinalCode(
  executionLanguage: SupportedLanguage,
  sourceCode: string,
  snippet?: { code?: string; wrapperCode?: string | null }
): string {
  let wrapperCode = snippet?.wrapperCode || "";

  // ------------------- 1. JAVASCRIPT -------------------
  if (executionLanguage === "javascript") {
    const userFuncMatch = sourceCode.match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)|class\s+Solution\s*\{\s*(\w+)\s*\((.*?)\)/);
    const userFuncName = userFuncMatch ? (userFuncMatch[1] || userFuncMatch[3] || userFuncMatch[5]) : null;

    if (wrapperCode && userFuncName && !wrapperCode.includes(userFuncName)) {
      wrapperCode = "";
    }

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
function arrayToTree(arr) {
  if (!Array.isArray(arr) || arr.length === 0 || arr[0] === null || arr[0] === undefined) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const curr = queue.shift();
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      curr.left = new TreeNode(arr[i]);
      queue.push(curr.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
      curr.right = new TreeNode(arr[i]);
      queue.push(curr.right);
    }
    i++;
  }
  return root;
}
function treeToArray(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push(null);
    }
  }
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }
  return result;
}
function isTreeNode(obj) {
  return obj && typeof obj === 'object' && ('val' in obj && ('left' in obj || 'right' in obj));
}
`;

    if (!wrapperCode || wrapperCode.trim() === "// Wrapper" || wrapperCode.includes("module.exports")) {
      const match = (snippet?.code || sourceCode).match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)|class\s+Solution\s*\{\s*(\w+)\s*\((.*?)\)/);
      if (match) {
        const funcName = match[1] || match[3] || match[5];
        const argsStr = (match[2] || match[4] || match[6] || "").trim();
        const argCount = argsStr ? argsStr.split(',').length : 0;
        const isTreeProblem = sourceCode.includes(".left") || sourceCode.includes(".right") || sourceCode.includes("TreeNode") || argsStr.includes("root") || argsStr.includes("node");

        wrapperCode = `const fs = require('fs');\n${treeHelpers}\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);\nif (input.length === 0) { throw new Error("TEST CASE ERROR: The input provided is empty."); }\n`;
        for (let i = 0; i < argCount; i++) {
          wrapperCode += `const rawArg${i} = input[${i}] !== undefined ? JSON.parse(input[${i}]) : undefined;\n`;
          wrapperCode += `const arg${i} = (${isTreeProblem} && Array.isArray(rawArg${i})) ? arrayToTree(rawArg${i}) : rawArg${i};\n`;
        }
        const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
        wrapperCode += `let res;\ntry {\n  if (typeof Solution !== 'undefined' && typeof (new Solution())['${funcName}'] === 'function') {\n    res = (new Solution())['${funcName}'](${callArgs});\n  } else if (typeof ${funcName} === 'function') {\n    res = ${funcName}(${callArgs});\n  }\n} catch (e) {\n  console.error("EXECUTION ERROR:", e.message || e);\n  process.exit(1);\n}\n`;
        wrapperCode += `const outVal = (res === null && ${isTreeProblem}) ? [] : (isTreeNode(res) ? treeToArray(res) : (res !== undefined ? res : (isTreeNode(arg0) ? treeToArray(arg0) : arg0)));\n`;
        wrapperCode += `console.log(JSON.stringify(outVal).replace(/\\s/g, ''));`;
      }
    }

    if (wrapperCode) {
      wrapperCode = wrapperCode.replace(
        /const input = fs\.readFileSync\(0, ['"]utf-8['"]\)\.trim\(\)\.split\(['"]\\n['"]\);/g,
        `const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);`
      );

      const isTreeProb = sourceCode.includes(".left") || sourceCode.includes(".right") || sourceCode.includes("TreeNode") || sourceCode.includes("root");
      if (isTreeProb) {
        wrapperCode = wrapperCode.replace(
          /(const|let|var)\s+(\w+)\s*=\s*JSON\.parse\((input\[\d+\])\);/g,
          `let $2 = JSON.parse($3); if (Array.isArray($2) && typeof arrayToTree === 'function') { $2 = arrayToTree($2); }`
        );
      }

      const resMatch = wrapperCode.match(/const\s+res\s*=\s*(\w+)\((.*?)\);/);
      if (resMatch) {
        const funcName = resMatch[1];
        const callArgsStr = resMatch[2];
        const firstArg = callArgsStr?.split(',')[0]?.trim() || "arg0";

        wrapperCode = wrapperCode.replace(
          new RegExp(`const\\s+res\\s*=\\s*${funcName}\\((.*?)\\);`, 'g'),
          `let res;\ntry {\n  if (typeof Solution !== 'undefined' && typeof (new Solution())['${funcName}'] === 'function') {\n    res = (new Solution())['${funcName}']($1);\n  } else if (typeof ${funcName} === 'function') {\n    res = ${funcName}($1);\n  }\n} catch (e) {\n  console.error("EXECUTION ERROR:", e.message || e);\n  process.exit(1);\n}`
        );

        wrapperCode = wrapperCode.replace(
          /console\.log\(JSON\.stringify\((.*?)\)\.replace\(\/\\s\/g,\s*''\)\);/g,
          `const outVal = (res === null && ${isTreeProb}) ? [] : (isTreeNode($1) ? treeToArray($1) : ($1 !== undefined ? $1 : (isTreeNode(${firstArg}) ? treeToArray(${firstArg}) : ${firstArg})));\nconsole.log(JSON.stringify(outVal).replace(/\\s/g, ''));`
        );
      }
    }

    return `${treeHelpers}\n${sourceCode}\n${wrapperCode}`;
  }

  // ------------------- 2. PYTHON -------------------
  if (executionLanguage === "python") {
    const userPyFunc = sourceCode.match(/def\s+(\w+)\s*\(/);
    const pyFuncName = userPyFunc ? userPyFunc[1] : null;

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
`;

    if (wrapperCode && pyFuncName && !wrapperCode.includes(pyFuncName)) {
      wrapperCode = "";
    }

    if (!wrapperCode || wrapperCode.trim() === "" || wrapperCode.includes("TODO")) {
      const funcMatch = (snippet?.code || sourceCode).match(/def\s+(\w+)\s*\((.*?)\):/);
      if (funcMatch && funcMatch[1] && funcMatch[2] !== undefined) {
        const funcName = funcMatch[1];
        const rawParams = funcMatch[2].split(',').map(p => p.trim()).filter(p => p && p !== 'self');
        const argCount = rawParams.length;

        let pyWrapper = `\nimport sys, json, math, collections, heapq, itertools, functools, bisect\ninput_lines = [line.strip() for line in sys.stdin.read().strip().splitlines() if line.strip() != '']\n`;
        pyWrapper += `if len(input_lines) == 0: raise Exception("TEST CASE ERROR: Input is empty.")\n`;
        for (let i = 0; i < argCount; i++) {
          pyWrapper += `arg${i} = json.loads(input_lines[${i}]) if ${i} < len(input_lines) else None\n`;
        }
        const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
        pyWrapper += `res = None\n`;
        pyWrapper += `if 'Solution' in globals():\n`;
        pyWrapper += `    sol = Solution()\n`;
        pyWrapper += `    if hasattr(sol, '${funcName}'):\n`;
        pyWrapper += `        res = getattr(sol, '${funcName}')(${callArgs})\n`;
        pyWrapper += `    elif '${funcName}' in globals():\n`;
        pyWrapper += `        res = globals()['${funcName}'](${callArgs})\n`;
        pyWrapper += `elif '${funcName}' in globals():\n`;
        pyWrapper += `    res = globals()['${funcName}'](${callArgs})\n`;
        pyWrapper += `out_val = res if res is not None else (arg0 if 'arg0' in locals() else None)\n`;
        pyWrapper += `print(json.dumps(out_val, separators=(',', ':')))\n`;

        return `from typing import *\nimport sys, json, math, collections, heapq, itertools, functools, bisect\n${pyNodeHelpers}\n${sourceCode}\n${pyWrapper}`;
      }
    } else {
      wrapperCode = wrapperCode.replace(
        /if len\(input_lines\) < \d+: sys\.exit\(0\)/g,
        `if len(input_lines) < 1: raise Exception("TEST CASE ERROR: Input is empty.")`
      );

      const callMatch = wrapperCode.match(/res = (\w+)\((.*?)\)/);
      if (callMatch && callMatch[2]) {
        const firstArg = callMatch[2].split(',')[0]?.trim() || "arg0";
        wrapperCode = wrapperCode.replace(
          /print\(json\.dumps\(res\)\.replace\(' ', ''\)\)/g,
          `print(json.dumps(res if res is not None else ${firstArg}, separators=(',', ':')))`
        );
      }

      if (sourceCode.includes("class Solution") && !wrapperCode.includes("Solution()")) {
        const funcMatch = (snippet?.code || sourceCode).match(/def\s+(\w+)\s*\(/);
        if (funcMatch && funcMatch[1]) {
          const funcName = funcMatch[1];
          wrapperCode = wrapperCode.replace(
            new RegExp(`res = ${funcName}\\(`, 'g'),
            `res = Solution().${funcName}(`
          );
        }
      }

      return `from typing import *\nimport sys, json, math, collections, heapq, itertools, functools, bisect\n${pyNodeHelpers}\n${sourceCode}\n${wrapperCode}`;
    }
  }

  // ------------------- 3. JAVA -------------------
  if (executionLanguage === "java") {
    let sanitizedSource = sourceCode.replace(/^package\s+[\w.]+;\s*/gm, "");
    sanitizedSource = sanitizedSource.replace(/public\s+class\s+Solution/g, "class Solution");

    if (wrapperCode && !wrapperCode.includes("TODO")) {
      return `${sanitizedSource}\n${wrapperCode}`;
    }

    const methodMatch = (snippet?.code || sourceCode).match(/(?:public|private|protected)?\s+([\w<>\[\]]+)\s+(\w+)\s*\((.*?)\)/);
    const funcName = methodMatch ? methodMatch[2] : "solution";
    const rawArgs = methodMatch && methodMatch[3] ? methodMatch[3].split(',').map(a => a.trim()).filter(Boolean) : [];
    const argCount = rawArgs.length;

    let javaMain = `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n`;
    javaMain += `    public static void main(String[] args) {\n`;
    javaMain += `        try {\n`;
    javaMain += `            Scanner sc = new Scanner(System.in);\n`;
    javaMain += `            List<String> lines = new ArrayList<>();\n`;
    javaMain += `            while (sc.hasNextLine()) {\n`;
    javaMain += `                String l = sc.nextLine().trim();\n`;
    javaMain += `                if (!l.isEmpty()) lines.add(l);\n`;
    javaMain += `            }\n`;
    javaMain += `            if (lines.size() < ${argCount}) return;\n`;

    const callArgsList: string[] = [];
    rawArgs.forEach((argStr, i) => {
      const type = (argStr.split(/\s+/)[0] || "");
      const argVar = `arg${i}`;
      callArgsList.push(argVar);
      if (type.includes("[][]") || type.includes("List<List")) {
        javaMain += `            int[][] ${argVar} = parseInt2D(lines.get(${i}));\n`;
      } else if (type.includes("[]") || type.includes("List")) {
        javaMain += `            int[] ${argVar} = parseIntArray(lines.get(${i}));\n`;
      } else if (type === "String") {
        javaMain += `            String ${argVar} = lines.get(${i}).replaceAll("^\\"|\\"$", "");\n`;
      } else if (type === "boolean") {
        javaMain += `            boolean ${argVar} = Boolean.parseBoolean(lines.get(${i}));\n`;
      } else {
        javaMain += `            int ${argVar} = Integer.parseInt(lines.get(${i}).replaceAll("[^0-9-]", ""));\n`;
      }
    });

    const callArgs = callArgsList.join(', ');
    javaMain += `            Solution sol = new Solution();\n`;
    javaMain += `            Object res = sol.${funcName}(${callArgs});\n`;
    javaMain += `            if (res == null && ${argCount} > 0) res = arg0;\n`;
    javaMain += `            if (res instanceof int[]) System.out.println(Arrays.toString((int[]) res).replace(" ", ""));\n`;
    javaMain += `            else if (res instanceof int[][]) System.out.println(Arrays.deepToString((int[][]) res).replace(" ", ""));\n`;
    javaMain += `            else System.out.println(res);\n`;
    javaMain += `        } catch (Exception e) {\n`;
    javaMain += `            e.printStackTrace();\n`;
    javaMain += `        }\n`;
    javaMain += `    }\n`;

    javaMain += `    private static int[] parseIntArray(String s) {\n`;
    javaMain += `        s = s.trim().replaceAll("^\\[|\\]$", "");\n`;
    javaMain += `        if (s.isEmpty()) return new int[0];\n`;
    javaMain += `        String[] p = s.split(",");\n`;
    javaMain += `        int[] res = new int[p.length];\n`;
    javaMain += `        for (int i = 0; i < p.length; i++) res[i] = Integer.parseInt(p[i].trim());\n`;
    javaMain += `        return res;\n`;
    javaMain += `    }\n`;
    javaMain += `    private static int[][] parseInt2D(String s) {\n`;
    javaMain += `        s = s.trim();\n`;
    javaMain += `        if (s.equals("[]") || s.isEmpty()) return new int[0][0];\n`;
    javaMain += `        s = s.substring(1, s.length() - 1);\n`;
    javaMain += `        String[] rows = s.split("\\\\],\\\\s*\\\\[");\n`;
    javaMain += `        int[][] res = new int[rows.length][];\n`;
    javaMain += `        for (int i = 0; i < rows.length; i++) res[i] = parseIntArray(rows[i]);\n`;
    javaMain += `        return res;\n`;
    javaMain += `    }\n`;
    javaMain += `}\n\n`;

    return `${javaMain}${sanitizedSource}`;
  }

  // ------------------- 4. C++ -------------------
  if (executionLanguage === "cpp") {
    if (wrapperCode && !wrapperCode.includes("TODO") && !wrapperCode.includes("return 0;")) {
      return `${sourceCode}\n${wrapperCode}`;
    }

    const methodMatch = (snippet?.code || sourceCode).match(/(\w+)\s+(\w+)\s*\((.*?)\)/);
    const funcName = methodMatch ? methodMatch[2] : "solution";
    const rawArgs = methodMatch && methodMatch[3] ? methodMatch[3].split(',').map(a => a.trim()).filter(Boolean) : [];
    const argCount = rawArgs.length;

    let cppMain = `\n#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n#include <algorithm>\n#include <unordered_map>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <cmath>\n#include <climits>\nusing namespace std;\n\n`;
    cppMain += `int main() {\n`;
    cppMain += `    vector<string> lines;\n`;
    cppMain += `    string line;\n`;
    cppMain += `    while (getline(cin, line)) {\n`;
    cppMain += `        if (!line.empty()) {\n`;
    cppMain += `            if (line.back() == '\\r') line.pop_back();\n`;
    cppMain += `            lines.push_back(line);\n`;
    cppMain += `        }\n`;
    cppMain += `    }\n`;
    cppMain += `    if (lines.size() < ${argCount}) return 0;\n`;

    const callArgsList: string[] = [];
    rawArgs.forEach((argStr, i) => {
      const argVar = `arg${i}`;
      callArgsList.push(argVar);
      cppMain += `    stringstream ss${i}(lines[${i}].substr(1, lines[${i}].size() - 2));\n`;
      cppMain += `    vector<int> ${argVar};\n`;
      cppMain += `    string token${i};\n`;
      cppMain += `    while (getline(ss${i}, token${i}, ',')) {\n`;
      cppMain += `        if (!token${i}.empty()) ${argVar}.push_back(stoi(token${i}));\n`;
      cppMain += `    }\n`;
    });

    cppMain += `    Solution sol;\n`;
    cppMain += `    auto res = sol.${funcName}(${callArgsList.join(', ')});\n`;
    cppMain += `    cout << res << endl;\n`;
    cppMain += `    return 0;\n`;
    cppMain += `}\n`;

    return `${sourceCode}\n${cppMain}`;
  }

  // ------------------- 5. C -------------------
  if (executionLanguage === "c") {
    if (wrapperCode && !wrapperCode.includes("TODO") && !wrapperCode.includes("return 0;")) {
      return `${sourceCode}\n${wrapperCode}`;
    }

    let cMain = `\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n#include <math.h>\n#include <limits.h>\n\n`;
    cMain += `int main() {\n`;
    cMain += `    return 0;\n`;
    cMain += `}\n`;

    return `${sourceCode}\n${cMain}`;
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
