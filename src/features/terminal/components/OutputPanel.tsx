import { Loader2, Check, X, AlertTriangle, Info } from "lucide-react";
import type { ExecutionResult, ProblemTestCase } from "../types";
import type { MouseEvent } from "react";
import { Maximize2 } from 'lucide-react';

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
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
  setOutputHeight: (height: number) => void;
  setCustomInput: (value: string) => void;
  setCustomInputActive: (active: boolean) => void;
  setIsOutputActive: (active: boolean) => void;
};

const getTabClassName = (isActive: boolean) =>
  `cursor-pointer rounded-none border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer ${
    isActive
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
  onResizeStart,
  setOutputHeight,
  setCustomInput,
  setCustomInputActive,
  setIsOutputActive,
}: OutputPanelProps) => {
  const getResultForCase = (index: number) => {
    if (isCustomInputRun) {
      return null;
    }
    return output?.details?.find((detail) => detail.testCaseIndex === index);
  };

  const hasError = output?.details?.some((detail) => detail.runtimeError);
  const totalCases = output?.totalCases ?? 0;
  const allPassed = output?.status === "PASSED" || (output?.passedCases === totalCases && totalCases > 0);

  // Compute aggregate metrics
  const successfulDetails = output?.details?.filter(d => d.metrics) || [];
  const totalDuration = successfulDetails.reduce((sum, d) => sum + (d.metrics?.durationMs || 0), 0);
  const avgDuration = successfulDetails.length > 0 ? totalDuration / successfulDetails.length : 0;
  const maxMemory = successfulDetails.reduce((max, d) => Math.max(max, d.metrics?.memoryKb || 0), 0);

  const handleMaximizeOutput = () => {
    const reservedHeight = 150;
    if (outputHeight === window.innerHeight - reservedHeight) {
      setOutputHeight(200);
      return;
    }
    const maximizedHeight = Math.max(150, window.innerHeight - reservedHeight);
    setOutputHeight(maximizedHeight);
  };

  const outputStatus: "LOADING" | "TIMEOUT" | "RUNTIME_ERROR" | "ACCEPTED" | "WRONG_ANSWER" | "COMPLETED" | "IDLE" = isExecuting
    ? "LOADING"
    : output
    ? hasError
      ? output.details?.some((d) => d.runtimeError?.toLowerCase().includes("timeout"))
        ? "TIMEOUT"
        : "RUNTIME_ERROR"
      : output.status === "COMPLETED"
      ? "COMPLETED"
      : allPassed
      ? "ACCEPTED"
      : "WRONG_ANSWER"
    : "IDLE";

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
            {!isOutputActive && (
              <button className="hover:bg-white/5 border border-white/5 p-1.5 rounded-none text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" title="Maximize output panel" onClick={handleMaximizeOutput}>
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            {isOutputActive ? (
              <div className="flex items-center gap-2">
                <button className="hover:bg-white/5 border border-white/5 p-1.5 rounded-none text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" title="Maximize output panel" onClick={handleMaximizeOutput}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <label className={`flex w-fit cursor-pointer items-center gap-2 rounded-none border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-150 ${
                  customInputActive 
                    ? "border-cyan-500/30 bg-cyan-950/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.05)]" 
                    : "border-white/5 bg-transparent text-slate-500 hover:text-slate-300 hover:border-white/10"
                }`}>
                  <span>[ CUSTOM_INPUT: {customInputActive ? "ON" : "OFF"} ]</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    title="Toggle custom stdin input"
                    checked={customInputActive}
                    onChange={() => setCustomInputActive(!customInputActive)}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>

        {/* Custom Input Textarea */}
        {isOutputActive && customInputActive ? (
          <div className="mb-4 flex flex-col gap-2">
            <textarea
              value={customInput}
              title="Enter custom stdin"
              onChange={(e) => setCustomInput(e.target.value)}
              className="h-28 rounded-none border border-white/10 bg-black/40 p-3 text-xs font-mono text-cyan-400 placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none transition-all [&&::-webkit-scrollbar]:w-1.5 [&&::-webkit-scrollbar-thumb]:bg-slate-700"
              placeholder={`Enter custom stdin parameters. Example:
5
1 2 3 4 5
3`}
              rows={4}
            />
          </div>
        ) : null}

        {/* Execution Output Panel */}
        {isExecuting ? (
          <div className="flex items-center gap-3 rounded-none border border-cyan-500/20 bg-cyan-950/5 p-4 text-cyan-400 text-xs font-mono tracking-wider">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>SYS // EXECUTING_SOLUTION_IN_SANDBOX...</span>
          </div>
        ) : isOutputActive ? (
          <div className="space-y-4">
            {/* Elegant Top Status Banner */}
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
                      {isCustomInputRun || outputStatus === "COMPLETED"
                        ? "Free-form execution complete."
                        : `Passed ${output?.passedCases || 0} of ${output?.totalCases || 0} test cases.`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aggregate Telemetry Benchmarks */}
            {(avgDuration > 0 || maxMemory > 0) && (
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

            {/* Main Raw Console Output */}
            <div className="rounded-none border border-white/5 bg-black/30 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 border-b border-white/5 pb-1">
                &gt; CONSOLE_OUTPUT // SYSTEM_LOG
              </div>
              <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-300 leading-relaxed font-mono">
                {outputText || "// System idle. Console logs will generate upon run."}
              </pre>
            </div>

            {/* Side-by-Side Diff Viewer for First Failed Case */}
            {outputStatus === "WRONG_ANSWER" && output?.details && (
              <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-4">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  MISMATCHED_OUTPUT // DIAGNOSTICS [ CASE {output.details.findIndex(d => !d.passed) + 1} ]
                </div>

                {/* Custom Verification Warning Banner */}
                <div className="rounded-none border border-cyan-500/20 bg-cyan-950/5 p-3 flex items-start gap-2.5 font-mono text-[11px] text-cyan-400 leading-normal border-l-2 border-l-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.02)]">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block mb-0.5">INFO // VERIFICATION_ASSISTANCE</span>
                    If your solution output does not match due to strict spacing, array order, or expected format mismatches, you can verify your algorithm's logic directly using the <span className="text-white font-bold select-none cursor-pointer uppercase underline hover:text-cyan-300 transition-colors" onClick={() => setCustomInputActive(true)}>[ CUSTOM INPUT ]</span> playground above.
                  </div>
                </div>

                {/* Grid Comparison */}
                {(() => {
                  const failedCase = output.details.find((d) => !d.passed);
                  if (!failedCase) return null;

                  return (
                    <div className="space-y-3">
                      {failedCase.problemId && (
                        <div className="rounded-none bg-black/40 border border-white/5 p-3 text-[10px]">
                          <span className="text-slate-500 font-semibold uppercase tracking-wider mr-2">INPUT_PARAMS:</span>
                          <span className="text-slate-300 whitespace-pre-wrap font-mono">{failedCase.expectedOutput ? testCases[failedCase.testCaseIndex]?.input : "-"}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Actual Output */}
                        <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-3.5">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5 text-rose-400" />
                            ACTUAL_OUTPUT
                          </div>
                          <pre className="rounded-none bg-black/60 border border-rose-500/10 p-3 text-xs text-rose-200 whitespace-pre-wrap break-words leading-relaxed font-mono">
                            {failedCase.output || "empty"}
                          </pre>
                        </div>

                        {/* Expected Output */}
                        <div className="rounded-none border border-emerald-500/20 bg-emerald-950/5 p-3.5">
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            TARGET_OUTPUT
                          </div>
                          <pre className="rounded-none bg-black/60 border border-emerald-500/10 p-3 text-xs text-emerald-200 whitespace-pre-wrap break-words leading-relaxed font-mono">
                            {failedCase.expectedOutput || "empty"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          /* Test Suite Cases Tab */
          <div className="space-y-4">
            {isCustomInputRun ? (
              <div className="rounded-none border border-yellow-500/20 bg-yellow-950/5 p-4 text-yellow-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span>Custom input execution is active. Test case suite comparisons are hidden.</span>
              </div>
            ) : null}
            
            {testCases.length === 0 ? (
              <p className="text-slate-600 text-xs font-mono">NO_TEST_CASES // SYNTAX_SEEDED_EXERCISE</p>
            ) : (
              testCases.map((item, index) => {
                const match = getResultForCase(index);
                const borderClassName = match
                  ? match.passed
                    ? "border-emerald-500/20 bg-emerald-950/5"
                    : "border-rose-500/20 bg-rose-950/5"
                  : "border-white/5 bg-black/20";

                return (
                  <div key={`${item.input}-${index}`} className={`flex flex-col border rounded-none p-4 gap-3 transition-all ${borderClassName}`}>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        // CASE_{index + 1}
                      </span>
                      {match && (
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                          match.passed
                            ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/15"
                            : "text-rose-400 border-rose-500/20 bg-rose-950/15"
                        }`}>
                          {match.passed ? "[ PASSED ]" : "[ FAILED ]"}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">INPUT_PARAMETERS</div>
                        <pre className="rounded-none bg-black/40 border border-white/5 p-3 text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{item.input ?? "-"}</pre>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">EXPECTED_RETURN</div>
                        <pre className="rounded-none bg-black/40 border border-white/5 p-3 text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{item.expectedOutput ?? "-"}</pre>
                      </div>
                    </div>

                    {match && (
                      <div className="border-t border-white/5 pt-3">
                        {match.metrics && (
                          <div className="grid grid-cols-2 gap-4 border border-white/5 bg-black/60 p-3 font-mono text-[9px] relative mb-3">
                            <div className="absolute top-0 right-0 p-1 text-[7px] text-cyan-500/20 select-none uppercase tracking-widest font-bold">
                              CASE_METRICS // PROFILER
                            </div>
                            
                            <div className="flex flex-col gap-1 border-r border-white/5 pr-3">
                              <span className="text-slate-600 uppercase tracking-widest text-[8px]">EXECUTION_TIME</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-cyan-400 font-bold text-xs tracking-tight">
                                  {match.metrics.durationMs >= 1 
                                    ? match.metrics.durationMs.toFixed(3) 
                                    : (match.metrics.durationMs * 1000).toFixed(0)}
                                </span>
                                <span className="text-[8px] text-slate-500 uppercase">
                                  {match.metrics.durationMs >= 1 ? "ms" : "μs"}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 pl-2">
                              <span className="text-slate-600 uppercase tracking-widest text-[8px]">HEAP_MEMORY</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-emerald-400 font-bold text-xs tracking-tight">
                                  {match.metrics.memoryKb >= 1024 
                                    ? (match.metrics.memoryKb / 1024).toFixed(2) 
                                    : match.metrics.memoryKb.toFixed(1)}
                                </span>
                                <span className="text-[8px] text-slate-500 uppercase">
                                  {match.metrics.memoryKb >= 1024 ? "MB" : "KB"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">EXECUTION_RETURN_RESULTS</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Actual return value */}
                          <div className={`rounded-none border p-3 ${
                            match.passed ? "border-emerald-500/10 bg-emerald-950/5" : "border-rose-500/10 bg-rose-950/5"
                          }`}>
                            <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">ACTUAL_OUTPUT</div>
                            <pre className={`rounded-none bg-black/40 p-2.5 text-[11px] whitespace-pre-wrap font-mono ${
                              match.passed ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {match.output || (match.runtimeError ? "Compilation/Runtime Error" : "empty")}
                            </pre>
                          </div>

                          {/* Error block if any */}
                          {match.runtimeError && (
                            <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-3 flex flex-col justify-center">
                              <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-1">SANDBOX_SYSTEM_TRACE</div>
                              <pre className="rounded-none bg-black/40 p-2.5 text-[11px] text-rose-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                                {match.runtimeError}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default OutputPanel;
