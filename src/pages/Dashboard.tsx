import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import { api } from "../config/api";
import { useAnalytics } from "../hooks/useAnalytics";
import { AnalyticsPanels } from "../components/features/AnalyticsPanels";
import { LeaderboardTable } from "../components/features/LeaderboardTable";
import { useMyRating, TIER_COLORS } from "../hooks/useLeaderboard";
import { AnalyticsErrorBoundary } from "../components/features/AnalyticsErrorBoundary";
import { NotificationCenter } from "../components/features/NotificationCenter";
import {
  Swords,
  TrendingUp,
  Trophy,
  Flame,
  Percent,
  Code2,
  ChevronRight,
  X,
  CheckCircle2,
  LayoutDashboard,
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
        stats: statsRes?.data?.stats ? {
          totalMatches: statsRes.data.stats.totalMatches || 0,
          wins: statsRes.data.stats.wins || 0,
          losses: statsRes.data.stats.losses || 0,
          winRate: statsRes.data.stats.winRate || 0,
        } : null,
        recentBattles: statsRes?.data?.recentMatches || [],
        recommendedProblems: (probRes?.data?.problems || []).slice(0, 4),
      };
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(Boolean(isAuthenticated || user));
  const { data: myRating } = useMyRating(Boolean(isAuthenticated || user));

  const profile = dashboardData?.profile || null;
  const stats = dashboardData?.stats || null;
  const recentBattles: any[] = dashboardData?.recentBattles || [];
  const recommendedProblems: any[] = dashboardData?.recommendedProblems || [];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (matchmakingStatus === "FOUND_PENDING") {
      setAcceptTimer(10);
      interval = setInterval(() => {
        setAcceptTimer((prev) => {
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

  if (!isLoading && !isAuthenticated && !user) return <Navigate to="/signin" replace />;
  if (isLoading || !user) return <TableSkeleton />;

  const username = user.username;
  const userRating = myRating?.rating || 1200;

  return (
    <div className="flex min-h-screen bg-[#050608] text-slate-100 font-mono">
      {/* DESKTOP SIDEBAR */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full relative pt-16 p-4 md:p-8 overflow-x-hidden">
      {/* Global dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] -z-10" />

      <div className="max-w-6xl mx-auto flex flex-col gap-6 relative z-10">

        {/* ── HEADER BAR ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-5 border-b border-white/6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-normal">Dashboard</h1>
              <p className="text-[#8892A4] text-xs mt-1">Good {timeOfDay.toLowerCase()}, ready for battle</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 border border-white/10 bg-[#0c0f18] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#00FF87]" />
              <span className="text-xs font-mono text-[#8892A4]">{username}</span>
            </div>
            <NotificationCenter />
          </div>
        </div>

        {/* ── FIND OPPONENT ──────────────────────────────────────── */}
        <div className="border border-white/8 border-l-2 border-l-[#00D4FF] bg-[#0c0f18] p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Find Opponent</h2>
              <p className="text-xs text-[#8892A4]">Enter matchmaking queue for a ranked 1v1 battle</p>
            </div>
            <button
              onClick={findMatch}
              className="bg-[#00D4FF] text-[#050608] font-bold px-8 py-3 transition-all hover:opacity-85"
            >
              START MATCHMAKING
            </button>
          </div>
        </div>

        {/* ── STATS GRID ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/6">
          <div className="bg-[#0c0f18] p-6 flex flex-col gap-2">
            <Trophy className="w-4 h-4 text-[#3D4657]" />
            <span className="text-2xl font-extrabold text-white font-mono">{stats?.totalMatches ?? 0}</span>
            <span className="text-[10px] text-[#8892A4] font-medium uppercase tracking-wider">Total Battles</span>
          </div>
          <div className="bg-[#0c0f18] p-6 flex flex-col gap-2">
            <Flame className="w-4 h-4 text-[#3D4657]" />
            <span className="text-2xl font-extrabold text-white font-mono">{stats?.wins ?? 0}</span>
            <span className="text-[10px] text-[#8892A4] font-medium uppercase tracking-wider">Victories</span>
          </div>
          <div className="bg-[#0c0f18] p-6 flex flex-col gap-2">
            <Percent className="w-4 h-4 text-[#3D4657]" />
            <span className="text-2xl font-extrabold text-white font-mono">{stats?.winRate ?? 0}%</span>
            <span className="text-[10px] text-[#8892A4] font-medium uppercase tracking-wider">Win Rate</span>
          </div>
          <div className="bg-[#0c0f18] p-6 flex flex-col gap-2">
            <TrendingUp className="w-4 h-4 text-[#3D4657]" />
            <span className="text-2xl font-extrabold text-white font-mono">{userRating}</span>
            <span className="text-[10px] text-[#8892A4] font-medium uppercase tracking-wider">Rating</span>
          </div>
        </div>

        {/* ── RECOMMENDED PROBLEMS ───────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-3.5 h-3.5 text-[#3D4657]" />
            <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wider">Recommended Problems</span>
            <hr className="flex-1 border-t border-white/6" />
          </div>
          <div className="flex flex-col">
            {recommendedProblems.length > 0 ? recommendedProblems.map((problem: any) => {
              const diff = (problem.difficulty_level || 'MEDIUM').toUpperCase();
              return (
                <div key={problem.id} className="flex items-center justify-between border-b border-white/6 bg-[#0c0f18] hover:bg-[#111520] px-5 py-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">{problem.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 border ${
                      diff === 'EASY' ? 'border-[#00FF87]/30 text-[#00FF87]' :
                      diff === 'MEDIUM' ? 'border-[#FFB800]/30 text-[#FFB800]' :
                      'border-[#FF3B5C]/30 text-[#FF3B5C]'
                    }`}>{diff}</span>
                  </div>
                  <span className="text-[#8892A4] text-xs">→</span>
                </div>
              );
            }) : (
              <div className="border-b border-white/6 bg-[#0c0f18] px-5 py-3">
                <span className="text-xs text-[#8892A4]">No recommended problems available</span>
              </div>
            )}
          </div>
        </div>

        {/* ── BATTLE HISTORY ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-3.5 h-3.5 text-[#3D4657]" />
            <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wider">Recent Battles</span>
            <hr className="flex-1 border-t border-white/6" />
          </div>
          <div className="border border-white/6 bg-[#0c0f18]">
            {recentBattles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/6 text-[#8892A4]">
                      <th className="text-left p-3 font-medium">Problem</th>
                      <th className="text-left p-3 font-medium">Opponent</th>
                      <th className="text-left p-3 font-medium">Result</th>
                      <th className="text-left p-3 font-medium">Score</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBattles.slice(0, 5).map((perf: any, i: number) => {
                      const isWin = perf.status === 'PASSED' || perf.status === 'WON' || perf.status === 'COMPLETED';
                      const opponents = perf.event?.performances?.filter((p: any) => p.user?.id !== user?.id) || [];
                      const opponentName = opponents[0]?.user?.username || '—';
                      const problemName = perf.event?.commonProblem?.name || 'Unknown';
                      return (
                        <tr key={perf.id || i} className="border-b border-white/5 hover:bg-[#111520] transition-colors">
                          <td className="p-3 text-white">{problemName}</td>
                          <td className="p-3 text-[#8892A4]">{opponentName}</td>
                          <td className={`p-3 font-medium ${isWin ? 'text-[#00FF87]' : 'text-[#FF3B5C]'}`}>{isWin ? 'WIN' : 'LOSS'}</td>
                          <td className="p-3 text-[#8892A4] font-mono">{perf.score ?? 0}</td>
                          <td className="p-3 text-[#8892A4] font-mono">{perf.createdAt ? new Date(perf.createdAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-xs text-[#8892A4]">No recent battles</p>
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS ──────────────────────────────────────────── */}
        {analytics && !analyticsLoading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-3.5 h-3.5 text-[#3D4657]" />
              <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wider">Analytics</span>
              <hr className="flex-1 border-t border-white/6" />
            </div>
            <AnalyticsErrorBoundary>
              <AnalyticsPanels analytics={analytics} />
            </AnalyticsErrorBoundary>
          </div>
        )}

        {/* ── LEADERBOARD ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-3.5 h-3.5 text-[#3D4657]" />
            <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wider">Leaderboard</span>
            <hr className="flex-1 border-t border-white/6" />
          </div>
          <LeaderboardTable />
        </div>

      </div>
      </main>

      {/* ── MATCHMAKING: SEARCHING MODAL ────────────────────────────── */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md bg-[#0c0f18] border border-white/10 border-l-2 border-l-[#00D4FF] p-8 flex flex-col items-center gap-6">
            <span className="text-[11px] font-mono text-[#8892A4] uppercase tracking-widest">Finding opponent</span>
            <span className="text-4xl font-extrabold text-white font-mono">
              {Math.floor(waitingTime / 60)}:{String(waitingTime % 60).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2 text-xs text-[#8892A4]">
              <span>Your rating:</span>
              <span className="text-white font-mono font-bold">{userRating}</span>
            </div>
            <button
              onClick={cancelMatch}
              className="w-full py-3 rounded-none border border-[#FF3B5C]/30 text-[#FF3B5C] font-bold text-xs tracking-wide uppercase transition-all cursor-pointer hover:bg-[#FF3B5C]/10 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel Queue</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MATCHMAKING: FOUND PENDING MODAL ────────────────────────── */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none">
          <div className="w-full max-w-xl bg-[#06080e] border border-white/10 border-l-2 border-l-[#00D4FF] p-8 flex flex-col items-center gap-6">
            {/* VS Cards */}
            <div className="w-full grid grid-cols-5 items-center gap-2">
              <div className="col-span-2 border border-white/8 bg-[#080a10] p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-[#8892A4] font-bold uppercase tracking-wide mb-1">YOU</span>
                <span className="text-base font-extrabold text-white tracking-wide truncate max-w-full">{username}</span>
                <span className="text-xs text-[#8892A4] mt-1 font-mono">{userRating}</span>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <span className="text-sm font-bold text-[#FF3B5C] font-mono">VS</span>
              </div>

              <div className="col-span-2 border border-white/8 bg-[#080a10] p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-[#8892A4] font-bold uppercase tracking-wide mb-1">OPPONENT</span>
                <span className="text-base font-extrabold text-white tracking-wide truncate max-w-full">
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-[#8892A4] mt-1 font-mono">1250</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
              <Swords className="w-5 h-5 text-[#00D4FF]" />
              <span>Match Found</span>
            </div>

            <button
              onClick={acceptMatch}
              className="w-full py-4 rounded-none border border-[#00FF87] bg-[#00FF87] text-[#050608] font-bold text-sm uppercase tracking-wide transition-all cursor-pointer hover:opacity-85 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Accept</span>
            </button>

            <p className="text-xs text-[#8892A4] font-mono">
              <span className="text-[#FFB800] font-bold">{acceptTimer}</span> seconds remaining
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
