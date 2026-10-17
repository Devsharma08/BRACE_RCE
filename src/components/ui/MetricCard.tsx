import type { ComponentType, ReactNode } from "react";

// ─── MetricCard ──────────────────────────────────────────────────────────────
// Shared metric tile: label + value + optional icon/unit/trend/description.
type MetricCardProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  /** e.g. "+12 this week" or "2-day best streak". */
  trend?: string;
  trendTone?: "positive" | "warning" | "danger";
  description?: string;
  /** Colored status dot beside the label. */
  dotTone?: "live" | "active" | "warning" | "danger" | "muted";
  /** Value color — defaults to primary text. */
  valueTone?: "default" | "positive" | "warning" | "danger";
  icon?: ComponentType<{ className?: string }>;
  className?: string;
};

const dotClasses = {
  live: "bg-accent-success",
  active: "bg-accent-primary",
  warning: "bg-accent-warning",
  danger: "bg-accent-danger",
  muted: "bg-faint",
} as const;

const trendClasses = {
  positive: "text-accent-success",
  warning: "text-accent-warning",
  danger: "text-accent-danger",
} as const;

const valueClasses = {
  default: "text-fg",
  positive: "text-accent-success",
  warning: "text-accent-warning",
  danger: "text-accent-danger",
} as const;

export const MetricCard = ({
  label,
  value,
  unit,
  trend,
  trendTone = "positive",
  description,
  dotTone,
  valueTone = "default",
  icon: Icon,
  className = "",
}: MetricCardProps) => (
  <div className={`min-w-0 rounded-card border border-subtle-line bg-surface p-4 transition-colors hover:bg-surface-hover sm:p-5 ${className}`}>
    <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-subtle">
      {Icon && <Icon className="size-3.5 shrink-0 text-accent-primary/50" aria-hidden="true" />}
      {dotTone && <span className={`size-1.5 shrink-0 rounded-full ${dotClasses[dotTone]}`} aria-hidden="true" />}
      {label}
    </span>
    <p className="mt-2 flex items-baseline gap-1.5">
      <span className={`font-mono text-xl font-bold tabular-nums sm:text-2xl ${valueClasses[valueTone]}`}>{value}</span>
      {unit && <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{unit}</span>}
    </p>
    {trend && <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${trendClasses[trendTone]}`}>{trend}</p>}
    {description && <p className="mt-1.5 text-[11px] leading-relaxed text-subtle">{description}</p>}
  </div>
);

// ─── MetricCardSkeleton ──────────────────────────────────────────────────────
// Blinking placeholder matching MetricCard's shape while data is in flight.
export const MetricCardSkeleton = ({ className = "" }: { className?: string }) => (
  <div aria-hidden="true" className={`min-w-0 rounded-card border border-subtle-line bg-surface p-4 sm:p-5 ${className}`}>
    <span className="flex items-center gap-2">
      <span className="size-3 rounded-full bg-surface-hover animate-pulse" />
      <span className="h-2.5 w-24 rounded-none bg-surface-hover animate-pulse" />
    </span>
    <span className="mt-3 block h-6 w-16 rounded-none bg-surface-hover animate-pulse" />
  </div>
);