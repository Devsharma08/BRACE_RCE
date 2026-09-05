import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { House, ChevronLeft, ChevronRight } from "lucide-react";
import { CodeContext } from "../context/CodeContext";
import { UserResponseContext } from "../context/ResponseContext";
import { executeCode, fetchSystemProblems } from "../features/terminal/api";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import LoadingOverlay from "../features/terminal/components/LoadingOverlay";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import OutputPanel from "../features/terminal/components/OutputPanel";
import PracticeSidebar, { type PracticeProblem } from "../features/terminal/components/PracticeSidebar";
import { buildProblemTestCases, formatExecutionOutput } from "../features/terminal/executionOutput";
import { useTerminalLayout } from "../features/terminal/hooks/useTerminalLayout";
import type { ExecutionMode, SupportedLanguage } from "../features/terminal/types";
import type { ProblemTimerRef } from "../features/terminal/components/ProblemTimer";
import { NotesPanel } from "../components/ui/NotesPanel";

// ─────────────────────────────────────────────────────────────
// Language / Snippet Helpers
// ─────────────────────────────────────────────────────────────

const getLanguageStarterCode = (lang: SupportedLanguage, problemName?: string): string => {
  switch (lang) {
    case "python":
      return `# Solution for ${problemName || "problem"}\ndef solution(*args):\n    pass\n`;
    case "c++":
      return `// Solution for ${problemName || "problem"}\n#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n`;
    case "java":
      return `// Solution for ${problemName || "problem"}\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`;
    case "c":
      return `// Solution for ${problemName || "problem"}\n#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    return 0;\n}\n`;
    case "javascript":
    default:
      return `/**\n * Solution for ${problemName || "problem"}\n */\nvar solution = function() {\n    \n};\n`;
  }
};

const getBoilerplate = (problem: PracticeProblem | null, lang: SupportedLanguage): string => {
  if (!problem) return getLanguageStarterCode(lang);
  // 1. Try code_snippets from DB
  if (problem.code_snippets && problem.code_snippets.length > 0) {
    const match = problem.code_snippets.find(
      (s) =>
        s.language?.toLowerCase() === lang.toLowerCase() ||
        (lang === "c++" && s.language?.toLowerCase() === "cpp")
    );
    if (match?.code) return match.code;
  }
  // 2. Fall back to generic boilerplate
  return getLanguageStarterCode(lang, problem.name);
};

// ─────────────────────────────────────────────────────────────
// Terminal Component
// ─────────────────────────────────────────────────────────────

const Terminal = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL-driven: id or oid selects the initial problem
  const targetId = searchParams.get("id") || searchParams.get("oid") || searchParams.get("problemId") || "";

  // ── State ──────────────────────────────────────────────────
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [activeProblem, setActiveProblem] = useState<PracticeProblem | null>(null);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingMode, setExecutingMode] = useState<ExecutionMode | null>(null);
  const [outputText, setOutputText] = useState("");
  const [resLoading, setResponseLoading] = useState(false);
  const [isCustomInputRun, setIsCustomInputRun] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isOutputActive, setIsOutputActive] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [submissionTrigger, setSubmissionTrigger] = useState(0);

  const timerRef = useRef<ProblemTimerRef>(null);

  // ── Contexts ───────────────────────────────────────────────
  const {
    code,
    setCode,
    language,
    setLanguage,
    testCases,
    setTestCases,
    activeFile,
    setActiveFile,
    output,
    setOutput,
    customInput,
    setCustomInput,
    customInputActive,
    setCustomInputActive,
  } = useContext(CodeContext);

  const { setStatus } = useContext(UserResponseContext);

  // ── Layout ─────────────────────────────────────────────────
  const {
    outputHeight,
    sidebarWidth,
    setOutputHeight,
    startOutputDragging,
    startSidebarDragging,
    setSidebarWidth,
  } = useTerminalLayout();

  const formatEditorRef = useRef<(() => void) | null>(null);

  // ── Load all system problems on mount ─────────────────────
  useEffect(() => {
    const controller = new AbortController();
    setProblemsLoading(true);

    fetchSystemProblems(controller.signal)
      .then((data) => {
        setProblems(data);

        // Auto-select: by URL id, or first problem
        let initial: PracticeProblem | null = null;
        if (targetId) {
          initial =
            data.find(
              (p: PracticeProblem) =>
                p.id === targetId ||
                p.github_oid === targetId ||
                String(p.problem_number) === targetId
            ) ?? null;
        }
        if (!initial && data.length > 0) initial = data[0];
        if (initial) loadProblem(initial, data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error("Failed to load problems:", e);
      })
      .finally(() => setProblemsLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load problem into editor ───────────────────────────────
  const loadProblem = useCallback(
    (problem: PracticeProblem, allProblems?: PracticeProblem[]) => {
      setActiveProblem(problem);
      setActiveFile(problem.github_oid || problem.id);
      setOutput(null);
      setOutputText("");

      // If there's previously saved draft code — restore it
      const draftLang = (problem.lastLanguage as SupportedLanguage) || "javascript";
      const draftCode = problem.lastCode ?? getBoilerplate(problem, draftLang);

      setLanguage(draftLang);
      setCode(draftCode);

      // Load public test cases
      const tcs = buildProblemTestCases({
        test_cases: problem.test_cases ?? [],
      } as any);
      setTestCases(tcs);

      setCustomInput("");
      setCustomInputActive(false);
      setIsCustomInputRun(false);

      // Sync solved status on problem objects (in case we come from list)
      if (allProblems) setProblems(allProblems);
    },
    [setActiveFile, setCode, setCustomInput, setCustomInputActive, setLanguage, setOutput, setTestCases]
  );

  // ── Handle language switch (load boilerplate for new lang) ─
  const handleLanguageChange = useCallback(
    (newLang: SupportedLanguage) => {
      setLanguage(newLang);
      setCode(getBoilerplate(activeProblem, newLang));
    },
    [activeProblem, setLanguage, setCode]
  );

  // ── Reset code to starter boilerplate ─────────────────────
  const handleResetCode = useCallback(() => {
    setCode(getBoilerplate(activeProblem, language));
  }, [activeProblem, language, setCode]);

  // ── Select problem from sidebar ───────────────────────────
  const handleSelectProblem = useCallback(
    (problem: PracticeProblem) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("id", problem.id);
        return next;
      });
      loadProblem(problem);
    },
    [loadProblem, setSearchParams]
  );

  // ── Execute code ──────────────────────────────────────────
  const handleRunCode = useCallback(
    async (
      nextCode: string,
      nextLanguage: SupportedLanguage,
      oid: string,
      mode: ExecutionMode = "RUN"
    ) => {
      const customInputValue = customInputActive ? customInput.trim() : "";
      const isCustomExecution = customInputValue.length > 0;
      setIsCustomInputRun(isCustomExecution);
      setResponseLoading(true);
      setIsExecuting(true);
      setExecutingMode(mode);
      setStatus("LOADING");

      try {
        const timeTaken = mode === "SUBMIT" ? timerRef.current?.getCurrentTime() : undefined;
        const data = await executeCode({
          code: nextCode,
          language: nextLanguage,
          oid,
          mode,
          customInput: customInputValue,
        });
        setOutput(data);
        setStatus("SUCCESS");
        setOutputText(formatExecutionOutput(data, mode));

        // Update solved status in local list if submission passed
        if (mode === "SUBMIT" && data.status === "PASSED" && activeProblem) {
          setProblems((prev) =>
            prev.map((p) =>
              p.id === activeProblem.id
                ? { ...p, isSolved: true, solvedAt: new Date().toISOString(), attempts: (p.attempts ?? 0) + 1 }
                : p
            )
          );
          setActiveProblem((prev) =>
            prev ? { ...prev, isSolved: true, solvedAt: new Date().toISOString() } : prev
          );
        } else if (mode === "SUBMIT" && activeProblem) {
          // Still count the attempt
          setProblems((prev) =>
            prev.map((p) =>
              p.id === activeProblem.id ? { ...p, attempts: (p.attempts ?? 0) + 1 } : p
            )
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Execution failed";
        setOutputText(`ERROR: ${message}`);
        setOutput(null);
        setStatus("ERROR");
      } finally {
        setIsExecuting(false);
        setExecutingMode(null);
        setResponseLoading(false);
        setCustomInput("");
        // For SUBMIT mode always clear custom-input flag; for RUN only keep if custom input was used
        if (mode === "SUBMIT" || !isCustomExecution) setIsCustomInputRun(false);
        if (mode === "SUBMIT") {
          setSubmissionTrigger((prev) => prev + 1);
        }
      }
    },
    [
      customInput,
      customInputActive,
      activeProblem,
      setOutput,
      setCustomInput,
      setIsCustomInputRun,
      setStatus,
    ]
  );

  // ── Single test case runner ───────────────────────────────
  const handleRunSingleTestCase = useCallback(
    async (testCaseIndex: number) => {
      if (!testCases || !testCases[testCaseIndex]) return;
      const inputString = testCases[testCaseIndex].input || "";

      setResponseLoading(true);
      setIsExecuting(true);
      setExecutingMode("RUN");
      setStatus("LOADING");
      setIsCustomInputRun(true); // Mark as custom/single-test run — panel will hide pass/fail counts

      try {
        const data = await executeCode({
          code,
          language,
          oid: activeFile,
          mode: "RUN",
          customInput: inputString,
        });

        // The backend returns details[0] for a single-test run.
        // Normalise that detail so testCaseIndex matches the card the user clicked.
        const rawDetail = data.details?.[0];
        const normalizedData = rawDetail
          ? { ...data, details: [{ ...rawDetail, testCaseIndex }] }
          : data;

        setOutput(normalizedData);
        setStatus("SUCCESS");

        // Build outputText: show error OR output — never both
        if (rawDetail?.runtimeError) {
          setOutputText(rawDetail.runtimeError);
        } else {
          setOutputText(rawDetail?.output?.trim() || "// No output produced.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Execution failed";
        setOutputText(`ERROR: ${message}`);
        setOutput(null);
        setStatus("ERROR");
      } finally {
        setIsExecuting(false);
        setExecutingMode(null);
        setResponseLoading(false);
        // Keep isCustomInputRun=true so the panel knows it was a single-test run
      }
    },
    [testCases, code, language, activeFile, setOutput, setStatus]
  );

  const handleCodeChange = useCallback((nextCode: string) => setCode(nextCode), [setCode]);

  // ── Derived values ────────────────────────────────────────
  const activeFileName = activeProblem?.name || "Practice Workspace";
  const activeFileKey = activeFile ? `${activeFile}:${activeFileName}` : "";

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[#02040a] text-white font-mono select-none md:flex-row">
      {/* ── PRACTICE SIDEBAR (COLLAPSIBLE & DRAGGABLE) ──────────────── */}
      <div
        style={{ width: isPanelOpen ? `${sidebarWidth}px` : "0px" }}
        className="relative z-20 h-full transition-[width] duration-300 ease-in-out shrink-0"
      >
        <div className="w-full h-full bg-[#06080e] border-r border-cyan-500/20 shadow-2xl overflow-hidden relative">
          <div className="flex flex-col h-full" style={{ width: `${sidebarWidth}px` }}>
            <PracticeSidebar
              problems={problems}
              activeProblem={activeProblem}
              onSelectProblem={handleSelectProblem}
              width={sidebarWidth}
              onResizeStart={startSidebarDragging}
              isLoading={problemsLoading}
            />
          </div>
        </div>

        {/* SIDEBAR TOGGLE BUTTON */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-30 bg-[#0b0c0e] border border-cyan-500/30 text-cyan-400 p-2 rounded-r-lg hover:bg-cyan-900/40 hover:text-cyan-300 transition-all shadow-[4px_0_15px_rgba(0,0,0,0.5)] left-full"
          title={isPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isPanelOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ── MAIN WORKSPACE ───────────────────────────────── */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#02040a] relative z-10 transition-all duration-300">
        {/* HEADER BAR */}
        <div className="flex w-full items-center justify-between gap-3 border-b-2 border-cyan-500/20 bg-[#06080e] px-3 py-2 text-xs font-mono text-cyan-400/80 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/dashboard"
              title="Exit to Dashboard"
              className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-none border border-cyan-500/25 bg-cyan-950/10 px-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-all hover:border-cyan-400 hover:bg-cyan-950/20 active:scale-95"
            >
              <House className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">[ DASHBOARD ]</span>
            </Link>
            <span className="truncate">SYS // PRACTICE_WORKSPACE</span>
          </div>
          <div className="flex items-center gap-3">
            {activeProblem?.difficulty_level && (
              <span
                className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${
                  activeProblem.difficulty_level.toUpperCase() === "EASY"
                    ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-400"
                    : activeProblem.difficulty_level.toUpperCase() === "HARD"
                    ? "border-rose-500/30 bg-rose-950/30 text-rose-400"
                    : "border-amber-500/30 bg-amber-950/30 text-amber-400"
                }`}
              >
                {activeProblem.difficulty_level.toUpperCase()}
              </span>
            )}
            {activeProblem?.isSolved && (
              <span className="text-[10px] px-2 py-0.5 border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 font-bold uppercase">
                ✓ SOLVED
              </span>
            )}
            <span className="truncate text-slate-500 uppercase">
              {problemsLoading ? "LOADING..." : activeFileName}
            </span>
          </div>
        </div>

        {/* EDITOR + OUTPUT */}
        <div className="flex-1 min-h-0 relative">
          {loading && <LoadingOverlay label="Loading workspace..." />}

          <div className="absolute inset-0 flex flex-col min-h-0">
            {activeFile ? (
              <>
                <EditorToolbar
                  activeFile={activeFile}
                  disabled={resLoading || loading}
                  executingMode={executingMode}
                  language={language}
                  setLanguage={handleLanguageChange}
                  sidebarWidth={sidebarWidth}
                  setSidebarWidth={setSidebarWidth}
                  setCode={setCode}
                  fileName={activeFileName}
                  onRun={() => void handleRunCode(code, language, activeFile, "RUN")}
                  onSubmit={() => void handleRunCode(code, language, activeFile, "SUBMIT")}
                  showSubmit={true}
                  showFileExplorerToggle={false}
                  onToggleFileExplorer={() => {}}
                  isFileExplorerOpen={false}
                  onFormat={() => formatEditorRef.current?.()}
                  onReset={handleResetCode}
                  onToggleNotes={() => setIsNotesOpen((p) => !p)}
                  isNotesOpen={isNotesOpen}
                  onExit={() => navigate("/dashboard")}
                  submissionTrigger={submissionTrigger}
                  timerRef={timerRef}
                  initialSubmissionTimes={activeProblem?.submissionTimes ?? []}
                />

                <div className="flex-1 min-h-0 grid" style={{ gridTemplateRows: "minmax(0, 1fr) auto" }}>
                  <div className="h-full min-h-0 overflow-hidden">
                    <MonacoIDE
                      handleRunCode={handleRunCode}
                      language={language}
                      code={code}
                      oid={activeFile}
                      fileKey={activeFileKey}
                      onCodeChange={handleCodeChange}
                      onFormatMount={(formatAction) => {
                        formatEditorRef.current = formatAction;
                      }}
                    />
                  </div>

                  <OutputPanel
                    isExecuting={isExecuting}
                    isOutputActive={isOutputActive}
                    output={output}
                    outputHeight={outputHeight}
                    setOutputHeight={setOutputHeight}
                    outputText={outputText}
                    testCases={testCases}
                    customInput={customInput}
                    customInputActive={customInputActive}
                    isCustomInputRun={isCustomInputRun}
                    setCustomInput={setCustomInput}
                    setCustomInputActive={setCustomInputActive}
                    onResizeStart={startOutputDragging}
                    setIsOutputActive={setIsOutputActive}
                    onRunSingleTestCase={handleRunSingleTestCase}
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-cyan-500 font-mono text-sm">
                {problemsLoading
                  ? "LOADING PRACTICE PROBLEMS..."
                  : "NO PROBLEMS FOUND. ADD PROBLEMS VIA SEED ENDPOINT."}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* NOTES PANEL */}
      <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
};

export default Terminal;
