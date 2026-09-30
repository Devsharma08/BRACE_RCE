import type React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import {
  CodeComparisonContent,
  type PerformanceData,
  type Submission,
} from "../components/features/CodeComparisonContent";

interface MatchPerformer {
  id: string;
  userId: string;
  status: string;
  score: number;
  timeTakenMs: number | null;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
  submissions: Submission[];
}

interface MatchDetail {
  id: string;
  userId: string;
  eventId: string;
  status: string;
  score: number;
  timeTakenMs: number | null;
  questionsSolved?: number;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
  event: {
    id: string;
    name?: string | null;
    type: string;
    status: string;
    commonProblem?: {
      name?: string | null;
      problem_number?: number | null;
      difficulty_level?: string | null;
    } | null;
    performances: MatchPerformer[];
  } | null;
  submissions: Submission[];
}

/** Same win semantics as the profile stats endpoint. */
const WIN_STATUSES = ["PASSED", "WON", "COMPLETED"];

interface TimelineEntry {
  key: string;
  side: "MINE" | "OPPONENT";
  username: string;
  at: string | null;
  submission: Submission;
}

const StatTile = ({
  icon: Icon,
  label,
  value,
  tone = "text-fg",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: string;
}) => (
  <div className="rounded-btn border border-subtle-line bg-base/60 px-3 py-2.5">
    <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-faint">
      <Icon className="h-3 w-3" />
      {label}
    </span>
    <span className={`mt-1 block font-mono text-sm font-bold tabular-nums ${tone}`}>{value}</span>
  </div>
);

/**
 * Post-battle analysis page (/analysis/:matchId).
 *
 * Fetches ONE match (ownership-checked server-side) and renders:
 *   1. Result header — win/loss, problem, score, time, both sides.
 *   2. Merged event timeline — both players' submissions interleaved by time.
 *   3. Side-by-side code review — the shared CodeComparisonContent component
 *      (previously only reachable via the profile modal).
 */
const MatchAnalysis = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: match, isLoading, isError } = useQuery<MatchDetail>({
    queryKey: ["match-analysis", matchId],
    queryFn: async () => {
      const res = await api.get(`/profile/matches/${matchId}`);
      return res.data.match as MatchDetail;
    },
    enabled: Boolean(matchId),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-subtle">
          Loading match telemetry…
        </p>
      </div>
    );
  }

  if (isError || !match) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="max-w-md border border-accent-danger/30 bg-accent-danger/5 p-6">
          <AlertTriangle className="mx-auto h-5 w-5 text-accent-danger" />
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-accent-danger">
            Match not found
          </p>
          <p className="mt-2 font-sans text-[11px] text-subtle">
            This battle may have been pruned, or it belongs to another account.
          </p>
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent-primary hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to profile
        </Link>
      </div>
    );
  }

  const performances = match.event?.performances ?? [];
  const myPerf = performances.find((p) => p.userId === match.userId);
  const oppPerf = performances.find((p) => p.userId !== match.userId);
  const problem = match.event?.commonProblem;
  const isWin = WIN_STATUSES.includes(match.status);
  const mySubs = myPerf?.submissions ?? match.submissions ?? [];

  // Merge BOTH sides' submission events into one chronological timeline —
  // this is the "who did what, when" narrative of the battle.
  const timeline: TimelineEntry[] = performances
    .flatMap((perf) =>
      (perf.submissions ?? []).map((submission, index): TimelineEntry => ({
        key: `${perf.id}-${submission?.id ?? index}`,
        side: perf.userId === match.userId ? "MINE" : "OPPONENT",
        username: perf.user?.username ?? "Unknown",
        at: submission?.createdAt ?? null,
        submission,
      })),
    )
    .sort((a, b) => {
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return (a.submission.attemptNumber ?? 0) - (b.submission.attemptNumber ?? 0);
    });


  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      {/* BACK */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-subtle transition-colors hover:text-accent-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* ── RESULT HEADER ─────────────────────────────────────────────── */}
      <section className="rounded-card border border-subtle-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-btn border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                  isWin
                    ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
                    : "border-accent-danger/40 bg-accent-danger/10 text-accent-danger"
                }`}
              >
                {isWin ? <Trophy className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                {isWin ? "Victory" : "Defeat"} // {match.status}
              </span>
              <span className="rounded-btn border border-subtle-line bg-base px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-faint">
                {match.event?.type ?? "MATCH"}
              </span>
            </div>
            <h1 className="mt-3 font-mono text-lg font-bold uppercase tracking-[0.16em] text-fg">
              {problem?.name ?? match.event?.name ?? "Battle review"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-faint">
              {problem?.problem_number != null && <span>Problem #{problem.problem_number}</span>}
              {problem?.difficulty_level && <span>{problem.difficulty_level}</span>}
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(match.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <p className="font-mono text-[9px] uppercase tracking-widest text-faint">Opponent</p>
            <p className="mt-0.5 truncate font-mono text-sm font-bold uppercase tracking-wider text-accent-danger">
              {oppPerf?.user?.username ?? "Solo run"}
            </p>
            {oppPerf && (
              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-faint">
                {oppPerf.score} pts // {WIN_STATUSES.includes(oppPerf.status) ? "WON" : oppPerf.status}
              </p>
            )}
          </div>
        </div>

        {/* KEY METRICS */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile icon={Target} label="Score" value={`${match.score}`} tone="text-accent-primary" />
          <StatTile
            icon={Clock}
            label="Time"
            value={match.timeTakenMs != null ? `${Math.round(match.timeTakenMs / 1000)}s` : "N/A"}
          />
          <StatTile icon={Trophy} label="Attempts" value={`${mySubs.length}`} />
          <StatTile
            icon={Zap}
            label="Solved"
            value={`${match.questionsSolved ?? (isWin ? 1 : 0)}`}
            tone={isWin ? "text-accent-success" : "text-fg"}
          />
        </div>
      </section>


      {/* ── MERGED EVENT TIMELINE (mine + opponent interleaved) ───────── */}
      <section className="mt-5 rounded-card border border-subtle-line bg-surface p-5">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-fg">
          Battle events // chronological
        </h2>
        <p className="mt-1 font-sans text-[11px] text-subtle">
          Every submission from both sides, merged into a single timeline.
        </p>

        {timeline.length === 0 ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-faint">
            No submission events were recorded for this battle.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {timeline.map((entry) => {
              const mine = entry.side === "MINE";
              const passed = entry.submission.status === "PASSED";
              return (
                <li
                  key={entry.key}
                  className={`flex flex-wrap items-center gap-2.5 rounded-btn border-l-2 border border-subtle-line bg-base/50 px-3 py-2 ${
                    mine ? "border-l-accent-primary" : "border-l-accent-danger"
                  }`}
                >
                  <span
                    className={`shrink-0 rounded-btn border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest ${
                      mine
                        ? "border-accent-primary/40 bg-accent-primary/10 text-accent-primary"
                        : "border-accent-danger/40 bg-accent-danger/10 text-accent-danger"
                    }`}
                  >
                    {mine ? "You" : entry.username}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-subtle">
                    Attempt #{entry.submission.attemptNumber}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                      passed ? "text-accent-success" : "text-accent-danger"
                    }`}
                  >
                    {entry.submission.status}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-faint">
                    {entry.submission.passedCase}/{entry.submission.totalCases} cases
                    {entry.submission.runtimeMs != null && ` · ${entry.submission.runtimeMs}ms`}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-faint">
                    {entry.at ? new Date(entry.at).toLocaleTimeString() : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── SIDE-BY-SIDE CODE REVIEW (shared with the history modal) ───── */}
      <section className="mt-5 overflow-hidden rounded-card border border-subtle-line bg-surface">
        <div className="border-b border-subtle-line px-5 py-4">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-fg">
            Code review // side by side
          </h2>
          <p className="mt-1 font-sans text-[11px] text-subtle">
            Compare approaches, runtimes and test-case coverage with{" "}
            {oppPerf ? oppPerf.user?.username : "your own attempts"}.
          </p>
        </div>
        <div className="flex h-[70vh] min-h-[480px] flex-col">
          <CodeComparisonContent
            currentUserId={match.userId || user?.id || ""}
            performances={performances as unknown as PerformanceData[]}
          />
        </div>
      </section>
    </div>
  );
};

export default MatchAnalysis;

