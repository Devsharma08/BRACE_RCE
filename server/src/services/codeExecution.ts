import type { Request, Response } from "express";
import { prisma } from "../Lib/prisma.js";
import { execFile } from "child_process";
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
  }
  return extensionMap[language];
}

const pistonVersionMapping: Record<string, string> = {
  'python': "3.13.2",
  'javascript': "22.11.1",
  'java': "25",
  'c': "10",
  'cpp': "25.3",
  "typescript": '5.9.3'
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

    // Fetch test cases from DB if it's a real problem
    if (githubOid && !githubOid.startsWith("local-")) {
      const fileData = await prisma.problem.findUnique({
        where: { github_oid: githubOid },
        select: { test_cases: true }
      });

      const testCases = (fileData?.test_cases ?? []) as TestCaseRecord[];

      if (executionMode === "SUBMIT") {
        casesToRun = testCases;
      } else {
        casesToRun = testCases.slice(0, 1);
      }
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
        "language": executionLanguage,
        "version": pistonVersionMapping[executionLanguage],
        "files": [
          {
            "name": `main.${getExtension(executionLanguage)}`,
            "content": sourceCode,
          }
        ],
        "stdin": testCaseInput,
        "compile_timeout": 10000,
        "run_timeout": 10000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1
      };

      let data: any;

      try {
        // 1. Try hitting the public Piston API first
        const pistonResponse = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!pistonResponse?.ok) throw new Error("Piston API blocked or down");
        data = await pistonResponse?.json();

      } catch (apiError) {
        // 2. FALLBACK: Execute JavaScript locally if Piston fails!
        if (executionLanguage === "javascript") {
          console.log("⚠️ Piston API failed. Falling back to local Node.js execution!");
          try {
            const localCode = `
                        ${sourceCode}
                    `;
            const { stdout, stderr } = await execFileAsync("node", ["-e", localCode], { timeout: 3000 });

            data = {
              compile: { code: 0 },
              run: { output: stdout || stderr, stdout, stderr }
            };
          } catch (localErr: any) {
            data = {
              compile: { code: 0 },
              run: { output: localErr.message || "Local Execution Error", stderr: localErr.message }
            };
          }
        } else {
          // Push a failure result if it's not JS
          results.push({
            testCaseIndex: index,
            output: "",
            expectedOutput: currentCase.expectedOutput,
            passed: false,
            ...problemIdPayload(currentCase),
            runtimeError: `Piston API is down. Fallback only supports JS.`,
          });
          break;
        }
      }

      // --- RESTORED LOGIC BELOW ---
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
