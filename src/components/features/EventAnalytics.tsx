import { type EventAnalyticsData, type EventParticipantAnalytics } from "../../hooks/useEventAnalytics";

interface EventAnalyticsProps {
  analytics: EventAnalyticsData;
  compact?: boolean;
}

export const EventAnalytics: React.FC<EventAnalyticsProps> = ({ analytics, compact = false }) => {
  const { summary, runtimeStats, perParticipant, roomCode, status } = analytics;

  if (compact) {
    return (
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-faint">Participants</span>
          <span className="font-bold text-fg">{summary.totalParticipants}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-faint">Pass rate</span>
          <span className="font-bold text-accent-success">{summary.passRate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-faint">Avg runtime</span>
          <span className="font-bold text-accent-primary">{runtimeStats.avg}ms</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-faint">
          Event Analytics {roomCode && `#${roomCode}`}
        </h3>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
          status === "FINISHED"
            ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
            : "border-accent-warning/40 bg-accent-warning/10 text-accent-warning"
        }`}>
          {status}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-base/50 border border-line rounded-lg p-3">
          <p className="text-[9px] text-faint font-mono tracking-widest uppercase">Total</p>
          <p className="text-2xl font-bold text-fg">{summary.totalParticipants}</p>
        </div>
        <div className="bg-base/50 border border-line rounded-lg p-3">
          <p className="text-[9px] text-faint font-mono tracking-widest uppercase">Pass Rate</p>
          <p className="text-2xl font-bold text-accent-success">{summary.passRate}%</p>
        </div>
        <div className="bg-base/50 border border-line rounded-lg p-3">
          <p className="text-[9px] text-faint font-mono tracking-widest uppercase">Passed</p>
          <p className="text-2xl font-bold text-accent-success">{summary.passedCount}</p>
        </div>
        <div className="bg-base/50 border border-line rounded-lg p-3">
          <p className="text-[9px] text-faint font-mono tracking-widest uppercase">Failed</p>
          <p className="text-2xl font-bold text-accent-danger">{summary.failedCount}</p>
        </div>
      </div>

      {/* Runtime stats */}
      {runtimeStats.avg > 0 && (
        <div className="bg-base/50 border border-line rounded-lg p-3">
          <p className="text-[9px] text-faint font-mono tracking-widest uppercase mb-2">
            Runtime (ms)
          </p>
          <div className="flex gap-4 text-xs">
            <span className="flex flex-col">
              <span className="text-faint">Best</span>
              <span className="font-bold text-accent-success">{runtimeStats.best}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-faint">Avg</span>
              <span className="font-bold text-fg">{runtimeStats.avg}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-faint">Worst</span>
              <span className="font-bold text-accent-danger">{runtimeStats.worst}</span>
            </span>
          </div>
        </div>
      )}

{/* Per-participant breakdown */}
       <div>
         <p className="text-[9px] text-faint font-mono tracking-widest uppercase mb-2">
           Participants
         </p>
         <div className="flex flex-col gap-1 max-h-80 overflow-y-auto themed-scroll">
           {perParticipant.map((p: EventParticipantAnalytics) => {
             const passed = ["PASSED", "COMPLETED", "WON"].includes(p.status);
             const failed = ["FAILED", "TIMEOUT", "LOST"].includes(p.status);
             const progressPct = p.questionsSolved > 0 && p.submissionCount > 0
               ? Math.min(100, Math.round((p.questionsSolved / Math.max(p.questionsSolved, 1)) * 100))
               : 0;
             return (
               <div
                 key={p.userId}
                 className="flex items-center gap-3 bg-base/30 border border-line rounded-lg px-2 py-1.5"
               >
                 {p.avatarUrl ? (
                   <img
                     src={p.avatarUrl}
                     alt={p.username}
                     className="h-6 w-6 rounded-full object-cover border border-subtle-line"
                   />
                 ) : (
                   <div className="w-6 h-6 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[7px] font-mono font-bold text-fg">
                     {p.username?.[0]?.toUpperCase() || "?"}
                   </div>
                 )}
                 <span className="text-xs font-mono text-fg flex-1 truncate">
                   {p.username}
                 </span>

                 {/* Progress bar — shows proportion of problems solved */}
                 <div className="hidden sm:flex items-center gap-1.5 min-w-[80px]">
                   <div className="flex-1 h-1.5 rounded bg-subtle-line overflow-hidden">
                     <div
                       className={`h-full rounded ${
                         progressPct > 0
                           ? passed
                             ? "bg-accent-success"
                             : "bg-accent-danger"
                           : "bg-transparent"
                       }`}
                       style={{ width: `${progressPct}%` }}
                     />
                   </div>
                   <span className="text-[9px] text-subtle font-mono">
                     {p.questionsSolved}/{perParticipant.length}
                   </span>
                 </div>

                 {/* Status badge */}
                 <span className={`text-[8px] px-1 py-0.25 rounded border font-bold ${
                   passed
                     ? "border-accent-success/30 text-accent-success"
                     : failed
                       ? "border-accent-danger/30 text-accent-danger"
                       : "border-accent-warning/30 text-accent-warning"
                 }`}>
                   {p.status}
                 </span>

                 {/* Detailed metrics on larger screens */}
                 <div className="hidden md:flex items-center gap-3 text-[9px] text-subtle font-mono">
                   <span className="flex items-center gap-1">
                     <span>{p.submissionCount} subs</span>
                   </span>
                   {p.bestRuntimeMs && (
                     <span className="flex items-center gap-1">
                       <span>best {p.bestRuntimeMs}ms</span>
                     </span>
                   )}
                   {p.timeTakenMs && (
                     <span className="flex items-center gap-1">
                       <span>{Math.round(p.timeTakenMs / 1000)}s</span>
                     </span>
                   )}
                   {p.score != null && (
                     <span className="text-accent-primary font-bold">
                       {p.score} pts
                     </span>
                   )}
                 </div>

                 {/* Compact metrics on small screens */}
                 <div className="md:hidden text-[8px] text-subtle font-mono">
                   {p.submissionCount} subs
                   {p.bestRuntimeMs ? ` · ${p.bestRuntimeMs}ms` : ""}
                 </div>
               </div>
             );
           })}
         </div>
       </div>
    </div>
  );
};
