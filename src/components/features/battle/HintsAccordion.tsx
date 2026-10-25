import { useMemo, useState } from "react";

export function ProblemHintsAccordion({ hints }: { hints?: any }) {
  const [unlockedCount, setUnlockedCount] = useState<number>(0);

  const parsedHints = useMemo(() => {
    if (Array.isArray(hints) && hints.length > 0) return hints;
    if (typeof hints === "string" && hints.trim().length > 0) return [hints];
    return [
      "Analyze input data constraints and identify potential edge cases (e.g. empty inputs, zero values, or single element arrays).",
      "Consider using an efficient data structure (such as a Hash Map, Two-Pointers, or Sliding Window) to reduce time complexity.",
      "Optimal Strategy: Aim for O(N) time complexity and O(1) auxiliary space where feasible.",
    ];
  }, [hints]);

  return (
    <div className="rounded border border-accent-warning/20 bg-accent-warning/5 p-3 font-mono text-xs mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-accent-warning font-bold flex items-center gap-1">
          ⚡ PROBLEM HINTS & BLUEPRINT ({unlockedCount}/{parsedHints.length})
        </span>
        {unlockedCount < parsedHints.length && (
          <button
            type="button"
            onClick={() =>
              setUnlockedCount((prev) => Math.min(parsedHints.length, prev + 1))
            }
            className="text-[9px] font-bold text-accent-warning border border-accent-warning/30 bg-accent-warning/5 px-2 py-0.5 uppercase tracking-wider hover:bg-accent-warning/10 transition-all cursor-pointer"
          >
            {unlockedCount === 0 ? "REVEAL HINT" : `HINT #${unlockedCount + 1}`}
          </button>
        )}
      </div>

      {unlockedCount === 0 ? (
        <div className="text-[10px] text-faint italic">
          Hints are locked to encourage independent problem-solving. Click above
          to unlock hints step-by-step.
        </div>
      ) : (
        <div className="space-y-1.5 mt-2">
          {parsedHints
            .slice(0, unlockedCount)
            .map((hintText: string, idx: number) => (
              <div
                key={`hint-${idx}`}
                className="border-l-2 border-accent-warning bg-surface-hover p-2 text-[10px] text-accent-warning/90 leading-relaxed"
              >
                <span className="font-bold text-accent-warning block mb-0.5">
                  // HINT #{idx + 1}
                </span>
                {hintText}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
