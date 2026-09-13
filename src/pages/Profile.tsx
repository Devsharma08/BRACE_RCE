import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Trophy, Crosshair, Clock, Shield, Target, ChevronLeft, Code, LogOut, User, Zap, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../config/api";
import { CodeComparisonModal } from "../components/features/CodeComparisonModal";
import { useAuth } from "../context/AuthContext";
import { PageSkeleton } from "../components/ui/Skeleton";
import { useAnalytics } from "../hooks/useAnalytics";
import { useMyRating } from "../hooks/useLeaderboard";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import { AnalyticsPanels } from "../components/features/AnalyticsPanels";
import { AnalyticsErrorBoundary } from "../components/features/AnalyticsErrorBoundary";

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
  const { data: myRating } = useMyRating(true);

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

  const { data: analytics } = useAnalytics();

  const profile = data?.profile || null;
  const stats = data?.stats || null;
  const history = data?.history || [];

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex min-h-screen bg-[#050608] text-slate-100 font-mono relative overflow-x-hidden">
      {/* DESKTOP SIDEBAR */}
      <DashboardSidebar rating={myRating?.rating} />
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full relative pt-16 p-4 md:p-8 overflow-hidden">
      {/* Global dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] -z-10" />

      <div className="max-w-6xl mx-auto flex flex-col gap-6 relative z-10">

        {/* ── HEADER / BACK NAVIGATION ─────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/6 pb-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-[#8892A4] hover:text-[#00D4FF] text-xs transition-all"
          >
            <ChevronLeft className="w-4 h-4" />Home
          </Link>

          <div className="border border-white/8 bg-[#0c0f18] px-3 py-1.5 text-[#8892A4] text-xs font-medium uppercase tracking-wider">
            Profile
          </div>
        </div>

        {/* ── IDENTITY CARD ─────────────────────────────────────── */}
        <div className="border border-white/6 border-t-2 border-t-[#00D4FF]/40 bg-[#0c0f18] p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-18 h-18 bg-[#111520] border border-white/8 flex items-center justify-center relative">
              <span className="text-2xl font-mono text-[#00D4FF]">{(profile?.username || "?").slice(0, 2).toUpperCase()}</span>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00FF87] border-2 border-[#0c0f18]" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{profile?.username || "Unknown"}</h1>
              <p className="text-xs text-[#8892A4] mt-1">{profile?.email || ""}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <div className="text-xs text-[#00D4FF] font-mono font-bold">{stats?.totalMatches || 0}</div>
                  <div className="text-[9px] text-[#3D4657] uppercase">Battles</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#00D4FF] font-mono font-bold">{stats?.winRate || 0}%</div>
                  <div className="text-[9px] text-[#3D4657] uppercase">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#00D4FF] font-mono font-bold">{stats?.totalScore || 0}</div>
                  <div className="text-[9px] text-[#3D4657] uppercase">Score</div>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 border border-[#FF3B5C]/25 text-[#FF3B5C] hover:bg-[#FF3B5C]/7 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* ── STATS METRICS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/6">
          {[
            { label: "Battles", value: stats?.totalMatches || 0, icon: Shield },
            { label: "Wins", value: stats?.wins || 0, icon: Trophy },
            { label: "Losses", value: stats?.losses || 0, icon: Target },
            { label: "Win Rate", value: `${stats?.winRate || 0}%`, icon: Crosshair },
            { label: "Score", value: stats?.totalScore || 0, icon: Zap },
            { label: "Avg Time", value: stats?.totalTimeMs ? `${Math.round(stats.totalTimeMs / 60000)}m` : "0m", icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0c0f18] p-4 flex flex-col gap-1">
              <stat.icon className="w-3.5 h-3.5 text-[#3D4657]" />
              <span className="text-base font-extrabold text-white font-mono">{stat.value}</span>
              <span className="text-[9px] text-[#8892A4] uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── BATTLE LEDGER ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-sm font-semibold text-white">Battle history</span>
          </div>

          <div className="border border-white/6 border-t-2 border-t-[#00D4FF]/40 bg-[#0c0f18]">
            {history.length > 0 ? (
              <div className="flex flex-col">
                {history.map((record) => {
                  const isWin = record.status === "WIN";
                  return (
                    <div
                      key={record.id}
                      className={`flex items-center justify-between border-b border-white/5 hover:bg-[#111520] px-5 py-3 transition-colors ${
                        isWin ? "bg-[#00FF87]/[0.02]" : "bg-[#FF3B5C]/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-[3px] h-8 ${isWin ? "bg-[#00FF87]" : "bg-[#FF3B5C]"}`} />
                        <div>
                          <p className="text-sm text-white font-medium">
                            {record.event?.commonProblem?.name || record.problem?.name || "Unknown Problem"}
                          </p>
                          <p className="text-[10px] text-[#8892A4] font-mono mt-0.5">
                            {new Date(record.createdAt).toLocaleDateString()} • {record.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${isWin ? "text-[#00FF87]" : "text-[#FF3B5C]"}`}>
                          {isWin ? "VICTORY" : "DEFEAT"}
                        </span>
                        {(record.event?.performances || record.submissions) && (
                          <button
                            onClick={() => {
                              const perfsToPass = record.event?.performances || record.submissions || [];
                              setSelectedPerformances(perfsToPass);
                            }}
                            className="px-3 py-1.5 border border-white/10 text-[#8892A4] hover:border-[#00D4FF] hover:text-[#00D4FF] text-xs font-medium transition-all"
                          >
                            <Code className="w-3 h-3 inline mr-1" />
                            Review code
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3">
                <Shield className="w-10 h-10 text-[#3D4657]" />
                <p className="text-sm text-[#8892A4]">No match history yet</p>
                <p className="text-xs text-[#3D4657]">Complete a battle to start building your record</p>
                <Link to="/lobby" className="mt-2 text-xs text-[#00D4FF] hover:underline">
                  Enter lobby →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS ──────────────────────────────────────────── */}
        {analytics && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-semibold text-white">Analytics</span>
            </div>

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/6 mb-6">
              {[
                { label: "SOLVED", value: analytics.summary.totalSolved },
                { label: "BATTLES", value: analytics.summary.totalMatches },
                { label: "WINS", value: analytics.summary.wins },
                { label: "WIN RATE", value: `${analytics.summary.winRate}%` },
                { label: "ATTEMPTS", value: analytics.summary.totalAttempts },
                {
                  label: "AVG TIME",
                  value: analytics.summary.avgSolveTimeMs > 0
                    ? `${Math.round(analytics.summary.avgSolveTimeMs / 60000)}m`
                    : "0m",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#0c0f18] border border-white/6 p-3 flex flex-col gap-1"
                >
                  <span className="text-[9px] text-[#3D4657] uppercase tracking-wider">{stat.label}</span>
                  <span className="text-base font-extrabold text-white font-mono">{stat.value}</span>
                </div>
              ))}
            </div>

            <AnalyticsErrorBoundary>
              <AnalyticsPanels analytics={analytics} />
            </AnalyticsErrorBoundary>
          </div>
        )}

      </div>

      </main>

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
