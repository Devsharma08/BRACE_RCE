export type SupportedLanguage = "javascript" | "java" | "";

export type ExecutionMode = "RUN" | "SUBMIT";

export type RawTestCase = {
  input?: string;
  expectedOutput?: string;
  problemId?: string;
};

export type FileContentResponse = {
  content?: string;
  test_cases?: RawTestCase[];
  id?: string;
  name?: string;
  problem_definition?: string;
  problem_hints?: unknown;
  difficulty_level?: string;
  data_structure?: string;
};

export type ProblemTestCase = {
  input: string;
  expectedOutput: string;
  problemId?: string;
  problemDefinition?: string;
  problemDifficultyLevel?: string;
  hints?: unknown;
};

export type ExecutionDetail = {
  testCaseIndex: number;
  output?: string;
  expectedOutput?: string;
  passed: boolean;
  runtimeError?: string | null;
  problemId?: string;
  metrics?: {
    durationMs: number;
    memoryKb: number;
  } | null;
};

export type ExecutionResult = {
  mode?: ExecutionMode;
  totalCases?: number;
  passedCases?: number;
  status?: string;
  problemId?: string;
  details?: ExecutionDetail[];
};

export type ExecuteCodeRequest = {
  code: string;
  language: SupportedLanguage;
  oid: string;
  mode: ExecutionMode;
  customInput?: string;
  fileName?: string;
};
