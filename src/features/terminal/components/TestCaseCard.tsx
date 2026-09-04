import {memo} from 'react';
import type { ExecutionDetail, ProblemTestCase } from "../types";
import { Loader2 } from "lucide-react";


interface TestCaseCardProps {
  item: ProblemTestCase;
  index: number;
  match?: ExecutionDetail | null;
  isRunningThis: boolean;
  isExecutingAny: boolean;
  onRunSingleTestCase?: (index: number) => void;
}

export const TestCaseCard = memo(function TestCaseCard({
  item,
  index,
  match,
  isRunningThis,
  isExecutingAny,
  onRunSingleTestCase,
}: TestCaseCardProps) {
  const borderClassName = match
    ? match.passed
      ? "border-emerald-500/20 bg-emerald-950/5"
      : "border-rose-500/20 bg-rose-950/5"
    : "border-white/5 bg-black/20";
  return (
    <div className={`flex flex-col border rounded-none p-4 gap-3 transition-all ${borderClassName}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          // CASE_{index + 1}
        </span>
        <div className="flex items-center gap-2">
          {onRunSingleTestCase && (
            <button
              type="button"
              onClick={() => onRunSingleTestCase(index)}
              disabled={isExecutingAny}
              className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-400 hover:bg-cyan-950/40 text-cyan-300 transition-all duration-150 active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              {isRunningThis && <Loader2 className="w-2.5 h-2.5 animate-spin text-cyan-400" />}
              [ {isRunningThis ? `RUNNING #${index + 1}...` : `RUN TEST #${index + 1} ONLY`} ]
            </button>
          )}
          {match && (
            <span
              className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${match.passed
                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/15"
                  : "text-rose-400 border-rose-500/20 bg-rose-950/15"
                }`}
            >
              {match.passed ? "[ PASSED ]" : "[ FAILED ]"}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
            INPUT_PARAMETERS
          </div>
          <pre className="rounded-none bg-black/40 border border-white/5 p-3 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
            {item.input ?? "-"}
          </pre>
        </div>
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
            EXPECTED_RETURN
          </div>
          <pre className="rounded-none bg-black/40 border border-white/5 p-3 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
            {item.expectedOutput ?? "-"}
          </pre>
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
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">
            EXECUTION_RETURN_RESULTS
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`rounded-none border p-3 ${match.passed ? "border-emerald-500/10 bg-emerald-950/5" : "border-rose-500/10 bg-rose-950/5"
                }`}
            >
              <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                ACTUAL_OUTPUT
              </div>
              <pre
                className={`rounded-none bg-black/40 p-2.5 text-sm whitespace-pre-wrap font-mono ${match.passed ? "text-emerald-400" : "text-rose-400"
                  }`}
              >
                {match.output || (match.runtimeError ? "Compilation/Runtime Error" : "empty")}
              </pre>
            </div>
            {match.runtimeError && (
              <div className="rounded-none border border-rose-500/20 bg-rose-950/5 p-3 flex flex-col justify-center">
                <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-1">
                  SANDBOX_SYSTEM_TRACE
                </div>
                <pre className="rounded-none bg-black/40 p-2.5 text-sm text-rose-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                  {match.runtimeError}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});