import React, { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useSocketInvalidation } from "../hooks/useSocketInvalidation";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { api } from "../config/api";
import { useAnalytics } from "../hooks/useAnalytics";
import { AnalyticsPanels } from "../components/features/AnalyticsPanels";
import { LeaderboardTable } from "../components/features/LeaderboardTable";
import { useMyRating } from "../hooks/useLeaderboard";
import { AnalyticsErrorBoundary } from "../components/features/AnalyticsErrorBoundary";
import {
  Swords,
  TrendingUp,
  Trophy,
  Flame,
  Percent,
  Code2,
  X,
  CheckCircle2,
  Activity,
  BarChart2,
} from "lucide-react";

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
  const { data: profile } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const res = await api.get("/profile").catch(() => null);
      return res?.data?.data || null;
    },
  });

  // Match stats + recent battles — refresh after every finished battle.
  const { data: statsData } = useQuery({
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
  const { data: recommendedProblemsData = [] } = useQuery({
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

  const { data: analytics } = useAnalytics(Boolean(isAuthenticated || user));
  const { data: myRating } = useMyRating(Boolean(isAuthenticated || user));

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

  return (
    <div className="flex min-h-screen bg-[#050608] text-slate-100 font-mono">

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

        {/* ── HEADER BAR ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-cyan-500/10">
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase truncate font-mono"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Good {timeOfDay}, operative. System nominal.
            </p>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/15 bg-raised shrink-0">
            <span className="w-1.5 h-1.5 bg-[#00FF87] animate-pulse rounded-full" />
            <span className="text-xs text-white font-mono font-bold max-w-[120px] truncate" title={username}>
              {username}
            </span>
          </span>
        </div>

        {/* ── FIND OPPONENT ────────────────────────────────────────────── */}
        <div className="mb-8 border border-cyan-500/20 border-t-2 border-t-cyan-400/50 bg-raised p-6 shadow-[0_0_30px_rgba(0,212,255,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white mb-1">Find Opponent</h2>
              <p className="text-xs text-subtle">
                Enter matchmaking queue for a ranked 1v1 battle
              </p>
            </div>
            <button
              onClick={() => findMatch()}
              className="flex-shrink-0 bg-accent text-ink font-bold px-6 py-3 text-xs tracking-wider transition-all hover:bg-cyan-400 shadow-[0_0_16px_rgba(0,212,255,0.3)] uppercase whitespace-nowrap"
            >
              START MATCHMAKING
            </button>
          </div>
        </div>

        {/* ── STATS GRID ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { icon: TrendingUp, label: "ELO Rating",  value: myRating?.rating ?? "—"             },
            { icon: Trophy,     label: "Record",      value: stats ? `${stats.wins}W / ${stats.losses}L` : "—" },
            { icon: Flame,      label: "Win Rate",    value: stats ? `${Math.round(stats.winRate)}%` : "—"    },
            { icon: Percent,    label: "Submissions", value: analytics?.summary?.totalAttempts ?? "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="border border-cyan-500/15 bg-raised p-4 sm:p-6 min-w-0">
              <Icon className="w-5 h-5 text-cyan-500/40 mb-2" />
              <div className="text-xl sm:text-2xl font-black font-mono truncate">
                {label === 'ELO Rating' ? (
                  <span className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.4))' }}>{value}</span>
                ) : label === 'Win Rate' ? (
                  <span className="text-emerald-400">{value}</span>
                ) : (
                  <span className="text-white">{value}</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 whitespace-nowrap font-mono">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── RECOMMENDED PROBLEMS ──────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="recommended-heading">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-cyan-500/30" />
            <span
              id="recommended-heading"
              className="text-[10px] text-cyan-500/50 font-mono font-bold uppercase tracking-[0.2em]"
            >
              Recommended Problems
            </span>
            <hr className="flex-1 border-cyan-500/10" />
          </div>
          <div className="border border-cyan-500/15 bg-raised">
            {recommendedProblems.length > 0 ? (
              recommendedProblems.map((problem: any) => {
                const diff = (problem.difficulty_level || "MEDIUM").toUpperCase();
                return (
                  <div
                    key={problem.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 hover:bg-elevated px-4 py-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm text-white font-medium truncate">{problem.name}</span>
                      <span
                        className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded-sm whitespace-nowrap ${
                          diff === "EASY"
                            ? "border-[#00FF87]/30 text-[#00FF87]"
                            : diff === "MEDIUM"
                            ? "border-[#FFB800]/30 text-[#FFB800]"
                            : "border-[#FF3B5C]/30 text-[#FF3B5C]"
                        }`}
                      >
                        {diff}
                      </span>
                    </div>
                    <span className="text-subtle text-xs shrink-0">→</span>
                  </div>
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
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-500/30" />
            <span
              id="battles-heading"
              className="text-[10px] text-cyan-500/50 font-mono font-bold uppercase tracking-[0.2em]"
            >
              Recent Battles
            </span>
            <hr className="flex-1 border-cyan-500/10" />
          </div>
          <div className="border border-cyan-500/15 bg-raised">
            {recentBattles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono min-w-[480px]">
                  <thead>
                    <tr className="border-b border-cyan-500/10">
                      {["Problem", "Opponent", "Result", "Score", "Date"].map(h => (
                        <th
                          key={h}
                          scope="col"
                          className="text-left p-3 font-mono text-[10px] tracking-widest uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentBattles.slice(0, 5).map((perf: any, i: number) => {
                      const isWin =
                        perf.status === "PASSED" ||
                        perf.status === "WON" ||
                        perf.status === "COMPLETED";
                      const opponents =
                        perf.event?.performances?.filter(
                          (p: any) => p.user?.id !== user?.id
                        ) || [];
                      const opponentName = opponents[0]?.user?.username || "—";
                      const problemName =
                        perf.event?.commonProblem?.name || "Unknown";
                      return (
                        <tr
                          key={perf.id || i}
                          className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                        >
                          <td className="p-3 text-white max-w-[160px] truncate font-mono text-[11px]" title={problemName}>
                            {problemName}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{opponentName}</td>
                          <td
                            className={`p-3 font-medium ${
                              isWin ? "text-[#00FF87]" : "text-[#FF3B5C]"
                            }`}
                          >
                            {isWin ? "WIN" : "LOSS"}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{perf.score ?? 0}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {perf.createdAt
                              ? new Date(perf.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3">
                <Swords className="w-10 h-10 text-slate-700" />
                <p className="text-xs text-slate-400 font-mono">No recent battles</p>
                <p className="text-[10px] text-slate-600 font-mono">
                  Complete a battle to start building your record
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── GLOBAL RANKINGS ───────────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="rankings-heading">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan-500/30" />
            <span
              id="rankings-heading"
              className="text-[10px] text-cyan-500/50 font-mono font-bold uppercase tracking-[0.2em]"
            >
              Global Rankings
            </span>
            <hr className="flex-1 border-cyan-500/10" />
          </div>
          <AnalyticsErrorBoundary>
            <LeaderboardTable limit={10} />
          </AnalyticsErrorBoundary>
        </section>

        {/* ── PERFORMANCE ANALYTICS ─────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="analytics-heading">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan-500/30" />
            <span
              id="analytics-heading"
              className="text-[11px] text-subtle font-medium uppercase tracking-wide"
            >
              Performance Analytics
            </span>
            <hr className="flex-1 border-cyan-500/10" />
          </div>
          <AnalyticsErrorBoundary>
            {analytics ? (
              <AnalyticsPanels analytics={analytics} compact={true} />
            ) : (
              <div className="border border-cyan-500/15 bg-raised p-8 text-center text-xs text-subtle">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none"
        >
          <div className="w-full max-w-md bg-raised border border-cyan-500/20 border-t-2 border-t-cyan-400/50 p-8 flex flex-col items-center gap-6">
            <span className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.2em] font-bold">
              Finding opponent
            </span>
            <span
              className="text-5xl font-black font-mono text-cyan-400 tracking-wider tabular-nums"
              style={{ filter: "drop-shadow(0 0 15px rgba(0,212,255,0.5))" }}
            >
              {Math.floor(waitingTime / 60)}:
              {String(waitingTime % 60).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-2 text-xs text-subtle">
              <span>Your rating:</span>
              <span className="text-white font-mono font-bold">{userRating}</span>
            </div>
            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-rose-500/30 text-rose-400 font-mono font-bold text-xs tracking-wider uppercase transition-all hover:bg-rose-500/10 hover:border-rose-400 flex items-center justify-center gap-2"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none"
        >
          <div className="w-full max-w-xl bg-raised border border-cyan-500/20 border-t-2 border-t-cyan-400/50 p-8 flex flex-col items-center gap-6">

            {/* VS Cards */}
            <div className="w-full grid grid-cols-5 items-center gap-3">
              <div className="col-span-2 border border-cyan-500/15 bg-raised p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest mb-1">
                  YOU
                </span>
                <span
                  className="text-base font-extrabold text-white tracking-wide truncate w-full"
                  title={username}
                >
                  {username}
                </span>
                <span className="text-xs text-subtle mt-1 font-mono">{userRating}</span>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <span className="text-sm font-black text-rose-400 font-mono">VS</span>
              </div>

              <div className="col-span-2 border border-cyan-500/15 bg-raised p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest mb-1">
                  OPPONENT
                </span>
                <span
                  className="text-base font-extrabold text-white tracking-wide truncate w-full"
                  title={pendingOpponent?.username}
                >
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-subtle mt-1 font-mono">1250</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
              <Swords className="w-5 h-5 text-accent" />
              Match Found
            </div>

            <button
              onClick={acceptMatch}
              className="w-full py-4 border border-[#00FF87] bg-[#00FF87] text-ink font-bold text-sm uppercase tracking-wide transition-all hover:opacity-85 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Accept
            </button>

            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-4xl font-black font-mono text-amber-400 tabular-nums">
                {acceptTimer}
              </span>
              <div
                className="w-full h-1 bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={acceptTimer}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-label="Time remaining to accept"
              >
                <div
                  className="h-full bg-amber-400 transition-all duration-1000"
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
