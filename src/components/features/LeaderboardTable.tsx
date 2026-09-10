import { memo, useRef } from "react";
import { Trophy, Medal } from "lucide-react";
import { useLeaderboard, TIER_COLORS } from "../../hooks/useLeaderboard";
import { hasBooted, markBooted } from "../../utils/sessionBoot";

/** Global ELO leaderboard table (ROADMAP §1). */
export const LeaderboardTable = memo(({ limit = 10 }: { limit?: number }) => {
  const { data, isLoading } = useLeaderboard(limit);

  // Staggered reveal animation state
  const bootAlreadyPlayedRef = useRef<boolean | null>(null);
  if (bootAlreadyPlayedRef.current === null) {
    bootAlreadyPlayedRef.current = hasBooted('leaderboard-reveal');
    markBooted('leaderboard-reveal');
  }
  const isFirstMount = !bootAlreadyPlayedRef.current;

  return (
    <div className="bg-[#06080e] border border-white/10 p-5">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rankRowReveal {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      ` }} />
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500 mb-4 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-amber-400" /> Global Leaderboard // ELO Rankings
      </p>
      {isLoading ? (
        <p className="text-xs text-slate-500 font-mono">LOADING RANKINGS…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-slate-500 font-mono">NO RANKED OPERATIVES YET — WIN BATTLES TO CLIMB.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {data.map((entry, idx) => (
            <div
              key={entry.userId}
              className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-3 py-2 bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-colors"
              style={isFirstMount ? {
                opacity: 0,
                animation: `rankRowReveal 0.4s ease-out ${idx * 40}ms forwards`
              } : undefined}
            >
              <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                {entry.rank <= 3 ? <Medal className="w-3.5 h-3.5 text-amber-400" /> : null}#{entry.rank}
              </span>
              <span className="text-xs font-mono text-white truncate">{entry.username}</span>
              <span className={`text-[10px] font-mono font-bold ${TIER_COLORS[entry.tier] ?? "text-slate-400"}`}>
                {entry.tier}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">{entry.rating}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
