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
  const details = result.details ?? [];

  if (mode === "RUN") {
    // Custom input / single test case execution — return the actual result
    const runResult = details[0];
    if (!runResult) {
      // Nothing came back — show raw JSON as fallback
      return JSON.stringify(result, null, 2);
    }
    // Exclusively show error OR output, never both
    if (runResult.runtimeError) {
      return runResult.runtimeError;
    }
    return runResult.output?.trim() || "// No output produced.";
  }

  // SUBMIT mode: summary + per-case details
  const summary = `Status: ${result.status}\nPassed: ${result.passedCases}/${result.totalCases}`;
  const caseDetails = details
    .map(
      (detail) =>
        `Test Case ${detail.testCaseIndex + 1}:\nExpected: ${detail.expectedOutput}\nOutput: ${detail.output}\nResult: ${
          detail.passed ? "Passed" : "Failed"
        }${detail.runtimeError ? "\nError: " + detail.runtimeError : ""}`,
    )
    .join("\n\n");

  return caseDetails ? `${summary}\n\n${caseDetails}` : summary;
};
