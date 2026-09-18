import type { ComponentType, ReactNode } from "react";

// ─── EmptyState ──────────────────────────────────────────────────────────────
// Shared empty state: never render a blank box — always offer the next action.
type EmptyStateProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ icon: Icon, title, message, action, className = "" }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center gap-3 rounded-card border border-subtle-line bg-surface px-6 py-10 text-center ${className}`}>
    <span aria-hidden="true" className="grid size-11 place-items-center rounded-btn border border-subtle-line bg-surface-hover text-accent-primary">
      <Icon className="size-5" />
    </span>
    <p className="font-mono text-sm font-bold uppercase tracking-wider text-fg">{title}</p>
    <p className="max-w-sm text-sm leading-relaxed text-subtle">{message}</p>
    {action && <div className="mt-1">{action}</div>}
  </div>
);