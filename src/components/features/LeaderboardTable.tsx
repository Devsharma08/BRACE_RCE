import { memo, useRef, type CSSProperties } from "react";
import { Trophy, Medal } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLeaderboard, TIER_COLORS } from "../../hooks/useLeaderboard";
import { hasBooted, markBooted } from "../../utils/sessionBoot";

export const LeaderboardTable = memo(({ limit = 10 }: { limit?: number }) => {
  const { user } = useAuth();
  const { data, isLoading, isFetching } = useLeaderboard(limit);
  // Background refetch (post-battle socket invalidation) — first load stays a
  // skeleton, refreshes show a non-blocking SYNCING dot instead.

  const bootAlreadyPlayedRef = useRef<boolean | null>(null);
  if (bootAlreadyPlayedRef.current === null) {
    bootAlreadyPlayedRef.current = hasBooted("leaderboard-reveal");
    markBooted("leaderboard-reveal");
  }
  const isFirstMount = !bootAlreadyPlayedRef.current;

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-accent-warning";
    if (rank === 2) return "text-fg";
    if (rank === 3) return "text-accent-warning";
    return "text-faint";
  };

  return (
    <div className="ds-card p-6">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-label mb-4 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-accent-warning" /> // GLOBAL LEADERBOARD — ELO RANKINGS
        {isFetching && !isLoading && (
          <span className="ml-auto flex items-center gap-1.5 text-[9px] text-accent-primary/70 normal-case tracking-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" aria-hidden="true" />
            SYNCING…
          </span>
        )}
      </p>
      {isLoading ? (
        <p className="text-xs text-faint font-mono">LOADING RANKINGS…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-faint font-mono">NO RANKED OPERATIVES YET — WIN BATTLES TO CLIMB.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((entry, idx) => {
            const isCurrentUser = Boolean(user?.id && entry.userId === user.id);
            return (
              <div
                key={entry.userId}
                className={`${isFirstMount ? "ds-rank-row" : ""} grid grid-cols-[2.5rem_2rem_1fr_6rem_5rem] items-center gap-3 rounded-card border border-subtle-line px-4 py-2 transition-colors ${
                  isCurrentUser ? "bg-surface-hover" : "bg-surface hover:bg-surface-hover"
                }`}
                style={
                  isFirstMount
                    ? ({ "--rank-row-delay": `${idx * 40}ms` } as CSSProperties)
                    : undefined
                }
              >
                <span className={`text-xs font-mono font-bold flex items-center gap-1 ${getRankColor(entry.rank)}`}>
                  {entry.rank <= 3 ? <Medal className="w-3.5 h-3.5" /> : null}#{entry.rank}
                </span>
                <div className="w-7 h-7 rounded-btn bg-elevated border border-subtle-line flex items-center justify-center text-[9px] font-mono font-bold text-accent-primary">
                  {entry.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-mono text-fg truncate">
                  {entry.username}
                  {isCurrentUser ? " (you)" : ""}
                </span>
                <span className={`text-[10px] font-mono font-bold ${TIER_COLORS[entry.tier] ?? "text-subtle"}`}>
                  {entry.tier}
                </span>
                <span className="text-xs font-mono font-bold text-accent-primary">{entry.rating}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
