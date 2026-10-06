export type SupportedLanguage = "javascript" | "java" | "c" | "c++" | "c11" | "python";

export type ExecutionMode = "RUN" | "SUBMIT";

export type RawTestCase = {
  input?: string;
  expectedOutput?: string;
  problemId?: string;
  /** False when the server withheld this case's input/expected output. */
  is_public?: boolean;
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
  /**
   * False for a case whose input/expected were withheld by the server. The card
   * still renders so the list shows all 15, but it must not offer "run this
   * one" — there is no input on the client to run.
   */
  isPublic?: boolean;
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
  /**
   * Run exactly this stored case (0-based) with its real expected output, so a
   * single-case run returns a genuine pass/fail. Ignored in SUBMIT mode, which
   * always grades the full set.
   */
  testCaseIndex?: number;
  fileName?: string;
  timeTaken?: string;
  roomId?: string;
};
