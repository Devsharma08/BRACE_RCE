import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Trophy,
  Crosshair,
  Clock,
  Shield,
  Target,
  ChevronLeft,
  Code,
  LogOut,
  Zap,
  BarChart2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../config/api";
import { useSocketInvalidation } from "../hooks/useSocketInvalidation";
import { CodeComparisonModal } from "../components/features/CodeComparisonModal";
import { useAuth } from "../context/AuthContext";
import { PageSkeleton } from "../components/ui/Skeleton";
import { useAnalytics } from "../hooks/useAnalytics";
import { useMyRating } from "../hooks/useLeaderboard";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
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

  // Post-battle wave: stats + history refresh, identity stays cached.
  useSocketInvalidation("leaderboard:invalidate", [
    ["profile-stats"],
    ["user-analytics"],
  ]);

  // Identity (username, avatar, email) — static per session.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const profileRes = await api.get("/profile");
      return profileRes.data.data as UserProfile;
    },
    staleTime: Infinity,
  });

  // Stats + match history — change after every battle.
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      const statsRes = await api.get("/profile/stats");
      return {
        stats: statsRes.data.stats as MatchStats,
        history: (statsRes.data.recentMatches || []) as MatchRecord[],
      };
    },
  });

  // Users land here intentionally to see their latest numbers — always
  // refetch analytics on mount even though the query is otherwise cached.
  const { data: analytics } = useAnalytics(true, true);

  const loading = profileLoading || statsLoading;
  const stats = statsData?.stats || null;
  const history = statsData?.history || [];

  if (loading) return <PageSkeleton />;

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
          pt-20 px-4 py-6 md:px-8 md:py-8
          pb-20 md:pb-8
        "
      >
        {/* Dot-grid texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

        <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">

          {/* ── HEADER / BACK NAVIGATION ──────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-white/6 pb-5">
            <Link
              to="/"
              className="flex items-center gap-2 text-subtle hover:text-accent text-xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Home
            </Link>
            <div className="border border-white/8 bg-raised px-3 py-1.5 text-subtle text-xs font-medium uppercase tracking-wider">
              Profile
            </div>
          </div>

          {/* ── IDENTITY CARD ───────────────────────────────────────────── */}
          <div className="border border-cyan-500/15 border-t-2 border-t-accent/40 bg-raised p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Avatar */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-elevated border border-white/8 flex items-center justify-center relative">
                  <span className="text-lg font-mono text-accent">
                    {(profile?.username || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00FF87] border-2 border-[#0c0f18] animate-pulse rounded-full" />
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <h1
                    className="text-lg sm:text-xl font-bold text-white truncate"
                    title={profile?.username}
                  >
                    {profile?.username || "Unknown"}
                  </h1>
                  <p
                    className="text-xs text-subtle mt-0.5 truncate"
                    title={profile?.email}
                  >
                    {profile?.email || ""}
                  </p>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {[
                      { label: "Battles", value: stats?.totalMatches ?? 0 },
                      { label: "Win Rate", value: `${stats?.winRate ?? 0}%` },
                      { label: "Score",    value: stats?.totalScore ?? 0    },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className="text-base font-black font-mono text-cyan-400">
                          {value}
                        </div>
                        <div className="text-[9px] text-[#4A5568] uppercase tracking-widest">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 border border-[#FF3B5C]/25 text-[#FF3B5C] hover:bg-[#FF3B5C]/8 text-xs font-medium transition-all self-start sm:self-auto shrink-0"
                aria-label="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>

          {/* ── STATS METRICS ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/5">
            {[
              { label: "Battles",   value: stats?.totalMatches ?? 0,   icon: Shield    },
              { label: "Wins",      value: stats?.wins ?? 0,           icon: Trophy    },
              { label: "Losses",    value: stats?.losses ?? 0,         icon: Target    },
              { label: "Win Rate",  value: `${stats?.winRate ?? 0}%`,  icon: Crosshair },
              { label: "Score",     value: stats?.totalScore ?? 0,     icon: Zap       },
              {
                label: "Avg Time",
                value: stats?.totalTimeMs
                  ? `${Math.round(stats.totalTimeMs / 60000)}m`
                  : "0m",
                icon: Clock,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-raised p-4 flex flex-col gap-1">
                <Icon className="w-3.5 h-3.5 text-[#4A5568]" />
                <span className="text-base font-extrabold text-white font-mono">{value}</span>
                <span className="text-[9px] text-subtle uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>

          {/* ── BATTLE LEDGER ────────────────────────────────────────────── */}
          <section aria-labelledby="history-heading">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-500/40" />
              <span
                id="history-heading"
                className="text-[11px] text-subtle font-mono font-bold uppercase tracking-widest"
              >
                Battle history
              </span>
              <hr className="flex-1 border-white/6" />
            </div>

            <div className="border border-cyan-500/15 border-t-2 border-t-accent/40 bg-raised">
              {history.length > 0 ? (
                <div className="flex flex-col">
                  {history.map(record => {
                    const isWin = record.status === "WIN";
                    return (
                      <div
                        key={record.id}
                        className={`flex flex-wrap items-center justify-between gap-3 border-b border-white/5 hover:bg-elevated px-4 py-3 transition-colors ${
                          isWin ? "bg-[#00FF87]/[0.015]" : "bg-[#FF3B5C]/[0.015]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-[3px] h-8 shrink-0 ${
                              isWin ? "bg-[#00FF87]" : "bg-[#FF3B5C]"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              {record.event?.commonProblem?.name ||
                                record.problem?.name ||
                                "Unknown Problem"}
                            </p>
                            <p className="text-[10px] text-subtle font-mono mt-0.5">
                              {new Date(record.createdAt).toLocaleDateString()} •{" "}
                              {record.status}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-xs font-bold ${
                              isWin ? "text-[#00FF87]" : "text-[#FF3B5C]"
                            }`}
                          >
                            {isWin ? "VICTORY" : "DEFEAT"}
                          </span>
                          {(record.event?.performances || record.submissions) && (
                            <button
                              onClick={() => {
                                const perfsToPass =
                                  record.event?.performances ||
                                  record.submissions ||
                                  [];
                                setSelectedPerformances(perfsToPass);
                              }}
                              className="px-3 py-1.5 border border-white/10 text-subtle hover:border-accent hover:text-accent text-xs font-medium transition-all"
                              aria-label="Review code from this match"
                            >
                              <Code className="w-3 h-3 inline mr-1" />
                              Review
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 flex flex-col items-center gap-3">
                  <Shield className="w-10 h-10 text-[#3D4657]" />
                  <p className="text-sm text-subtle">No match history yet</p>
                  <p className="text-xs text-[#4A5568]">
                    Complete a battle to start building your record
                  </p>
                  <Link
                    to="/lobby"
                    className="mt-2 text-xs text-accent hover:underline"
                  >
                    Enter lobby →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
          {analytics && (
            <section aria-labelledby="analytics-heading">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-cyan-500/40" />
                <span
                  id="analytics-heading"
                  className="text-[11px] text-subtle font-mono font-bold uppercase tracking-widest"
                >
                  Analytics
                </span>
                <hr className="flex-1 border-white/6" />
              </div>

              {/* Summary stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/5 mb-6">
                {[
                  { label: "SOLVED",   value: analytics.summary.totalSolved    },
                  { label: "BATTLES",  value: analytics.summary.totalMatches   },
                  { label: "WINS",     value: analytics.summary.wins           },
                  { label: "WIN RATE", value: `${analytics.summary.winRate}%`  },
                  { label: "ATTEMPTS", value: analytics.summary.totalAttempts  },
                  {
                    label: "AVG TIME",
                    value:
                      analytics.summary.avgSolveTimeMs > 0
                        ? `${Math.round(analytics.summary.avgSolveTimeMs / 60000)}m`
                        : "0m",
                  },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="bg-raised border border-cyan-500/10 p-3 flex flex-col gap-1"
                  >
                    <span className="text-[9px] text-[#4A5568] uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <span className="text-base font-extrabold text-white font-mono">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              <AnalyticsErrorBoundary>
                <AnalyticsPanels analytics={analytics} />
              </AnalyticsErrorBoundary>
            </section>
          )}
        </div>
      </main>

      {/* Code comparison modal */}
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
