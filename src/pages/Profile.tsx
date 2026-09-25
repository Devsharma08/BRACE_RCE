import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Trophy,
  Crosshair,
  Clock,
  Shield,
  Target,
  Code,
  Zap,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../config/api";
import { useSocketInvalidation } from "../hooks/useSocketInvalidation";
import { CodeComparisonModal } from "../components/features/CodeComparisonModal";
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
    <div className="flex min-h-screen bg-base text-fg font-mono">

      {/* Desktop sidebar */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main
        className="
          flex-1 min-w-0 w-full
          ml-0 md:ml-[var(--sidebar-width)]
          pt-14 px-4 py-6 md:px-8 md:py-8
          pb-20 md:pb-8
        "
      >
        {/* Dot-grid texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 relative z-10">

          {/* ── HEADER / BACK NAVIGATION ──────────────────────────────── */}
          <div className="flex items-center justify-between border-b border-line pb-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-subtle transition hover:text-accent-primary"
            >
              <ArrowLeft size={14} />
              Return to dashboard
            </Link>
            <span className="border border-line bg-surface px-3 py-1.5 text-[9px] uppercase tracking-widest text-subtle">
              Profile / operative record
            </span>
          </div>

          {/* ── IDENTITY CARD ───────────────────────────────────────────── */}
          <section className="mt-6 overflow-hidden rounded-panel border border-line-mid bg-surface shadow-panel">
            <div className="border-b border-line bg-surface-hover/40 px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              <div className="flex items-center justify-between">
                <span>BRACE // operative report</span>
                <span>Record 001 / active</span>
              </div>
            </div>
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_.9fr]">
              <div className="flex gap-5">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-accent-primary/30 bg-accent-primary/10 text-xl font-bold text-accent-primary">
                  OP
                  <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-surface bg-accent-success" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">Operative identity</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg">
                    {profile?.username || "OPERATIVE"}
                  </h1>
                  <p className="mt-1 text-xs text-subtle">
                    {profile?.email || "operative@brace-rce.local"}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-widest text-faint">
                    <span>status <b className="text-accent-success">online</b></span>
                    <span>rank <b className="text-fg">unlisted</b></span>
                    <span>signal <b className="text-accent-primary">nominal</b></span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-l border-line pl-0 lg:pl-8">
                {[
                  [stats?.totalMatches ?? 0, "battles"],
                  [`${stats?.winRate ?? 0}%`, "win rate"],
                  [stats?.totalScore ?? 0, "score"],
                ].map(([value, label]) => (
                  <div key={label} className="border-l border-line px-3 first:border-0">
                    <div className="text-2xl font-bold text-fg">
                      {value}
                    </div>
                    <div className="mt-2 text-[9px] uppercase tracking-widest text-faint">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
              {[
                { Icon: Shield, label: "Battles", value: stats?.totalMatches ?? 0 },
                { Icon: Trophy, label: "Wins", value: stats?.wins ?? 0 },
                { Icon: Target, label: "Losses", value: stats?.losses ?? 0 },
                { Icon: Crosshair, label: "Win rate", value: `${stats?.winRate ?? 0}%` },
                { Icon: Zap, label: "Score", value: stats?.totalScore ?? 0 },
                {
                  Icon: Clock,
                  label: "Avg time",
                  value: stats?.totalTimeMs
                    ? `${Math.round(stats.totalTimeMs / 60000)}m`
                    : "—",
                },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="border-r border-b border-line p-4 last:border-r-0">
                  <Icon size={14} className="text-faint" />
                  <div className="mt-4 text-lg font-bold text-fg">
                    {value}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-widest text-faint">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>


          {/* ── BATTLE LEDGER ────────────────────────────────────────────── */}
          <section aria-labelledby="history-heading">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={15} className="text-accent-primary" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-subtle" id="history-heading">
                Battle history
              </h2>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="overflow-hidden border border-line bg-surface">
              {history.length > 0 ? (
                <div className="divide-y divide-line">
                  {history.map(record => {
                    const isWin = record.status === "WIN";
                    return (
                      <div
                        key={record.id}
                        className={`flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-surface-hover/40 ${
                          isWin ? "bg-surface-hover/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-8 w-1 shrink-0 ${
                              isWin ? "bg-accent-primary" : "bg-accent-danger"
                            }`}
                          />
                          <div>
                            <div className="text-sm text-fg">
                              {record.event?.commonProblem?.name ||
                                record.problem?.name ||
                                "Unknown Problem"}
                            </div>
                            <div className="mt-1 text-[9px] uppercase tracking-widest text-faint">
                              {new Date(record.createdAt).toLocaleDateString()} / {record.status}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] font-bold ${
                              isWin ? "text-accent-success" : "text-accent-danger"
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
                              className="flex items-center gap-1 border border-line bg-surface px-3 py-1.5 text-[9px] uppercase tracking-widest text-subtle transition hover:border-accent-primary/40 hover:text-accent-primary"
                            >
                              <Code size={12} />
                              Review
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-10">
                  <Shield size={22} className="text-faint" />
                  <p className="text-xs uppercase tracking-widest text-subtle">No match history yet</p>
                  <p className="text-xs text-faint">
                    Complete a battle to start building your record
                  </p>
                  <Link
                    to="/lobby"
                    className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent-primary hover:text-fg"
                  >
                    <Zap size={13} />
                    Enter lobby
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
          {analytics && (
            <section aria-labelledby="analytics-heading">
              <div className="mt-10 mb-3 flex items-center gap-2">
                <BarChart3 size={15} className="text-accent-primary" />
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-subtle" id="analytics-heading">
                  Analytics
                </h2>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                <div className="overflow-hidden rounded-panel border border-line-mid bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fg">Execution activity</span>
                    <span className="text-[9px] uppercase tracking-widest text-muted">
                      {analytics.activityData?.length > 0 ? "Active" : "Awaiting data"}
                    </span>
                  </div>
                  {analytics.activityData?.length > 0 ? (
                    <>
                      <div className="mt-8 flex h-28 items-end gap-2 border-b border-line">
                        {analytics.activityData.slice(-12).map((point, index) => {
                          const height = Math.min(100, Math.max(5, point.count || 0));
                          return (
                            <div
                              key={index}
                              className="flex-1 bg-accent-primary/20 transition hover:bg-accent-primary/60"
                              style={{ height: `${height}%` }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-between text-[8px] uppercase tracking-widest text-muted">
                        <span>
                          {new Date(analytics.activityData[0]?.date || "").toLocaleDateString(undefined, { month: "short" })} weeks ago
                        </span>
                        <span>current cycle</span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-8 flex h-28 items-end justify-center gap-2 border-b border-line">
                      {[22, 38, 30, 52, 44, 68, 56, 76, 62, 84, 73, 92].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 bg-accent-primary/20 transition hover:bg-accent-primary/60"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="overflow-hidden rounded-panel border border-line-mid bg-surface p-6">
                  <div className="text-sm text-fg">Training signal</div>
                  <p className="mt-3 text-xs leading-6 text-subtle">
                    Complete a challenge to populate your performance telemetry and difficulty distribution.
                  </p>
                  <Link
                    to="/problems"
                    className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent-primary hover:text-fg"
                  >
                    Enter training
                    <Zap size={13} />
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <AnalyticsErrorBoundary>
                  <AnalyticsPanels analytics={analytics} />
                </AnalyticsErrorBoundary>
              </div>
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
