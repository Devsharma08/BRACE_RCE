import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Trophy, Crosshair, Clock, Shield, Target, ChevronLeft, Code, LogOut, User, Zap } from "lucide-react";
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
    <div className="min-h-screen bg-[#02040a] text-slate-100 p-6 md:p-10 font-mono relative overflow-hidden">
      {/* Global dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] -z-10" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-500/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto flex flex-col gap-8 relative z-10">

        {/* ── HEADER / BACK NAVIGATION ─────────────────────────── */}
        <div className="flex items-center justify-between border-b-2 border-white/10 pb-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-xs tracking-widest transition-all"
          >
            <ChevronLeft className="w-4 h-4" />[ MAINFRAME ]
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>OPERATIVE PROFILE</span>
          </div>
        </div>

        {/* ── TOP ROW: IDENTITY CARD + METRICS ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: IDENTITY DOSSIER */}
          <div className="relative rounded-none border border-white/20 border-l-4 border-b-4 border-l-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] p-6 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
            {/* Top accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-rose-500" />

            <div className="relative mb-4 mt-3">
              <img
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
                alt="Avatar"
                className="w-20 h-20 rounded-none border-2 border-cyan-500/40 p-0.5 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
              />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#06080e]" />
            </div>

            <h1 className="text-lg font-extrabold tracking-widest text-white mb-1 uppercase">
              {profile?.username}
            </h1>
            <p className="text-xs text-slate-400 mb-5 font-sans">{profile?.email}</p>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-none bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-rose-200 text-xs font-bold tracking-wider transition-all cursor-pointer relative z-10"
            >
              <LogOut className="w-4 h-4" />
              <span>[ TERMINATE SESSION ]</span>
            </button>

            <div className="w-full grid grid-cols-2 gap-3 mt-5 relative z-10">
              <div className="rounded-none border border-white/10 bg-black/50 p-3">
                <span className="text-slate-500 text-[10px] block mb-1 tracking-widest">DESIGNATION</span>
                <span className="text-cyan-400 font-extrabold text-xs">CYBER_CLASS_I</span>
              </div>
              <div className="rounded-none border border-white/10 bg-black/50 p-3">
                <span className="text-slate-500 text-[10px] block mb-1 tracking-widest">STATUS</span>
                <span className="text-emerald-400 font-extrabold text-xs">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* CENTER/RIGHT: METRICS GRID */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Section badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 self-start rounded-none border border-slate-700/60 bg-[#06080e] text-slate-400 text-xs font-bold uppercase tracking-widest">
              <User className="w-3.5 h-3.5" />
              <span>PERFORMANCE METRICS</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Crosshair, label: "ENGAGEMENTS", value: stats?.totalMatches || 0, color: "text-cyan-400", borderClass: "border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60" },
                { icon: Trophy, label: "SUCCESSES", value: stats?.wins || 0, color: "text-emerald-400", borderClass: "border-l-4 border-b-4 border-l-emerald-500/60 border-b-emerald-500/60" },
                { icon: Target, label: "WIN RATE", value: `${stats?.winRate || 0}%`, color: "text-rose-400", borderClass: "border-t-4 border-r-4 border-t-rose-500/60 border-r-rose-500/60" },
                { icon: Clock, label: "TIME IN FIELD", value: stats?.totalTimeMs ? `${Math.round(stats.totalTimeMs / 60000)}m` : "0m", color: "text-amber-400", borderClass: "border-t-4 border-l-4 border-t-amber-500/60 border-l-amber-500/60" },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className={`relative rounded-none border border-white/20 bg-[#06080e] p-5 flex flex-col justify-between overflow-hidden ${metric.borderClass}`}
                  >
                    <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
                    <Icon className={`w-4 h-4 mb-3 ${metric.color}`} />
                    <div>
                      <p className="text-[10px] text-slate-500 tracking-widest mb-1 uppercase">{metric.label}</p>
                      <p className={`text-2xl font-extrabold ${metric.color}`}>{metric.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BATTLE LEDGER ─────────────────────────────────────── */}
        <div>
          {/* Section badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-5 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>BATTLE LEDGER // CODE REVIEWS</span>
          </div>

          <div className="relative rounded-none border border-white/20 border-r-4 border-b-4 border-r-cyan-500/70 border-b-cyan-500/70 bg-[#06080e] flex flex-col max-h-[700px] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Table header */}
            <div className="p-5 border-b border-white/10 bg-[#02040a]/60 flex items-center justify-between relative z-10">
              <h2 className="text-sm font-extrabold text-white tracking-widest flex items-center gap-3">
                <Shield className="w-4 h-4 text-cyan-400" />
                BATTLE LEDGER & CODE REVIEWS
              </h2>
              <span className="text-xs text-slate-500 tracking-widest">LAST 10 ENGAGEMENTS</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 relative z-10" style={{ scrollbarWidth: "none" }}>
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 py-16">
                  <Activity className="w-10 h-10 mb-4" />
                  <p className="text-xs tracking-widest">NO COMBAT RECORDS FOUND</p>
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
                      className={`flex items-center justify-between p-4 rounded-none border bg-black/40 transition-all hover:bg-black/60 ${isWin ? "border-emerald-500/30" : isLoss ? "border-rose-500/30" : "border-white/10"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-12 ${isWin ? "bg-emerald-500" : isLoss ? "bg-rose-500" : "bg-slate-500"}`} />
                        <div>
                          <p className="text-white font-bold text-sm tracking-wider mb-1 flex items-center gap-2">
                            {problemName}
                            <span className={`text-[10px] px-2 py-0.5 rounded-none font-extrabold border ${
                              diffLevel === "HARD" ? "bg-rose-950/40 text-rose-400 border-rose-500/30" :
                              diffLevel === "MEDIUM" ? "bg-amber-950/40 text-amber-400 border-amber-500/30" :
                              "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                            }`}>
                              {diffLevel}
                            </span>
                          </p>
                          <div className="flex gap-4 text-xs text-slate-500 font-sans">
                            <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                            {bestSub?.runtimeMs !== undefined && (
                              <span className="text-cyan-400">Runtime: {bestSub.runtimeMs}ms</span>
                            )}
                            {bestSub?.memoryKb !== undefined && (
                              <span className="text-cyan-400">
                                Memory: {bestSub.memoryKb >= 1024 ? `${(bestSub.memoryKb / 1024).toFixed(1)}MB` : `${bestSub.memoryKb}KB`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className={`font-extrabold tracking-widest text-sm ${isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-slate-400"}`}>
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
                                  timeTakenMs: record.timeTakenMs,
                                }];
                            setSelectedPerformances(perfsToPass);
                          }}
                          className="px-3 py-2 rounded-none bg-cyan-950/40 hover:bg-cyan-600 border border-cyan-500/40 hover:border-cyan-300 text-cyan-200 hover:text-white text-xs font-bold tracking-widest transition-all flex items-center gap-1.5"
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
