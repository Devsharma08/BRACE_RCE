import type {
  ExecutionMode,
  ExecutionResult,
  FileContentResponse,
  ProblemTestCase,
  SupportedLanguage,
} from "./types";

export const detectLanguageFromFileName = (fileName?: string): SupportedLanguage => {
  if (!fileName) return "javascript";
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "java":
      return "java";
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
      return "javascript";
    case "cpp":
    case "cc":
    case "cxx":
      return "c++";
    case "py":
    case "python":
      return "python";
    case "c":
      return "c";
    default:
      return "javascript";
  }
};

export const buildProblemTestCases = (data: FileContentResponse): ProblemTestCase[] => {
  return (data.test_cases ?? [])
    .filter((testCase) => (testCase.input ?? "") !== "")
    .map((testCase) => ({
      input: testCase.input ?? "",
      expectedOutput: testCase.expectedOutput ?? "",
      problemId: data.id,
      problemDefinition: data.problem_definition,
      problemDifficultyLevel: data.difficulty_level,
      hints: data.problem_hints,
    }));
};

export const formatExecutionOutput = (result: ExecutionResult, mode: ExecutionMode) => {
  if (mode === "RUN") {
    const runResult = result.details?.[0];

    if (!runResult) {
      return JSON.stringify(result, null, 2);
    }

    return runResult.runtimeError
      ? `Error:\n${runResult.runtimeError}`
      : runResult.output || "No output";
  }

  const details = result.details ?? [];
  const summary = `Status: ${result.status}\nPassed: ${result.passedCases}/${result.totalCases}`;
  const caseDetails = details
    .map(
      (detail) =>
        `Test Case ${detail.testCaseIndex + 1}:\nExpected: ${detail.expectedOutput}\nOutput: ${detail.output}\nResult: ${detail.passed ? "Passed" : "Failed"
        }${detail.runtimeError ? "\nError: " + detail.runtimeError : ""}`,
    )
    .join("\n\n");

  return caseDetails ? `${summary}\n\n${caseDetails}` : summary;
};
