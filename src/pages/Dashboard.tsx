import React, { useState, useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { MetricCard, MetricCardSkeleton } from "../components/ui/MetricCard";
import { StatusPill } from "../components/ui/StatusPill";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useSocketInvalidation } from "../hooks/useSocketInvalidation";
import { api } from "../config/api";
import { useAnalytics } from "../hooks/useAnalytics";
import { AnalyticsPanels } from "../components/features/AnalyticsPanels";
import { getDivision, TIER_COLORS, useLeaderboard, useMyRating } from "../hooks/useLeaderboard";
import { AnalyticsErrorBoundary } from "../components/features/AnalyticsErrorBoundary";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import {
  Swords,
  Trophy,
  Flame,
  Code2,
  X,
  CheckCircle2,
  Activity,
  BarChart2,
  Plus,
  ArrowUpRight,
  Bell,
  UserRound,
  Gauge,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

// Loose shapes for the untyped server payloads this page consumes —
// /problems/system and /profile/stats return plain JSON, not client models.
type DashboardProblem = {
  id?: string;
  github_oid?: string;
  name?: string;
  difficulty_level?: string;
};

type DashboardMatch = {
  id?: string;
  status?: string;
  score?: number;
  createdAt?: string;
  event?: { commonProblem?: { name?: string } | null } | null;
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "—";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "Yesterday" : `${elapsedDays}d ago`;
};

/** Compact duration label for solve/run timings (ms → "820ms" | "1.4s"). */
const formatMs = (value?: number | null) => {
  if (!value || value <= 0) return "—";
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
};

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
  const [acceptTimer, setAcceptTimer] = useState<number>(10);

  // After any finished battle the server emits leaderboard:invalidate — one
  // wave refreshes the whole dashboard (stats, recent battles, problems).
  useSocketInvalidation("leaderboard:invalidate", [
    ["dashboard-profile"],
    ["dashboard-stats"],
    ["dashboard-problems"],
  ]);

  // Time of day greeting
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "MORNING" : hour < 18 ? "AFTERNOON" : "EVENING";

  // Profile card data — identity rarely changes, so it is long-lived and is
  // deliberately NOT part of the post-battle refresh wave.
  const { data: profile } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const res = await api.get("/profile").catch(() => null);
      return res?.data?.data || null;
    },
  });

  // Match stats + recent battles — refresh after every finished battle.
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      try {
        const statsRes = await api.get("/profile/stats").catch(() => null);
        return {
          stats: statsRes?.data?.stats
            ? {
                totalMatches: statsRes.data.stats.totalMatches || 0,
                wins: statsRes.data.stats.wins || 0,
                losses: statsRes.data.stats.losses || 0,
                winRate: statsRes.data.stats.winRate || 0,
              }
            : null,
          recentBattles: statsRes?.data?.recentMatches || [],
        };
      } catch {
        // Partial failure must not blank the whole dashboard
        return { stats: null, recentBattles: [] };
      }
    },
  });

  // Recommended problems — also refreshed post-battle
  const { data: recommendedProblemsData = [], isLoading: recommendedLoading } = useQuery({
    queryKey: ["dashboard-problems", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const probRes = await api.get("/problems/system").catch(() => null);
      return (probRes?.data?.problems || []).slice(0, 4);
    },
  });

  const dashboardData = {
    profile,
    stats: statsData?.stats ?? null,
    recentBattles: statsData?.recentBattles ?? [],
    recommendedProblems: recommendedProblemsData,
  };

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(Boolean(isAuthenticated || user));
  const { data: myRating, isLoading: ratingLoading } = useMyRating(Boolean(isAuthenticated || user));
  const { data: leaderboardRows, isLoading: leaderboardLoading } = useLeaderboard(25, Boolean(isAuthenticated || user));

  const stats = dashboardData?.stats || null;
  const recentBattles = dashboardData?.recentBattles || [];
  const recommendedProblems = dashboardData?.recommendedProblems || [];

  const timerActiveRef = useRef(false);

  useEffect(() => {
    if (matchmakingStatus !== "FOUND_PENDING") {
      setAcceptTimer(10);
      return;
    }
    timerActiveRef.current = true;
    const interval = setInterval(() => {
      if (!timerActiveRef.current) return;
      setAcceptTimer((prev) => {
        if (!timerActiveRef.current) return prev;
        if (prev <= 1) {
          timerActiveRef.current = false;
          clearInterval(interval);
          declineMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      timerActiveRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingStatus]);

  useEffect(() => {
    if (matchmakingStatus === "SEARCHING") {
      document.title = "Searching... | BRACE RCE";
    } else if (matchmakingStatus === "FOUND_PENDING") {
      document.title = "Match Found! | BRACE RCE";
    } else {
      document.title = "Dashboard | BRACE RCE";
    }
    return () => {
      document.title = "Dashboard | BRACE RCE";
    };
  }, [matchmakingStatus]);

  if (isLoading) return <TableSkeleton />;
  if (!isLoading && !isAuthenticated && !user) return <Navigate to="/signin" />;

  const username = user?.username || "OPERATIVE";
  const userRating = myRating?.rating ?? 1000;
  const division = getDivision(userRating);
  const globalRank = leaderboardRows?.find((row) => row.userId === user?.id)?.rank;
  // The matchmaking payload carries identity only (username / id / avatar /
  // bio) — the server sends no rating. The leaderboard cache this page already
  // holds is the honest source; an opponent outside that slice renders "—"
  // rather than a fabricated number (this slot previously hardcoded 1250).
  const opponentRating = leaderboardRows?.find((row) => row.userId === pendingOpponent?.id)?.rating;
  const matchesPlayed = stats?.totalMatches ?? myRating?.totalMatches ?? 0;
  const winRate = stats ? Math.round(stats.winRate) : Math.round(myRating?.winRate ?? 0);
  const winStreak = analytics?.summary?.currentStreak ?? 0;
  const isQueued = matchmakingStatus === "SEARCHING";
  const kpiLoading = statsLoading || analyticsLoading || ratingLoading;
  const rankLoading = ratingLoading || leaderboardLoading;

  // Live aggregates for the KPI grid. Every tile reads from one of these, so no
  // tile ever falls back to a hardcoded placeholder. `/profile/stats` is the
  // battle-scoped source of truth; `/analytics` covers solves + run timings.
  const analyticsSummary = analytics?.summary;
  const runtimeStats = analytics?.runtimeStats;
  const totalSolved = analyticsSummary?.totalSolved ?? 0;
  const totalAttempts = analyticsSummary?.totalAttempts ?? 0;
  const completionRate = Math.round(analyticsSummary?.completionRate ?? 0);
  const wins = stats?.wins ?? myRating?.wins ?? analyticsSummary?.wins ?? 0;
  const losses = stats?.losses ?? myRating?.losses ?? 0;
  const avgSolveLabel = formatMs(analyticsSummary?.avgSolveTimeMs);

  return (
    <div className="relative flex min-h-screen w-full bg-base text-fg font-mono selection:bg-accent-primary/30 selection:text-accent-primary">
      {/* Dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />

      {/* DESKTOP SIDEBAR — shared shell with /problems, /profile, /lobby */}
      <DashboardSidebar rating={myRating?.rating} />

      {/* MOBILE BOTTOM NAV */}
      <MobileBottomNav />

      {/* DIALOG OVERLAYS (preserved) */}
      {matchmakingStatus === "SEARCHING" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Searching for opponent"
          className="fixed inset-0 z-50 flex items-center justify-center ds-overlay p-4 select-none"
        >
          <div className="w-full max-w-md bg-raised border border-subtle-line border-t-2 border-t-accent-primary/40 p-8 flex flex-col items-center gap-6">
            <span className="text-[10px] text-label uppercase tracking-[0.2em] font-bold">
              Finding opponent
            </span>
            <span
              className="text-5xl font-black font-mono text-accent-primary tracking-wider tabular-nums"
              style={{ filter: "drop-shadow(0 0 15px rgba(0,212,255,0.5))" }}
            >
              {Math.floor(waitingTime / 60)}:
              {String(waitingTime % 60).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-2 text-xs text-subtle">
              <span>Your rating:</span>
              <span className="text-fg font-mono font-bold">{userRating}</span>
            </div>
            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-accent-danger/30 text-accent-danger font-mono font-bold text-xs tracking-wider uppercase transition-all hover:bg-accent-danger/10 hover:border-accent-danger flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel Queue
            </button>
          </div>
        </div>
      )}

      {matchmakingStatus === "FOUND_PENDING" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Match found"
          className="fixed inset-0 z-50 flex items-center justify-center ds-overlay p-4 select-none"
        >
          <div className="w-full max-w-xl bg-raised border border-subtle-line border-t-2 border-t-accent-primary/40 p-8 flex flex-col items-center gap-6">
            <div className="w-full grid grid-cols-5 items-center gap-3">
              <div className="col-span-2 border border-subtle-line bg-raised p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-subtle font-mono font-bold uppercase tracking-widest mb-1">
                  YOU
                </span>
                <span className="text-base font-extrabold text-fg tracking-wide truncate w-full" title={username}>
                  {username}
                </span>
                <span className="text-xs text-subtle mt-1 font-mono">{userRating}</span>
              </div>

              <div className="col-span-1 flex items-center justify-center">
                <span className="text-sm font-black text-accent-danger font-mono">VS</span>
              </div>

              <div className="col-span-2 border border-subtle-line bg-raised p-4 flex flex-col items-center text-center min-w-0">
                <span className="text-[10px] text-subtle font-mono font-bold uppercase tracking-widest mb-1">
                  OPPONENT
                </span>
                <span className="text-base font-extrabold text-fg tracking-wide truncate w-full" title={pendingOpponent?.username}>
                  {pendingOpponent?.username || "Opponent"}
                </span>
                <span className="text-xs text-subtle mt-1 font-mono">
                  {opponentRating ?? "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-fg uppercase">
              <Swords className="w-5 h-5 text-accent" />
              Match Found
            </div>

            <button
              onClick={acceptMatch}
              className="w-full py-4 ds-btn border border-accent-success bg-accent-success text-ink font-bold text-sm uppercase tracking-wide transition-all hover:opacity-85 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Accept
            </button>

            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-4xl font-black font-mono text-accent-warning tabular-nums">
                {acceptTimer}
              </span>
              <div
                className="w-full h-1 bg-line overflow-hidden"
                role="progressbar"
                aria-valuenow={acceptTimer}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-label="Time remaining to accept"
              >
                <div
                  className="h-full bg-accent-warning transition-all duration-1000"
                  style={{ width: `${(acceptTimer / 10) * 100}%` }}
                />
              </div>
              <p className="text-xs text-subtle font-mono">seconds remaining</p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA — left offset matches the fixed sidebar widths */}
      <main className="relative z-10 w-full min-w-0 flex-1 ml-0 md:ml-[var(--sidebar-width)] px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8">
        {/* ── HEADER ─────────────────────────────────────────────── */}
        {/* Page title only. The app brand + route nav now come from Layout's
            sticky Header and DashboardSidebar, so repeating them here would
            render the BRACE lockup twice on the same screen. */}

        {/* ── OPERATIVE BANNER ───────────────────────────────────── */}
        <section className="relative isolate overflow-hidden border-y border-subtle-line py-5 md:py-5">
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between ">
            <div>
              <h1 className="font-mono text-4xl font-black tracking-[-0.05em] text-fg md:text-6xl">
                Good {timeOfDay.toLowerCase()},<br />
                <span className="text-accent">{username}</span>
              </h1>
              <p className="mt-4 max-w-xl font-sans text-sm leading-6 text-subtle">
                Your execution history, current rating, and next challenge — in one operational view.
              </p>
            </div>
            {/* Rank block — profile photo stacks *above* the division and
                global-rank readout so the identity anchor leads the metadata. */}
            <div className="flex flex-col items-start gap-3 border-l border-subtle-line pl-5">
              {/* Profile photo — falls back to avatar icon when no image */}
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-14 w-14 overflow-hidden rounded-full border border-accent-primary/30 bg-accent-primary/5 object-cover"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full border border-accent-primary/30 bg-accent-primary/10 text-accent-primary">
                  <UserRound size={20} />
                </div>
              )}
              <div>
                <div className="text-xs font-bold tracking-widest text-fg">
                  RANK /{" "}
                  <span className={TIER_COLORS[division] ?? "text-fg"}>
                    {division}
                  </span>
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-widest text-subtle">
                  {rankLoading ? (
                    <span className="text-muted">resolving global rank…</span>
                  ) : (
                    <>
                      #{globalRank ?? "—"} — {userRating} ELO
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── KPI GRID ─────────────────────────────────────────────── */}
        {/* Six tiles mirror the console reference row: battles, wins, losses,
            win rate, score and average solve time — all from live queries. */}
        <section className="grid gap-px border-y border-subtle-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {kpiLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                label="Rating"
                value={userRating}
                trend={`#${globalRank ?? "—"} global`}
                icon={Trophy}
                dotTone="active"
              />
              <MetricCard
                label="Battles"
                value={matchesPlayed}
                trend={`${totalSolved} solved`}
                icon={Swords}
                dotTone="live"
              />
              <MetricCard
                label="Wins"
                value={wins}
                trend={`${winRate}% win rate`}
                icon={CheckCircle2}
                dotTone="live"
                valueTone="positive"
              />
              <MetricCard
                label="Losses"
                value={losses}
                trend={`${totalAttempts} attempts`}
                icon={X}
                dotTone="danger"
                valueTone="danger"
              />
              <MetricCard
                label="Current streak"
                value={winStreak}
                trend={`completion ${completionRate}%`}
                icon={Flame}
                dotTone="warning"
                valueTone="warning"
              />
              <MetricCard
                label="Avg solve time"
                value={avgSolveLabel}
                trend={runtimeStats ? `best ${formatMs(runtimeStats.best)}` : "no runs yet"}
                icon={Activity}
                dotTone="muted"
              />
            </>
          )}
        </section>

        {/* ── ACTION HUB ───────────────────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div
            className={`relative overflow-hidden rounded-card border p-6 transition ${
              isQueued
                ? "border-accent-primary/60 bg-accent-primary/[0.07] ds-pulse-ring"
                : "border-subtle-line bg-surface"
            }`}
          >
            <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-accent-primary/15" />
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                  <Swords size={14} /> Ranked queue
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg">
                  Matchmaking
                </h2>
                <p className="mt-2 max-w-sm font-sans text-sm leading-6 text-subtle">
                  {isQueued
                    ? "Searching for an opponent in the ranked pool…"
                    : "Enter a ranked 1v1 and test your execution under pressure."}
                </p>
              </div>
              <Gauge
                className={`${isQueued ? "animate-pulse text-accent-primary" : "text-subtle"} w-5 h-5 shrink-0`}
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-subtle-line pt-4">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-subtle">
                {isQueued ? "queue armed / realtime" : "estimated session / 15 min"}
              </div>
              {isQueued ? (
                <button
                  onClick={cancelMatch}
                  className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-accent-danger transition-all hover:bg-accent-danger/20"
                >
                  Cancel queue
                </button>
              ) : (
                <button
                  onClick={() => findMatch()}
                  disabled={matchmakingStatus !== "IDLE"}
                  className="rounded-lg bg-accent-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-ink transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Start matchmaking
                </button>
              )}
            </div>
          </div>

          <Link
            to="/rooms/create"
            className="group relative overflow-hidden rounded-card border border-subtle-line bg-surface p-6 transition hover:border-accent-success/30"
          >
            <div className="absolute right-0 top-0 h-24 w-24 border-l border-b border-accent-primary/15" />
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent-success">
              <Plus size={14} /> Custom room
            </div>
            <h2 className="mt-8 text-xl font-bold tracking-tight text-fg">
              Build an arena.
            </h2>
            <p className="mt-2 font-sans text-sm leading-6 text-subtle group-hover:text-fg transition-colors">
              Seed a problem, generate tests, invite your network.
            </p>
            <ArrowUpRight
              size={16}
              className="absolute right-6 bottom-6 text-subtle transition group-hover:text-accent group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </Link>
        </section>

        {/* ── PROBLEM LIST + BATTLE LIST ─────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          {/* Recommended problems */}
          <section aria-labelledby="recommended-heading">
            <div className="mt-3 flex items-center gap-2">
              <Code2 size={14} className="text-accent-primary/30" />
              <h2
                id="recommended-heading"
                className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-secondary"
              >
                Recommended problems
              </h2>
              <hr className="flex-1 border-subtle-line" />
              <Link
                to="/problems"
                className="text-[9px] uppercase tracking-widest text-subtle transition hover:text-accent"
              >
                Browse corpus
              </Link>
            </div>
            <div className="mt-3 overflow-hidden rounded-card border border-subtle-line bg-surface">
              {recommendedLoading ? (
                <div aria-hidden="true" className="divide-y divide-subtle-line">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="h-3 w-40 rounded-none bg-surface-hover animate-pulse" />
                      <span className="h-4 w-12 rounded-btn bg-surface-hover animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recommendedProblems.length > 0 ? (
                recommendedProblems.map((problem: DashboardProblem) => {
                  const diff = (problem.difficulty_level || "MEDIUM").toUpperCase();
                  return (
                    <Link
                      key={problem.id}
                      to={`/terminal?id=${problem.id || problem.github_oid}`}
                      className="group flex items-center justify-between gap-3 border-b border-subtle-line px-4 py-2.5 transition hover:bg-surface-hover last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-8 w-8 place-items-center rounded-lg border border-subtle-line text-[10px] text-subtle">
                          ↗
                        </span>
                        <span className="min-w-0 truncate text-sm text-subtle group-hover:text-fg">
                          {problem.name}
                        </span>
                        <StatusPill
                          tone={diff === "EASY" ? "live" : diff === "MEDIUM" ? "warning" : "danger"}
                        >
                          {diff}
                        </StatusPill>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-subtle group-hover:text-accent"
                      />
                    </Link>
                  );
                })
              ) : (
                <div className="px-5 py-4">
                  <span className="text-xs text-subtle">No recommended problems available</span>
                </div>
              )}
            </div>
          </section>

          {/* Recent battles */}
          <section aria-labelledby="battles-heading">
            <div className="mt-3 flex items-center gap-2">
              <Activity size={14} className="text-accent-primary/30" />
              <h2
                id="battles-heading"
                className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-secondary"
              >
                Recent battles
              </h2>
              <hr className="flex-1 border-subtle-line" />
              <Link
                to="/profile"
                className="text-[9px] uppercase tracking-widest text-subtle transition hover:text-accent"
              >
                View record
              </Link>
            </div>
            <div className="mt-3 overflow-hidden rounded-card border border-subtle-line bg-surface">
              {statsLoading ? (
                <div aria-hidden="true" className="divide-y divide-subtle-line">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="h-3 w-full max-w-[220px] rounded-none bg-surface-hover animate-pulse" />
                      <span className="ml-auto h-4 w-10 rounded-none bg-surface-hover animate-pulse" />
                      <span className="h-3 w-12 rounded-none bg-surface-hover animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recentBattles.length > 0 ? (
                <div className="divide-y divide-subtle-line">
                  {recentBattles.slice(0, 5).map((perf: DashboardMatch, i: number) => {
                    const isWin =
                      perf.status === "PASSED" ||
                      perf.status === "WON" ||
                      perf.status === "COMPLETED";
                    const problemName = perf.event?.commonProblem?.name || "Unknown";
                    return (
                      <div
                        key={perf.id || i}
                        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-hover"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg" title={problemName}>
                          {problemName}
                        </span>
                        <StatusPill tone={isWin ? "live" : "danger"} className="shrink-0">
                          {isWin ? "WIN" : "LOSS"}
                        </StatusPill>
                        <span className="w-12 shrink-0 text-right font-mono text-[11px] text-subtle">
                          {perf.score ?? 0}
                        </span>
                        <time
                          className="w-16 shrink-0 text-right font-mono text-[11px] font-bold text-secondary"
                          dateTime={perf.createdAt}
                        >
                          {formatRelativeTime(perf.createdAt)}
                        </time>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={Swords}
                    title="No recent battles"
                    message="Complete a battle to start building your record."
                    action={
                      <Link
                        to="/lobby"
                        className="inline-flex items-center gap-2 border border-accent-primary/40 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary transition-colors hover:bg-accent-primary/10"
                      >
                        Enter the arena
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── PERFORMANCE ANALYTICS ───────────────────────────────────── */}
        <section className="mt-8 gap-4 border-t border-subtle-line pt-8">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BarChart2 size={14} className="text-accent-primary/30" />
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted">
                Performance Analytics
              </h2>
              <hr className="flex-1 border-subtle-line" />
              <Link
                to="/profile"
                className="text-[9px] uppercase tracking-widest text-subtle transition hover:text-accent"
              >
                Analytics
              </Link>
            </div>
            {/* <div className="mt-3 flex flex-col gap-3">
              <p className="max-w-xs font-sans text-sm leading-6 text-subtle">
                A compact view of your execution rhythm across the current cycle.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Gauge size={12} className="text-accent-primary shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-fg">{myRating?.rating ?? "—"}</div>
                    <div className="text-[8px] uppercase tracking-widest text-subtle">Elo</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Flame size={12} className="text-accent-warning shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-fg">{analyticsSummary?.currentStreak ?? 0}</div>
                    <div className="text-[8px] uppercase tracking-widest text-subtle">Streak</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy size={12} className="text-accent-success shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-fg">{winRate}%</div>
                    <div className="text-[8px] uppercase tracking-widest text-subtle">Win rate</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-accent-primary/30 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-fg">{matchesPlayed}</div>
                    <div className="text-[8px] uppercase tracking-widest text-subtle">Battles</div>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
          <div className="rounded-card border border-subtle-line bg-surface p-5">
            <AnalyticsErrorBoundary>
              {analytics ? (
                <AnalyticsPanels analytics={analytics} compact={true} />
              ) : (
                <div className="rounded-card border border-subtle-line bg-surface p-6 text-center text-xs text-muted">
                  Analytics data unavailable
                </div>
              )}
            </AnalyticsErrorBoundary>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
