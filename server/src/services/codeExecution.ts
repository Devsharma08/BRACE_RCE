import { exec } from "child_process";
import type { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../Lib/prisma.js";

type SupportedLanguage = "javascript" | "java";
type ExecutionMode = "RUN" | "SUBMIT";

type ExecuteBody = {
  code?: unknown;
  language?: unknown;
  oid?: unknown;
  mode?: unknown;
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

const execAsync = promisify(exec);

const normalize = (value: string) => (value || "").replace(/\r\n/g, "\n").trim();

const problemIdPayload = (currentCase: TestCaseRecord) => {
  return currentCase.problemId ? { problemId: currentCase.problemId } : {};
};

const getExecutionMode = (mode: unknown): ExecutionMode => {
  return mode === "SUBMIT" ? "SUBMIT" : "RUN";
};

const getLanguage = (language: unknown): SupportedLanguage => {
  return language === "java" ? "java" : "javascript";
};

const getJavaImports = () => {
  return ["import java.util.*", "import java.io.*", "import java.math.*", "import java.util.stream.*"]
    .map((importLine) => `${importLine};`)
    .join("\n");
};

const prepareSourceFile = async ({
  code,
  language,
  tempDir,
  wrapperCode,
}: {
  code: string;
  language: SupportedLanguage;
  tempDir: string;
  wrapperCode: string;
}) => {
  if (language === "java") {
    const autoImports = getJavaImports();
    const processedCode = wrapperCode
      ? `${autoImports}\n\n${code}\n${wrapperCode}`
      : `${autoImports}\n\n${code.replace(/class\s+[A-Za-z0-9_]+/, "class Solution")}\n\npublic class Main {\n  public static void main(String[] args) {\n    try {\n      try {\n        java.lang.reflect.Method mainMethod = Solution.class.getMethod("main", String[].class);\n        mainMethod.invoke(null, (Object)args);\n      } catch (NoSuchMethodException e) {\n        new Solution();\n      }\n    } catch (java.lang.reflect.InvocationTargetException e) {\n      e.getCause().printStackTrace(System.err);\n    } catch (Exception e) {\n      e.printStackTrace(System.err);\n    }\n  }\n}`;

    await fs.writeFile(path.join(tempDir, "Main.java"), processedCode);

    return {
      dockerImage: "eclipse-temurin:17-alpine",
      runCommand: "javac Main.java && java Main < input.txt",
    };
  }

  const fileName = "index.js";
  const processedCode = wrapperCode ? `${code}\n${wrapperCode}` : code;
  await fs.writeFile(path.join(tempDir, fileName), processedCode);

  return {
    dockerImage: "node:18-slim",
    runCommand: `node ${fileName} < input.txt`,
  };
};

const buildDockerCommand = ({
  dockerImage,
  runCommand,
  tempDir,
}: {
  dockerImage: string;
  runCommand: string;
  tempDir: string;
}) => {
  return `docker run --rm \
                --network none \
                --user 1000:1000 \
                --pids-limit 64 \
                --memory="128m" \
                --cpus=".5" \
                -v "${tempDir}:/app" \
                -w /app \
                ${dockerImage} \
                sh -c "timeout 20s ${runCommand}"`;
};

export const executeCode = async (req: Request, res: Response) => {
  const { code, language, oid, mode } = req.body as ExecuteBody;
  const sourceCode = typeof code === "string" ? code : "";
  const githubOid = typeof oid === "string" ? oid : "";
  const executionMode = getExecutionMode(mode);
  const executionLanguage = getLanguage(language);
  const jobId = uuidv4();
  const tempDir = path.join(process.cwd(), "temp", jobId);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    const fileData = await prisma.problem.findUnique({
      where: { github_oid: githubOid },
      select: {
        test_cases: true,
        code_snippets: true,
      },
    });

    const testCases = (fileData?.test_cases ?? []) as TestCaseRecord[];
    const codeSnippets = (fileData?.code_snippets ?? []) as CodeSnippetRecord[];
    const wrapperCode = codeSnippets.find((snippet) => snippet.language === executionLanguage)?.wrapperCode ?? "";
    const casesToRun =
      testCases.length === 0
        ? [{ input: "", expectedOutput: "" }]
        : executionMode === "SUBMIT"
          ? testCases
          : testCases.slice(0, 1);

    const { dockerImage, runCommand } = await prepareSourceFile({
      code: sourceCode,
      language: executionLanguage,
      tempDir,
      wrapperCode,
    });

    const results: ExecutionDetail[] = [];
    let totalPassed = 0;

    for (const [index, currentCase] of casesToRun.entries()) {
      const testCasePath = path.join(tempDir, "input.txt");
      await fs.writeFile(testCasePath, (currentCase.input || "").trim());

      const dockerCmd = buildDockerCommand({ dockerImage, runCommand, tempDir });

      try {
        const { stdout, stderr } = await execAsync(dockerCmd);

        if (normalize(stderr)) {
          results.push({
            testCaseIndex: index,
            output: stdout,
            expectedOutput: currentCase.expectedOutput,
            passed: false,
            runtimeError: stderr,
          });
          break;
        }

        const actualOutput = normalize(stdout);
        const expectedOutput = normalize(currentCase.expectedOutput);
        const passed = actualOutput === expectedOutput;

        if (passed) totalPassed++;

        results.push({
          testCaseIndex: index,
          output: stdout,
          expectedOutput: currentCase.expectedOutput,
          passed,
          ...problemIdPayload(currentCase),
          runtimeError: null,
        });

        if (executionMode === "SUBMIT" && !passed) {
          break;
        }
      } catch (execError) {
        const error = execError as { stdout?: string; stderr?: string };
        results.push({
          testCaseIndex: index,
          output: error.stdout || "",
          expectedOutput: currentCase.expectedOutput,
          passed: false,
          ...problemIdPayload(currentCase),
          runtimeError: error.stderr || "Timeout or Execution Interruption",
        });
        break;
      }
    }

    return res.json({
      mode: executionMode,
      totalCases: casesToRun.length,
      passedCases: totalPassed,
      status: totalPassed === casesToRun.length ? "PASSED" : "FAILED",
      problemId: testCases[0]?.problemId || "",
      details: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution failure";
    console.error("System Core Fault:", error);
    return res.status(500).json({ error: "System execution failure", details: message });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
