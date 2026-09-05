import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import type { ExecutionDetail, ExecutionResult, ProblemTestCase } from "../types";
import type { MouseEvent } from "react";
import { Maximize2 } from 'lucide-react';
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
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
  setOutputHeight: (height: number) => void;
  setCustomInput: (value: string) => void;
  setCustomInputActive: (active: boolean) => void;
  setIsOutputActive: (active: boolean) => void;
  onRunSingleTestCase?: (index: number) => void;
};

const getTabClassName = (isActive: boolean) =>
  `cursor-pointer rounded-none border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer ${isActive
    ? "text-cyan-400 border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_10px_rgba(6,182,212,0.05)]"
    : "text-slate-500 border-white/5 bg-transparent hover:border-white/10 hover:text-slate-300"
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
  // ── Derived state ──────────────────────────────────────────────────────────

  // For a single-test / custom run: look at first detail only
  const singleDetail: ExecutionDetail | undefined = isCustomInputRun
    ? output?.details?.[0]
    : undefined;

  // For full submit run: aggregate metrics
  const successfulDetails = (!isCustomInputRun ? output?.details : [])?.filter(d => d.metrics) || [];
  const totalDuration = successfulDetails.reduce((sum, d) => sum + (d.metrics?.durationMs || 0), 0);
  const avgDuration = successfulDetails.length > 0 ? totalDuration / successfulDetails.length : 0;
  const maxMemory = successfulDetails.reduce((max, d) => Math.max(max, d.metrics?.memoryKb || 0), 0);

  const totalCases = output?.totalCases ?? 0;
  const allPassed = output?.status === "PASSED" || (output?.passedCases === totalCases && totalCases > 0);

  // Determine output status — exclusive categories
  type OutputStatus = "LOADING" | "TIMEOUT" | "RUNTIME_ERROR" | "ACCEPTED" | "WRONG_ANSWER" | "COMPLETED" | "CUSTOM_ERROR" | "CUSTOM_OK" | "IDLE";

  const outputStatus: OutputStatus = isExecuting
    ? "LOADING"
    : output
      ? isCustomInputRun
        ? singleDetail?.runtimeError
          ? singleDetail.runtimeError.toLowerCase().includes("timeout")
            ? "TIMEOUT"
            : "RUNTIME_ERROR"
          : "COMPLETED"  // custom input always shows as COMPLETED (not pass/fail)
        : output.details?.some(d => d.runtimeError)
          ? output.details?.some(d => d.runtimeError?.toLowerCase().includes("timeout"))
            ? "TIMEOUT"
            : "RUNTIME_ERROR"
          : output.status === "COMPLETED"
            ? "COMPLETED"
            : allPassed
              ? "ACCEPTED"
              : "WRONG_ANSWER"
      : "IDLE";

  // Determine if we should show error vs output in Console Output tab
  const hasRuntimeError = isCustomInputRun
    ? Boolean(singleDetail?.runtimeError)
    : output?.details?.some(d => d.runtimeError) ?? false;

  const handleMaximizeOutput = () => {
    const reservedHeight = 150;
    if (outputHeight === window.innerHeight - reservedHeight) {
      setOutputHeight(200);
      return;
    }
    const maximizedHeight = Math.max(150, window.innerHeight - reservedHeight);
    setOutputHeight(maximizedHeight);
  };

  return (
    <>
      {/* Resizer Handle */}
      <div
        onMouseDown={onResizeStart}
        className="w-full h-1 cursor-row-resize border-t border-cyan-500/40 bg-cyan-400/20 transition-all hover:bg-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.6)] active:bg-cyan-400 z-10"
      />

      <div
        style={{
          height: `${outputHeight}px`,
          maxHeight: outputHeight > 600 ? "none" : "min(70vh, 600px)",
        }}
        className="flex-none overflow-y-auto border-t border-white/5 bg-[#08090a] p-4 font-mono [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900/40 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 sm:p-5"
      >
        {/* Navigation Tabs */}
        <div className="mb-4 flex flex-col gap-3 border-b border-white/5 pb-3 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsOutputActive(true)} className={getTabClassName(isOutputActive)}>
              Console Output
            </button>
            <button onClick={() => setIsOutputActive(false)} className={getTabClassName(!isOutputActive)}>
              Test Suite Cases
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="hover:bg-white/5 border border-white/5 p-1.5 rounded-none text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Maximize output panel"
              onClick={handleMaximizeOutput}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Main Content ────────────────────────────────────────── */}
        {isExecuting ? (
          <div className="flex items-center gap-3 rounded-none border border-cyan-500/20 bg-cyan-950/5 p-4 text-cyan-400 text-xs font-mono tracking-wider">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>SYS // EXECUTING_SOLUTION_IN_SANDBOX...</span>
          </div>
        ) : isOutputActive ? (
          /* ── CONSOLE OUTPUT TAB ──────────────────────────── */
          <div className="space-y-4">

            {/* Status Banner — only show when there is output */}
            {outputStatus !== "IDLE" && (
              <div
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-none border p-4 shadow-none border-dashed font-mono text-xs tracking-wider ${
                  outputStatus === "ACCEPTED" || outputStatus === "COMPLETED"
                    ? "border-emerald-500/30 bg-emerald-950/5 text-emerald-400"
                    : outputStatus === "WRONG_ANSWER"
                      ? "border-rose-500/30 bg-rose-950/5 text-rose-400"
                      : outputStatus === "TIMEOUT"
                        ? "border-amber-500/30 bg-amber-950/5 text-amber-400"
                        : "border-rose-500/30 bg-rose-950/5 text-rose-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {outputStatus === "ACCEPTED" || outputStatus === "COMPLETED" ? (
                    <div className="bg-emerald-950/15 border border-emerald-500/30 px-2.5 py-1 text-emerald-400 font-bold">
                      {outputStatus === "COMPLETED" ? "[ DONE ]" : "[ OK ]"}
                    </div>
                  ) : outputStatus === "TIMEOUT" ? (
                    <div className="bg-amber-950/15 border border-amber-500/30 px-2.5 py-1 text-amber-400 font-bold">
                      [ TLE ]
                    </div>
                  ) : (
                    <div className="bg-rose-950/15 border border-rose-500/30 px-2.5 py-1 text-rose-400 font-bold">
                      [ ERR ]
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold tracking-wider uppercase">
                      SYS // STATUS_{outputStatus}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase">
                      {isCustomInputRun
                        ? "Custom / single test case execution complete."
                        : `Passed ${output?.passedCases || 0} of ${output?.totalCases || 0} test cases.`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aggregate Telemetry — only for full submit runs */}
            {!isCustomInputRun && (avgDuration > 0 || maxMemory > 0) && (
              <div className="grid grid-cols-2 gap-4 border border-white/10 bg-black/60 p-4 font-mono text-[10px] relative shadow-[0_0_15px_rgba(6,182,212,0.03)] border-l-2 border-l-cyan-500/20">
                <div className="absolute top-0 right-0 p-2 text-[8px] text-cyan-500/30 select-none uppercase tracking-widest font-bold">
                  AGGREGATE // SYSTEM_PROFILER
                </div>

                <div className="flex flex-col gap-1.5 border-r border-white/5 pr-4">
                  <span className="text-slate-500 uppercase tracking-widest text-[8.5px] font-bold">// AVG_EXECUTION_TIME</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-cyan-400 font-bold text-base md:text-lg tracking-tight">
                      {avgDuration >= 1
                        ? avgDuration.toFixed(3)
                        : (avgDuration * 1000).toFixed(0)}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">
                      {avgDuration >= 1 ? "ms" : "μs"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pl-4">
                  <span className="text-slate-500 uppercase tracking-widest text-[8.5px] font-bold">// PEAK_HEAP_MEMORY</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-emerald-400 font-bold text-base md:text-lg tracking-tight">
                      {maxMemory >= 1024
                        ? (maxMemory / 1024).toFixed(2)
                        : maxMemory.toFixed(1)}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">
                      {maxMemory >= 1024 ? "MB" : "KB"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Console Output — error XOR output, never both */}
            {hasRuntimeError ? (
              /* Runtime Error Display */
              <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-4">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-2 border-b border-rose-500/10 pb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  SANDBOX_SYSTEM_TRACE // RUNTIME_ERROR
                </div>
                <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm text-rose-300 leading-relaxed font-mono">
                  {outputText || "// Runtime error occurred."}
                </pre>
              </div>
            ) : (
              /* Normal Output Display */
              <div className="rounded-none border border-white/5 bg-black/30 p-4">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 border-b border-white/5 pb-1">
                  &gt; CONSOLE_OUTPUT // SYSTEM_LOG
                </div>
                <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm text-slate-300 leading-relaxed font-mono">
                  {outputText || "// System idle. Console logs will generate upon run."}
                </pre>
              </div>
            )}

            {/* Side-by-Side Diff — only for full SUBMIT wrong answers, never for custom input */}
            {!isCustomInputRun && outputStatus === "WRONG_ANSWER" && output?.details && (() => {
              const failedCase = output.details.find((d) => !d.passed);
              if (!failedCase) return null;
              return (
                <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-4">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    MISMATCHED_OUTPUT // DIAGNOSTICS [ CASE {output.details.findIndex(d => !d.passed) + 1} ]
                  </div>
                  <div className="space-y-3">
                    {failedCase.problemId && (
                      <div className="rounded-none bg-black/40 border border-white/5 p-3 text-[10px]">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider mr-2">INPUT_PARAMS:</span>
                        <span className="text-slate-300 whitespace-pre-wrap font-mono">
                          {failedCase.expectedOutput ? testCases[failedCase.testCaseIndex]?.input : "-"}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-3.5">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          ACTUAL_OUTPUT
                        </div>
                        <pre className="rounded-none bg-black/60 border border-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap break-words leading-relaxed font-mono">
                          {failedCase.output || "empty"}
                        </pre>
                      </div>
                      <div className="rounded-none border border-emerald-500/20 bg-emerald-950/5 p-3.5">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          TARGET_OUTPUT
                        </div>
                        <pre className="rounded-none bg-black/60 border border-emerald-500/10 p-3 text-sm text-emerald-200 whitespace-pre-wrap break-words leading-relaxed font-mono">
                          {failedCase.expectedOutput || "empty"}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* ── TEST SUITE CASES TAB ─────────────────────────── */
          <div className="space-y-4">
            {isCustomInputRun ? (
              <div className="rounded-none border border-yellow-500/20 bg-yellow-950/5 p-4 text-yellow-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span>Custom / single test case execution is active — suite comparison results may be partial.</span>
              </div>
            ) : null}

            {testCases.length === 0 ? (
              <p className="text-slate-600 text-xs font-mono">NO_TEST_CASES // SYNTAX_SEEDED_EXERCISE</p>
            ) : (
              testCases.map((item, index) => (
                <TestCaseCard
                  key={`${item.input}-${index}`}
                  item={item}
                  index={index}
                  match={output?.details?.find((detail) => detail.testCaseIndex === index)}
                  isRunningThis={runningTestCaseIndex === index}
                  isExecutingAny={isExecuting}
                  onRunSingleTestCase={onRunSingleTestCase}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default OutputPanel;
