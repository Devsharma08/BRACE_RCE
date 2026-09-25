import { Link } from "react-router-dom";
import { ArrowUpRight, Code2, SquareTerminal } from "lucide-react";

/**
 * WorkspaceTeaser — home card for the sandboxed coding workspace.
 *
 * Replaces the taxonomy ledger that moved to its own /ds page: one wide
 * protocol card (same card idiom as WorkspaceDirectory) routing into the
 * live terminal.
 */
export function WorkspaceTeaser() {
  return (
    <section aria-label="Workspace" className="w-full py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="group relative flex flex-col overflow-hidden rounded-panel border border-line bg-surface/60 p-7 transition duration-300 hover:border-line-mid hover:bg-surface-hover/60 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="absolute right-7 top-7 hidden h-11 w-11 place-items-center rounded-full border border-line bg-surface/60 text-accent-primary transition duration-300 group-hover:scale-105 group-hover:border-line-mid md:grid">
            <Code2 size={18} />
          </div>

          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
              workspace protocol
            </div>
            <h2 className="mt-5 font-mono text-3xl font-bold tracking-tight text-fg md:text-4xl">
              Workspace
            </h2>
            <p className="mt-4 text-sm leading-6 text-subtle">
              Write, run, and debug code in your sandboxed coding workspace with live diagnostics.
            </p>
          </div>

          <div className="relative mt-8 flex flex-wrap items-center gap-3 md:mt-0">
            <Link
              to="/terminal"
              className="flex items-center gap-2 border border-accent-primary/40 bg-accent-primary/10 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent-primary transition hover:border-accent-primary/70 hover:bg-accent-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              <SquareTerminal size={14} />
              Launch terminal
              <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              to="/ds"
              className="flex items-center gap-2 border border-subtle-line px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-faint transition hover:border-accent-primary/50 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              Open protocol
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceTeaser;
