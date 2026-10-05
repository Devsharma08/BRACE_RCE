import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { queryKeys } from "../lib/queryKeys";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { TerminalContext } from "../context/TerminalContext";
import { executeCode, fetchSystemProblems } from "../features/terminal/api";
import EditorToolbar from "../features/terminal/components/EditorToolbar";
import LoadingOverlay from "../features/terminal/components/LoadingOverlay";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import OutputPanel from "../features/terminal/components/OutputPanel";
import PracticeSidebar, { type PracticeProblem } from "../features/terminal/components/PracticeSidebar";
import { buildProblemTestCases, formatExecutionOutput } from "../features/terminal/executionOutput";
import {
  outputGridTemplateRows,
  useTerminalLayout,
} from "../features/terminal/hooks/useTerminalLayout";
import type { ExecutionMode, SupportedLanguage } from "../features/terminal/types";
import type { ProblemTimerRef } from "../features/terminal/components/ProblemTimer";
import { NotesPanel } from "../components/ui/NotesPanel";
import { invalidateProblemQueries } from "../utils/problemCache";
import { useIsMobile } from "../hooks/useMediaQuery";

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
  // 1. Try code_snippets from DB (stored under Monaco-style ids, e.g. "cpp")
  if (problem.code_snippets && problem.code_snippets.length > 0) {
    const normalizedLang = lang === "c++" ? "cpp" : lang.toLowerCase();
    const match = problem.code_snippets.find(
      (s) => s.language?.toLowerCase() === normalizedLang
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
  const { user } = useAuth();

  // URL-driven: id or oid selects the initial problem
  const targetId = searchParams.get("id") || searchParams.get("oid") || searchParams.get("problemId") || "";

  // ── State ──────────────────────────────────────────────────
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [activeProblem, setActiveProblem] = useState<PracticeProblem | null>(null);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [problemsError, setProblemsError] = useState<string | null>(null);
  // Bumped by Retry buttons — re-runs the catalog fetch without a remount.
  const [problemsNonce, setProblemsNonce] = useState(0);
  const retryProblems = useCallback(() => setProblemsNonce((n) => n + 1), []);

  // Output-track ceiling, read from the workspace grid (see
  // measureWorkspaceCeiling) and consumed by useTerminalLayout.
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);

  /**
   * Ceiling the output track may occupy right now, measured from the workspace
   * grid. Returns 0 before the first layout pass so the hook keeps its viewport
   * estimate instead of clamping the track down to its hard floor.
   *
   * Deliberately measured on demand: the previous cached (observer-written)
   * value could be stale-high at drag time — a resize between measurements let
   * the drag push the row past the workspace, which is what left the panel's
   * own scrollbar off-screen.
   */
  const measureWorkspaceCeiling = useCallback(() => {
    const el = workspaceGridRef.current;
    const height = el ? el.getBoundingClientRect().height : 0;
    if (height <= 0) return 0;
    // Floors: desktop keeps MIN_EDITOR_PX (200) for the editor row; mobile
    // keeps a usable 180px editor above the output track.
    const isCompact = window.innerWidth < 768;
    return Math.max(120, height - (isCompact ? 180 : 200));
  }, []);
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
  const [javaClassName, setJavaClassName] = useState<string>("Solution");
  // Index of the single case currently being run, so exactly one card shows its
  // spinner. Null when no single-case run is in flight.
  const [runningTestCaseIndex, setRunningTestCaseIndex] = useState<number | null>(null);

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
    // Per-language code preservation
    codeByLanguage,
    setCodeForLanguage,
    getCodeForLanguage,
  } = useContext(TerminalContext);

  const { setStatus } = useContext(TerminalContext);

  // Used to invalidate the cached problem payloads after a SUBMIT writes progress.
  const queryClient = useQueryClient();

  // ── Layout ─────────────────────────────────────────────────
  const {
    outputHeight,
    sidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setOutputHeight,
    startOutputDragging,
    startSidebarDragging,
    setSidebarWidth,
    clampOutputHeight,
  } = useTerminalLayout({
    autoCloseBelowPx: 220,
    getMaxOutputHeight: measureWorkspaceCeiling,
  });

  // The output track's true ceiling is the WORKSPACE height minus the editor
  // floor — window.innerHeight ignores the toolbar, status bar, and stacked
  // mobile layout, so dragging could push the grid past its own container and
  // make the output scrollbar unreachable. Re-clamp on every container resize
  // (the same ceiling also caps the CSS track itself; see outputGridTemplateRows).
  useEffect(() => {
    const el = workspaceGridRef.current;
    if (!el) return;
    const measure = () => {
      // 0 while the grid has no layout yet — the hook then keeps its viewport
      // estimate instead of clamping the track down to its hard floor.
      if (measureWorkspaceCeiling() <= 0) return;
      clampOutputHeight();
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [clampOutputHeight, measureWorkspaceCeiling]);

  // Below md the shell stacks vertically. If the sidebar stayed in flow it would
  // take the full column height and push the editor + output panel off-screen
  // entirely, so on small screens it becomes a fixed overlay drawer instead.
  const isMobile = useIsMobile();
  const isSidebarOpen = isPanelOpen && !isSidebarCollapsed;

  const formatEditorRef = useRef<(() => void) | null>(null);

  // ── Load all system problems on mount ─────────────────────
  useEffect(() => {
    const controller = new AbortController();
    setProblemsLoading(true);

    fetchSystemProblems(controller.signal)
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid problem payload");
        setProblems(data);
        setProblemsError(null);

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
        if (e.name !== "AbortError") {
          console.error("Failed to load problems:", e);
          setProblemsError("The complete problem catalog could not be loaded.");
        }
      })
      .finally(() => {
        // A superseded request (auth restore re-runs this effect) must not
        // clear the NEWER request's flag — that race flashed "NO PROBLEMS
        // FOUND" while the real catalog was still in flight.
        if (!controller.signal.aborted) setProblemsLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, problemsNonce]);

  // ── Load problem into editor ───────────────────────────────
  const loadProblem = useCallback(
    (problem: PracticeProblem, allProblems?: PracticeProblem[]) => {
      setActiveProblem(problem);
      setActiveFile(problem.github_oid || problem.id);
      setOutput(null);
      setOutputText("");

      // Extract Java class name from code_snippets if available
      const javaSnippet = problem.code_snippets?.find(
        (s) => s.language?.toLowerCase() === "java"
      );
      if (javaSnippet?.code) {
        const classMatch = javaSnippet.code.match(/class\s+(\w+)/);
        if (classMatch?.[1]) {
          setJavaClassName(classMatch[1]);
        } else {
          setJavaClassName("Solution");
        }
      } else {
        setJavaClassName("Solution");
      }

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
      // TerminalContext.changeLanguage will restore saved code for this language
      // or set empty string if none exists - then we set boilerplate
      const savedCode = getCodeForLanguage(newLang);
      if (!savedCode && activeProblem) {
        setCode(getBoilerplate(activeProblem, newLang));
      }
    },
    [activeProblem, setLanguage, setCode, getCodeForLanguage]
  );

  // ── Reset code to starter boilerplate ─────────────────────
  const handleResetCode = useCallback(() => {
    setCode(getBoilerplate(activeProblem, language));
    // Also update the per-language storage
    setCodeForLanguage(language, getBoilerplate(activeProblem, language));
  }, [activeProblem, language, setCode, setCodeForLanguage]);

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
          // A practice SUBMIT writes progress (solved/attempts), so the problem
          // payloads cached with staleTime: Infinity are stale now.
          invalidateProblemQueries(queryClient);
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
      const target = testCases[testCaseIndex];

      // A withheld case has no input on the client, so there is nothing to
      // re-send. The server still owns it and grades it during SUBMIT.
      if (target.isPublic === false) return;

      setRunningTestCaseIndex(testCaseIndex);
      setResponseLoading(true);
      setIsExecuting(true);
      setExecutingMode("RUN");
      setStatus("LOADING");
      // A single stored case is a REAL graded run, not a custom input: the
      // server keeps this case's expected output, so `passed` is meaningful.
      setIsCustomInputRun(false);
      setIsOutputActive(true);

      try {
        const data = await executeCode({
          code,
          language,
          oid: activeFile,
          mode: "RUN",
          testCaseIndex,
        });

        // The server already stamps the detail with the true stored index, so
        // the verdict lands on the card that was clicked. Normalise defensively
        // in case a proxy or an older server drops the field.
        const rawDetail = data.details?.[0];
        const normalizedData = rawDetail
          ? {
              ...data,
              details: [
                {
                  ...rawDetail,
                  testCaseIndex:
                    typeof rawDetail.testCaseIndex === "number"
                      ? rawDetail.testCaseIndex
                      : testCaseIndex,
                },
              ],
            }
          : data;

        setOutput(normalizedData);
        setStatus("SUCCESS");

        // Show error OR output — never both
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
        setRunningTestCaseIndex(null);
        setIsExecuting(false);
        setExecutingMode(null);
        setResponseLoading(false);
      }
    },
    [testCases, code, language, activeFile, setOutput, setStatus]
  );

  const handleCodeChange = useCallback((nextCode: string) => setCode(nextCode), [setCode]);
  const handleClearOutput = useCallback(() => {
    setOutput(null);
    setOutputText("");
    setIsCustomInputRun(false);
    setIsOutputActive(false);
  }, [setOutput]);

  // ── Derived values ────────────────────────────────────────
  const activeFileName = activeProblem?.name || "Practice Workspace";
  const activeFileKey = activeFile ? `${activeFile}:${activeFileName}` : "";

  // ── Render ────────────────────────────────────────────────
  return (
    // .viewport-shell keeps the dynamic-viewport height (with a vh fallback) in
    // ONE rule — as the old `h-[100vh] h-[100dvh]` utility pair the vh value won,
    // so on phones the shell was taller than the visible area and the page
    // scrolled behind the browser chrome, clipping the output panel's bottom.
    <div className="viewport-shell flex min-h-0 flex-col overflow-hidden bg-base pt-2 text-fg font-mono select-none md:flex-row">
      {/* ── PRACTICE SIDEBAR (COLLAPSIBLE & DRAGGABLE, auto-closes <220px) ────────────────
          On mobile this is an overlay drawer (absolute + backdrop) rather than a
          flex child, so opening it never pushes the workspace off-screen. */}
      {isMobile && isSidebarOpen && (
        <button
          type="button"
          aria-label="Close problem sidebar"
          onClick={() => setIsSidebarCollapsed(true)}
          className="absolute inset-0 z-20 bg-base/70 backdrop-blur-[1px]"
        />
      )}

      <div
        style={{
          width: isSidebarOpen ? `min(${sidebarWidth}px, 100vw)` : "0px",
        }}
        className={`${isMobile ? "absolute inset-y-0 left-0" : "relative"} z-30 h-full transition-[width] duration-300 ease-in-out shrink-0`}
      >
        {/* PracticeSidebar renders its own drag handle (fed by
            onResizeStart → startSidebarDragging). */}
        <div className="w-full h-full bg-raised border-r border-subtle-line shadow-2xl overflow-hidden relative">
          <div className="flex flex-col h-full" style={{ width: `${sidebarWidth}px` }}>
            <PracticeSidebar
              problems={problems}
              activeProblem={activeProblem}
              onSelectProblem={handleSelectProblem}
              width={sidebarWidth}
              onResizeStart={startSidebarDragging}
              isLoading={problemsLoading}
              errorMessage={problemsError}
            />
            {/* ── Loader: full problems fetch overlay (blocks panels until databank syncs) ── */}
            {problemsLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-raised/95 backdrop-blur-[1px]">
                <div className="w-10 h-10 rounded-none border border-accent-primary/40 bg-accent-primary/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                </div>
                <p className="text-[11px] text-accent-primary font-mono font-bold tracking-[0.25em] uppercase animate-pulse">
                  SYNCING PROBLEM DATABANK…
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR TOGGLE BUTTON.
            `left-full` sits the button just outside the panel, which is off
            screen on mobile where the panel is capped at 100vw. On mobile it
            moves inside the panel instead. */}
        <button
          onClick={() => {
            const next = !(isPanelOpen && !isSidebarCollapsed);
            setIsPanelOpen(next);
            setIsSidebarCollapsed(!next);
            if (next && sidebarWidth < 220) setSidebarWidth(360);
          }}
          className={`absolute top-1/2 -translate-y-1/2 z-30 bg-raised border border-accent-primary/30 text-accent-primary p-2 hover:bg-accent-primary/10 transition-all shadow-[4px_0_15px_rgba(0,0,0,0.5)] ${
            isMobile ? "right-3 rounded-r-lg" : "left-full rounded-r-lg"
          }`}
          title={isPanelOpen && !isSidebarCollapsed ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isPanelOpen && !isSidebarCollapsed ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isPanelOpen && !isSidebarCollapsed}
        >
          {isPanelOpen && !isSidebarCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ── MAIN WORKSPACE ───────────────────────────────── */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-base relative z-10 transition-all duration-300">
        {/* HEADER BAR */}
        <div className="flex w-full items-center justify-between gap-3 border-b-2 border-subtle-line bg-raised px-3 py-2 text-xs font-mono text-accent-primary/80 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">SYS // PRACTICE_WORKSPACE</span>
          </div>
          <div className="flex items-center gap-3">
            {activeProblem?.difficulty_level && (
              <span
                className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${
                  activeProblem.difficulty_level.toUpperCase() === "EASY"
                    ? "border-accent-success/30 bg-accent-success/10 text-accent-success"
                    : activeProblem.difficulty_level.toUpperCase() === "HARD"
                    ? "border-accent-danger/30 bg-accent-danger/10 text-accent-danger"
                    : "border-accent-warning/30 bg-accent-warning/10 text-accent-warning"
                }`}
              >
                {activeProblem.difficulty_level.toUpperCase()}
              </span>
            )}
            {activeProblem?.isSolved && (
              <span className="text-[10px] px-2 py-0.5 border border-accent-success/40 bg-accent-success/10 text-accent-success font-bold uppercase">
                ✓ SOLVED
              </span>
            )}
            <span className="truncate text-faint uppercase">
              {problemsLoading ? "LOADING..." : activeFileName}
            </span>
          </div>
        </div>

        {/* EDITOR + OUTPUT */}
        <div className="flex-1 min-h-0 relative">
          {problemsLoading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay-bg">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                <span className="text-xs font-mono text-subtle uppercase tracking-widest">Loading complete problem data…</span>
              </div>
            </div>
          ) : problemsError ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay-bg p-6 text-center">
              <div className="max-w-md border border-accent-danger/30 bg-accent-danger/5 p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-accent-danger">Problem catalog unavailable</p>
                <p className="mt-2 text-xs text-subtle">{problemsError}</p>
                <button
                  type="button"
                  onClick={retryProblems}
                  className="mt-4 cursor-pointer border border-accent-primary/40 bg-accent-primary/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-accent-primary transition-colors hover:bg-accent-primary/20"
                >
                  Retry sync
                </button>
              </div>
            </div>
          ) : (
            <>
              {loading && <LoadingOverlay label="Loading workspace..." />}

              <div className="absolute inset-0 flex flex-col min-h-0 ">
                {activeFile ? (
                  <>
                    <EditorToolbar
                      activeFile={activeFile}
                      code={code}
                      disabled={resLoading || loading}
                      executingMode={executingMode}
                      language={language}
                      setLanguage={handleLanguageChange}
                      sidebarWidth={0}
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
                      onClearOutput={handleClearOutput}
                      onToggleNotes={() => setIsNotesOpen((p) => !p)}
                      isNotesOpen={isNotesOpen}
                      onExit={() => navigate("/dashboard")}
                      submissionTrigger={submissionTrigger}
                      timerRef={timerRef}
                      initialSubmissionTimes={activeProblem?.submissionTimes ?? []}
                    />

                    {/* The grid clips: the output track is capped in CSS
                        (outputGridTemplateRows) so it can never claim more
                        room than the workspace has, but clipping here also
                        stops a mid-drag stale height from painting the panel's
                        scrollbar past the page and off-screen. */}
                    <div
                      ref={workspaceGridRef}
                      className="grid min-h-0 flex-1 overflow-hidden"
                      style={{ gridTemplateRows: outputGridTemplateRows(outputHeight) }}
                    >
                      {/* No inline min-height here: this cell sits in a minmax(0,1fr)
                          grid row, so a hard floor made the editor overflow its own row
                          and paint over the OutputPanel below it. */}
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
                          javaClassName={javaClassName}
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
                        runningTestCaseIndex={runningTestCaseIndex}
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
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                    {/* Empty catalog is a transient databank state, not a dead
                        end — show progress + a manual retry instead of the old
                        "ADD PROBLEMS VIA SEED ENDPOINT" dead-end copy. */}
                    <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
                    <p className="font-mono text-xs uppercase tracking-widest text-subtle">
                      No problems in the databank yet — sync in progress
                    </p>
                    <button
                      type="button"
                      onClick={retryProblems}
                      className="cursor-pointer border border-accent-primary/40 bg-accent-primary/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-accent-primary transition-colors hover:bg-accent-primary/20"
                    >
                      Retry sync
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* NOTES PANEL */}
      <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
};

export default Terminal;
