import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CircleUserRound,
  Code2,
  Eye,
  Gauge,
  LockKeyhole,
  Swords,
} from "lucide-react";

/**
 * WorkspaceDirectory — home "choose your workspace" bento.
 *
 * Five protocol cards on a 12-col grid (7/5 split top row, three 4-col cards
 * below). Accent roles map to the shared design tokens so the section reads
 * identically to the rest of the app:
 *   cyan   → accent-primary (brand CTA)
 *   lime   → accent-success (live / verified telemetry)
 *   violet → accent-violet  (competition protocol)
 *   amber  → accent-warning (network / presence)
 *   pink   → accent-pink    (review protocol)
 */

type AccentKey = "cyan" | "lime" | "violet" | "amber" | "pink";

export const services: {
  id: string;
  category: string;
  title: string;
  description: string;
  detail: string;
  href: string;
  icon: typeof Code2;
  accent: AccentKey;
  signal: string;
}[] = [
  { id: "01", category: "WORKSPACE PROTOCOL", title: "Problem workspace", description: "Browse algorithm problems beside a focused editor, hints, examples, and test cases.", detail: "side-by-side IDE / five runtimes", href: "/problems", icon: Code2, accent: "cyan", signal: "WORKSPACE READY" },
  { id: "03", category: "VERIFICATION PROTOCOL", title: "Telemetry verification", description: "Execute complete suites in a secure sandbox and inspect verdicts, runtimes, and output diffs.", detail: "visible / hidden / edge tiers", href: "/terminal", icon: Gauge, accent: "lime", signal: "SUITE MONITORING" },
  { id: "05", category: "COMPETITION PROTOCOL", title: "Battle arena", description: "Enter ranked rooms, synchronize with an opponent, and solve under a shared clock.", detail: "realtime rooms / match state", href: "/lobby", icon: Swords, accent: "violet", signal: "LOBBY ACTIVE" },
  { id: "07", category: "NETWORK PROTOCOL", title: "Friends & challenges", description: "Track operative presence, compare progress, and issue direct coding challenges.", detail: "presence / requests / head-to-head", href: "/friends", icon: CircleUserRound, accent: "amber", signal: "NETWORK ONLINE" },
  { id: "08", category: "REVIEW PROTOCOL", title: "Match review & replay", description: "Compare submitted code, inspect the timeline, and learn from every decisive moment.", detail: "replay / timeline / spectate", href: "/dashboard", icon: Eye, accent: "pink", signal: "REPLAY INDEXED" },
];

const accentStyles: Record<
  AccentKey,
  { text: string; border: string; line: string; tint: string; glow: string }
> = {
  cyan: { text: "text-accent-primary", border: "border-accent-primary/30", line: "bg-accent-primary", tint: "bg-accent-primary/[0.06]", glow: "group-hover:shadow-[0_0_40px_rgba(0,212,255,0.08)]" },
  lime: { text: "text-accent-success", border: "border-accent-success/30", line: "bg-accent-success", tint: "bg-accent-success/[0.045]", glow: "group-hover:shadow-[0_0_40px_rgba(0,255,135,0.07)]" },
  violet: { text: "text-accent-violet", border: "border-accent-violet/30", line: "bg-accent-violet", tint: "bg-accent-violet/[0.05]", glow: "group-hover:shadow-[0_0_40px_rgba(196,181,253,0.07)]" },
  amber: { text: "text-accent-warning", border: "border-accent-warning/30", line: "bg-accent-warning", tint: "bg-accent-warning/[0.045]", glow: "group-hover:shadow-[0_0_40px_rgba(255,184,0,0.07)]" },
  pink: { text: "text-accent-pink", border: "border-accent-pink/30", line: "bg-accent-pink", tint: "bg-accent-pink/[0.045]", glow: "group-hover:shadow-[0_0_40px_rgba(249,168,212,0.07)]" },
} as const;

export function WorkspaceDirectory() {
  return (
    <section aria-label="Available workspaces" className="w-full py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header — identical treatment to every other section */}
        <div className="mb-10 sm:mb-14 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,212,255,0.9)]" />
            workspace directory / online
          </div>
          <h2 className="mt-5 font-mono text-4xl font-bold tracking-[-0.04em] text-fg md:text-5xl">
            Choose your <span className="text-accent-primary">workspace.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-faint mx-auto">
            One execution engine. Five systems for building, verifying, competing, connecting, and reviewing your operative signal.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[220px]">
          {services.map(({ id, category, title, description, detail, href, icon: Icon, accent, signal }) => {
            const styles = accentStyles[accent];
            const placement =
              id === "01" ? "lg:col-start-1 lg:col-span-7 lg:row-start-1 lg:row-span-2"
              : id === "03" ? "lg:col-start-8 lg:col-span-5 lg:row-start-1"
              : id === "05" ? "lg:col-start-1 lg:col-span-4 lg:row-start-3"
              : id === "07" ? "lg:col-start-5 lg:col-span-4 lg:row-start-3"
              : "lg:col-start-9 lg:col-span-4 lg:row-start-3";
            const cardStyle = id === "01" ? "min-h-[390px]" : "min-h-[220px]";
            return (
              <Link
                key={href + id}
                to={href}
                className={`group relative flex ${cardStyle} ${placement} flex-col overflow-hidden rounded-[28px] border border-line bg-surface/60 p-7 transition duration-300 hover:-translate-y-1 hover:border-line-mid hover:bg-surface-hover/60 md:p-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary`}
              >
                <div className={`absolute right-7 top-7 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface/60 ${styles.text} transition duration-300 group-hover:scale-105 group-hover:border-line-mid`}>
                  <Icon size={18} />
                </div>
                <div className="absolute -bottom-10 -right-3 select-none font-mono text-[10rem] font-bold leading-none tracking-[-0.16em] text-fg/[0.025]">{id}</div>
                <div className="relative flex items-center gap-2 pr-16">
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.line}`} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">{category}</span>
                </div>
                <div className="relative mt-auto">
                  <div className={`mb-4 font-mono text-[9px] uppercase tracking-[0.18em] ${styles.text}`}>{signal}</div>
                  <h3 className={`font-mono font-bold tracking-tight text-fg ${id === "01" ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"}`}>{title}</h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-subtle">{description}</p>
                  <div className="mt-7 flex items-center justify-between border-t border-line pt-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-faint">{detail}</span>
                    <span className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest ${styles.text}`}>
                      Open <ArrowUpRight size={14} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pre-flight strip */}
        <div className="mt-12 grid gap-5 border-y border-subtle-line py-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-success">
              <LockKeyhole size={13} /> pre-flight verified
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-faint">
              All workspaces share the same verified test corpus, isolated runners, and operative identity layer.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-faint">
            <CircleUserRound size={13} /> secure execution
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceDirectory;
