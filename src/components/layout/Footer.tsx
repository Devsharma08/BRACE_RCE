import { Link } from "react-router-dom";
import { ArrowUpRight, Code2, Radio } from "lucide-react";

type FooterVariant = "full" | "compact";

/**
 * SiteFooter — system sign-off strip.
 *
 * `full` is the marketing-scale footer with the giant wordmark and links.
 * `compact` is a slim system strip for dense app views (e.g. /profile).
 */
export const Footer = ({ variant = "full" }: { variant?: FooterVariant } = {}) => {
  if (variant === "compact") {
    return (
      <footer className="w-full border-t border-line bg-base px-5 py-4 text-faint sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.18em] sm:flex-row">
          <span>BRACE RCE / built by Dev Sharma</span>
          <span className="text-accent-primary/70">DSA journey × web development</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-line bg-base px-5 py-14 text-fg sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-accent-primary">
              <Radio size={13} /> System footer / end of transmission
            </div>
            <p className="mt-8 font-mono text-[clamp(3.8rem,12vw,9rem)] font-bold leading-[0.78] tracking-[-0.1em] text-fg">
              BRACE<span className="text-accent-primary">.</span>RCE
            </p>
            <p className="mt-8 max-w-md font-sans text-sm leading-6 text-faint">
              A small execution engine built from a DSA journey, sharpened through web development, and designed for the next operative.
            </p>
          </div>
          <div className="flex flex-col justify-between gap-10 lg:items-end">
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
