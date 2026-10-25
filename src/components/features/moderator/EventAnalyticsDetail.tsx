import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Clock,
  Users,
  ShieldAlert,
  Lock,
  Trophy,
  Skull,
  Code,
} from "lucide-react";
import {
  EventAnalyticsDetail,
  EventParticipantDetail,
  EventProblemDetail,
} from "../../../hooks/useModeratorEvents";

const STATUS_COLORS: Record<string, string> = {
  WAITING: "border-accent-warning/30 bg-accent-warning/10 text-accent-warning",
  IN_PROGRESS:
    "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
  FINISHED: "border-accent-success/30 bg-accent-success/10 text-accent-success",
  EXPIRED: "border-accent-danger/30 bg-accent-danger/10 text-accent-danger",
};

interface EventAnalyticsDetailProps {
  analytics: EventAnalyticsDetail;
  onBack: () => void;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent-primary/50 mb-3">
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

const StatTile = ({
  icon: Icon,
  label,
  value,
  tone = "text-fg",
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
  tone?: string;
}) => (
  <div className="flex items-center gap-3 rounded-card border border-line bg-void/80 p-3.5">
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border border-line bg-surface-hover text-faint">
      <Icon size={14} />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-widest text-faint">{label}</p>
      <p className={`mt-1 text-xl font-bold leading-none ${tone}`}>{value}</p>
    </div>
  </div>
);

export function EventAnalyticsDetailView({
  analytics,
  onBack,
}: EventAnalyticsDetailProps) {
  const {
    summary,
    runtimeStats,
    perParticipant,
    perProblem,
    timeline,
    blockedUsers,
    roomCode,
    status,
    host,
    startedAt,
    finishedAt,
    totalTimeLimitMs,
    maxUsers,
    createdAt,
  } = analytics;

  const passRate = summary.passRate;
  const durationMinutes =
    startedAt && finishedAt
      ? Math.round(
          (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) /
            60000,
        )
      : null;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle-line pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[10px] font-mono text-accent-primary hover:text-fg transition-colors"
          >
            <ChevronLeft size={13} /> Back to events
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${STATUS_COLORS[status]}`}
          >
            {status}
          </span>
          {roomCode && (
            <span className="text-[9px] font-mono text-faint">#{roomCode}</span>
          )}
        </div>
      </div>

      {/* Event header info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Users}
          label="Participants"
          value={summary.totalParticipants}
        />
        <StatTile
          icon={Clock}
          label="Duration"
          value={
            durationMinutes != null
              ? `${durationMinutes}m`
              : startedAt
                ? "In progress"
                : "Not started"
          }
        />
        <StatTile
          icon={Trophy}
          label="Pass Rate"
          value={`${passRate}%`}
          tone={passRate >= 50 ? "text-accent-success" : "text-accent-warning"}
        />
        <StatTile
          icon={Lock}
          label="Max Users"
          value={maxUsers}
          tone="text-accent-primary"
        />
      </div>

      {/* Event metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="col-span-1 sm:col-span-2">
          <SectionLabel>Event Details</SectionLabel>
          <div className="grid grid-cols-2 gap-3 text-[9px]">
            <div className="flex flex-col">
              <span className="text-faint uppercase tracking-widest">
                Event ID
              </span>
              <span className="font-mono text-fg truncate">
                {analytics.eventId}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-faint uppercase tracking-widest">
                Room Code
              </span>
              <span className="font-mono text-fg">{roomCode || "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-faint uppercase tracking-widest">Host</span>
              <span className="font-mono text-fg truncate">
                {host.username}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-faint uppercase tracking-widest">Type</span>
              <span className="font-mono text-fg capitalize">
                {analytics.type}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-faint uppercase tracking-widest">
                Status
              </span>
              <span
                className={`font-mono text-fg capitalize ${STATUS_COLORS[status]}`}
              >
                {analytics.status}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-faint uppercase tracking-widest">
                Created
              </span>
              <span className="font-mono text-fg">
                {new Date(createdAt).toLocaleString()}
              </span>
            </div>
            {startedAt && (
              <div className="flex flex-col">
                <span className="text-faint uppercase tracking-widest">
                  Started
                </span>
                <span className="font-mono text-fg">
                  {new Date(startedAt).toLocaleString()}
                </span>
              </div>
            )}
            {finishedAt && (
              <div className="flex flex-col">
                <span className="text-faint uppercase tracking-widest">
                  Finished
                </span>
                <span className="font-mono text-fg">
                  {new Date(finishedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Runtime stats */}
        <Card>
          <SectionLabel>Runtime Statistics</SectionLabel>
          <div className="grid grid-cols-3 gap-3 text-[9px]">
            <div className="flex flex-col items-center">
              <span className="text-faint uppercase tracking-widest">Best</span>
              <span className="font-mono font-bold text-accent-success">
                {runtimeStats.best}ms
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-faint uppercase tracking-widest">
                Average
              </span>
              <span className="font-mono font-bold text-fg">
                {runtimeStats.avg}ms
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-faint uppercase tracking-widest">
                Worst
              </span>
              <span className="font-mono font-bold text-accent-danger">
                {runtimeStats.worst}ms
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-problem breakdown */}
      <Card className="col-span-1 sm:col-span-2 lg:col-span-1">
        <SectionLabel>Problem Solve Rates</SectionLabel>
        <div className="flex flex-col gap-2">
          {perProblem.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-subtle-line pb-2 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] font-bold text-fg truncate">
                  {p.name}
                </span>
                <span className="text-[8px] font-mono text-faint uppercase">
                  #{p.problemNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[9px] font-mono text-faint">
                  {p.solveCount}/{p.attemptCount}
                </span>
                <span
                  className={`text-[9px] font-bold ${p.passRate >= 50 ? "text-accent-success" : p.passRate > 0 ? "text-accent-warning" : "text-accent-danger"}`}
                >
                  {p.passRate}%
                </span>
              </div>
              <div className="w-full h-1 bg-surface-hover rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-accent-primary/30 rounded-full"
                  style={{ width: `${p.passRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-participant breakdown */}
      <Card>
        <SectionLabel>Participant Performance</SectionLabel>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-[9px]">
            <thead className="border-b border-subtle-line">
              <tr>
                <th className="px-3 py-2 text-faint uppercase tracking-widest text-left">
                  Participant
                </th>
                <th className="px-3 py-2 text-faint uppercase tracking-widest text-right">
                  Status
                </th>
                <th className="px-3 py-2 text-faint uppercase tracking-widest text-right">
                  Score
                </th>
                <th className="px-3 py-2 text-faint uppercase tracking-widest text-right">
                  Problems
                </th>
                <th className="px-3 py-2 text-faint uppercase tracking-widest text-right">
                  Submissions
                </th>
                <th className="px-3 py-2 text-faint uppercase tracking-widest text-right">
                  Best Runtime
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle-line">
              {perParticipant.map((p) => (
                <tr
                  key={p.userId}
                  className="hover:bg-accent/5 transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[8px] font-bold text-fg shrink-0">
                        {p.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-xs font-bold text-fg truncate min-w-0">
                        {p.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                        ["PASSED", "COMPLETED", "WON"].includes(p.status)
                          ? "border-accent-success/30 text-accent-success"
                          : ["FAILED", "TIMEOUT", "LOST"].includes(p.status)
                            ? "border-accent-danger/30 text-accent-danger"
                            : "border-accent-warning/30 text-accent-warning"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono text-fg">{p.score}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono text-fg">
                      {p.questionsSolved}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono text-fg">
                      {p.submissionCount}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-mono text-[9px] ${p.bestRuntimeMs ? "text-fg" : "text-faint"}`}
                    >
                      {p.bestRuntimeMs ? `${p.bestRuntimeMs}ms` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <SectionLabel>Event Timeline</SectionLabel>
        {timeline.length === 0 ? (
          <p className="text-[9px] text-faint text-center py-4">
            No timeline events recorded.
          </p>
        ) : (
          <div className="relative border-l border-subtle-line pl-4">
            {timeline.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 mb-4 relative"
              >
                <div className="flex h-2 w-2 items-center justify-center rounded-full border border-line bg-raised z-10">
                  <div className="h-1 w-1 rounded-full bg-accent-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-fg">
                    {entry.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[8px] text-faint font-mono">
                    {entry.actorUsername || "System"} ·{" "}
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  {entry.reason && (
                    <span className="text-[8px] text-faint mt-0.5">
                      {entry.reason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Blocked users */}
      {blockedUsers.length > 0 && (
        <Card accent="right">
          <SectionLabel>Blocked Users</SectionLabel>
          <div className="flex flex-col gap-2">
            {blockedUsers.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 border border-subtle-line bg-base/50 px-3 py-2 text-[9px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-fg truncate">
                    {b.blockedUserUsername}
                  </span>
                  <span className="text-[8px] text-faint uppercase">
                    blocked
                  </span>
                </div>
                <span className="text-[8px] text-faint font-mono">
                  {b.reason || "No reason provided"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Back button */}
      <div className="flex justify-end">
        <Link
          to="/moderator/events"
          className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-accent-primary hover:text-fg"
        >
          <ChevronLeft size={13} /> Back to event list
        </Link>
      </div>
    </div>
  );
}
