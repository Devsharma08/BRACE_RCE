import type { ReactNode } from "react";

// ─── PageHeader ──────────────────────────────────────────────────────────────
// Shared page/section header: eyebrow rule, display heading, description, actions.
type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  as?: "h1" | "h2";
  id?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export const PageHeader = ({ eyebrow, title, as: Tag = "h2", id, description, actions, className = "" }: PageHeaderProps) => (
  <header className={`flex flex-col justify-between gap-4 md:flex-row md:items-end ${className}`}>
    <div className="min-w-0">
      {eyebrow && (
        <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-label">
          <span aria-hidden="true" className="h-px w-6 bg-accent-primary/50" />
          {eyebrow}
        </p>
      )}
      <Tag id={id} className="font-display text-2xl font-black uppercase tracking-tight text-fg sm:text-3xl">
        {title}
      </Tag>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-subtle">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
  </header>
);