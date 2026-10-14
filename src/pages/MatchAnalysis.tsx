import type { FC } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  Code2,
  Cpu,
  Gauge,
  Loader2,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { isWinnerStatus } from "../utils/participantVerdict";

type AnalysisMode = "solo" | "1v1" | "multiplayer";

/** One stored code submission (real DB shape from CodeSubmission). */
type Submission = {
  id: string;
  language: string;
  status: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  passedCase: number;
  totalCases: number;
  isBestSubmission: boolean;
  attemptNumber: number;
  submittedCode: string;
  createdAt: string;
};

/** A participant performance row (me + every opponent). */
type Participant = {
  id: string;
  userId: string;
  status: string;
  score: number;
  questionsSolved: number;
  timeTakenMs: number | null;
  createdAt: string;
  user?: { id: string; username: string; avatarUrl: string | null } | null;
  submissions: Submission[];
};

// ── formatting helpers ──────────────────────────────────────────────────
const fmtMs = (ms: number | null | undefined): string => {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s` : `${ms} ms`;
};
const fmtMem = (kb: number | null | undefined): string =>
  kb == null ? "—" : `${(kb / 1024).toFixed(1)} MB`;
const fmtClock = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleTimeString([], { hour12: false }) : "—";
const fmtDate = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

// ── derived metrics from a participant's real submissions ────────────────
const orderedSubs = (p: Participant): Submission[] =>
  [...(p.submissions ?? [])].sort((a, b) => a.attemptNumber - b.attemptNumber);

/** Best submission = flagged best, else passing w/ lowest runtime, else last. */
const bestSubmission = (p: Participant): Submission | null => {
  const subs = orderedSubs(p);
  if (subs.length === 0) return null;
  const flagged = subs.find((s) => s.isBestSubmission);
  if (flagged) return flagged;
  const passing = subs
    .filter((s) => s.status === "PASSED" && s.runtimeMs != null)
    .sort((a, b) => (a.runtimeMs as number) - (b.runtimeMs as number));
  if (passing[0]) return passing[0];
  const anyPassing = subs.find((s) => s.status === "PASSED");
  return anyPassing ?? subs[subs.length - 1];
};

const bestRuntimeMs = (p: Participant): number | null => {
  const runtimes = (p.submissions ?? [])
    .filter((s) => s.status === "PASSED" && s.runtimeMs != null)
    .map((s) => s.runtimeMs as number);
  return runtimes.length ? Math.min(...runtimes) : null;
};

const bestMemoryKb = (p: Participant): number | null => {
  const mems = (p.submissions ?? [])
    .filter((s) => s.status === "PASSED" && s.memoryKb != null)
    .map((s) => s.memoryKb as number);
  return mems.length ? Math.min(...mems) : null;
};

const coverage = (p: Participant): string => {
  const best = bestSubmission(p);
  if (!best) return "—";
  return `${best.passedCase} / ${best.totalCases}`;
};

const isPassed = (status?: string | null): boolean =>
  isWinnerStatus(status) || (status ?? "").toUpperCase() === "PASSED";

const statusTone = (status: string): string =>
  isPassed(status)
    ? "text-accent-success border-accent-success/30 bg-accent-success/[0.07]"
    : (status ?? "").toUpperCase() === "PENDING"
      ? "text-subtle border-line bg-void"
      : "text-accent-danger border-accent-danger/30 bg-accent-danger/[0.07]";

// Participant line colours, drawn straight from the app accent palette
// (index.css @theme) so the chart inherits the console theme instead of
// carrying its own hardcoded hues. "me" is always the primary cyan;
// opponents cycle through the remaining accents, wrapping for big rooms.
const LINE_COLORS = [
  "var(--accent-primary)",
  "var(--accent-violet)",
  "var(--accent-danger)",
  "var(--accent-success)",
  "var(--accent-warning)",
  "var(--accent-pink)",
  "var(--accent-primary)",
  "var(--accent-violet)",
];

const truncateCode = (code: string, max = 4000): string =>
  code.length > max ? `${code.slice(0, max)}\n… truncated` : code;

/**
 * Match analysis — client component (react-router stack).
 *
 * Layout (large screens):
 *   header + stat tiles
 *   -> performance chart sits SIDE-BY-SIDE with the head-to-head table
 *   -> code review panel sits at the BOTTOM (last)
 */
const MatchAnalysis: FC = () => {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: match, isLoading, isError } = useQuery<any>({
    queryKey: ["match-analysis", matchId],
    queryFn: async () => {
      const res = await api.get(`/profile/matches/${matchId}`)
      return res.data.match as any
    },
    enabled: Boolean(matchId),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-subtle">
          Loading match telemetry…
        </p>
      </div>
    )
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
    )
  }

  // ── derive participants (me first, then opponents) ────────────────────
  const meId = match.userId as string;
  const rawParticipants: Participant[] = (match.event?.performances ?? []).map(
    (p: any) => ({
      ...p,
      user: p.user ?? null,
      submissions: p.submissions ?? [],
    }),
  );
  const participants: Participant[] = [
    { ...match, submissions: match.submissions ?? [] } as Participant,
    ...rawParticipants.filter((p) => p.userId !== meId),
  ];

  const me = participants[0];
  const opponents = participants.slice(1);
  const mode: AnalysisMode =
    participants.length <= 1
      ? "solo"
      : participants.length === 2
        ? "1v1"
        : "multiplayer";

  const problem = match.event?.commonProblem ?? null;
  const problemName = problem?.name ?? "Practice session";
  const difficulty = problem?.difficulty_level ?? null;
  const difficultyTone =
    difficulty === "EASY"
      ? "text-accent-success bg-accent-success/[0.08]"
      : difficulty === "HARD"
        ? "text-accent-danger bg-accent-danger/[0.08]"
        : "text-accent-warning bg-accent-warning/[0.08]";

  const iWon = isPassed(me.status);
  const primaryOpponent = opponents[0] ?? null;

  const verdict =
    mode === "solo"
      ? {
          label: iWon ? "Solved" : "Unsolved",
          icon: iWon ? Check : Gauge,
          tone: iWon ? "lime" : "rose",
        }
      : iWon
        ? { label: "Victory", icon: Trophy, tone: "lime" }
        : { label: "Defeat", icon: AlertTriangle, tone: "rose" };
  const modeLabel =
    mode === "solo"
      ? "solo solve"
      : mode === "1v1"
        ? "1v1 match"
        : `${participants.length}-player room`;

  // ── chart series: one line per participant ─────────────────────────────
  const series = participants.map((p, i) => {
    const subs = orderedSubs(p);
    return {
      name: p.user?.username ?? (p.userId === meId ? "you" : `player ${i + 1}`),
      me: p.userId === meId,
      color:
        p.userId === meId
          ? LINE_COLORS[0]
          : LINE_COLORS[1 + ((i - 1) % (LINE_COLORS.length - 1))],
      points: subs.map((s) =>
        s.totalCases > 0 ? (s.passedCase / s.totalCases) * 100 : 0,
      ),
    };
  });
  const maxPoints = Math.max(1, ...series.map((s) => s.points.length));
  const hasTelemetry = series.some((s) => s.points.length > 0);

  const rows = participants.map((p) => ({
    p,
    name: p.user?.username ?? (p.userId === meId ? "you" : "player"),
    me: p.userId === meId,
    runtime: bestRuntimeMs(p),
    memory: bestMemoryKb(p),
    cov: coverage(p),
    attempts: (p.submissions ?? []).length,
    score: p.score ?? 0,
    time: p.timeTakenMs,
  }));
  const fastest = rows.reduce<number | null>(
    (min, r) =>
      r.runtime != null && (min == null || r.runtime < min) ? r.runtime : min,
    null,
  );

  const myBest = bestSubmission(me);
  const oppBest = primaryOpponent ? bestSubmission(primaryOpponent) : null;

  return (
    <main className="min-h-screen bg-void px-4 py-6 font-mono text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/profile" className="mb-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-faint transition hover:text-accent-primary"><ArrowLeft size={14} /> Back to profile</Link>
        <section className="overflow-hidden rounded-panel border border-line-mid bg-surface shadow-panel">
          <div className="border-b border-line bg-gradient-to-br from-surface-hover via-transparent to-accent-primary/[0.035] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-btn border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${
                      verdict.tone === "lime"
                        ? "border-accent-success/25 bg-accent-success/[0.05] text-accent-success"
                        : "border-accent-danger/25 bg-accent-danger/[0.05] text-accent-danger"
                    }`}
                  >
                    <verdict.icon size={12} /> {verdict.label}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[9px] uppercase tracking-widest text-faint">
                    {mode === "multiplayer" ? <Users size={11} /> : null} {modeLabel}
                  </span>
                  {match.event?.roomCode ? (
                    <span className="rounded-full border border-line px-3 py-1.5 text-[9px] uppercase tracking-widest text-faint">
                      #{match.event.roomCode}
                    </span>
                  ) : null}
                </div>
                <p className="mt-6 text-[9px] uppercase tracking-[0.24em] text-accent-primary">
                  Post-battle analysis
                </p>
                <h1 className="mt-2 break-words text-2xl font-semibold tracking-[-0.035em] text-fg sm:text-4xl">
                  {problemName}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest">
                  {problem?.problem_number != null ? (
                    <span className="rounded-btn bg-surface-hover px-2 py-1 text-subtle">
                      #{problem.problem_number}
                    </span>
                  ) : null}
                  {difficulty ? (
                    <span className={`rounded-btn px-2 py-1 ${difficultyTone}`}>{difficulty}</span>
                  ) : null}
                  {match.createdAt ? (
                    <span className="px-1 text-faint">{fmtDate(match.createdAt)}</span>
                  ) : null}
                </div>
              </div>
              {mode !== "solo" && primaryOpponent ? (
                <div className="text-left sm:text-right">
                  <p className="text-[9px] uppercase tracking-widest text-faint">
                    {mode === "1v1" ? "Opponent" : "Top opponent"}
                  </p>
                  <p className="mt-2 text-lg font-bold text-accent-danger">
                    {primaryOpponent.user?.username ?? "player"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-faint">
                    {primaryOpponent.score ?? 0} pts ·{" "}
                    <span className={isPassed(primaryOpponent.status) ? "text-accent-success" : "text-accent-danger"}>
                      {isPassed(primaryOpponent.status) ? "solved" : "unsolved"}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-left sm:text-right">
                  <p className="text-[9px] uppercase tracking-widest text-faint">Your result</p>
                  <p className={`mt-2 text-lg font-bold ${iWon ? "text-accent-success" : "text-accent-danger"}`}>
                    {me.status ?? "PENDING"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-faint">
                    {me.questionsSolved ?? 0} solved
                  </p>
                </div>
              )}
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Target} label="Score" value={`${me.score ?? 0}`} tone="text-accent-primary" />
              <Stat icon={Clock3} label="Time" value={fmtMs(me.timeTakenMs)} />
              <Stat icon={Code2} label="Attempts" value={`${(me.submissions ?? []).length}`} />
              <Stat
                icon={Check}
                label="Solved"
                value={`${me.questionsSolved ?? 0}`}
                tone={iWon ? "text-accent-success" : "text-fg"}
              />
            </div>
          </div>
        </section>
        {/* Chart sits beside the head-to-head table on large screens. */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.12fr_1.12fr] lg:gap-5">
          <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">Performance map</p>
                <h2 className="mt-1 text-base font-bold">Player comparison</h2>
                <p className="mt-1 text-[10px] text-faint">
                  Test-case pass ratio across each participant's attempts.
                </p>
              </div>
              {series.length > 1 ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-widest text-faint">
                  {series.map((s) => (
                    <span key={s.name} className="flex items-center gap-1.5">
                      <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {hasTelemetry ? (
              <PerformanceChart series={series} maxPoints={maxPoints} />
            ) : (
              <div className="mt-5 flex h-40 items-center justify-center rounded-card border border-dashed border-line bg-void text-[10px] uppercase tracking-widest text-faint">
                No submissions recorded
              </div>
            )}
          </div>
          <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-2 pb-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">Head to head</p>
                <h2 className="mt-1 text-base font-bold">
                  {mode === "solo" ? "Your metrics" : "Metric comparison"}
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="border-b border-line bg-surface-hover text-[9px] uppercase tracking-widest text-faint">
                  <tr>
                    <th className="px-3 py-3 font-normal">Player</th>
                    <th className="px-3 py-3 font-normal">Status</th>
                    <th className="px-3 py-3 font-normal">Runtime</th>
                    <th className="px-3 py-3 font-normal">Memory</th>
                    <th className="px-3 py-3 font-normal">Coverage</th>
                    <th className="px-3 py-3 font-normal">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover text-xs">
                  {rows.map((r) => (
                    <tr key={r.p.id} className={r.me ? "bg-accent-primary/[0.03]" : undefined}>
                      <td className={`px-3 py-3 font-bold ${r.me ? "text-accent-primary" : "text-fg"}`}>
                        {r.name}
                        {r.me ? (
                          <span className="ml-1 text-[8px] font-normal text-faint">(you)</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusTone(r.p.status)}`}
                        >
                          {r.p.status ?? "PENDING"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-fg">
                        {fmtMs(r.runtime)}
                        {r.runtime != null && r.runtime === fastest ? (
                          <span className="ml-1 text-[8px] text-accent-success">fastest</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-fg">{fmtMem(r.memory)}</td>
                      <td className="px-3 py-3 text-fg">{r.cov}</td>
                      <td className="px-3 py-3 text-faint">{r.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        {/* Code review is the final section on every screen. */}
        <section className="mt-4 overflow-hidden rounded-panel border border-line-mid bg-surface p-5 shadow-panel sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-card border border-accent-violet/25 bg-accent-violet/[0.06] text-accent-violet">
              <Code2 size={18} />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-accent-violet">Code review</p>
              <h2 className="mt-1 text-base font-bold">
                {mode === "solo" ? "Your solution" : "Side-by-side compare"}
              </h2>
            </div>
          </div>
          {myBest ? (
            <>
              <div className="mt-6 flex flex-wrap gap-3">
                <MiniMetric icon={Cpu} label="Your runtime" value={fmtMs(bestRuntimeMs(me))} />
                <MiniMetric icon={Gauge} label="Test coverage" value={coverage(me)} />
                <MiniMetric icon={Code2} label="Language" value={myBest.language ?? "—"} />
                <MiniMetric icon={Target} label="Memory" value={fmtMem(bestMemoryKb(me))} />
              </div>
              <div className={`mt-6 grid gap-4 ${oppBest ? "lg:grid-cols-2" : ""}`}>
                <CodePane
                  title="Your accepted attempt"
                  subtitle={`${myBest.language ?? "code"} · ${fmtClock(myBest.createdAt)}`}
                  tone="cyan"
                  code={truncateCode(myBest.submittedCode)}
                />
                {oppBest && primaryOpponent ? (
                  <CodePane
                    title={`${primaryOpponent.user?.username ?? "Opponent"}'s attempt`}
                    subtitle={`${oppBest.language ?? "code"} · ${fmtClock(oppBest.createdAt)} · ${
                      isPassed(oppBest.status) ? "passed" : "not accepted"
                    }`}
                    tone={isPassed(oppBest.status) ? "violet" : "rose"}
                    code={truncateCode(oppBest.submittedCode)}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-6 flex h-32 items-center justify-center rounded-card border border-dashed border-line bg-void text-[10px] uppercase tracking-widest text-faint">
              No code submitted for this match
            </div>
          )}
          <button
            onClick={() => navigate("/problems")}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent-primary px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-fg"
          >
            <Code2 size={14} /> Practice more problems
          </button>
        </section>
      </div>
    </main>
  )
}

function Stat({ icon: Icon, label, value, tone = "text-fg" }: { icon: typeof Target; label: string; value: string; tone?: string }) { return <div className="group flex items-center gap-3 rounded-card border border-line bg-void/80 p-3.5 transition-colors hover:border-line-mid hover:bg-surface-hover"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border border-line bg-surface-hover text-faint transition-colors group-hover:border-accent-primary/25 group-hover:text-accent-primary"><Icon size={14} /></div><div className="min-w-0"><p className="text-[9px] uppercase tracking-widest text-faint">{label}</p><p className={`mt-1 text-xl font-bold leading-none ${tone}`}>{value}</p></div></div> }
function MiniMetric({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) { return <div className="flex items-center justify-between border-b border-line pb-3 text-[10px]"><span className="flex items-center gap-2 text-faint"><Icon size={13} /> {label}</span><b className="text-fg">{value}</b></div> }
function CodePane({
  title,
  subtitle,
  tone,
  code,
}: {
  title: string;
  subtitle: string;
  tone: "cyan" | "violet" | "rose";
  code: string;
}) {
  const toneRing =
    tone === "cyan"
      ? "border-accent-primary/20"
      : tone === "violet"
        ? "border-accent-violet/20"
        : "border-accent-danger/20";
  const toneText =
    tone === "cyan" ? "text-accent-primary" : tone === "violet" ? "text-accent-violet" : "text-accent-danger";
  return (
    <div className={`overflow-hidden rounded-card border ${toneRing} bg-void`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${toneText}`}>{title}</p>
        <p className="text-[9px] text-faint">{subtitle}</p>
      </div>
      <pre className="max-h-72 overflow-auto p-4 text-[11px] leading-5 text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Multi-series line chart — one line per participant, so it grows to fit
 * 1v1, N-player rooms, and solo solves. X = attempt index, Y = pass ratio %.
 */
function PerformanceChart({
  series,
  maxPoints,
}: {
  series: { name: string; me: boolean; color: string; points: number[] }[];
  maxPoints: number;
}) {
  const W = 420;
  const H = 160;
  const padX = 14;
  const padY = 16;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;
  const x = (i: number) =>
    padX + (maxPoints <= 1 ? plotW / 2 : (i / (maxPoints - 1)) * plotW);
  const y = (v: number) => padY + plotH - (v / 100) * plotH;

  return (
    <div className="mt-5 overflow-hidden rounded-card border border-line bg-void p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label="Player performance comparison chart"
        preserveAspectRatio="none"
      >
        {[0, 50, 100].map((g) => (
          <path
            key={g}
            d={`M${padX} ${y(g)}H${W - padX}`}
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={s.me ? 3 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.me ? 1 : 0.75}
          />
        ))}
        {series.map((s) =>
          s.points.map((v, i) => (
            <circle key={`${s.name}-${i}`} cx={x(i)} cy={y(v)} r={s.me ? 3 : 2.2} fill={s.color} />
          )),
        )}
      </svg>
      <div className="flex justify-between px-1 pt-1 text-[8px] text-faint">
        {Array.from({ length: maxPoints }).map((_, i) => (
          <span key={i}>A{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

export default MatchAnalysis
