import type {
  UserAnalytics,
  ActivityPoint,
  BattleTrendPoint,
  LanguageUsage,
  SolveByMonth,
  WeakArea,
} from "../../hooks/useAnalytics";
import { memo } from "react";

// ─── Shared primitives ───────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent-primary/50 mb-4">
    {children}
  </p>
);

const Card = ({
  children,
  className = "",
  accent = "left" as "left" | "right" | "top" | "bottom" | "none",
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "left" | "right" | "top" | "bottom" | "none";
}) => {
  const accentClass = {
    left: "border-l-2 border-l-accent-primary/50",
    right: "border-r-2 border-r-accent-primary/50",
    top: "border-t-2 border-t-accent-primary/50",
    bottom: "border-b-2 border-b-accent-primary/50",
    none: "",
  }[accent];

  return (
    <div
      className={`bg-raised border border-accent-primary/15 ${accentClass} p-5 sm:p-6 min-w-0 ${className}`}
    >
      {children}
    </div>
  );
};

// ─── 1. Activity Heatmap — current month only ────────────────────────────────
export const ActivityHeatmap = memo(({ data }: { data: ActivityPoint[] }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Build a lookup from "YYYY-MM-DD" → count
  const lookup = new Map<string, number>();
  data.forEach((d) => lookup.set(d.date, d.count));

  // Build days array for current month
  const days: { date: string; dayNum: number; count: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, dayNum: d, count: lookup.get(dateStr) || 0 });
  }

  // First day of month (0=Sun, 1=Mon ...)
  const firstDow = new Date(year, month, 1).getDay();

  // Pad so grid aligns to week starting Sunday
  const padded: (null | (typeof days)[0])[] = [
    ...Array(firstDow).fill(null),
    ...days,
  ];

  const max = Math.max(...days.map((d) => d.count), 1);

  const cellClass = (count: number) => {
    if (count === 0) return "bg-elevated/40 border-accent-primary/5";
    const t = count / max;
    if (t < 0.25) return "bg-accent-primary/10 border-accent-primary/25";
    if (t < 0.5) return "bg-accent-primary/30 border-accent-primary/40";
    if (t < 0.8) return "bg-accent-primary/70 border-accent-primary/50";
    return "bg-accent-primary border-accent-primary/60";
  };

  const DOW = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card accent="top">
      <SectionLabel>Activity — {monthName}</SectionLabel>
      {/* Day-of-week headers — always 7 columns (calendar semantics); tighter
          gutter on phones so the cells keep usable width. */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {DOW.map((d, i) => (
          <div
            key={i}
            className="text-[10px] font-bold text-subtle font-mono text-center"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {padded.map((day, i) =>
          day === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} activities`}
              className={`aspect-[1.1] rounded-[2px] border flex items-center justify-center cursor-default transition-colors ${cellClass(day.count)}`}
            >
              <span className="text-[10px] font-bold font-mono text-fg/70 leading-none">
                {day.dayNum}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] font-mono text-subtle">Less</span>
        {[
          "bg-elevated/40 border border-accent-primary/5",
          "bg-accent-primary/15",
          "bg-accent-primary/30",
          "bg-accent-primary/70",
          "bg-accent-primary/90",
        ].map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
        ))}
        <span className="text-[10px] font-mono text-subtle">More</span>
      </div>
    </Card>
  );
});

// ─── 2. Difficulty Breakdown — full-width three columns ──────────────────────────
export const DifficultyBreakdown = memo(
  ({ data }: { data: { EASY: number; MEDIUM: number; HARD: number } }) => {
    const total = (data.EASY || 0) + (data.MEDIUM || 0) + (data.HARD || 0) || 1;

    const segments = [
      {
        label: "Easy",
        value: data.EASY,
        pct: Math.round((data.EASY / total) * 100),
        bar: "bg-accent-success",
        text: "text-accent-success",
        border: "border-accent-success/20",
        bg: "bg-accent-success/5",
      },
      {
        label: "Medium",
        value: data.MEDIUM,
        pct: Math.round((data.MEDIUM / total) * 100),
        bar: "bg-accent-warning",
        text: "text-accent-warning",
        border: "border-accent-warning/20",
        bg: "bg-accent-warning/5",
      },
      {
        label: "Hard",
        value: data.HARD,
        pct: Math.round((data.HARD / total) * 100),
        bar: "bg-accent-danger",
        text: "text-accent-danger",
        border: "border-accent-danger/20",
        bg: "bg-accent-danger/5",
      },
    ];

    return (
      <Card accent="left" className="h-full flex flex-col min-w-0">
        <SectionLabel>Problems Solved by Difficulty</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 min-w-0">
          {segments.map((s) => (
            <div
              key={s.label}
              className={`flex flex-col gap-3 border ${s.border} ${s.bg} p-3 sm:p-4 min-w-0`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-faint uppercase tracking-wider">
                  {s.label}
                </p>
                <p
                  className={`text-xl font-bold font-mono mt-0.5 sm:text-2xl ${s.text}`}
                >
                  {s.value}
                </p>
              </div>
              {/* Vertical fill bar — flex-1 (with a fixed floor) so the track
                absorbs whatever extra row height the paired heatmap adds
                instead of leaving a blank gutter under each column. */}
              <div className="flex-1 min-h-[6rem] sm:min-h-[7rem] bg-void rounded-[2px] overflow-hidden flex flex-col justify-end">
                <div
                  className={`${s.bar} w-full rounded-[2px] transition-all duration-700 opacity-80`}
                  style={{ height: `${s.pct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-faint text-right">
                {s.pct}%
              </p>
            </div>
          ))}
        </div>
      </Card>
    );
  },
);

// ─── 3. Battle Win Rate Trend ─────────────────────────────────────────────────
export const BattleTrendChart = memo(
  ({ data }: { data: BattleTrendPoint[] }) => {
    // Fully responsive width — fills its container instead of a fixed 300px.
    return (
      <Card accent="none" className="min-w-0">
        <div className="flex items-start justify-between mb-4">
          <SectionLabel>Win Rate Trend</SectionLabel>
          {data.length === 0 ? (
            <span
              className="text-3xl font-black font-mono text-accent-primary"
              style={{ filter: "drop-shadow(0 0 8px rgba(0,212,255,0.4))" }}
            >
              0%
            </span>
          ) : (
            <span
              className="text-3xl font-black font-mono text-accent-primary"
              style={{ filter: "drop-shadow(0 0 8px rgba(0,212,255,0.4))" }}
            >
               {Math.round((data[data.length - 1].winRate ?? 0) * 100)}%
            </span>
          )}
        </div>
        <div className="relative w-full h-24 sm:h-32 min-w-0">
          <svg
            viewBox="0 0 420 160"
            className="absolute inset-0 w-full h-full max-w-[420px] max-h-[160px]"
            role="img"
            aria-label="Win rate trend chart"
            preserveAspectRatio="none"
          >
            {/* 50% guide */}
            <line
              x1={0}
              y1={80}
              x2={420}
              y2={80}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 4"
            />
            {data.length === 0 ? (
              // Flat 0% baseline
              <line
                x1={0}
                y1={159}
                x2={420}
                y2={159}
                stroke="var(--accent-primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ) : (
              <>
                {data.map((d, i) => {
                  const wins = data
                    .slice(0, i + 1)
                    .filter((x) => x.result === "WIN").length;
                  const winRate = (wins / (i + 1)) * 100;
                  const xStep = 420 / Math.max(data.length - 1, 1);
                  const cx = i * xStep;
                  const cy = 160 - (winRate / 100) * 160;
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={2}
                      fill={
                        d.result === "WIN"
                          ? "var(--accent-success)"
                          : "var(--accent-danger)"
                      }
                      opacity={0.7}
                    />
                  );
                })}
                <polyline
                  points={data
                    .map((d, i) => {
                      const wins = data
                        .slice(0, i + 1)
                        .filter((x) => x.result === "WIN").length;
                      const winRate = (wins / (i + 1)) * 100;
                      const xStep = 420 / Math.max(data.length - 1, 1);
                      return `${i * xStep},${160 - (winRate / 100) * 160}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={`M0,160 ${data
                    .map((d, i) => {
                      const wins = data
                        .slice(0, i + 1)
                        .filter((x) => x.result === "WIN").length;
                      const winRate = (wins / (i + 1)) * 100;
                      const xStep = 420 / Math.max(data.length - 1, 1);
                      return `${i * xStep},${160 - (winRate / 100) * 160}`;
                    })
                    .join(
                      " ",
                    )} L${((data.length - 1) * 420) / Math.max(data.length - 1, 1)},160 Z`}
                  fill="url(#wr-grad)"
                />
                <defs>
                  <linearGradient id="wr-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent-primary)"
                      stopOpacity="0.2"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-primary)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
              </>
            )}
          </svg>
        </div>
        {data.length === 0 ? (
          <div className="flex justify-between mt-2 text-[9px] font-mono text-faint">
            <span>0 battles</span>
            <span>awaiting first battle</span>
          </div>
        ) : (
          <div className="flex justify-between mt-2 text-[9px] font-mono text-faint">
            <span>Battle #1</span>
            <span>Last {data.length} battles</span>
          </div>
        )}
      </Card>
    );
  },
);

// ─── 4. Language Usage ────────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  javascript: "#f0db4f",
  typescript: "#3178c6",
  python: "#4b8bbe",
  java: "#ed8b00",
  cpp: "#659ad2",
  c: "#a8b9cc",
  go: "#00add8",
  rust: "#ce422b",
};

export const LanguageBars = memo(({ data }: { data: LanguageUsage[] }) => {
  const top = data.slice(0, 5);
  const maxCount = Math.max(...top.map((d) => d.count || 0), 1);

  // Zero state: with no submissions every language genuinely sits at 0, so
  // render scaffold rows at 0 with empty tracks instead of a text stub.
  const rows: LanguageUsage[] =
    top.length > 0
      ? top
      : Object.keys(LANG_COLORS)
          .slice(0, 5)
          .map((language) => ({ language, count: 0 }));

  // Pre-compute language rows outside JSX to avoid arrow-function body
  // braces conflicting with JSX expression delimiters.
  const languageRows = rows.map((d) => {
    const color = LANG_COLORS[d.language] ?? "#64748b";
    const pct = Math.round(((d.count || 0) / maxCount) * 100);
    return (
      <div key={d.language} className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: color }}
            />
            <span className="text-[11px] font-mono text-subtle capitalize truncate">
              {d.language}
            </span>
          </div>
          <span className="text-[10px] font-mono text-subtle font-bold">
            {d.count}
          </span>
        </div>
        <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color, opacity: 0.75 }}
          />
        </div>
      </div>
    );
  });

  return (
    <Card accent="right" className="h-full flex flex-col min-w-0">
      <SectionLabel>Language Usage</SectionLabel>
      {/* flex-1 + centered: rows spread through the card's share of the grid
          row, so a single language doesn't sit in the top quarter with the
          rest of the cell blank. */}
      <div className="flex flex-1 flex-col justify-center gap-3 min-w-0">
        {/* Language rows pre-computed outside JSX to avoid brace conflicts */}
        {languageRows}
      </div>
    </Card>
  );
});

// ─── 5. Solve Velocity — monthly bar chart ────────────────────────────────────
const SolveVelocityChartInner = ({ data }: { data: SolveByMonth[] }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  // Zero state: synthesize the trailing six calendar months at count 0 so the
  // chart still draws its month axis and tracks instead of a text stub.
  const recent =
    data.length > 0
      ? data.slice(-6) // last 6 months
      : Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setDate(1);
          d.setMonth(d.getMonth() - 5 + i);
          return {
            month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            count: 0,
          };
        });

  // Pre-compute chart bars outside JSX to avoid arrow-function body
  // braces conflicting with JSX expression delimiters.
  const velocityRows = recent.map((d) => {
    const h = Math.round((d.count / max) * 100);
    const label = d.month.slice(5); // "MM"
    return (
      <div
        key={d.month}
        className="flex-1 flex flex-col items-center gap-1 min-w-0"
      >
        <span className="text-[9px] font-mono text-faint">{d.count}</span>
        <div
          className="w-full bg-surface-hover rounded-[2px] overflow-hidden flex flex-col justify-end"
          style={{ height: 52 }}
        >
          <div
            className="w-full bg-accent-success/70 rounded-[2px] transition-all duration-700"
            style={{ height: `${h}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-faint truncate">
          {label}
        </span>
      </div>
    );
  });

  return (
    <Card accent="bottom" className="min-w-0">
      <SectionLabel>Monthly Solves</SectionLabel>
      <div className="flex items-end gap-2 h-20 min-w-0">{velocityRows}</div>
    </Card>
  );
};

export const SolveVelocityChart = memo(SolveVelocityChartInner);

// ─── 6. Runtime Stats ─────────────────────────────────────────────────────────
export const RuntimeStats = memo(
  ({ data }: { data: { best: number; avg: number; worst: number } }) => {
    // Always render — with no timed runs every metric legitimately reads 0ms,
    // which keeps the grid row filled instead of dropping the column entirely.
    const fmt = (ms: number) =>
      ms === 0 ? "0ms" : ms >= 1 ? `${ms}ms` : `${(ms * 1000).toFixed(0)}μs`;

    return (
      <Card accent="none" className="h-full flex flex-col min-w-0">
        <SectionLabel>Execution Runtime</SectionLabel>
        {/* flex-1 + centered: metrics fill the card's share of the row while the
          SectionLabel stays top-aligned with its neighbor card. */}
        <div className="flex flex-1 flex-col justify-center">
          {/* 3-up metrics: scaled down on phones so "12345ms" stays in its column */}
          <div className="grid grid-cols-3 divide-x divide-accent-primary/15">
            {[
              { label: "Best", value: data.best, color: "text-accent-success" },
              {
                label: "Average",
                value: data.avg,
                color: "text-accent-primary",
              },
              {
                label: "Worst",
                value: data.worst,
                color: "text-accent-danger",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="flex min-w-0 flex-col items-center gap-1 px-1.5 first:pl-0 last:pr-0 sm:px-3"
              >
                <span className="text-[9px] font-mono text-faint uppercase tracking-wider">
                  {m.label}
                </span>
                <span className={`font-black font-mono sm:text-xl ${m.color}`}>
                  {fmt(m.value)}
                </span>
              </div>
            ))}
          </div>
          {data.avg === 0 && (
            <p className="mt-3 text-center text-[9px] font-mono uppercase tracking-wider text-faint">
              Awaiting first timed run
            </p>
          )}
        </div>
      </Card>
    );
  },
);

// ─── 7. Current Streak ────────────────────────────────────────────────────────
export const StreakPanel = memo(
  ({
    streak,
    activityData = [],
  }: {
    streak: number;
    activityData?: ActivityPoint[];
  }) => {
    const isActive = streak > 0;

    // Last-14-days strip: real data in the card's lower half so the short KPI
    // block no longer leaves the cell mostly blank — all-faint squares when the
    // user hasn't solved anything yet (honest 0-value state, same as the rest).
    const last14Days = (() => {
      const counts = new Map(activityData.map((p) => [p.date, p.count]));
      const days: { date: string; count: number }[] = [];
      const today = new Date();
      for (let offset = 13; offset >= 0; offset--) {
        const d = new Date(today);
        d.setDate(today.getDate() - offset);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({ date, count: counts.get(date) ?? 0 });
      }
      return days;
    })();

    return (
      <Card
        accent="top"
        className="flex-1 h-full flex flex-col justify-between min-w-0"
      >
        <SectionLabel>Current Streak</SectionLabel>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p
              className="text-4xl font-bold font-mono text-accent-warning mb-2 sm:text-5xl"
              style={{
                filter: isActive
                  ? "drop-shadow(0 0 12px rgba(245,158,11,0.6))"
                  : "none",
              }}
            >
              {streak}
            </p>
            <p className="text-[11px] text-faint font-mono">
              {streak === 1
                ? "day active"
                : streak === 0
                  ? "Start solving problems"
                  : "days in a row"}
            </p>
          </div>
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl sm:w-20 sm:h-20 sm:text-3xl ${
              isActive
                ? "bg-accent-warning/20 border border-accent-warning/40 text-accent-warning animate-pulse"
                : "bg-surface-hover border border-subtle-line text-faint"
            }`}
          >
            🔥
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-mono uppercase tracking-wider text-faint">
            Last 14 days
          </p>
          <div className="flex gap-1 sm:gap-1.5">
            {last14Days.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${d.count} solve${d.count === 1 ? "" : "s"}`}
                className={`h-2 sm:h-3 flex-1 rounded-[2px] ${
                  d.count > 0
                    ? "bg-accent-warning/80"
                    : "bg-surface-hover border border-subtle-line"
                }`}
              />
            ))}
          </div>
        </div>
      </Card>
    );
  },
);

// ─── 8. Completion Metrics ────────────────────────────────────────────────────
export const CompletionMetrics = memo(
  ({
    completionRate,
    growthRate,
    weakAreas,
    difficultyBreakdown,
  }: {
    completionRate: number;
    growthRate: number;
    weakAreas: WeakArea[];
    difficultyBreakdown?: { EASY: number; MEDIUM: number; HARD: number };
  }) => {
    const growthColor =
      growthRate > 50
        ? "text-accent-success"
        : growthRate > 0
          ? "text-accent-primary"
          : "text-faint";
    const growthTrend = growthRate > 0 ? "↑" : growthRate < 0 ? "↓" : "→";

    // Pre-compute weak area rows outside JSX
    const weakAreaRows = (
      weakAreas.length > 0
        ? weakAreas.slice(0, 2)
        : ["EASY", "HARD"].map((difficulty) => ({
            difficulty,
            solved: 0,
            attempted: 0,
            successRate: 0,
          }))
    ).map((area) => (
      <div
        key={area.difficulty}
        className="flex items-center justify-between rounded-btn border border-subtle-line bg-base/50 px-3 py-2"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg">
          {area.difficulty}
        </span>
        <span
          className={`font-mono text-[10px] font-bold ${area.successRate > 0 ? "text-accent-success" : "text-muted"}`}
        >
          {area.successRate}% ({area.solved}/{area.attempted})
        </span>
      </div>
    ));

    // Pre-compute difficulty breakdown rows outside JSX
    const breakdownRows = difficultyBreakdown
      ? (["EASY", "MEDIUM", "HARD"] as const).map((level) => (
          <div key={level} className="text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">
              {level}
            </span>
            <span className="block text-lg font-black font-mono text-fg sm:text-xl">
              {difficultyBreakdown[level]}
            </span>
          </div>
        ))
      : null;

    return (
      <Card accent="right" className="flex-1 h-full flex flex-col min-w-0">
        <SectionLabel>Performance Metrics</SectionLabel>
        {/* flex-1 + justify-between: sections distribute through the full card
          height (grid/flex stretched), so no half of the cell sits blank. */}
        <div className="flex flex-1 flex-col justify-between gap-4">
          {/* Completion Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-card border border-subtle-line bg-base/50 p-3 sm:p-4">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-subtle">
                Completion Rate
              </span>
              <span className="mt-1 block text-xl font-black font-mono text-accent-primary">
                {completionRate}%
              </span>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base">
                <div
                  className="h-full rounded-full bg-accent-primary transition-all duration-700"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div className="rounded-card border border-subtle-line bg-base/50 p-3 sm:p-4">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-subtle">
                Monthly Growth
              </span>
              <span
                className={`mt-1 block text-xl font-black font-mono ${growthColor}`}
              >
                {growthTrend} {Math.abs(growthRate)}%
              </span>
              <p className="mt-1 text-[9px] font-mono text-muted">
                {growthRate > 0
                  ? "More solves this month"
                  : growthRate < 0
                    ? "Fewer solves this month"
                    : "No solves yet this month"}
              </p>
            </div>
          </div>

          {/* Weak Areas */}
          <div className="border-t border-subtle-line pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-subtle">
                Weak Areas
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted">
                Solved by difficulty
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weakAreaRows}
            </div>
          </div>

          {difficultyBreakdown && breakdownRows && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-subtle-line pt-3">
              {breakdownRows}
            </div>
          )}
        </div>
      </Card>
    );
  },
);

// ─── Full Analytics Section ───────────────────────────────────────────────────
export const AnalyticsPanels = memo(
  ({
    analytics,
    compact = false,
  }: {
    analytics: UserAnalytics;
    compact?: boolean;
  }) => {
    const {
      summary,
      difficultyBreakdown,
      activityData,
      battleTrend,
      languageUsage,
      solvesByMonth,
      runtimeStats,
      weakAreas,
    } = analytics;

    if (compact) {
      // Dashboard: 2-column layout, concise
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <ActivityHeatmap data={activityData} />
          <div className="flex flex-col gap-4">
            <StreakPanel
              streak={summary.currentStreak}
              activityData={activityData}
            />
            <CompletionMetrics
              completionRate={summary.completionRate}
              growthRate={summary.growthRate}
              weakAreas={weakAreas}
              difficultyBreakdown={difficultyBreakdown}
            />
          </div>
        </div>
      );
    }

    // Profile: full layout — serialized for UX flow: headline KPIs first
    // (streak + performance), then what got solved (activity + difficulty), then
    // how it's trending over time (win rate + monthly velocity), and the
    // technical breakdown last. Each row pairs cards of similar content height
    // so no grid cell is left half-empty.
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StreakPanel
            streak={summary.currentStreak}
            activityData={activityData}
          />
          <CompletionMetrics
            completionRate={summary.completionRate}
            growthRate={summary.growthRate}
            weakAreas={weakAreas}
            difficultyBreakdown={difficultyBreakdown}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActivityHeatmap data={activityData} />
          <DifficultyBreakdown data={difficultyBreakdown} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BattleTrendChart data={battleTrend} />
          <SolveVelocityChart data={solvesByMonth} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LanguageBars data={languageUsage} />
          {/* Always rendered, even at 0ms — an empty column read as a layout
            hole, whereas zeroed values still tell the user where data lands. */}
          <RuntimeStats data={runtimeStats} />
        </div>
      </div>
    );
  },
);
