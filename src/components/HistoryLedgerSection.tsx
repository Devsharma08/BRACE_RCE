import React, { useState } from "react";
import { BookOpen, Code, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { CodeComparisonModal } from "./CodeComparisionModel";

interface HistoryLedgerSectionProps {
  history: any[];
  currentUserId: string;
}

export const HistoryLedgerSection: React.FC<HistoryLedgerSectionProps> = ({ history, currentUserId }) => {
  const [selectedPerformances, setSelectedPerformances] = useState<any[] | null>(null);

  const diffCls = (d: string) =>
    d === "HARD"   ? "text-rose-400 border-rose-500/25"
    : d === "MEDIUM" ? "text-amber-400 border-amber-500/25"
    : "text-emerald-400 border-emerald-500/25";

  return (
    <div className="relative w-full border border-white/5 bg-black/40">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/25" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/25" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/25" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/25" />

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <h2 className="flex items-center gap-2 font-mono text-sm font-black text-white uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          Battle Ledger
          <span className="text-[10px] text-cyan-500/50 font-normal tracking-widest">// CODE REVIEW</span>
        </h2>
        <span className="text-[9px] text-slate-600 tracking-widest uppercase">LAST 5 RECORDS</span>
      </div>

      {/* TABLE */}
      {history.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-slate-600 font-mono text-xs">
          <Activity className="w-7 h-7 opacity-30" />
          <span className="tracking-widest uppercase">No Engagement Records Found</span>
          <span className="text-[10px] text-slate-700">Complete your first battle to populate this ledger</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["#", "PROBLEM", "DIFF", "OUTCOME", "RUNTIME", "MEM", "SCORE", ""].map((h, i) => (
                  <th
                    key={i}
                    className={`py-3 px-4 text-[9px] text-slate-600 font-bold tracking-[0.2em] uppercase text-left whitespace-nowrap ${i === 7 ? "text-right pr-6" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 5).map((record, idx) => {
                const isWin = record.status === "WON" || record.status === "PASSED";
                const isLoss = record.status === "LOST" || record.status === "FAILED" || record.status === "SURRENDER";
                const name = record.event?.commonProblem?.name || record.problem?.name || "CLASSIFIED OP";
                const diff = record.event?.commonProblem?.difficulty_level || record.problem?.difficulty_level || "MEDIUM";
                const bestSub = record.submissions?.find((s: any) => s.isBestSubmission) || record.submissions?.[0];

                return (
                  <tr key={record.id} className="group border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                    <td className="py-4 px-4 text-[10px] text-slate-700">{String(idx + 1).padStart(2, "0")}</td>

                    <td className="py-4 px-4">
                      <span className="font-black text-white text-[11px] tracking-wide">{name}</span>
                      <span className="block text-[9px] text-slate-600 mt-0.5">{new Date(record.createdAt).toLocaleDateString()}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`text-[9px] border px-1.5 py-0.5 font-black uppercase ${diffCls(diff)}`}>
                        {diff}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"}`}>
                        {isWin ? <TrendingUp className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : null}
                        {record.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-cyan-400 text-[11px]">
                      {bestSub?.runtimeMs !== undefined ? `${bestSub.runtimeMs}ms` : <span className="text-slate-700">—</span>}
                    </td>

                    <td className="py-4 px-4 text-cyan-400 text-[11px]">
                      {bestSub?.memoryKb !== undefined
                        ? bestSub.memoryKb >= 1024 ? `${(bestSub.memoryKb / 1024).toFixed(1)}MB` : `${bestSub.memoryKb}KB`
                        : <span className="text-slate-700">—</span>}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-black text-xs ${isWin ? "text-amber-400" : "text-slate-700"}`}>
                        {isWin ? "+" : ""}{record.score || 0}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          const perfs = record.event?.performances?.length > 0
                            ? record.event.performances
                            : [{ userId: currentUserId, user: { id: currentUserId, username: "YOU", avatarUrl: "" }, submissions: record.submissions || [], score: record.score || 0, timeTakenMs: record.timeTakenMs }];
                          setSelectedPerformances(perfs);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-cyan-500/40 text-slate-500 hover:text-cyan-400 text-[10px] font-black tracking-widest uppercase transition-all"
                      >
                        <Code className="w-3 h-3" /> REVIEW
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
