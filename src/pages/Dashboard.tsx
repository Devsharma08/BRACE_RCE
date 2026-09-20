import React, { useState, useEffect, useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { MetricCard, MetricCardSkeleton } from "../components/ui/MetricCard";
import { StatusPill } from "../components/ui/StatusPill";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useSocketInvalidation } from "../hooks/useSocketInvalidation";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { api } from "../config/api";
import { useAnalytics } from "../hooks/useAnalytics";
import { AnalyticsPanels } from "../components/features/AnalyticsPanels";
import { getDivision, TIER_COLORS, useLeaderboard, useMyRating } from "../hooks/useLeaderboard";
import { AnalyticsErrorBoundary } from "../components/features/AnalyticsErrorBoundary";
import {
  Swords,
  Trophy,
  Flame,
  Percent,
  Code2,
  X,
  CheckCircle2,
  Activity,
  BarChart2,
  Plus,
} from "lucide-react";

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "—";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "Yesterday" : `${elapsedDays}d ago`;
};

export const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const {
    findMatch,
    cancelMatch,
    acceptMatch,
    declineMatch,
    matchmakingStatus,
    waitingTime,
    pendingOpponent,
  } = useSocket();
  const navigate = useNavigate();
  const [acceptTimer, setAcceptTimer] = useState<number>(10);

  // After any finished battle the server emits leaderboard:invalidate — one
  // wave refreshes the whole dashboard (stats, recent battles, problems).
  useSocketInvalidation("leaderboard:invalidate", [
    ["dashboard-profile"],
    ["dashboard-stats"],
    ["dashboard-problems"],
  ]);

  // Time of day greeting
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "MORNING" : hour < 18 ? "AFTERNOON" : "EVENING";

  // Profile card data — identity rarely changes, so it is long-lived and is
  // deliberately NOT part of the post-battle refresh wave.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const res = await api.get("/profile").catch(() => null);
      return res?.data?.data || null;
    },
  });

  // Match stats + recent battles — refresh after every finished battle.
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      try {
        const statsRes = await api.get("/profile/stats").catch(() => null);
        return {
          stats: statsRes?.data?.stats
            ? {
                totalMatches: statsRes.data.stats.totalMatches || 0,
                wins: statsRes.data.stats.wins || 0,
                losses: statsRes.data.stats.losses || 0,
                winRate: statsRes.data.stats.winRate || 0,
              }
            : null,
          recentBattles: statsRes?.data?.recentMatches || [],
        };
      } catch {
        // Partial failure must not blank the whole dashboard — fall back to
        // empty stats so the rest of the page still renders.
        return { stats: null, recentBattles: [] };
      }
    },
  });

  // Recommended problems — also refreshed post-battle (isSolved flags change).
  const { data: recommendedProblemsData = [], isLoading: recommendedLoading } = useQuery({
    queryKey: ["dashboard-problems", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const probRes = await api.get("/problems/system").catch(() => null);
      return (probRes?.data?.problems || []).slice(0, 4);
    },
  });

  // Back-compat shape for the JSX below (was one combined query).
  const dashboardData = {
    profile,
    stats: statsData?.stats ?? null,
    recentBattles: statsData?.recentBattles ?? [],
    recommendedProblems: recommendedProblemsData,
  };

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(Boolean(isAuthenticated || user));
  const { data: myRating, isLoading: ratingLoading } = useMyRating(Boolean(isAuthenticated || user));
  const { data: leaderboardRows, isLoading: leaderboardLoading } = useLeaderboard(25, Boolean(isAuthenticated || user));

  const stats = dashboardData?.stats || null;
  const recentBattles: any[] = dashboardData?.recentBattles || [];
  // Renamed upstream (recommendedProblemsData) to avoid shadowing this alias.
  const recommendedProblems: any[] = dashboardData?.recommendedProblems || [];

  // Guards the accept countdown so a stale interval tick queued before the
  // cleanup runs cannot fire declineMatch() a second time. The ref flips to
  // false on cleanup; any tick that wakes up afterwards exits immediately.
  const timerActiveRef = useRef(false);

  useEffect(() => {
    if (matchmakingStatus !== "FOUND_PENDING") {
      // Leaving the pending state resets the dial so the next match starts at 10.
      setAcceptTimer(10);
      return;
    }
    timerActiveRef.current = true;
    const interval = setInterval(() => {
      if (!timerActiveRef.current) return;
      setAcceptTimer((prev) => {
        if (!timerActiveRef.current) return prev;
        if (prev <= 1) {
          timerActiveRef.current = false;
          clearInterval(interval);
          declineMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      timerActiveRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingStatus]);

  useEffect(() => {
    if (matchmakingStatus === "SEARCHING") {
      document.title = "Searching... | BRACE RCE";
    } else if (matchmakingStatus === "FOUND_PENDING") {
      document.title = "Match Found! | BRACE RCE";
    } else {
      document.title = "Dashboard | BRACE RCE";
    }
  }, [matchmakingStatus]);

  if (!isLoading && !isAuthenticated && !user) return <Navigate to="/signin" />;

  const username = user?.username || "OPERATIVE";
  const userRating = myRating?.rating ?? 1000;
  const division = getDivision(userRating);
  const globalRank = leaderboardRows?.find((row) => row.userId === user?.id)?.rank;
  const matchesPlayed = stats?.totalMatches ?? myRating?.totalMatches ?? 0;
  const winRate = stats ? Math.round(stats.winRate) : Math.round(myRating?.winRate ?? 0);
  const winStreak = analytics?.summary?.currentStreak ?? 0;
  const isQueued = matchmakingStatus === "SEARCHING";

  // Skeleton gates: blink while a value is still in flight; render the real
  // (possibly zero) value only once its query has settled.
  const kpiLoading = statsLoading || analyticsLoading || ratingLoading;
  const rankLoading = ratingLoading || leaderboardLoading;

  return (
    <div className="flex min-h-screen bg-base text-fg font-mono">

      {/* Desktop sidebar */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main
        className="
          flex-1 min-w-0 w-full
          ml-0 md:ml-[60px] lg:ml-[245px]
          pt-14
          px-4 py-6 md:px-8 md:py-8
          pb-20 md:pb-8
        "
      >
        {/* Dot-grid texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

        {/* ── OPERATIVE BANNER ────────────────────────────────────────── */}
        <div className="ds-card p-6 mb-6 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <img
              src={user?.avatarUrl || dashboardData?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              alt=""
              className="w-16 h-16 rounded-card border border-subtle-line object-cover"
            />
            <div className="min-w-0">
              <p className="text-[10px] text-label uppercase tracking-[0.2em] font-bold">Operative profile</p>
              <h1 className="text-2xl font-black text-fg tracking-widest uppercase truncate font-display">
                {username}
              </h1>
              <p className="text-xs text-subtle mt-1">
                Good {timeOfDay}. System nominal.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full lg:w-auto">
            {rankLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} aria-hidden="true" className="px-4 py-3 rounded-card border border-subtle-line bg-base">
                    <span className="block h-2.5 w-14 rounded-none bg-surface-hover animate-pulse" />
                    <span className="mt-2 block h-5 w-16 rounded-none bg-surface-hover animate-pulse" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="px-4 py-3 rounded-card border border-subtle-line bg-base">
                  <p className="text-[10px] text-muted uppercase tracking-widest">ELO</p>
                  <p className="text-xl font-black font-mono text-accent-primary tabular-nums">{userRating}</p>
                </div>
                <div className="px-4 py-3 rounded-card border border-subtle-line bg-base">
                  <p className="text-[10px] text-muted uppercase tracking-widest">Division</p>
                  <p className={`text-sm font-black font-mono mt-1 ${TIER_COLORS[division] ?? "text-fg"}`}>{division}</p>
                </div>
                <div className="px-4 py-3 rounded-card border border-subtle-line bg-base">
                  <p className="text-[10px] text-muted uppercase tracking-widest">Global rank</p>
                  <p className="text-xl font-black font-mono text-fg tabular-nums">{globalRank ? `#${globalRank}` : "—"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── KPI GRID ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {kpiLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard label="Matches played" value={matchesPlayed} icon={Trophy} dotTone="active" />
              <MetricCard label="Win rate" value={`${winRate}%`} icon={Percent} dotTone="live" valueTone="positive" />
              <MetricCard label="Current win streak" value={winStreak} icon={Flame} dotTone="warning" valueTone="warning" />
            </>
          )}
        </div>

        {/* ── ACTION HUB ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className={`ds-card p-6 ${isQueued ? "ds-pulse-ring" : ""}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] text-label uppercase tracking-[0.2em] font-bold mb-1">Ranked queue</p>
                <h2 className="text-lg font-bold text-fg mb-1">Matchmaking</h2>
                <p className="text-xs text-subtle">
                  {isQueued ? "Searching for an opponent…" : "Enter ranked 1v1. Pulse ring arms when queued."}
                </p>
              </div>
              {isQueued ? (
                <button
                  onClick={cancelMatch}
                  className="ds-btn flex-shrink-0 border border-accent-danger/40 text-accent-danger font-bold px-6 py-3 text-xs tracking-wider uppercase whitespace-nowrap hover:bg-accent-danger/10"
                >
                  Cancel queue
                </button>
              ) : (
                <button
                  onClick={() => findMatch()}
                  className="ds-btn flex-shrink-0 bg-accent-primary text-ink font-bold px-6 py-3 text-xs tracking-wider transition-all hover:opacity-90 uppercase whitespace-nowrap"
                >
                  START MATCHMAKING
                </button>
              )}
            </div>
          </div>
          <Link to="/rooms/create" className="ds-card group p-6">
            <p className="text-[10px] text-label uppercase tracking-[0.2em] font-bold mb-1">Custom room creator</p>
            <h2 className="text-lg font-bold text-fg mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent-primary" /> Problem & test generator
            </h2>
            <p className="text-xs text-subtle group-hover:text-fg transition-colors">
              Build a private arena, seed a problem, and generate test cases.
            </p>
          </Link>
        </div>

        {/* ── RECOMMENDED PROBLEMS ──────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="recommended-heading">
          <div className="mb-3 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-accent-primary/30" />
            <span
              id="recommended-heading"
              className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-secondary"
            >
              Recommended Problems
            </span>
            <hr className="flex-1 border-subtle-line" />
          </div>
          <div className="overflow-hidden rounded-card border border-subtle-line bg-surface">
            {recommendedLoading ? (
              <div aria-hidden="true" className="divide-y divide-subtle-line">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="h-3.5 w-40 rounded-none bg-surface-hover animate-pulse" />
                    <span className="h-4 w-12 rounded-btn bg-surface-hover animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recommendedProblems.length > 0 ? (
              recommendedProblems.map((problem: any) => {
                const diff = (problem.difficulty_level || "MEDIUM").toUpperCase();
                return (
                  <Link
                    key={problem.id}
                    to={`/terminal?id=${problem.id || problem.github_oid}`}
                    className="flex items-center justify-between gap-3 border-b border-subtle-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="truncate text-sm font-medium text-fg">{problem.name}</span>
                      <StatusPill tone={diff === "EASY" ? "live" : diff === "MEDIUM" ? "warning" : "danger"} className="shrink-0">
                        {diff}
                      </StatusPill>
                    </div>
                    <span className="shrink-0 text-xs text-muted transition-colors group-hover:text-accent-primary">→</span>
                  </Link>
                );
              })
            ) : (
              <div className="px-5 py-4">
                <span className="text-xs text-subtle">No recommended problems available</span>
              </div>
            )}
          </div>
        </section>

        {/* ── RECENT BATTLES ────────────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="battles-heading">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-primary/30" />
            <span
              id="battles-heading"
              className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-secondary"
            >
              Recent Battles
            </span>
            <hr className="flex-1 border-subtle-line" />
          </div>
          <div className="overflow-hidden rounded-card border border-subtle-line bg-surface">
            {statsLoading ? (
              <div aria-hidden="true" className="divide-y divide-subtle-line">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="h-3 w-full max-w-[220px] rounded-none bg-surface-hover animate-pulse" />
                    <span className="ml-auto h-4 w-10 rounded-none bg-surface-hover animate-pulse" />
                    <span className="h-3 w-12 rounded-none bg-surface-hover animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentBattles.length > 0 ? (
              <div className="divide-y divide-subtle-line">
                    {recentBattles.slice(0, 5).map((perf: any, i: number) => {
                      const isWin =
                        perf.status === "PASSED" ||
                        perf.status === "WON" ||
                        perf.status === "COMPLETED";
                      const problemName =
                        perf.event?.commonProblem?.name || "Unknown";
                      return (
                        <div
                          key={perf.id || i}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
                        >
                          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg" title={problemName}>
                            {problemName}
                          </span>
                          <StatusPill tone={isWin ? "live" : "danger"} className="shrink-0">
                            {isWin ? "WIN" : "LOSS"}
                          </StatusPill>
                          <span className="w-12 shrink-0 text-right font-mono text-[11px] text-subtle">{perf.score ?? 0}</span>
                          <time className="w-16 shrink-0 text-right font-mono text-[11px] font-bold text-secondary" dateTime={perf.createdAt}>
                            {formatRelativeTime(perf.createdAt)}
                          </time>
                        </div>
                      );
                    })}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={Swords}
                  title="No recent battles"
                  message="Complete a battle to start building your record."
                  action={
                    <Link
                      to="/lobby"
                      className="inline-flex items-center gap-2 border border-accent-primary/40 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary transition-colors hover:bg-accent-primary/10"
                    >
                      Enter the arena
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </section>

        {/* ── PERFORMANCE ANALYTICS ─────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="analytics-heading">
          <div className="mb-3 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent-primary/50" />
            <span
              id="analytics-heading"
              className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted"
            >
              Performance Analytics
            </span>
            <hr className="flex-1 border-subtle-line" />
          </div>
          <AnalyticsErrorBoundary>
            {analytics ? (
              <AnalyticsPanels analytics={analytics} compact={true} />
            ) : (
              <div className="rounded-card border border-subtle-line bg-surface p-6 text-center text-xs text-muted">
                Analytics data unavailable
              </div>
            )}
          </AnalyticsErrorBoundary>
        </section>
      </main>

      {/* ── MATCHMAKING: SEARCHING MODAL ──────────────────────────────────── */}
      {matchmakingStatus === "SEARCHING" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Searching for opponent"
          className="fixed inset-0 z-50 flex items-center justify-center ds-overlay p-4 select-none"
        >
          <div className="w-full max-w-md bg-raised border border-subtle-line border-t-2 border-t-accent-primary/40 p-8 flex flex-col items-center gap-6">
            <span className="text-[10px] font-mono text-label uppercase tracking-[0.2em] font-bold">
              Finding opponent
            </span>
            <span
              className="text-5xl font-black font-mono text-accent-primary tracking-wider tabular-nums"
              style={{ filter: "drop-shadow(0 0 15px rgba(0,212,255,0.5))" }}
            >
              {Math.floor(waitingTime / 60)}:
              {String(waitingTime % 60).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-2 text-xs text-subtle">
              <span>Your rating:</span>
              <span className="text-fg font-mono font-bold">{userRating}</span>
            </div>
            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-accent-danger/30 text-accent-danger font-mono font-bold text-xs tracking-wider uppercase transition-all hover:bg-accent-danger/10 hover:border-accent-danger flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel Queue
            </button>
          </div>
        </div>
      )}

      {/* ── MATCHMAKING: MATCH FOUND MODAL ───────────────────────────────── */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Match found"
          className="fixed inset-0 z-50 flex items-center justify-center ds-overlay p-4 select-none"
        >
          <div className="w-full max-w-xl bg-raised border border-subtle-line border-t-2 border-t-accent-primary/40 p-8 flex flex-col items-center gap-6">

            {/* VS Cards */}
            <div className="w-full grid grid-cols-5 items-center gap-3">
              <div className="col-span-2 border border-subtle-line bg-raised p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-subtle font-mono font-bold uppercase tracking-widest mb-1">
                  YOU
                </span>
                <span
                  className="text-base font-extrabold text-fg tracking-wide truncate w-full"
                  title={username}
                >
                  {username}
                </span>
                <span className="text-xs text-subtle mt-1 font-mono">{userRating}</span>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <span className="text-sm font-black text-accent-danger font-mono">VS</span>
              </div>

              <div className="col-span-2 border border-subtle-line bg-raised p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-subtle font-mono font-bold uppercase tracking-widest mb-1">
                  OPPONENT
                </span>
                <span
                  className="text-base font-extrabold text-fg tracking-wide truncate w-full"
                  title={pendingOpponent?.username}
                >
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-subtle mt-1 font-mono">1250</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-fg uppercase">
              <Swords className="w-5 h-5 text-accent" />
              Match Found
            </div>

            <button
              onClick={acceptMatch}
              className="w-full py-4 ds-btn border border-accent-success bg-accent-success text-ink font-bold text-sm uppercase tracking-wide transition-all hover:opacity-85 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Accept
            </button>

            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-4xl font-black font-mono text-accent-warning tabular-nums">
                {acceptTimer}
              </span>
              <div
                className="w-full h-1 bg-line overflow-hidden"
                role="progressbar"
                aria-valuenow={acceptTimer}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-label="Time remaining to accept"
              >
                <div
                  className="h-full bg-accent-warning transition-all duration-1000"
                  style={{ width: `${(acceptTimer / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs text-subtle font-mono">seconds remaining</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
