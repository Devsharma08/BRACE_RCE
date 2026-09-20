import React, { useState } from "react";
import { BookOpen, Code, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { CodeComparisonModal } from "./CodeComparisonModal";

interface HistoryLedgerSectionProps {
  history: any[];
  currentUserId: string;
}

export const HistoryLedgerSection: React.FC<HistoryLedgerSectionProps> = ({ history, currentUserId }) => {
  const [selectedPerformances, setSelectedPerformances] = useState<any[] | null>(null);

  const diffCls = (d: string) =>
    d === "HARD"   ? "text-accent-danger border-accent-danger/30 bg-accent-danger/10"
    : d === "MEDIUM" ? "text-accent-warning border-accent-warning/30 bg-accent-warning/10"
    : "text-accent-success border-accent-success/30 bg-accent-success/10";

  return (
    <div className="relative w-full border border-accent-primary/15 bg-raised font-mono shadow-[0_0_30px_rgba(6,182,212,0.06)]">

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-accent-primary/10 bg-void">
        <h2 className="flex items-center gap-2 text-sm font-black text-fg uppercase tracking-wider">
          <BookOpen className="w-4 h-4 text-accent-primary" />
          Engagement History Ledger
          <span className="text-xs text-accent-primary/70 font-normal tracking-widest">// RECENT BATTLES</span>
        </h2>
        <span className="text-xs text-accent-primary font-bold border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 tracking-widest uppercase shadow-sm">
          {history.length} RECORDS LOGGED
        </span>
      </div>

      {/* TABLE */}
      {history.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2.5 text-subtle font-mono text-xs">
          <Activity className="w-8 h-8 opacity-40 text-accent-success" />
          <span className="tracking-widest uppercase font-bold text-fg">No Match Logs Available</span>
          <span className="text-xs text-subtle">Complete your first 1v1 battle to generate history logs</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-accent-primary/10 bg-void">
                {["#", "PROBLEM NAME", "DIFFICULTY", "OUTCOME", "RUNTIME", "MEMORY", "SCORE", "ACTION"].map((h, i) => (
                  <th
                    key={i}
                    className={`py-3.5 px-4 text-[10px] font-mono text-accent-primary/40 tracking-[0.2em] uppercase text-left whitespace-nowrap ${
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
                    className={`group border-b border-subtle-line transition-colors ${
                      isWin
                        ? "bg-accent-success/5 hover:bg-accent-success/10 border-l-2 border-l-accent-success"
                        : isLoss
                        ? "bg-accent-danger/5 hover:bg-accent-danger/10 border-l-2 border-l-accent-danger"
                        : "hover:bg-surface-hover border-l-2 border-l-faint"
                    }`}
                  >
                    <td className="py-4 px-4 text-[10px] text-subtle font-bold">{String(idx + 1).padStart(2, "0")}</td>

                    <td className="py-4 px-4">
                      <span className="font-black text-fg text-[11px] tracking-wide block">{name}</span>
                      <span className="block text-[9px] text-faint mt-0.5">{new Date(record.createdAt).toLocaleDateString()}</span>
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
                            ? "text-accent-success border-accent-success/30 bg-accent-success/10"
                            : isLoss
                            ? "text-accent-danger border-accent-danger/30 bg-accent-danger/10"
                            : "text-subtle border-subtle-line bg-base"
                        }`}
                      >
                        {isWin ? <TrendingUp className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : null}
                        {record.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-accent-primary text-[11px] font-bold">
                      {bestSub?.runtimeMs !== undefined ? `${bestSub.runtimeMs}ms` : <span className="text-faint">—</span>}
                    </td>

                    <td className="py-4 px-4 text-accent-primary text-[11px] font-bold">
                      {bestSub?.memoryKb !== undefined
                        ? bestSub.memoryKb >= 1024
                          ? `${(bestSub.memoryKb / 1024).toFixed(1)}MB`
                          : `${bestSub.memoryKb}KB`
                        : <span className="text-faint">—</span>}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-black text-xs ${isWin ? "text-accent-warning" : "text-faint"}`}>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-accent-primary/30 hover:border-accent-primary bg-accent-primary/5 text-accent-primary hover:text-fg text-[10px] font-black tracking-widest uppercase transition-all shadow-sm"
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
