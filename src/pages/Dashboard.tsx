import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
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

  // Time of day greeting
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "MORNING" : hour < 18 ? "AFTERNOON" : "EVENING";

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data", user?.id],
    enabled: Boolean(isAuthenticated || user),
    queryFn: async () => {
      const [profRes, statsRes, probRes] = await Promise.all([
        api.get("/profile").catch(() => null),
        api.get("/profile/stats").catch(() => null),
        api.get("/problems/system").catch(() => null),
      ]);
      return {
        profile: profRes?.data?.data || null,
        stats: statsRes?.data?.stats
          ? {
              totalMatches: statsRes.data.stats.totalMatches || 0,
              wins: statsRes.data.stats.wins || 0,
              losses: statsRes.data.stats.losses || 0,
              winRate: statsRes.data.stats.winRate || 0,
            }
          : null,
        recentBattles: statsRes?.data?.recentMatches || [],
        recommendedProblems: (probRes?.data?.problems || []).slice(0, 4),
      };
    },
  });

  const { data: analytics } = useAnalytics(Boolean(isAuthenticated || user));
  const { data: myRating } = useMyRating(Boolean(isAuthenticated || user));

  const stats = dashboardData?.stats || null;
  const recentBattles: any[] = dashboardData?.recentBattles || [];
  const recommendedProblems: any[] = dashboardData?.recommendedProblems || [];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (matchmakingStatus === "FOUND_PENDING") {
      setAcceptTimer(10);
      interval = setInterval(() => {
        setAcceptTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            declineMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
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
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,243,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

        {/* ── HEADER BAR ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/6">
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-extrabold text-white tracking-widest uppercase truncate"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Dashboard
            </h1>
            <p className="text-xs text-[#8892A4] mt-1">
              Good {timeOfDay}, operative. System nominal.
            </p>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-[#0c0f18] shrink-0">
            <span className="w-1.5 h-1.5 bg-[#00FF87] animate-pulse rounded-full" />
            <span className="text-xs text-white font-bold max-w-[120px] truncate" title={username}>
              {username}
            </span>
          </span>
        </div>

        {/* ── FIND OPPONENT ────────────────────────────────────────────── */}
        <div className="mb-8 border border-white/8 border-l-2 border-l-[#00D4FF] bg-[#0c0f18] p-6 shadow-[0_0_20px_rgba(0,212,255,0.08)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white mb-1">Find Opponent</h2>
              <p className="text-xs text-[#8892A4]">
                Enter matchmaking queue for a ranked 1v1 battle
              </p>
            </div>
            <button
              onClick={() => findMatch()}
              className="flex-shrink-0 bg-[#00D4FF] text-[#050608] font-bold px-6 py-3 text-xs tracking-wider transition-all hover:bg-cyan-400 shadow-[0_0_16px_rgba(0,243,255,0.3)] uppercase whitespace-nowrap"
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
            <div key={label} className="border border-cyan-500/15 bg-[#0c0f18] p-4 sm:p-6 min-w-0">
              <Icon className="w-5 h-5 text-cyan-500/40 mb-2" />
              <div className="text-xl sm:text-2xl font-extrabold text-white truncate">{value}</div>
              <div className="text-[10px] text-[#8892A4] uppercase tracking-widest mt-1 whitespace-nowrap">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── RECOMMENDED PROBLEMS ──────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="recommended-heading">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-[#3D4657]" />
            <span
              id="recommended-heading"
              className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide"
            >
              Recommended Problems
            </span>
            <hr className="flex-1 border-white/6" />
          </div>
          <div className="border border-white/6 bg-[#0c0f18]">
            {recommendedProblems.length > 0 ? (
              recommendedProblems.map((problem: any) => {
                const diff = (problem.difficulty_level || "MEDIUM").toUpperCase();
                return (
                  <div
                    key={problem.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 hover:bg-[#111520] px-4 py-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm text-white font-medium truncate">{problem.name}</span>
                      <span
                        className={`shrink-0 text-[10px] px-2 py-0.5 border whitespace-nowrap ${
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
                    <span className="text-[#8892A4] text-xs shrink-0">→</span>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-4">
                <span className="text-xs text-[#8892A4]">No recommended problems available</span>
              </div>
            )}
          </div>
        </section>

        {/* ── RECENT BATTLES ────────────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="battles-heading">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#3D4657]" />
            <span
              id="battles-heading"
              className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide"
            >
              Recent Battles
            </span>
            <hr className="flex-1 border-white/6" />
          </div>
          <div className="border border-white/6 bg-[#0c0f18]">
            {recentBattles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono min-w-[480px]">
                  <thead>
                    <tr className="border-b border-white/6 text-[#8892A4]">
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
                          className="border-b border-white/5 hover:bg-[#111520] transition-colors"
                        >
                          <td className="p-3 text-white max-w-[160px] truncate" title={problemName}>
                            {problemName}
                          </td>
                          <td className="p-3 text-[#8892A4]">{opponentName}</td>
                          <td
                            className={`p-3 font-medium ${
                              isWin ? "text-[#00FF87]" : "text-[#FF3B5C]"
                            }`}
                          >
                            {isWin ? "WIN" : "LOSS"}
                          </td>
                          <td className="p-3 text-[#8892A4]">{perf.score ?? 0}</td>
                          <td className="p-3 text-[#8892A4] whitespace-nowrap">
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
                <Swords className="w-10 h-10 text-[#3D4657]" />
                <p className="text-xs text-[#8892A4]">No recent battles</p>
                <p className="text-[10px] text-[#3D4657]">
                  Complete a battle to start building your record
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── GLOBAL RANKINGS ───────────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="rankings-heading">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-[#3D4657]" />
            <span
              id="rankings-heading"
              className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide"
            >
              Global Rankings
            </span>
            <hr className="flex-1 border-white/6" />
          </div>
          <AnalyticsErrorBoundary>
            <LeaderboardTable limit={10} />
          </AnalyticsErrorBoundary>
        </section>

        {/* ── PERFORMANCE ANALYTICS ─────────────────────────────────────── */}
        <section className="mb-8" aria-labelledby="analytics-heading">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-[#3D4657]" />
            <span
              id="analytics-heading"
              className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide"
            >
              Performance Analytics
            </span>
            <hr className="flex-1 border-white/6" />
          </div>
          <AnalyticsErrorBoundary>
            {analytics ? (
              <AnalyticsPanels analytics={analytics} compact={true} />
            ) : (
              <div className="border border-white/6 bg-[#0c0f18] p-8 text-center text-xs text-[#8892A4]">
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
          <div className="w-full max-w-md bg-[#0c0f18] border border-white/10 border-l-2 border-l-[#00D4FF] p-8 flex flex-col items-center gap-6">
            <span className="text-[11px] font-mono text-[#8892A4] uppercase tracking-widest">
              Finding opponent
            </span>
            <span
              className="text-5xl font-black font-mono text-cyan-400 tracking-wider tabular-nums"
              style={{ filter: "drop-shadow(0 0 15px rgba(0,243,255,0.5))" }}
            >
              {Math.floor(waitingTime / 60)}:
              {String(waitingTime % 60).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-2 text-xs text-[#8892A4]">
              <span>Your rating:</span>
              <span className="text-white font-mono font-bold">{userRating}</span>
            </div>
            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-[#FF3B5C]/30 text-[#FF3B5C] font-bold text-xs tracking-wide uppercase transition-all hover:bg-[#FF3B5C]/10 flex items-center justify-center gap-2"
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
          <div className="w-full max-w-xl bg-[#06080e] border border-white/10 border-l-2 border-l-[#00D4FF] p-8 flex flex-col items-center gap-6">

            {/* VS Cards */}
            <div className="w-full grid grid-cols-5 items-center gap-3">
              <div className="col-span-2 border border-white/8 bg-[#080a10] p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-[#8892A4] font-bold uppercase tracking-wide mb-1">
                  YOU
                </span>
                <span
                  className="text-base font-extrabold text-white tracking-wide truncate w-full"
                  title={username}
                >
                  {username}
                </span>
                <span className="text-xs text-[#8892A4] mt-1 font-mono">{userRating}</span>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <span className="text-sm font-bold text-[#FF3B5C] font-mono">VS</span>
              </div>

              <div className="col-span-2 border border-white/8 bg-[#080a10] p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-[#8892A4] font-bold uppercase tracking-wide mb-1">
                  OPPONENT
                </span>
                <span
                  className="text-base font-extrabold text-white tracking-wide truncate w-full"
                  title={pendingOpponent?.username}
                >
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-[#8892A4] mt-1 font-mono">1250</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
              <Swords className="w-5 h-5 text-[#00D4FF]" />
              Match Found
            </div>

            <button
              onClick={acceptMatch}
              className="w-full py-4 border border-[#00FF87] bg-[#00FF87] text-[#050608] font-bold text-sm uppercase tracking-wide transition-all hover:opacity-85 flex items-center justify-center gap-2"
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
              <p className="text-xs text-[#8892A4] font-mono">seconds remaining</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
