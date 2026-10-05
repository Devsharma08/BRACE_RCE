import { useMemo, useState } from "react";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import type { ExecutionDetail, ExecutionResult, ProblemTestCase } from "../types";
import type { MouseEvent } from "react";
import { TestCaseCard } from './TestCaseCard';

type OutputPanelProps = {
  isExecuting: boolean;
  isOutputActive: boolean;
  isCustomInputRun: boolean;
  output: ExecutionResult | null;
  outputHeight: number;
  outputText: string;
  testCases: ProblemTestCase[];
  customInput: string;
  customInputActive: boolean;
  runningTestCaseIndex?: number | null;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  setOutputHeight: (height: number) => void;
  setCustomInput: (value: string) => void;
  setCustomInputActive: (active: boolean) => void;
  setIsOutputActive: (active: boolean) => void;
  onRunSingleTestCase?: (index: number) => void;
};

const getTabClassName = (isActive: boolean) =>
  `cursor-pointer border-b-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-150 active:scale-95 ${
    isActive
      ? "border-b-accent-primary bg-accent-primary/10 text-accent-primary"
      : "border-b-transparent text-subtle hover:text-fg"
  }`;

const OutputPanel = ({
  isExecuting,
  isOutputActive,
  isCustomInputRun,
  output,
  outputHeight,
  outputText,
  testCases,
  customInput,
  customInputActive,
  runningTestCaseIndex,
  onResizeStart,
  setOutputHeight,
  setCustomInput,
  setCustomInputActive,
  setIsOutputActive,
  onRunSingleTestCase,
}: OutputPanelProps) => {
  const singleDetail: ExecutionDetail | undefined = isCustomInputRun
    ? output?.details?.[0]
    : undefined;

  const successfulDetails = (!isCustomInputRun ? output?.details : [])?.filter(d => d.metrics) || [];
  const totalDuration = successfulDetails.reduce((sum, d) => sum + (d.metrics?.durationMs || 0), 0);
  const avgDuration = successfulDetails.length > 0 ? totalDuration / successfulDetails.length : 0;
  const avgMemoryKb = successfulDetails.length > 0
    ? successfulDetails.reduce((sum, d) => sum + (d.metrics?.memoryKb || 0), 0) / successfulDetails.length
    : 0;
  const durations = successfulDetails.map(d => d.metrics?.durationMs || 0);
  const bestDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const worstDuration = durations.length > 0 ? Math.max(...durations) : 0;

  const totalCases = output?.totalCases ?? 0;
  // How many cases the problem actually has. `output.totalCases` counts what THIS
  // run graded, which is 1 for a single-case run — reporting "1/1 PASSED" for
  // that reads as a solved problem, so the full count is taken from the case
  // list instead and a partial run is labelled as one.
  const knownCases = testCases.length;
  const isPartialRun = Boolean(output) && totalCases > 0 && knownCases > totalCases;
  const allPassed =
    output?.status === "PASSED" ||
    (output?.passedCases === totalCases && totalCases > 0);
  // A partial run is never "accepted", however well that one case did.
  const accepted = allPassed && !isPartialRun;

  type OutputStatus = "LOADING" | "TIMEOUT" | "RUNTIME_ERROR" | "ACCEPTED" | "WRONG_ANSWER" | "COMPLETED" | "CUSTOM_ERROR" | "CUSTOM_OK" | "IDLE";

  const outputStatus: OutputStatus = isExecuting
    ? "LOADING"
    : output
      ? isCustomInputRun
        ? singleDetail?.runtimeError
          ? singleDetail.runtimeError.toLowerCase().includes("timeout")
            ? "TIMEOUT"
            : "RUNTIME_ERROR"
          : "COMPLETED"
        : output.details?.some(d => d.runtimeError)
          ? output.details?.some(d => d.runtimeError?.toLowerCase().includes("timeout"))
            ? "TIMEOUT"
            : "RUNTIME_ERROR"
          : output.status === "COMPLETED"
              ? "COMPLETED"
              : accepted
                ? "ACCEPTED"
                : "WRONG_ANSWER"
      : "IDLE";

  const showError = outputStatus === "RUNTIME_ERROR" || outputStatus === "TIMEOUT";
  const failedCase = output?.details?.find(d => !d.passed);

  const [activeDiagTab, setActiveDiagTab] = useState<"LOGS" | "TESTS">("LOGS");

  // The server grades the FULL case set and returns one detail row per case;
  // the API ships every case too, WITH its real input and expected output. Both
  // are indexed the same way, so render exactly as many cards as the runner
  // graded, filling any gap from the detail row.
  const renderedCases = useMemo(() => {
    const details = isCustomInputRun ? [] : output?.details ?? [];
    const byIndex = new Map(details.map((detail) => [detail.testCaseIndex, detail]));
    const lastDetailIndex = details.reduce(
      (max, detail) => Math.max(max, detail.testCaseIndex),
      -1,
    );
    // `totalCases` is the authoritative count of what was graded.
    const gradedCount = output?.totalCases ?? 0;
    const count = Math.max(testCases.length, lastDetailIndex + 1, gradedCount);

    return Array.from({ length: count }, (_, index) => ({
      item:
        testCases[index] ??
        // No local row for this index: synthesise one so the card still renders.
        { input: "", expectedOutput: byIndex.get(index)?.expectedOutput ?? "" },
      match: byIndex.get(index),
      // isPublic is OPTIONAL on the type, so an absent value must NOT be read
      // as withheld — defaulting to false would mark ordinary public cases as
      // hidden and drop their SAMPLE badge.
      isHidden: testCases[index]?.isPublic === false,
    }));
  }, [isCustomInputRun, output?.details, output?.totalCases, testCases]);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-subtle-line bg-terminal-bg">
      {/* Resizer handle — 4px line visually, ~20px hit strip for touch/fat
          fingers (the pseudo-element extends the pointer target only). */}
      <div
        onPointerDown={onResizeStart}
        className="relative h-1 cursor-row-resize border-t border-subtle-line transition-all hover:border-accent-primary hover:bg-accent-primary/10 touch-none before:absolute before:inset-x-0 before:-top-3 before:-bottom-1 before:content-['']"
      />

      {/* Diagnostic tabs */}
      <div className="flex items-center gap-0 border-b border-subtle-line bg-base/50 px-2">
        <button className={getTabClassName(activeDiagTab === "LOGS")} onClick={() => setActiveDiagTab("LOGS")}>
          Output Logs
        </button>
        <button className={getTabClassName(activeDiagTab === "TESTS")} onClick={() => setActiveDiagTab("TESTS")}>
          Test Cases
        </button>
      </div>

      {/* Content — overscroll-contain keeps wheel/trackpad scrolling from
          chaining to the page, and a stable gutter keeps the themed scrollbar
          visible instead of flashing over the cards. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 themed-scroll [scrollbar-gutter:stable]">
        {isExecuting && (
          <div className="flex items-center gap-2 p-3 text-accent-primary text-xs font-mono font-bold tracking-widest border border-accent-primary/20 bg-accent-primary/5 shadow-glow-accent">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            EXECUTING...
          </div>
        )}

        {!isExecuting && activeDiagTab === "LOGS" && outputText && (
          <pre className="text-xs font-mono text-subtle whitespace-pre-wrap">{outputText}</pre>
        )}

        {!isExecuting && activeDiagTab === "TESTS" && (
          <div className="space-y-4">
            {renderedCases.length === 0 ? (
              <p className="text-faint text-xs font-mono">NO_TEST_CASES // SYNTAX_SEEDED_EXERCISE</p>
            ) : (
              <>
                {/* Verdict header — how many cases ran versus how many exist locally */}
                <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-faint">
                  <span>{renderedCases.length} CASE{renderedCases.length !== 1 ? "S" : ""} RENDERED</span>
                  {output && (
                    <span className={isPartialRun ? "text-accent-warning" : undefined}>
                      {/* A single-case run graded 1 of 15; saying "1/1" would read
                          as a solved problem, so the partial run is labelled. */}
                      {isPartialRun
                        ? `CASE ${(output.details?.[0]?.testCaseIndex ?? 0) + 1} ONLY · ${output.passedCases ?? 0}/${output.totalCases ?? 1} PASSED`
                        : `${output.passedCases ?? 0}/${output.totalCases ?? renderedCases.length} PASSED`}
                    </span>
                  )}
                </div>

                {/* Aggregate execution metrics — measured cost of the inputs below */}
                {successfulDetails.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="border border-accent-primary/20 bg-accent-primary/5 p-3">
                      <div className="text-[9px] text-subtle uppercase tracking-widest mb-1">Avg time</div>
                      <div className="text-base font-mono font-bold text-accent-primary">{avgDuration.toFixed(0)}ms</div>
                    </div>
                    <div className="border border-accent-violet/20 bg-accent-violet/5 p-3">
                      <div className="text-[9px] text-subtle uppercase tracking-widest mb-1">Avg space</div>
                      <div className="text-base font-mono font-bold text-accent-violet">{(avgMemoryKb / 1024).toFixed(1)}MB</div>
                    </div>
                    <div className="border border-accent-success/20 bg-accent-success/5 p-3">
                      <div className="text-[9px] text-subtle uppercase tracking-widest mb-1">Fastest</div>
                      <div className="text-base font-mono font-bold text-accent-success">{bestDuration}ms</div>
                    </div>
                    <div className="border border-accent-warning/20 bg-accent-warning/5 p-3">
                      <div className="text-[9px] text-subtle uppercase tracking-widest mb-1">Slowest</div>
                      <div className="text-base font-mono font-bold text-accent-warning">{worstDuration}ms</div>
                    </div>
                  </div>
                )}
                {renderedCases.map(({ item, match, isHidden }, index) => (
                  <TestCaseCard
                    key={index}
                    item={item}
                    index={index}
                    isHidden={isHidden}
                    match={match}
                    isRunningThis={runningTestCaseIndex === index}
                    isExecutingAny={isExecuting}
                    onRunSingleTestCase={onRunSingleTestCase}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
