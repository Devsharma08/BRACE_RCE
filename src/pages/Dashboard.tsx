import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import { api } from "../config/api";
import {
  Swords,
  Bell,
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

  const username = user?.username || profile?.username || "OPERATIVE";
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const totalMatches = stats?.totalMatches || 0;
  const winRate = stats?.winRate || (totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0);
  const userRating = (user as any)?.rating || profile?.rating || Math.max(1000, 1000 + (wins * 25) - (losses * 10));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex min-h-screen bg-[#02040a] text-slate-100 font-mono relative overflow-x-hidden select-none">
      {/* Global dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] z-0" />
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/5 blur-3xl pointer-events-none z-0" />

      {/* 1. DESKTOP SIDEBAR */}
      <DashboardSidebar rating={userRating} />

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 ml-0 md:ml-[245px] w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-0 max-w-[1400px] z-10 relative">

        {/* HEADER BAR */}
        <header className="flex items-center justify-between border-b-2 border-white/10 pb-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-2 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMMAND CENTER</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide flex items-center gap-2">
              <span className="text-slate-400 font-bold text-base">GOOD {timeOfDay},</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">{username.toUpperCase()}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 tracking-wider">READY FOR YOUR NEXT BATTLE?</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="relative p-2 text-slate-400 hover:text-cyan-400 transition-colors border border-white/10 hover:border-cyan-500/40 bg-[#06080e] rounded-none cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </button>

            <div
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-white/20 border-l-4 border-l-cyan-500/70 bg-[#06080e] text-xs font-bold text-cyan-300 cursor-pointer hover:border-cyan-400 transition-all shadow-[0_0_12px_rgba(6,182,212,0.08)]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>◉ {username.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* 3. FIND OPPONENT HERO */}
        <section className="w-full relative rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-8 flex flex-col items-center justify-center gap-5 overflow-hidden mb-6">
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08),transparent_70%)] pointer-events-none" />

          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase relative z-10">
            <Swords className="w-4 h-4 text-cyan-400" />
            <span>⚔ FIND OPPONENT</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-[0.15em] text-white text-center relative z-10">
            1v1 RANKED BATTLE
          </h2>

          <button
            onClick={() => findMatch("ANY")}
            disabled={matchmakingStatus !== "IDLE"}
            className="group relative px-10 py-4 rounded-none border border-cyan-400 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-50 z-10 flex items-center gap-2"
          >
            <Swords className="w-4 h-4" />
            <span>[ FIND MATCH ]</span>
          </button>

          <p className="text-xs text-slate-400 tracking-wider relative z-10">
            Online Status: Active · 1v1 Queue Live
          </p>
        </section>

        {/* 4. STATS GRID — border-b divider */}
        <div className="border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400">PERFORMANCE METRICS</span>
          </div>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "RATING", value: userRating.toLocaleString(), sub: `+${wins * 25}`, subColor: "text-emerald-400", icon: TrendingUp, edge: "border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60" },
              { label: "WINS", value: wins, sub: `${totalMatches} matches`, subColor: "text-cyan-400", icon: Trophy, edge: "border-l-4 border-b-4 border-l-emerald-500/60 border-b-emerald-500/60" },
              { label: "WIN RATE", value: `${winRate}%`, sub: null, subColor: "", icon: Percent, edge: "border-t-4 border-r-4 border-t-amber-500/60 border-r-amber-500/60" },
              { label: "MATCHES", value: totalMatches, sub: null, subColor: "", icon: Flame, edge: "border-t-4 border-l-4 border-t-rose-500/60 border-l-rose-500/60" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`rounded-none border border-white/20 bg-[#06080e] p-4 flex flex-col gap-1 relative overflow-hidden ${stat.edge}`}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{stat.label}</span>
                    <Icon className="w-3.5 h-3.5 text-cyan-400/50" />
                  </div>
                  <div className="flex items-baseline justify-between relative z-10">
                    <span className="text-2xl font-extrabold text-white">{stat.value}</span>
                    {stat.sub && <span className={`text-xs font-bold ${stat.subColor}`}>{stat.sub}</span>}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* 5. TWO-COLUMN ANALYTICS — border-b divider */}
        <div className="border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400">ANALYTICS</span>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rating Progression */}
            <div className="rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60 bg-[#06080e] p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  RATING PROGRESSION
                </span>
                <span className="text-[10px] text-slate-500 tracking-wider">Live DB Rating Curve</span>
              </div>

              <div className="h-40 w-full relative flex items-end pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
                  <defs>
                    <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,80 Q50,65 100,70 T200,40 T300,20 L300,100 L0,100 Z" fill="url(#ratingGrad)" />
                  <path d="M0,80 Q50,65 100,70 T200,40 T300,20" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="0" cy="80" r="3.5" fill="#06b6d4" />
                  <circle cx="100" cy="70" r="3.5" fill="#06b6d4" />
                  <circle cx="200" cy="40" r="3.5" fill="#06b6d4" />
                  <circle cx="300" cy="20" r="4.5" fill="#38bdf8" />
                </svg>
              </div>
            </div>

            {/* Recent Battles */}
            <div className="rounded-none border border-white/20 border-l-4 border-b-4 border-l-emerald-500/60 border-b-emerald-500/60 bg-[#06080e] p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  RECENT BATTLES
                </span>
                <span className="text-[10px] text-slate-500 tracking-wider">Live Performance History</span>
              </div>

              <div className="flex flex-col gap-2.5 relative z-10">
                {recentBattles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    NO BATTLES RECORDED YET. CLICK [ FIND MATCH ] TO PLAY!
                  </div>
                ) : (
                  recentBattles.slice(0, 4).map((b, idx) => {
                    const isWin = b.status === "WON" || b.status === "PASSED";
                    const oppName = b.event?.performances?.find((p: any) => p.userId !== user?.id)?.user?.username || "Opponent";
                    return (
                      <div
                        key={b.id || idx}
                        className="flex items-center justify-between p-3 rounded-none border border-white/5 bg-black/40 hover:border-cyan-500/20 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-none flex items-center justify-center font-extrabold text-xs ${isWin ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40" : "bg-rose-950/80 text-rose-400 border border-rose-500/40"}`}>
                            {isWin ? "W" : "L"}
                          </span>
                          <span className="text-slate-200 font-bold">
                            {username} <span className="text-slate-500 font-normal">vs</span> {oppName}
                          </span>
                        </div>
                        <span className={`font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                          {isWin ? "+25" : "-10"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 6. CONTINUE CODING */}
        <div className="pb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400">CONTINUE CODING</span>
          </div>

          <section className="rounded-none border border-white/20 border-t-4 border-l-4 border-t-cyan-500/60 border-l-cyan-500/60 bg-[#06080e] p-5 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                RECOMMENDED PROBLEMS
              </span>
              <button
                onClick={() => navigate("/problems")}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 relative z-10">
              {recommendedProblems.length === 0 ? (
                <TableSkeleton rows={4} />
              ) : (
                recommendedProblems.map((p, i) => (
                  <div
                    key={p.id || i}
                    onClick={() => navigate(`/terminal?oid=${p.github_oid || p.id}${p.name ? `&file=${encodeURIComponent(p.name)}` : ""}`)}
                    className="flex items-center justify-between p-3.5 rounded-none border border-white/5 bg-black/40 hover:border-cyan-500/30 hover:bg-cyan-950/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {p.name}
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-none border border-amber-500/30 bg-amber-950/30 text-amber-400 font-bold uppercase">
                        {p.difficulty_level || "MEDIUM"}
                      </span>
                    </div>

                    <button className="px-3 py-1 rounded-none bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-black border border-cyan-500/40 font-bold text-xs transition-all flex items-center gap-1">
                      <span>[ CODE ]</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 7. MATCHMAKING OVERLAYS                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* PHASE 1: SEARCHING */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md rounded-none border border-cyan-500/50 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-8 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

            <h3 className="text-lg font-extrabold text-cyan-400 tracking-[0.3em] uppercase relative z-10">
              SEARCHING FOR OPPONENT
            </h3>

            <div className="flex items-center gap-3 relative z-10">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping [animation-delay:200ms]" />
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping [animation-delay:400ms]" />
            </div>

            <div className="text-5xl font-extrabold text-white font-mono tracking-widest my-2 relative z-10">
              {formatTime(waitingTime)}
            </div>

            <p className="text-xs text-slate-400 tracking-wider text-center relative z-10">
              Looking for similar rating...
            </p>

            <div className="w-full border border-white/10 bg-[#02040a] p-3 flex justify-between text-xs text-slate-300 relative z-10">
              <span>Rating: <strong className="text-cyan-400">{userRating}</strong></span>
              <span>Range: <strong className="text-cyan-400">±100</strong></span>
            </div>

            <button
              onClick={cancelMatch}
              className="w-full py-3 rounded-none border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs tracking-[0.2em] uppercase transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 relative z-10"
            >
              <X className="w-4 h-4" />
              <span>[ CANCEL QUEUE ]</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: MATCH FOUND */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none">
          <div className="w-full max-w-xl rounded-none border border-cyan-400 border-r-4 border-b-4 border-r-cyan-400 border-b-cyan-400 bg-[#06080e] p-8 flex flex-col items-center gap-6 shadow-[0_0_60px_rgba(6,182,212,0.35)] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* VS Cards */}
            <div className="w-full grid grid-cols-5 items-center gap-2 relative z-10">
              <div className="col-span-2 rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60 bg-[#02040a] p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase mb-1">YOU</span>
                <span className="text-base font-extrabold text-white tracking-wide truncate max-w-full">{username}</span>
                <span className="text-xs text-slate-400 mt-1">{userRating}</span>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <span className="text-xl font-extrabold text-rose-500 tracking-widest italic animate-pulse">VS</span>
              </div>

              <div className="col-span-2 rounded-none border border-white/20 border-l-4 border-b-4 border-l-rose-500/60 border-b-rose-500/60 bg-[#02040a] p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase mb-1">OPPONENT</span>
                <span className="text-base font-extrabold text-white tracking-wide truncate max-w-full">
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-slate-400 mt-1">1250</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-2xl font-extrabold text-cyan-400 tracking-[0.25em] uppercase my-1 relative z-10">
              <Swords className="w-6 h-6 text-cyan-400 animate-bounce" />
              <span>⚡ MATCH FOUND</span>
            </div>

            <button
              onClick={acceptMatch}
              className="w-full py-4 rounded-none border border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-[0.2em] uppercase transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-2 relative z-10"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>[ ACCEPT ]</span>
            </button>

            <p className="text-xs text-slate-400 tracking-widest uppercase relative z-10">
              <span className="text-amber-400 font-bold">{acceptTimer}</span> seconds remaining
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
