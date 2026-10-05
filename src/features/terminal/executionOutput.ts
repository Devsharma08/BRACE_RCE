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
  // Keep EVERY case the API returns, including the ones whose input and
  // expected output the server withheld. Those still occupy a slot in the list
  // and still receive a verdict, so the panel shows all 15 like the runner
  // graded all 15. Filtering on a non-empty input used to drop exactly those,
  // which is why a 15-case problem rendered as 3.
  return (data.test_cases ?? []).map((testCase) => ({
    input: testCase.input ?? "",
    expectedOutput: testCase.expectedOutput ?? "",
    isPublic: testCase.is_public ?? true,
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
