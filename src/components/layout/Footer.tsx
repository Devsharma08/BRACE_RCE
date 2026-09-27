import { Link } from "react-router-dom";
import { ArrowUpRight, Code2, Radio } from "lucide-react";

type FooterVariant = "full" | "compact";

type FooterProps = {
  variant?: FooterVariant;
  /**
   * Set on every route rendered inside ConsoleShell (/dashboard, /problems,
   * /lobby, ...). ConsoleShell owns the fixed DashboardSidebar and the fixed
   * MobileBottomNav, but Layout renders this footer OUTSIDE that shell, so the
   * footer has to repeat both offsets itself:
   *
   *  - `md:ml-[var(--sidebar-width)]` + a matching `md:w-[calc(...)]` move it
   *    into the content column. Without them the opaque rail (z-40, full
   *    viewport height) paints over the footer's left edge, which is what made
   *    the wordmark look trimmed as the rail expanded.
   *  - `pb-[calc(... + var(--mobile-bottom-nav-height))]` lifts the copyright
   *    row above the fixed bottom nav; `md:pb-*` drops that clearance once the
   *    nav (md:hidden) is gone.
   *
   * `--sidebar-width` resolves to 0px below md (index.css), so the width math
   * collapses back to `w-full` on phones.
   */
  offsetRail?: boolean;
};

/**
 * SiteFooter — system sign-off strip.
 *
 * `full` is the marketing-scale footer with the giant wordmark and links.
 * `compact` is a slim system strip for dense app views (e.g. /profile).
 */
export const Footer = ({ variant = "full", offsetRail = false }: FooterProps) => {
  // Rail clearance — empty on public routes so the marketing footer keeps its
  // full-bleed, viewport-scaled typography.
  const railOffset = offsetRail
    ? "md:ml-[var(--sidebar-width)] md:w-[calc(100%_-_var(--sidebar-width))]"
    : "";

  if (variant === "compact") {
    return (
      <footer
        className={`w-full border-t border-line bg-base px-5 pt-4 text-faint sm:px-8 ${railOffset} ${
          offsetRail
            ? "pb-[calc(1rem_+_var(--mobile-bottom-nav-height))] md:pb-4"
            : "pb-4"
        }`}
      >
        <div className="mx-auto flex max-w-6xl min-w-0 flex-col items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.18em] sm:flex-row">
          <span>BRACE RCE / built by Dev Sharma</span>
          <span className="text-accent-primary/70">DSA journey × web development</span>
        </div>
      </footer>
    );
  }

  // Once the rail eats 245px the footer column is much narrower than the
  // viewport, so the watermark has to track the footer rather than the window
  // or it overruns its grid track and gets clipped at the rail edge.
  const wordmarkScale = offsetRail
    ? "text-[clamp(3.8rem,8.5vw,8rem)]"
    : "text-[clamp(3.8rem,12vw,9rem)]";

  return (
    <footer
      className={`w-full border-t border-line bg-base px-5 pt-14 text-fg sm:px-8 lg:px-12 lg:pt-20 ${railOffset} ${
        offsetRail
          ? "pb-[calc(3.5rem_+_var(--mobile-bottom-nav-height))] md:pb-14 lg:pb-20"
          : "pb-14 lg:pb-20"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl min-w-0">
        <div className="grid min-w-0 gap-12 lg:grid-cols-[1.35fr_.65fr]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-accent-primary">
              <Radio size={13} /> System footer / end of transmission
            </div>
            <p
              className={`mt-8 font-mono font-bold leading-[0.78] tracking-[-0.1em] text-fg ${wordmarkScale}`}
            >
              BRACE<span className="text-accent-primary">.</span>RCE
            </p>
            <p className="mt-8 max-w-md font-sans text-sm leading-6 text-faint">
              A small execution engine built from a DSA journey, sharpened through web development, and designed for the next operative.
            </p>
          </div>
          <div className="flex min-w-0 flex-col justify-between gap-10 lg:items-end">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint lg:text-right">
              <span className="mb-3 block text-accent-success">● channel open</span>
              Sandboxed execution
              <br />
              Realtime competition
              <br />
              Structured practice
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to="/terminal"
                className="flex items-center gap-2 rounded-none border border-line px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-subtle transition hover:border-accent-primary/50 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                Enter system <ArrowUpRight size={13} />
              </Link>
              <a
                href="https://github.com/Devsharma08/BRACE_RCE"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-none border border-line px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-subtle transition hover:border-accent-primary/50 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                <Code2 size={13} /> Source
              </a>
            </div>
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-line pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint sm:flex-row">
          <span>BRACE RCE — built with care by Dev Sharma</span>
          <span>© {new Date().getFullYear()} / all systems reserved</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
