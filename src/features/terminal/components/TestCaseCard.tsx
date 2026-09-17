import { Check, X, Loader2, Play } from "lucide-react";
import type { ExecutionDetail, ProblemTestCase } from "../types";

type TestCaseCardProps = {
  item: ProblemTestCase;
  index: number;
  match?: ExecutionDetail;
  isRunningThis: boolean;
  isExecutingAny: boolean;
  onRunSingleTestCase?: (index: number) => void;
};

export const TestCaseCard = ({
  item,
  index,
  match,
  isRunningThis,
  isExecutingAny,
  onRunSingleTestCase,
}: TestCaseCardProps) => {
  const passed = match?.passed;
  const hasResult = match !== undefined;

  const statusColor = !hasResult
    ? "border-cyan-500/10 bg-raised/60"
    : passed
      ? "border-emerald-500/30 bg-emerald-950/10"
      : "border-rose-500/30 bg-rose-950/10";

  return (
    <div className={`border ${statusColor} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400">CASE #{index + 1}</span>
          {hasResult && (
            <span className={`text-[9px] font-bold px-2 py-0.5 ${
              passed
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_8px_rgba(0,255,102,0.2)]"
                : "text-rose-400 bg-rose-500/10 border border-rose-500/30 shadow-[0_0_8px_rgba(255,0,85,0.2)]"
            }`}>
              {passed ? "[ PASSED ]" : "[ FAILED ]"}
            </span>
          )}
        </div>
        {onRunSingleTestCase && !isExecutingAny && (
          <button
            onClick={() => onRunSingleTestCase(index)}
            className="flex items-center gap-1 text-[9px] font-mono font-bold border-cyan-500/40 bg-slate-800/60 text-cyan-400 hover:bg-cyan-500/20 px-2 py-1 transition-all tracking-wider"
          >
            <Play className="w-2.5 h-2.5" />
            RUN TEST #{index + 1} ONLY
          </button>
        )}
        {isRunningThis && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Input</div>
          <div className="border border-cyan-500/15 bg-[#070b16] p-2 text-[10px] font-mono text-slate-300 whitespace-pre-wrap">
            {item.input || "-"}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Expected</div>
          <div className="border border-cyan-500/15 bg-[#070b16] p-2 text-[10px] font-mono text-slate-300 whitespace-pre-wrap">
            {item.expectedOutput || "-"}
          </div>
        </div>
      </div>

      {hasResult && match?.output !== undefined && (
        <div className="mt-3">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Actual</div>
          <div className={`border p-2 text-[10px] font-mono whitespace-pre-wrap ${
            passed ? "border-emerald-500/15 text-emerald-300" : "border-rose-500/15 text-rose-300"
          }`}>
            {match?.output || "empty"}
          </div>
        </div>
      )}
    </div>
  );
};
