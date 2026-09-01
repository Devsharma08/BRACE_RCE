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
  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">
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
    left: "border-l-2 border-l-cyan-500/50",
    right: "border-r-2 border-r-cyan-500/50",
    top: "border-t-2 border-t-cyan-500/50",
    bottom: "border-b-2 border-b-cyan-500/50",
    none: "",
  }[accent];

  return (
    <div
      className={`bg-[#06080e] border border-white/8 ${accentClass} p-5 ${className}`}
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
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

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
    if (count === 0) return "bg-white/[0.04] border-white/[0.04]";
    const t = count / max;
    if (t < 0.25) return "bg-cyan-900/50 border-cyan-800/30";
    if (t < 0.5) return "bg-cyan-700/60 border-cyan-600/40";
    if (t < 0.8) return "bg-cyan-500/70 border-cyan-400/50";
    return "bg-cyan-400/90 border-cyan-300/60";
  };

  const DOW = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card accent="top">
      <SectionLabel>Activity — {monthName}</SectionLabel>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d, i) => (
          <div key={i} className="text-[9px] text-slate-600 font-mono text-center">
            {d}
          </div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {padded.map((day, i) =>
          day === null ? (
            <div key={`pad-${i}`} />
          ) : (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} activities`}
              className={`aspect-square rounded-[2px] border flex items-center justify-center cursor-default transition-colors ${cellClass(day.count)}`}
            >
              <span className="text-[8px] font-mono text-white/40 leading-none">
                {day.dayNum}
              </span>
            </div>
          )
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-slate-600 font-mono">Less</span>
        {["bg-white/[0.04]", "bg-cyan-900/50", "bg-cyan-700/60", "bg-cyan-500/70", "bg-cyan-400/90"].map(
          (c, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
          )
        )}
        <span className="text-[9px] text-slate-600 font-mono">More</span>
      </div>
    </Card>
  );
});

// ─── 2. Difficulty Breakdown — full-width three columns ──────────────────────────
export const DifficultyBreakdown = memo(({
  data,
}: {
  data: { EASY: number; MEDIUM: number; HARD: number };
}) => {
  const total = data.EASY + data.MEDIUM + data.HARD || 1;

  const segments = [
    {
      label: "Easy",
      value: data.EASY,
      pct: Math.round((data.EASY / total) * 100),
      bar: "bg-emerald-500",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      bg: "bg-emerald-950/20",
    },
    {
      label: "Medium",
      value: data.MEDIUM,
      pct: Math.round((data.MEDIUM / total) * 100),
      bar: "bg-amber-500",
      text: "text-amber-400",
      border: "border-amber-500/20",
      bg: "bg-amber-950/20",
    },
    {
      label: "Hard",
      value: data.HARD,
      pct: Math.round((data.HARD / total) * 100),
      bar: "bg-rose-500",
      text: "text-rose-400",
      border: "border-rose-500/20",
      bg: "bg-rose-950/20",
    },
  ];

  return (
    <Card accent="left">
      <SectionLabel>Problems Solved by Difficulty</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`flex flex-col gap-3 border ${s.border} ${s.bg} p-3`}
          >
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                {s.label}
              </p>
              <p className={`text-2xl font-bold font-mono mt-0.5 ${s.text}`}>
                {s.value}
              </p>
            </div>
            {/* Vertical fill bar */}
            <div className="h-16 bg-black/30 rounded-[2px] overflow-hidden flex flex-col justify-end">
              <div
                className={`${s.bar} w-full rounded-[2px] transition-all duration-700 opacity-80`}
                style={{ height: `${s.pct}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-slate-500 text-right">
              {s.pct}%
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
});

// ─── 3. Battle Win Rate Trend ─────────────────────────────────────────────────
export const BattleTrendChart = memo(({ data }: { data: BattleTrendPoint[] }) => {
  if (data.length === 0) {
    return (
      <Card accent="none">
        <SectionLabel>Battle Trend</SectionLabel>
        <div className="h-24 flex items-center justify-center text-[11px] text-slate-600 font-mono">
          No battles yet
        </div>
      </Card>
    );
  }

  const W = 300;
  const H = 80;

  // Cumulative win rate
  const points = data.map((d, i) => {
    const wins = data.slice(0, i + 1).filter((x) => x.result === "WIN").length;
    return { ...d, winRate: (wins / (i + 1)) * 100 };
  });

  const xStep = W / Math.max(points.length - 1, 1);
  const polyline = points
    .map((p, i) => `${i * xStep},${H - (p.winRate / 100) * H}`)
    .join(" ");

  const areaPath =
    `M0,${H} ` +
    points.map((p, i) => `L${i * xStep},${H - (p.winRate / 100) * H}`).join(" ") +
    ` L${(points.length - 1) * xStep},${H} Z`;

  const currentWR = Math.round(points[points.length - 1].winRate);

  return (
    <Card accent="none">
      <div className="flex items-start justify-between mb-4">
        <SectionLabel>Win Rate Trend</SectionLabel>
        <span className="text-lg font-bold font-mono text-cyan-400">{currentWR}%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20 overflow-visible">
        <defs>
          <linearGradient id="wr-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 50% guide */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
        <path d={areaPath} fill="url(#wr-grad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* W/L dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={i * xStep}
            cy={H - (p.winRate / 100) * H}
            r="2"
            fill={p.result === "WIN" ? "#10b981" : "#f43f5e"}
            opacity={0.7}
          />
        ))}
        {/* Last dot emphasis */}
        <circle
          cx={(points.length - 1) * xStep}
          cy={H - (points[points.length - 1].winRate / 100) * H}
          r="3"
          fill="#06b6d4"
        />
      </svg>
      <div className="flex justify-between mt-2 text-[9px] font-mono text-slate-600">
        <span>Battle #1</span>
        <span>Last {points.length} battles</span>
      </div>
    </Card>
  );
});

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
  const maxCount = Math.max(...top.map((d) => d.count), 1);

  if (top.length === 0) {
    return (
      <Card accent="none">
        <SectionLabel>Language Usage</SectionLabel>
        <div className="h-24 flex items-center justify-center text-[11px] text-slate-600 font-mono">
          No submissions yet
        </div>
      </Card>
    );
  }

  return (
    <Card accent="right">
      <SectionLabel>Language Usage</SectionLabel>
      <div className="flex flex-col gap-3">
        {top.map((d) => {
          const color = LANG_COLORS[d.language] ?? "#64748b";
          const pct = Math.round((d.count / maxCount) * 100);
          return (
            <div key={d.language} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[11px] font-mono text-slate-300 capitalize">
                    {d.language}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {d.count}
                </span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color, opacity: 0.75 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});

// ─── 5. Solve Velocity — monthly bar chart ────────────────────────────────────
export const SolveVelocityChart = memo(({ data }: { data: SolveByMonth[] }) => {
  if (data.length === 0) {
    return (
      <Card accent="none">
        <SectionLabel>Monthly Solves</SectionLabel>
        <div className="h-24 flex items-center justify-center text-[11px] text-slate-600 font-mono">
          No solves yet
        </div>
      </Card>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const recent = data.slice(-6); // last 6 months

  return (
    <Card accent="bottom">
      <SectionLabel>Monthly Solves</SectionLabel>
      <div className="flex items-end gap-2 h-20">
        {recent.map((d) => {
          const h = Math.round((d.count / max) * 100);
          const label = d.month.slice(5); // "MM"
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono text-slate-500">{d.count}</span>
              <div className="w-full bg-white/5 rounded-[2px] overflow-hidden flex flex-col justify-end" style={{ height: 52 }}>
                <div
                  className="w-full bg-emerald-500/70 rounded-[2px] transition-all duration-700"
                  style={{ height: `${h}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500">{label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
});

// ─── 6. Runtime Stats ─────────────────────────────────────────────────────────
export const RuntimeStats = memo(({
  data,
}: {
  data: { best: number; avg: number; worst: number };
}) => {
  if (data.avg === 0) return null;

  const fmt = (ms: number) =>
    ms >= 1 ? `${ms}ms` : `${(ms * 1000).toFixed(0)}μs`;

  return (
    <Card accent="none">
      <SectionLabel>Execution Runtime</SectionLabel>
      <div className="grid grid-cols-3 divide-x divide-white/5">
        {[
          { label: "Best", value: data.best, color: "text-emerald-400" },
          { label: "Average", value: data.avg, color: "text-cyan-400" },
          { label: "Worst", value: data.worst, color: "text-rose-400" },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-1 px-3 first:pl-0 last:pr-0">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
              {m.label}
            </span>
            <span className={`text-base font-bold font-mono ${m.color}`}>
              {fmt(m.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
});

// ─── 7. Current Streak ────────────────────────────────────────────────────────
export const StreakPanel = memo(({ streak }: { streak: number }) => {
  const isActive = streak > 0;

  return (
    <Card accent="top">
      <SectionLabel>Current Streak</SectionLabel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-bold font-mono text-amber-400 mb-2">
            {streak}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {streak === 1
              ? "day active"
              : streak === 0
                ? "Start solving problems"
                : "days in a row"}
          </p>
        </div>
        <div
          className={`w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl ${
            isActive
              ? "bg-amber-500/20 border border-amber-500/50 text-amber-400"
              : "bg-white/5 border border-white/10 text-slate-600"
          }`}
        >
          🔥
        </div>
      </div>
    </Card>
  );
});

// ─── 8. Completion Metrics ────────────────────────────────────────────────────
export const CompletionMetrics = memo(({
  completionRate,
  growthRate,
  weakAreas,
}: {
  completionRate: number;
  growthRate: number;
  weakAreas: WeakArea[];
}) => {
  const growthColor =
    growthRate > 50 ? "text-emerald-400" : growthRate > 0 ? "text-cyan-400" : "text-slate-500";
  const growthTrend = growthRate > 0 ? "↑" : growthRate < 0 ? "↓" : "→";

  return (
    <Card accent="right">
      <SectionLabel>Performance Metrics</SectionLabel>
      <div className="space-y-4">
        {/* Completion Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Completion Rate
            </span>
            <span className="text-base font-bold font-mono text-cyan-400">
              {completionRate}%
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500/70 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Growth Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Monthly Growth
            </span>
            <span className={`text-base font-bold font-mono ${growthColor}`}>
              {growthTrend} {Math.abs(growthRate)}%
            </span>
          </div>
          <p className="text-[9px] text-slate-600 font-mono">
            {growthRate > 0
              ? "Solving more problems this month"
              : growthRate < 0
                ? "Fewer solves this month"
                : "No solves yet this month"}
          </p>
        </div>

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">
              Weak Areas
            </span>
            <div className="space-y-2">
              {weakAreas.slice(0, 2).map((area) => (
                <div key={area.difficulty} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 capitalize">{area.difficulty}</span>
                  <span
                    className={`font-mono font-bold ${
                      area.successRate >= 75
                        ? "text-emerald-400"
                        : area.successRate >= 50
                          ? "text-amber-400"
                          : "text-rose-400"
                    }`}
                  >
                    {area.successRate}% ({area.solved}/{area.attempted})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

// ─── Full Analytics Section ───────────────────────────────────────────────────
export const AnalyticsPanels = memo(({
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityHeatmap data={activityData} />
        <DifficultyBreakdown data={difficultyBreakdown} />
        <StreakPanel streak={summary.currentStreak} />
        <CompletionMetrics
          completionRate={summary.completionRate}
          growthRate={summary.growthRate}
          weakAreas={weakAreas}
        />
      </div>
    );
  }

  // Profile: full layout
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActivityHeatmap data={activityData} />
        <DifficultyBreakdown data={difficultyBreakdown} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BattleTrendChart data={battleTrend} />
        <LanguageBars data={languageUsage} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StreakPanel streak={summary.currentStreak} />
        <CompletionMetrics
          completionRate={summary.completionRate}
          growthRate={summary.growthRate}
          weakAreas={weakAreas}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SolveVelocityChart data={solvesByMonth} />
        {runtimeStats.avg > 0 && <RuntimeStats data={runtimeStats} />}
      </div>
    </div>
  );
});
