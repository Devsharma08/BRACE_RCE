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
    <div className="flex min-h-screen bg-[#050811] text-slate-100 font-mono">
      {/* DESKTOP SIDEBAR */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full relative pt-14 p-4 md:p-8 overflow-x-hidden">
      {/* Global dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(rgba(0,243,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

      {/* ── HEADER BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-widest uppercase" style={{ fontFamily: "'Orbitron', sans-serif" }}>Dashboard</h1>
          <p className="text-xs text-[#8892A4] mt-1">Welcome back, operative. System nominal.</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <span className="flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-[#0c0f18]">
            <span className="w-1.5 h-1.5 bg-[#00FF87] animate-pulse" />
            <span className="text-xs text-white font-bold">{username}</span>
          </span>
        </div>
      </div>

      {/* ── FIND OPPONENT ──────────────────────────────────────── */}
      <div className="mb-8 border border-white/8 border-l-2 border-l-[#00D4FF] bg-[#0c0f18] p-8 flex items-center justify-between shadow-[0_0_20px_rgba(0,212,255,0.1)]">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Find Opponent</h2>
          <p className="text-xs text-[#8892A4]">Enter matchmaking queue for a ranked 1v1 battle</p>
        </div>
        <button
          onClick={() => findMatch()}
          className="bg-[#00D4FF] text-[#050608] font-bold px-8 py-3 tracking-wider transition-all hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.4)]"
        >
          START MATCHMAKING
        </button>
      </div>

      {/* ── STATS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="border border-cyan-500/20 bg-[#0c0f18] p-6">
          <TrendingUp className="w-5 h-5 text-cyan-500/40 mb-2" />
          <div className="text-2xl font-extrabold text-white">{myRating?.rating ?? "--"}</div>
          <div className="text-[10px] text-[#8892A4] uppercase tracking-widest mt-1">ELO Rating</div>
        </div>
        <div className="border border-cyan-500/20 bg-[#0c0f18] p-6">
          <Trophy className="w-5 h-5 text-cyan-500/40 mb-2" />
          <div className="text-2xl font-extrabold text-white">{stats ? `${stats.wins}W / ${stats.losses}L` : "--"}</div>
          <div className="text-[10px] text-[#8892A4] uppercase tracking-widest mt-1">Record</div>
        </div>
        <div className="border border-cyan-500/20 bg-[#0c0f18] p-6">
          <Flame className="w-5 h-5 text-cyan-500/40 mb-2" />
          <div className="text-2xl font-extrabold text-white">{stats ? `${Math.round(stats.winRate)}%` : "--"}</div>
          <div className="text-[10px] text-[#8892A4] uppercase tracking-widest mt-1">Win Rate</div>
        </div>
        <div className="border border-cyan-500/20 bg-[#0c0f18] p-6">
          <Percent className="w-5 h-5 text-cyan-500/40 mb-2" />
          <div className="text-2xl font-extrabold text-white">{analytics?.totalSubmissions ?? "--"}</div>
          <div className="text-[10px] text-[#8892A4] uppercase tracking-widest mt-1">Submissions</div>
        </div>
      </div>

      {/* ── RECOMMENDED PROBLEMS ───────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-4 h-4 text-[#3D4657]" />
          <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide">Recommended Problems</span>
          <hr className="flex-1 border-white/6" />
        </div>
        <div className="border border-white/6 bg-[#0c0f18]">
          {recommendedProblems.length > 0 ? recommendedProblems.map((problem: any) => {
            const diff = (problem.difficulty_level || 'MEDIUM').toUpperCase();
            return (
              <div key={problem.id} className="flex items-center justify-between border-b border-white/6 hover:bg-[#111520] px-5 py-3 transition-colors">
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
            <div className="border-b border-white/6 px-5 py-3">
              <span className="text-xs text-[#8892A4]">No recommended problems available</span>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT BATTLES ─────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#3D4657]" />
          <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide">Recent Battles</span>
          <hr className="flex-1 border-white/6" />
        </div>
        <div className="border border-white/6 bg-[#0c0f18]">
          {recentBattles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-white/6 text-[#8892A4]">
                    <th className="text-left p-3 font-mono text-[10px] tracking-widest uppercase">Problem</th>
                    <th className="text-left p-3 font-mono text-[10px] tracking-widest uppercase">Opponent</th>
                    <th className="text-left p-3 font-mono text-[10px] tracking-widest uppercase">Result</th>
                    <th className="text-left p-3 font-mono text-[10px] tracking-widest uppercase">Score</th>
                    <th className="text-left p-3 font-mono text-[10px] tracking-widest uppercase">Date</th>
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
                        <td className="p-3 text-[#8892A4]">{perf.score ?? 0}</td>
                        <td className="p-3 text-[#8892A4]">{perf.createdAt ? new Date(perf.createdAt).toLocaleDateString() : '—'}</td>
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

      {/* ── LEADERBOARD ────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-[#3D4657]" />
          <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide">Global Rankings</span>
          <hr className="flex-1 border-white/6" />
        </div>
        <AnalyticsErrorBoundary>
          <LeaderboardTable limit={10} />
        </AnalyticsErrorBoundary>
      </div>

      {/* ── ANALYTICS ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-[#3D4657]" />
          <span className="text-[11px] text-[#8892A4] font-medium uppercase tracking-wide">Performance Analytics</span>
          <hr className="flex-1 border-white/6" />
        </div>
        <AnalyticsErrorBoundary>
          <AnalyticsPanels />
        </AnalyticsErrorBoundary>
      </div>

      </main>

      {/* ── MATCHMAKING: SEARCHING MODAL ────────────────────────── */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none">
          <div className="w-full max-w-md bg-[#0c0f18] border border-white/10 border-l-2 border-l-[#00D4FF] p-8 flex flex-col items-center gap-6">
            <span className="text-[11px] font-mono text-[#8892A4] uppercase tracking-widest">Finding opponent</span>
            <span className="text-5xl font-black font-mono text-cyan-400 tracking-wider" style={{ filter: 'drop-shadow(0 0 15px rgba(0,243,255,0.5))' }}>
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

            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl font-black font-mono text-amber-400">{acceptTimer}</span>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${(acceptTimer / 10) * 100}%` }} />
              </div>
              <p className="text-xs text-[#8892A4] font-mono">seconds remaining</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
