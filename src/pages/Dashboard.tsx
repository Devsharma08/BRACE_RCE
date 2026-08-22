import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/authContext";
import { useSocket } from "../context/socketContext";
import DashboardSidebar from "../components/DashboardSidebar";
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
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

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

  // Countdown timer for Match Found Phase 2
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
  
  // Dynamic rating calculation from user wins/losses or profile rating
  const userRating = (user as any)?.rating || profile?.rating || Math.max(1000, 1000 + (wins * 25) - (losses * 10));

  // Format waiting time as MM:SS (e.g. 00:18)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-slate-100 font-mono relative overflow-x-hidden select-none">
      {/* BACKGROUND ACCENTS */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] z-0" />
      <div className="fixed top-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* 1. DESKTOP SIDEBAR (Fixed 245px) */}
      <DashboardSidebar rating={userRating} />

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 ml-[245px] p-6 lg:p-8 flex flex-col gap-6 max-w-[1400px] z-10 relative">
        {/* HEADER BAR */}
        <header className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>Good {timeOfDay},</span>
              <span className="text-cyan-400">{username}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Ready for your next battle?</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/profile")}
              className="relative p-2 text-slate-400 hover:text-cyan-400 transition-colors border border-cyan-500/20 rounded bg-cyan-950/20 cursor-pointer"
              title="Operative Settings"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </button>

            <div
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 bg-cyan-950/40 rounded text-xs font-bold text-cyan-300 cursor-pointer hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>◉ {username.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* 3. VISUAL HERO COMPONENT: FIND OPPONENT */}
        <section className="w-full relative rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-950/60 via-slate-950/90 to-cyan-950/60 p-8 flex flex-col items-center justify-center gap-5 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none" />

          {/* CARD HEADER */}
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold tracking-[0.3em] uppercase">
            <Swords className="w-5 h-5 text-cyan-400" />
            <span>⚔ FIND OPPONENT</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-black tracking-[0.2em] text-white text-center">
            1v1 RANKED BATTLE
          </h2>

          {/* MAIN CTA BUTTON */}
          <button
            onClick={() => findMatch("ANY")}
            disabled={matchmakingStatus !== "IDLE"}
            className="group relative px-10 py-4 border border-cyan-400 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-base tracking-[0.2em] uppercase rounded transition-all duration-200 cursor-pointer shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Swords className="w-5 h-5" />
              <span>[ FIND MATCH ]</span>
            </span>
          </button>

          {/* FOOTER STATS */}
          <p className="text-xs font-mono text-slate-400 tracking-wider">
            Online Status: Active · 1v1 Queue Live
          </p>
        </section>

        {/* 4. STATS GRID (4 Cards) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: RATING */}
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-4 flex flex-col gap-1 shadow-[0_0_15px_rgba(6,182,212,0.03)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              RATING
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{userRating.toLocaleString()}</span>
              <span className="text-xs font-bold text-emerald-400">+{wins * 25}</span>
            </div>
          </div>

          {/* CARD 2: WINS */}
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-4 flex flex-col gap-1 shadow-[0_0_15px_rgba(6,182,212,0.03)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              WINS
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{wins}</span>
              <span className="text-xs font-bold text-cyan-400">{totalMatches} matches</span>
            </div>
          </div>

          {/* CARD 3: WIN RATE */}
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-4 flex flex-col gap-1 shadow-[0_0_15px_rgba(6,182,212,0.03)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              WIN RATE
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{winRate}%</span>
              <Percent className="w-4 h-4 text-cyan-400/50" />
            </div>
          </div>

          {/* CARD 4: STREAK */}
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-4 flex flex-col gap-1 shadow-[0_0_15px_rgba(6,182,212,0.03)]">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              MATCHES
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{totalMatches}</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </section>

        {/* 5. TWO-COLUMN ANALYTICS SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RATING HISTORY */}
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                RATING PROGRESSION
              </span>
              <span className="text-[10px] text-slate-500">Live DB Rating Curve</span>
            </div>

            {/* SPARKLINE CHART GRAPH */}
            <div className="h-40 w-full relative flex items-end pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
                <defs>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 Q50,65 100,70 T200,40 T300,20 L300,100 L0,100 Z"
                  fill="url(#ratingGrad)"
                />
                <path
                  d="M0,80 Q50,65 100,70 T200,40 T300,20"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="0" cy="80" r="4" fill="#06b6d4" />
                <circle cx="100" cy="70" r="4" fill="#06b6d4" />
                <circle cx="200" cy="40" r="4" fill="#06b6d4" />
                <circle cx="300" cy="20" r="5" fill="#38bdf8" />
              </svg>
            </div>
          </div>

          {/* RECENT BATTLES */}
          <div className="rounded border border-cyan-500/20 bg-slate-950/60 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                RECENT BATTLES
              </span>
              <span className="text-[10px] text-slate-500">Live Performance History</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {recentBattles.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  NO BATTLES RECORDED YET. CLICK [ FIND MATCH ] TO PLAY!
                </div>
              ) : (
                recentBattles.slice(0, 4).map((b, idx) => {
                  const isWin = b.status === "WON" || b.status === "PASSED";
                  const oppName = b.event?.performances?.find((p: any) => p.userId !== user?.id)?.user?.username || "Opponent";
                  return (
                    <div
                      key={b.id || idx}
                      className="flex items-center justify-between p-3 rounded border border-white/5 bg-black/40 hover:border-cyan-500/30 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-black text-xs ${
                            isWin
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                          }`}
                        >
                          {isWin ? "W" : "L"}
                        </span>
                        <span className="text-slate-200 font-bold">
                          {username} <span className="text-slate-500 font-normal">vs</span> {oppName}
                        </span>
                      </div>

                      <span
                        className={`font-bold ${
                          isWin ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isWin ? "+25" : "-10"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* 6. CONTINUE CODING SECTION */}
        <section className="rounded border border-cyan-500/20 bg-slate-950/60 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              CONTINUE CODING
            </span>
            <button
              onClick={() => navigate("/problems")}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View All Problems <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {recommendedProblems.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                LOADING SYSTEM PROBLEMS...
              </div>
            ) : (
              recommendedProblems.map((p, i) => (
                <div
                  key={p.id || i}
                  onClick={() => navigate(`/terminal?oid=${p.github_oid || p.id}`)}
                  className="flex items-center justify-between p-3.5 rounded border border-white/5 bg-black/40 hover:border-cyan-500/40 hover:bg-cyan-950/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded border border-amber-500/30 bg-amber-950/30 text-amber-400 font-bold uppercase">
                      {p.difficulty_level || "MEDIUM"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <button className="px-3 py-1 bg-cyan-500/20 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-black border border-cyan-500/40 font-bold rounded transition-all flex items-center gap-1">
                      <span>[ CODE ]</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 7. MATCHMAKING SCREEN OVERLAYS (Phase 1 & Phase 2)          */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* PHASE 1: SEARCHING FOR OPPONENT MODAL */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md rounded-lg border border-cyan-500/50 bg-[#07090e] p-8 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

            <h3 className="text-lg font-black text-cyan-400 tracking-[0.3em] uppercase">
              SEARCHING FOR OPPONENT
            </h3>

            {/* ANIMATED PULSE DOTS */}
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping [animation-delay:200ms]" />
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping [animation-delay:400ms]" />
            </div>

            {/* WAITING TIMER TICKER */}
            <div className="text-5xl font-black text-white font-mono tracking-widest my-2">
              {formatTime(waitingTime)}
            </div>

            <p className="text-xs text-slate-400 font-mono tracking-wider text-center">
              Looking for similar rating...
            </p>

            {/* RATING BOUNDS */}
            <div className="w-full border border-cyan-500/20 bg-cyan-950/20 rounded p-3 flex justify-between text-xs text-slate-300 font-mono">
              <span>Rating: <strong className="text-cyan-400">{userRating}</strong></span>
              <span>Range: <strong className="text-cyan-400">±100</strong></span>
            </div>

            {/* CANCEL QUEUE BUTTON */}
            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs tracking-[0.2em] uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>[ CANCEL QUEUE ]</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: MATCH FOUND ACCEPT SCREEN */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none animate-fade-in">
          <div className="w-full max-w-xl rounded-lg border border-cyan-400 bg-[#07090e] p-8 flex flex-col items-center gap-6 shadow-[0_0_60px_rgba(6,182,212,0.4)] relative">
            {/* VERSUS CARDS */}
            <div className="w-full grid grid-cols-5 items-center gap-2">
              {/* YOU */}
              <div className="col-span-2 rounded border border-cyan-500/40 bg-cyan-950/30 p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase mb-1">YOU</span>
                <span className="text-base font-black text-white tracking-wide truncate max-w-full">
                  {username}
                </span>
                <span className="text-xs text-slate-400 font-mono mt-1">{userRating}</span>
              </div>

              {/* VS */}
              <div className="col-span-1 flex items-center justify-center">
                <span className="text-xl font-black text-rose-500 tracking-widest italic animate-pulse">
                  VS
                </span>
              </div>

              {/* OPPONENT */}
              <div className="col-span-2 rounded border border-rose-500/40 bg-rose-950/30 p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase mb-1">OPPONENT</span>
                <span className="text-base font-black text-white tracking-wide truncate max-w-full">
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-slate-400 font-mono mt-1">1250</span>
              </div>
            </div>

            {/* HEADLINE */}
            <div className="flex items-center gap-2 text-2xl font-black text-cyan-400 tracking-[0.25em] uppercase my-1">
              <Swords className="w-6 h-6 text-cyan-400 animate-bounce" />
              <span>⚡ MATCH FOUND</span>
            </div>

            {/* ACCEPT BUTTON */}
            <button
              onClick={acceptMatch}
              className="w-full py-4 border border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm tracking-[0.2em] uppercase rounded transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>[ ACCEPT ]</span>
            </button>

            {/* TIMER COUNTDOWN */}
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
              <span className="text-amber-400 font-bold">{acceptTimer}</span> seconds remaining
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
