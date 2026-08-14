import type { Request, Response } from "express";
import { prisma } from "../Lib/prisma.js";
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
    case 'cpp': return 'cpp';
    case 'py': return 'python';
    case 'javascript': return 'javascript';
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
    const userFuncMatch = sourceCode.match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)/);
    const userFuncName = userFuncMatch ? (userFuncMatch[1] || userFuncMatch[3]) : null;

    if (wrapperCode && userFuncName && !wrapperCode.includes(userFuncName)) {
      wrapperCode = "";
    }

    if (!wrapperCode || wrapperCode.trim() === "// Wrapper" || wrapperCode.includes("module.exports")) {
      const match = (snippet?.code || sourceCode).match(/(?:var|let|const|function)\s+(\w+)\s*=\s*function\s*\((.*?)\)|function\s+(\w+)\s*\((.*?)\)/);
      if (match) {
        const funcName = match[1] || match[3];
        const argsStr = (match[2] || match[4] || "").trim();
        const argCount = argsStr ? argsStr.split(',').length : 0;

        wrapperCode = `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);\nif (input.length === 0) { throw new Error("TEST CASE ERROR: The input provided is empty."); }\n`;
        for (let i = 0; i < argCount; i++) {
          wrapperCode += `const arg${i} = input[${i}] !== undefined ? JSON.parse(input[${i}]) : undefined;\n`;
        }
        const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
        wrapperCode += `let res;\nif (typeof Solution !== 'undefined' && typeof (new Solution())['${funcName}'] === 'function') {\n  res = (new Solution())['${funcName}'](${callArgs});\n} else {\n  res = ${funcName}(${callArgs});\n}\n`;
        wrapperCode += `console.log(res !== undefined ? JSON.stringify(res).replace(/\\s/g, '') : JSON.stringify(arg0).replace(/\\s/g, ''));`;
      }
    }

    if (wrapperCode) {
      // Robustly replace legacy split('\n') with split(/\r?\n/)
      wrapperCode = wrapperCode.replace(
        /const input = fs\.readFileSync\(0, ['"]utf-8['"]\)\.trim\(\)\.split\(['"]\\n['"]\);/g,
        `const input = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/).map(s => s.trim()).filter(x => x.length > 0);`
      );

      const resMatch = wrapperCode.match(/const\s+res\s*=\s*(\w+)\((.*?)\);/);
      if (resMatch) {
        const funcName = resMatch[1];
        const callArgsStr = resMatch[2];
        const firstArg = callArgsStr.split(',')[0]?.trim() || "arg0";

        wrapperCode = wrapperCode.replace(
          new RegExp(`const\\s+res\\s*=\\s*${funcName}\\((.*?)\\);`, 'g'),
          `let res;\nif (typeof Solution !== 'undefined' && typeof (new Solution())['${funcName}'] === 'function') {\n  res = (new Solution())['${funcName}']($1);\n} else if (typeof ${funcName} === 'function') {\n  res = ${funcName}($1);\n}`
        );

        wrapperCode = wrapperCode.replace(
          /console\.log\(JSON\.stringify\(res\)\.replace\(\/\\s\/g,\s*''\)\);/g,
          `console.log(res !== undefined ? JSON.stringify(res).replace(/\\s/g, '') : JSON.stringify(${firstArg}).replace(/\\s/g, ''));`
        );

        wrapperCode = wrapperCode.replace(
          /if\s*\(input\.length\s*<\s*\d+\)\s*(?:process\.exit\(0\);|throw\s+new\s+Error\(.*?\);)/g,
          `if (input.length === 0) { throw new Error("TEST CASE ERROR: The input provided is empty."); }`
        );
      }
    }

    return `${sourceCode}\n${wrapperCode}`;
  }

  // ------------------- 2. PYTHON -------------------
  if (executionLanguage === "python") {
    if (wrapperCode && !wrapperCode.includes("TODO")) {
      wrapperCode = wrapperCode.replace(
        /if len\(input_lines\) < \d+: sys\.exit\(0\)/g,
        `if len(input_lines) < 1: raise Exception("TEST CASE ERROR: The input provided does not have enough lines.")`
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

      return `from typing import *\n${sourceCode}\n${wrapperCode}`;
    }

    const funcMatch = (snippet?.code || sourceCode).match(/def\s+(\w+)\s*\((.*?)\):/);
    if (funcMatch && funcMatch[1] && funcMatch[2] !== undefined) {
      const funcName = funcMatch[1];
      const rawParams = funcMatch[2].split(',').map(p => p.trim()).filter(p => p && p !== 'self');
      const argCount = rawParams.length;

      let pyWrapper = `\nimport sys, json\ninput_lines = [line.strip() for line in sys.stdin.read().strip().splitlines() if line.strip() != '']\n`;
      pyWrapper += `if len(input_lines) < ${argCount}: raise Exception("TEST CASE ERROR: Not enough input lines.")\n`;
      for (let i = 0; i < argCount; i++) {
        pyWrapper += `arg${i} = json.loads(input_lines[${i}])\n`;
      }
      const callArgs = Array.from({ length: argCount }, (_, i) => `arg${i}`).join(', ');
      pyWrapper += `if 'Solution' in globals():\n`;
      pyWrapper += `    res = getattr(Solution(), '${funcName}')(${callArgs})\n`;
      pyWrapper += `else:\n`;
      pyWrapper += `    res = ${funcName}(${callArgs})\n`;
      pyWrapper += `print(json.dumps(res if res is not None else arg0, separators=(',', ':')))\n`;

      return `from typing import *\n${sourceCode}\n${pyWrapper}`;
    }

    return `from typing import *\n${sourceCode}\n${wrapperCode}`;
  }

  // ------------------- 3. JAVA -------------------
  if (executionLanguage === "java") {
    if (wrapperCode && !wrapperCode.includes("TODO")) {
      return `${sourceCode}\n${wrapperCode}`;
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

    const sanitizedSource = sourceCode.replace(/public\s+class\s+Solution/g, "class Solution");
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

    let cppMain = `\n#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n#include <algorithm>\nusing namespace std;\n\n`;
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

    let cMain = `\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n`;
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

    for (const [index, currentCase] of casesToRun.entries()) {
      const testCaseInput = currentCase.input || "";

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

    return res.json({
      mode: executionMode,
      totalCases: casesToRun.length,
      passedCases: totalPassed,
      status: totalPassed === casesToRun.length ? "PASSED" : "FAILED",
      problemId: casesToRun[0]?.problemId || "",
      details: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution failure";
    console.error("System Core Fault:", error);
    return res.status(500).json({ error: "System execution failure", details: message });
  }
};
