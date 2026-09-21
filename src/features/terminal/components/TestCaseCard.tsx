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
    ? "border-subtle-line bg-surface/60"
    : passed
      ? "border-accent-success/30 bg-accent-success/10"
      : "border-accent-danger/30 bg-accent-danger/10";

  return (
    <div className={`border ${statusColor} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-subtle">CASE #{index + 1}</span>
          {hasResult && (
            <span className={`text-[9px] font-bold px-2 py-0.5 ${
              passed
                ? "border border-accent-success/30 bg-accent-success/10 text-accent-success shadow-glow-success"
                : "border border-accent-danger/30 bg-accent-danger/10 text-accent-danger shadow-glow-danger"
            }`}>
              {passed ? "[ PASSED ]" : "[ FAILED ]"}
            </span>
          )}
        </div>
        {onRunSingleTestCase && !isExecutingAny && (
          <button
            onClick={() => onRunSingleTestCase(index)}
            className="flex items-center gap-1 border border-accent-primary/40 bg-elevated px-2 py-1 text-[9px] font-mono font-bold tracking-wider text-accent-primary transition-all hover:bg-accent-primary/10"
          >
            <Play className="w-2.5 h-2.5" />
            RUN TEST #{index + 1} ONLY
          </button>
        )}
        {isRunningThis && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-primary" />}
      </div>

      {/* Per-input cost — real measurements from the execution runtime */}
      {match?.metrics && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="border border-accent-primary/20 bg-accent-primary/5 px-2.5 py-2">
            <span className="text-[8px] uppercase tracking-widest text-faint">Time</span>
            <strong className="mt-0.5 block font-mono text-xs font-bold text-accent-primary">
              {match.metrics.durationMs}ms
            </strong>
          </div>
          <div className="border border-accent-violet/20 bg-accent-violet/5 px-2.5 py-2">
            <span className="text-[8px] uppercase tracking-widest text-faint">Space</span>
            <strong className="mt-0.5 block font-mono text-xs font-bold text-accent-violet">
              {(match.metrics.memoryKb / 1024).toFixed(1)}MB
            </strong>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] text-faint uppercase tracking-widest mb-1">Input</div>
          <div className="border border-subtle-line bg-terminal-bg p-2 text-[10px] font-mono text-subtle whitespace-pre-wrap">
            {item.input || "-"}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-faint uppercase tracking-widest mb-1">Expected</div>
          <div className="border border-subtle-line bg-terminal-bg p-2 text-[10px] font-mono text-subtle whitespace-pre-wrap">
            {item.expectedOutput || "-"}
          </div>
        </div>
      </div>

      {hasResult && match?.output !== undefined && (
        <div className="mt-3">
          <div className="text-[9px] text-faint uppercase tracking-widest mb-1">Actual</div>
          <div className={`border p-2 text-[10px] font-mono whitespace-pre-wrap ${
            passed ? "border-accent-success/15 text-accent-success" : "border-accent-danger/15 text-accent-danger"
          }`}>
            {match?.output || "empty"}
          </div>
        </div>
      )}
    </div>
  );
};
