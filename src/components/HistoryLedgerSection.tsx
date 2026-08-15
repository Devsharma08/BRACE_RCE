import React, { useState } from "react";
import { Shield, Code, Activity, Trophy } from "lucide-react";
import { CodeComparisonModal } from "../../../components/CodeComparisionModel";

interface HistoryLedgerSectionProps {
  history: any[];
  currentUserId: string;
}

export const HistoryLedgerSection: React.FC<HistoryLedgerSectionProps> = ({
  history,
  currentUserId
}) => {
  const [selectedPerformances, setSelectedPerformances] = useState<any[] | null>(null);

  return (
    <div className="w-full bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-cyan-500/20 bg-cyan-950/10 flex items-center justify-between">
        <h2 className="text-base font-mono font-bold text-white tracking-widest flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-cyan-400" /> BATTLE LEDGER & CODE REVIEWS
        </h2>
        <span className="text-xs font-mono text-cyan-500/60 tracking-widest">RECENT COMBAT RECORDS</span>
      </div>

      <div className="p-6 space-y-3 max-h-[420px] overflow-y-auto scrollbar-hide">
        {history.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 opacity-60 font-mono text-xs">
            <Activity className="w-8 h-8 mb-2" />
            <p>NO ENGAGEMENT RECORDS FOUND</p>
          </div>
        ) : (
          history.slice(0, 5).map((record) => {
            const isWin = record.status === "WON" || record.status === "PASSED";
            const isLoss = record.status === "LOST" || record.status === "FAILED" || record.status === "SURRENDER";
            const problemName = record.event?.commonProblem?.name || record.problem?.name || "BATTLE OPERATION";
            const diffLevel = record.event?.commonProblem?.difficulty_level || record.problem?.difficulty_level || "MEDIUM";
            const bestSub = record.submissions?.find((s: any) => s.isBestSubmission) || record.submissions?.[0];

            return (
              <div
                key={record.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-black/50 transition-all hover:bg-black/80 gap-4 ${
                  isWin ? "border-emerald-500/30" : isLoss ? "border-rose-500/30" : "border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-2 h-10 rounded-full ${isWin ? "bg-emerald-500" : isLoss ? "bg-rose-500" : "bg-slate-500"}`} />
                  <div>
                    <p className="text-white font-mono font-bold text-sm tracking-wider flex items-center gap-2">
                      {problemName}
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        diffLevel === 'HARD' ? 'bg-rose-500/20 text-rose-400' : diffLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {diffLevel}
                      </span>
                    </p>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-500 mt-1">
                      <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                      {bestSub?.runtimeMs !== undefined && (
                        <span className="text-cyan-400">Runtime: {bestSub.runtimeMs}ms</span>
                      )}
                      {bestSub?.memoryKb !== undefined && (
                        <span className="text-cyan-400">
                          Memory: {bestSub.memoryKb >= 1024 ? `${(bestSub.memoryKb / 1024).toFixed(1)}MB` : `${bestSub.memoryKb}KB`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right font-mono">
                    <p className={`font-bold tracking-widest text-xs ${isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"}`}>
                      {record.status}
                    </p>
                    <p className="text-xs text-amber-400 font-bold tracking-widest mt-0.5 flex items-center justify-end gap-1">
                      <Trophy className="w-3 h-3" /> +{record.score || 0} PTS
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const perfsToPass = (record.event?.performances && record.event.performances.length > 0)
                        ? record.event.performances
                        : [{
                            userId: currentUserId,
                            user: { id: currentUserId, username: "YOU", avatarUrl: "" },
                            submissions: record.submissions || [],
                            score: record.score || 0,
                            timeTakenMs: record.timeTakenMs
                          }];
                      setSelectedPerformances(perfsToPass);
                    }}
                    className="px-3 py-2 bg-cyan-950/40 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white rounded-lg font-mono text-xs font-bold tracking-widest transition-all flex items-center gap-1.5"
                  >
                    <Code className="w-3.5 h-3.5" /> [ REVIEW CODE ]
                  </button>
                </div>
              </div>
            );
          })
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
