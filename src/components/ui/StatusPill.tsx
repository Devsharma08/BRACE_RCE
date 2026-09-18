import type { ReactNode } from "react";

// ─── StatusPill ──────────────────────────────────────────────────────────────
// Shared status vocabulary:
//   cyan  = active / primary system state
//   lime  = verified / pass / live positive state
//   amber = attention / warning / candidate
//   red   = failure / danger
//   muted = neutral / idle
export type StatusTone = "active" | "live" | "warning" | "danger" | "muted" | "candidate";

const toneClasses: Record<StatusTone, { dot: string; text: string; frame: string }> = {
  active: { dot: "bg-accent-primary", text: "text-accent-primary", frame: "border-accent-primary/30" },
  live: { dot: "bg-accent-success", text: "text-accent-success", frame: "border-accent-success/30" },
  warning: { dot: "bg-accent-warning", text: "text-accent-warning", frame: "border-accent-warning/30" },
  danger: { dot: "bg-accent-danger", text: "text-accent-danger", frame: "border-accent-danger/30" },
  muted: { dot: "bg-faint", text: "text-subtle", frame: "border-subtle-line" },
  candidate: { dot: "bg-accent-warning", text: "text-accent-warning", frame: "border-dashed border-accent-warning/40" },
};

type StatusPillProps = {
  tone?: StatusTone;
  children: ReactNode;
  /** Animated ping on the dot — reserve for live/connection states only. */
  pulse?: boolean;
  className?: string;
};

export const StatusPill = ({ tone = "muted", children, pulse = false, className = "" }: StatusPillProps) => {
  const t = toneClasses[tone];
  return (
    <span className={`inline-flex min-h-7 items-center gap-2 border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${t.frame} ${t.text} ${className}`}>
      <span className="relative flex size-1.5" aria-hidden="true">
        {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${t.dot}`} />}
        <span className={`relative inline-flex size-1.5 rounded-full ${t.dot}`} />
      </span>
      {children}
    </span>
  );
};