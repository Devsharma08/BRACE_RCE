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
    d === "HARD"   ? "text-rose-400 border-rose-500/30 bg-rose-950/30"
    : d === "MEDIUM" ? "text-amber-400 border-amber-500/30 bg-amber-950/30"
    : "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";

  return (
    <div className="relative w-full border border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 via-slate-950/70 to-black font-mono shadow-xl shadow-emerald-950/5">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-500" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-500" />

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-black/40">
        <h2 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          Engagement History Ledger
          <span className="text-xs text-emerald-400/80 font-normal tracking-widest">// RECENT BATTLES</span>
        </h2>
        <span className="text-xs text-slate-300 font-bold border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 tracking-widest uppercase shadow-sm">
          {history.length} RECORDS LOGGED
        </span>
      </div>

      {/* TABLE */}
      {history.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2.5 text-slate-300 font-mono text-xs">
          <Activity className="w-8 h-8 opacity-40 text-emerald-400" />
          <span className="tracking-widest uppercase font-bold text-slate-200">No Match Logs Available</span>
          <span className="text-xs text-slate-400">Complete your first 1v1 battle to generate history logs</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {["#", "PROBLEM NAME", "DIFFICULTY", "OUTCOME", "RUNTIME", "MEMORY", "SCORE", "ACTION"].map((h, i) => (
                  <th
                    key={i}
                    className={`py-3.5 px-4 text-xs text-slate-300 font-bold tracking-[0.15em] uppercase text-left whitespace-nowrap ${
                      i === 7 ? "text-right pr-6" : ""
                    }`}
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
                const name = record.event?.commonProblem?.name || record.problem?.name || "CLASSIFIED MATCH";
                const diff = record.event?.commonProblem?.difficulty_level || record.problem?.difficulty_level || "MEDIUM";
                const bestSub = record.submissions?.find((s: any) => s.isBestSubmission) || record.submissions?.[0];

                return (
                  <tr
                    key={record.id}
                    className={`group border-b border-white/5 transition-colors ${
                      isWin
                        ? "bg-emerald-950/10 hover:bg-emerald-950/25 border-l-2 border-l-emerald-400"
                        : isLoss
                        ? "bg-rose-950/10 hover:bg-rose-950/25 border-l-2 border-l-rose-400"
                        : "hover:bg-white/5 border-l-2 border-l-slate-600"
                    }`}
                  >
                    <td className="py-4 px-4 text-[10px] text-slate-400 font-bold">{String(idx + 1).padStart(2, "0")}</td>

                    <td className="py-4 px-4">
                      <span className="font-black text-white text-[11px] tracking-wide block">{name}</span>
                      <span className="block text-[9px] text-slate-500 mt-0.5">{new Date(record.createdAt).toLocaleDateString()}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`text-[9px] border px-2 py-0.5 font-black uppercase ${diffCls(diff)}`}>
                        {diff}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                          isWin
                            ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
                            : isLoss
                            ? "text-rose-400 border-rose-500/30 bg-rose-950/30"
                            : "text-slate-300 border-slate-500/30 bg-slate-900"
                        }`}
                      >
                        {isWin ? <TrendingUp className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : null}
                        {record.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-cyan-300 text-[11px] font-bold">
                      {bestSub?.runtimeMs !== undefined ? `${bestSub.runtimeMs}ms` : <span className="text-slate-600">—</span>}
                    </td>

                    <td className="py-4 px-4 text-cyan-300 text-[11px] font-bold">
                      {bestSub?.memoryKb !== undefined
                        ? bestSub.memoryKb >= 1024
                          ? `${(bestSub.memoryKb / 1024).toFixed(1)}MB`
                          : `${bestSub.memoryKb}KB`
                        : <span className="text-slate-600">—</span>}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-black text-xs ${isWin ? "text-amber-400" : "text-slate-500"}`}>
                        {isWin ? "+" : ""}{record.score || 0}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          const perfs = record.event?.performances?.length > 0
                            ? record.event.performances
                            : [
                                {
                                  userId: currentUserId,
                                  user: { id: currentUserId, username: "YOU", avatarUrl: "" },
                                  submissions: record.submissions || [],
                                  score: record.score || 0,
                                  timeTakenMs: record.timeTakenMs,
                                },
                              ];
                          setSelectedPerformances(perfs);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/20 text-emerald-300 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all shadow-sm"
                      >
                        <Code className="w-3 h-3" /> REVIEW CODE
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
