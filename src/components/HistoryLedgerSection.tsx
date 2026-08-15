import React, { useState } from "react";
import { BookOpen, Code, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { CodeComparisonModal } from "./CodeComparisionModel";

interface HistoryLedgerSectionProps {
  history: any[];
  currentUserId: string;
}

export const HistoryLedgerSection: React.FC<HistoryLedgerSectionProps> = ({
  history,
  currentUserId,
}) => {
  const [selectedPerformances, setSelectedPerformances] = useState<any[] | null>(null);

  const diffStyle = (d: string) =>
    d === "HARD" ? "text-rose-400 bg-rose-500/10 border-rose-500/25"
    : d === "MEDIUM" ? "text-amber-400 bg-amber-500/10 border-amber-500/25"
    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";

  return (
    <div className="relative w-full bg-[#080a0d] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/30">
        <h2 className="font-mono text-sm font-black text-white tracking-[0.15em] flex items-center gap-2.5 uppercase">
          <BookOpen className="w-4 h-4 text-cyan-400" /> Battle Ledger
          <span className="text-[10px] text-cyan-500/60 font-normal ml-1">// CODE REVIEW LOG</span>
        </h2>
        <span className="text-[9px] text-slate-600 font-mono tracking-widest">LAST 5 ENGAGEMENTS</span>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        {history.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-2">
            <Activity className="w-8 h-8 opacity-30" />
            <span className="tracking-widest">NO ENGAGEMENT RECORDS FOUND</span>
            <span className="text-[10px] text-slate-700">Complete your first battle to populate this ledger</span>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/[0.04] bg-black/20">
                {["#", "PROBLEM", "DIFFICULTY", "OUTCOME", "RUNTIME", "MEMORY", "SCORE", "REVIEW"].map((h, i) => (
                  <th key={h} className={`py-3 px-4 text-[9px] text-slate-600 font-bold tracking-[0.2em] uppercase whitespace-nowrap ${i >= 6 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 5).map((record, idx) => {
                const isWin = record.status === "WON" || record.status === "PASSED";
                const isLoss = record.status === "LOST" || record.status === "FAILED" || record.status === "SURRENDER";
                const problemName = record.event?.commonProblem?.name || record.problem?.name || "CLASSIFIED OP";
                const diff = record.event?.commonProblem?.difficulty_level || record.problem?.difficulty_level || "MEDIUM";
                const bestSub = record.submissions?.find((s: any) => s.isBestSubmission) || record.submissions?.[0];

                return (
                  <tr
                    key={record.id}
                    className="group border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                  >
                    {/* INDEX */}
                    <td className="py-4 px-4 text-slate-700 text-[10px]">{String(idx + 1).padStart(2, "0")}</td>

                    {/* PROBLEM NAME */}
                    <td className="py-4 px-4">
                      <span className="font-black text-white tracking-wide text-[11px] truncate max-w-[180px] block">
                        {problemName}
                      </span>
                      <span className="text-[9px] text-slate-600">{new Date(record.createdAt).toLocaleDateString()}</span>
                    </td>

                    {/* DIFFICULTY */}
                    <td className="py-4 px-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black ${diffStyle(diff)}`}>
                        {diff}
                      </span>
                    </td>

                    {/* OUTCOME */}
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-1 font-black text-[10px] tracking-widest ${isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"}`}>
                        {isWin ? <TrendingUp className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : null}
                        {record.status}
                      </span>
                    </td>

                    {/* RUNTIME */}
                    <td className="py-4 px-4 text-cyan-400 text-[11px]">
                      {bestSub?.runtimeMs !== undefined ? `${bestSub.runtimeMs}ms` : <span className="text-slate-700">—</span>}
                    </td>

                    {/* MEMORY */}
                    <td className="py-4 px-4 text-cyan-400 text-[11px]">
                      {bestSub?.memoryKb !== undefined
                        ? bestSub.memoryKb >= 1024
                          ? `${(bestSub.memoryKb / 1024).toFixed(1)}MB`
                          : `${bestSub.memoryKb}KB`
                        : <span className="text-slate-700">—</span>}
                    </td>

                    {/* SCORE */}
                    <td className="py-4 px-4 text-right">
                      <span className={`font-black text-xs ${isWin ? "text-amber-400" : "text-slate-600"}`}>
                        {isWin ? "+" : ""}{record.score || 0}
                      </span>
                    </td>

                    {/* REVIEW BUTTON */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => {
                          const perfsToPass =
                            record.event?.performances?.length > 0
                              ? record.event.performances
                              : [{
                                  userId: currentUserId,
                                  user: { id: currentUserId, username: "YOU", avatarUrl: "" },
                                  submissions: record.submissions || [],
                                  score: record.score || 0,
                                  timeTakenMs: record.timeTakenMs,
                                }];
                          setSelectedPerformances(perfsToPass);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/8 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-400 text-cyan-400 hover:text-cyan-200 rounded-lg font-mono text-[10px] font-black tracking-widest transition-all"
                      >
                        <Code className="w-3 h-3" /> REVIEW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedPerformances && (
        <CodeComparisonModal
          currentUserId={currentUserId}
          performances={selectedPerformances}
          onClose={() => setSelectedPerformances(null)}
          onReturnHome={() => setSelectedPerformances(null)}
        />
      )}
    </div>
  );
};
