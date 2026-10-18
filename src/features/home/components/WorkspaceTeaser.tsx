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
    <section aria-label="Workspace" className="w-full py-10 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="group relative flex flex-col overflow-hidden rounded-panel border border-line bg-base/60 p-5 transition duration-300 hover:border-line-mid md:flex-row md:items-center md:justify-between md:p-10">
          <div className="absolute right-4 top-4 hidden h-9 w-9 place-items-center rounded-full border border-line bg-surface/60 text-accent-primary transition duration-300 group-hover:scale-105 group-hover:border-line-mid md:grid md:right-7 md:top-7 md:h-11 md:w-11">
            <Code2 size={18} />
          </div>

          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
              workspace protocol
            </div>
            <h2 className="mt-4 font-mono text-2xl font-bold tracking-tight text-fg md:mt-5 md:text-3xl lg:text-4xl">
              Workspace
            </h2>
            <p className="mt-3 text-xs leading-6 text-subtle md:text-sm">
              Write, run, and debug code in your sandboxed coding workspace with live diagnostics.
            </p>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2 sm:gap-3 md:mt-0">
            <Link
              to="/terminal"
              className="flex items-center gap-1.5 border border-accent-primary/40 bg-accent-primary/10 px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent-primary transition hover:border-accent-primary/70 hover:bg-accent-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary sm:px-5 sm:py-3 sm:text-[10px] sm:gap-2"
            >
              <SquareTerminal size={14}  />
              Launch terminal
              <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 " />
            </Link>
            <Link
              to="/ds"
              className="flex items-center gap-1.5 border border-subtle-line px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-faint transition hover:border-accent-primary/50 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary sm:px-5 sm:py-3 sm:text-[10px]"
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
