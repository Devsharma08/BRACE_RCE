import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Trophy, Crosshair, Clock, Shield, Target, ChevronLeft, Hexagon, Code, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../config/api";
import { CodeComparisonModal } from "../components/features/CodeComparisonModal";
import { useAuth } from "../context/AuthContext";

import { PageSkeleton } from "../components/ui/Skeleton";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

interface MatchStats {
  totalMatches: number;
  wins: number;
  losses: number;
  totalScore: number;
  winRate: number;
  totalTimeMs: number;
}

interface MatchRecord {
  id: string;
  status: string;
  score: number;
  timeTakenMs: number | null;
  createdAt: string;
  event?: {
    commonProblem?: { name: string; difficulty_level: string };
    performances?: any[];
  };
  problem?: { name: string; difficulty_level: string };
  submissions?: any[];
}

const Profile = () => {
  const [selectedPerformances, setSelectedPerformances] = useState<any[] | null>(null);
  const { logout } = useAuth();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["user-profile-data"],
    queryFn: async () => {
      const [profileRes, statsRes] = await Promise.all([
        api.get("/profile"),
        api.get("/profile/stats"),
      ]);
      return {
        profile: profileRes.data.data as UserProfile,
        stats: statsRes.data.stats as MatchStats,
        history: (statsRes.data.recentMatches || []) as MatchRecord[],
      };
    },
  });

  const profile = data?.profile || null;
  const stats = data?.stats || null;
  const history = data?.history || [];

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 p-6 md:p-12 font-sans relative overflow-hidden">
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER / BACK NAVIGATION */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-6">
          <Link to="/" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-mono text-xs tracking-widest transition-all">
            <ChevronLeft className="w-4 h-4" /> [ MAINFRAME ]
          </Link>
          <div className="flex items-center gap-2 text-slate-500 font-mono text-xs tracking-widest">
            <Hexagon className="w-4 h-4 text-cyan-500" /> OPERATIVE PROFILE
          </div>
        </div>

        {/* TOP ROW: PROFILE CARD & STATS OVERVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: IDENTITY DOSSIER */}
          <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center text-center shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-rose-500" />
            
            <div className="relative mb-4 mt-2">
              <img 
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-2 border-cyan-500/50 p-1 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black" />
            </div>

            <h1 className="font-mono text-xl font-bold tracking-widest text-white mb-1 uppercase">
              {profile?.username}
            </h1>
            <p className="font-mono text-xs text-slate-400 mb-4">{profile?.email}</p>

            <button
              onClick={logout}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/40 hover:border-rose-400 rounded-xl text-rose-300 hover:text-rose-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            >
              <LogOut className="w-4 h-4" />
              <span>[ TERMINATE SESSION ]</span>
            </button>

            <div className="w-full grid grid-cols-2 gap-3 font-mono text-xs mt-6">
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block mb-1">DESIGNATION</span>
                <span className="text-cyan-400 font-bold">CYBER_CLASS_I</span>
              </div>
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block mb-1">STATUS</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* CENTER/RIGHT: METRICS GRID */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <Crosshair className="w-5 h-5 text-cyan-400 mb-4" />
              <div>
                <p className="text-xs text-slate-500 font-mono tracking-widest mb-1">ENGAGEMENTS</p>
                <p className="text-2xl font-mono font-bold text-white">{stats?.totalMatches || 0}</p>
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <Trophy className="w-5 h-5 text-emerald-400 mb-4" />
              <div>
                <p className="text-xs text-slate-500 font-mono tracking-widest mb-1">SUCCESSES</p>
                <p className="text-2xl font-mono font-bold text-emerald-400">{stats?.wins || 0}</p>
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-rose-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <Target className="w-5 h-5 text-rose-400 mb-4" />
              <div>
                <p className="text-xs text-slate-500 font-mono tracking-widest mb-1">WIN RATE</p>
                <p className="text-2xl font-mono font-bold text-rose-400">{stats?.winRate || 0}%</p>
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <Clock className="w-5 h-5 text-amber-400 mb-4" />
              <div>
                <p className="text-xs text-slate-500 font-mono tracking-widest mb-1">TIME IN FIELD</p>
                <p className="text-2xl font-mono font-bold text-amber-400">
                  {stats?.totalTimeMs ? `${Math.round(stats.totalTimeMs / 60000)}m` : "0m"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: MATCH HISTORY LEDGER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-3">
            <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl flex flex-col h-full max-h-[800px]">
              <div className="p-6 border-b border-cyan-500/20 bg-cyan-950/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-widest flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  BATTLE LEDGER & CODE REVIEWS
                </h2>
                <span className="text-xs text-cyan-500/60 tracking-widest">LAST 10 ENGAGEMENTS</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                    <Activity className="w-12 h-12 mb-4" />
                    <p>NO COMBAT RECORDS FOUND</p>
                  </div>
                ) : (
                  history.map((record) => {
                    const isWin = record.status === "WON" || record.status === "PASSED";
                    const isLoss = record.status === "LOST" || record.status === "FAILED" || record.status === "SURRENDER";
                    const problemName = record.event?.commonProblem?.name || record.problem?.name || "BATTLE OPERATION";
                    const diffLevel = record.event?.commonProblem?.difficulty_level || record.problem?.difficulty_level || "MEDIUM";

                    const bestSub = record.submissions?.find((s: any) => s.isBestSubmission) || record.submissions?.[0];

                    return (
                      <div 
                        key={record.id} 
                        className={`flex items-center justify-between p-4 rounded-xl border bg-black/40 transition-all hover:bg-black/60
                          ${isWin ? "border-emerald-500/30" : isLoss ? "border-rose-500/30" : "border-slate-800"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 rounded-full ${isWin ? "bg-emerald-500" : isLoss ? "bg-rose-500" : "bg-slate-500"}`} />
                          <div>
                            <p className="text-white font-bold text-sm tracking-wider mb-1 flex items-center gap-2">
                              {problemName}
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                diffLevel === 'HARD' ? 'bg-rose-500/20 text-rose-400' : diffLevel === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {diffLevel}
                              </span>
                            </p>
                            <div className="flex gap-4 text-xs font-mono text-slate-500">
                              <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                              {bestSub?.runtimeMs !== undefined && (
                                <span className="text-cyan-400">Runtime: {bestSub.runtimeMs}ms</span>
                              )}
                              {bestSub?.memoryKb !== undefined && (
                                <span className="text-cyan-400">Memory: {bestSub.memoryKb >= 1024 ? `${(bestSub.memoryKb/1024).toFixed(1)}MB` : `${bestSub.memoryKb}KB`}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right font-mono">
                            <p className={`font-bold tracking-widest text-sm ${isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"}`}>
                              {record.status}
                            </p>
                            <p className="text-xs text-amber-400 font-bold tracking-widest mt-0.5">
                              +{record.score || 0} PTS
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              const perfsToPass = (record.event?.performances && record.event.performances.length > 0)
                                ? record.event.performances
                                : [{
                                    userId: profile?.id || "",
                                    user: { id: profile?.id || "", username: profile?.username || "YOU", avatarUrl: profile?.avatarUrl || "" },
                                    submissions: record.submissions || [],
                                    score: record.score || 0,
                                    timeTakenMs: record.timeTakenMs
                                  }];
                              setSelectedPerformances(perfsToPass);
                            }}
                            className="px-3 py-2 bg-cyan-950/40 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white rounded-lg font-mono text-xs font-bold tracking-widest transition-all flex items-center gap-1.5"
                          >
                            <Code className="w-3.5 h-3.5" /> [ REVIEW CODE ]
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {selectedPerformances && (
        <CodeComparisonModal
          currentUserId={profile?.id || ""}
          performances={selectedPerformances}
          onClose={() => setSelectedPerformances(null)}
          onReturnHome={() => setSelectedPerformances(null)}
        />
      )}
    </div>
  );
};

export default Profile;
