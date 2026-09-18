import type { ReactNode } from "react";

// ─── Panel ───────────────────────────────────────────────────────────────────
// Shared framed surface: border + surface + rounded-card, used by every app view.
type PanelProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  ariaLabel?: string;
  ariaLabelledBy?: string;
};

export const Panel = ({ children, className = "", as, ariaLabel, ariaLabelledBy }: PanelProps) => {
  // A labelled panel is a landmark — render <section> so it exposes role="region".
  const Tag = as ?? (ariaLabel || ariaLabelledBy ? "section" : "div");
  return (
    <Tag
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`min-w-0 overflow-hidden rounded-card border border-subtle-line bg-surface ${className}`}
    >
      {children}
    </Tag>
  );
};

// ─── PanelHeader ─────────────────────────────────────────────────────────────
// Mono uppercase panel title bar with optional right-side actions.
type PanelHeaderProps = {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export const PanelHeader = ({ title, actions, className = "" }: PanelHeaderProps) => (
  <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-subtle-line px-4 py-3 sm:px-5 ${className}`}>
    <span className="min-w-0 font-mono text-[10px] font-bold uppercase tracking-widest text-label">{title}</span>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

// ─── PanelBody ───────────────────────────────────────────────────────────────
export const PanelBody = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
);