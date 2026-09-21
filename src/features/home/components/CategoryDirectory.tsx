import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Brackets,
  GitBranch,
  Layers3,
  Link2,
  ListFilter,
  Search,
  Sigma,
  Sparkles,
  Waypoints,
} from "lucide-react";

/**
 * CategoryDirectory — home "master every structure" ledger.
 *
 * Eight data-structure domains as ledger rows (index / domain / focus /
 * corpus / action). Same accent-role mapping as WorkspaceDirectory so the
 * home page stays visually uniform with the token system.
 */

type AccentKey = "cyan" | "lime" | "violet" | "amber" | "pink";

const categories: {
  id: string;
  title: string;
  description: string;
  icon: typeof GitBranch;
  accent: AccentKey;
  count: string;
  href: string;
}[] = [
  { id: "01", title: "Trees & Graphs", description: "Traverse non-linear structures. Master BSTs, Tries, and complex graph algorithms.", icon: GitBranch, accent: "cyan", count: "32 paths", href: "/ds/tree" },
  { id: "02", title: "Dynamic Programming", description: "Break down hard problems and build efficient sub-solutions from first principles.", icon: Layers3, accent: "lime", count: "28 paths", href: "/ds/dynamic-programming" },
  { id: "03", title: "Arrays & Strings", description: "The core foundation of sequence logic, indexing, windows, and transformations.", icon: Brackets, accent: "violet", count: "46 paths", href: "/ds/array" },
  { id: "04", title: "Linked Lists", description: "Sequential access, cycle detection, and pointer mastery under pressure.", icon: Link2, accent: "amber", count: "18 paths", href: "/ds/linked-list" },
  { id: "05", title: "Sorting & Searching", description: "Optimize collection performance with lookup and ordering techniques.", icon: Search, accent: "pink", count: "24 paths", href: "/ds/searching" },
  { id: "06", title: "Math & Geometry", description: "Number theory, primes, modular arithmetic, and spatial algorithms.", icon: Sigma, accent: "cyan", count: "21 paths", href: "/ds/math" },
  { id: "07", title: "Stacks & Queues", description: "Master linear data flow using LIFO and FIFO structures.", icon: ListFilter, accent: "lime", count: "16 paths", href: "/ds/stack" },
  { id: "08", title: "Greedy & Intervals", description: "Make optimal local choices and solve range intersection problems.", icon: Waypoints, accent: "violet", count: "19 paths", href: "/ds/greedy" },
];

const accents: Record<AccentKey, string> = {
  cyan: "text-accent-primary border-accent-primary/20 bg-accent-primary/[0.035]",
  lime: "text-accent-success border-accent-success/20 bg-accent-success/[0.035]",
  violet: "text-accent-violet border-accent-violet/20 bg-accent-violet/[0.035]",
  amber: "text-accent-warning border-accent-warning/20 bg-accent-warning/[0.035]",
  pink: "text-accent-pink border-accent-pink/20 bg-accent-pink/[0.035]",
};

export function CategoryDirectory({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  return (
    <section aria-label="Problem categories" className="w-full py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header */}
        {showHeader && (
        <div className="mb-10 sm:mb-14 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,212,255,0.9)]" />
            problem corpus / taxonomy
          </div>
          <h2 className="mt-5 font-mono text-4xl font-bold tracking-[-0.04em] text-fg md:text-5xl">
            Master every <span className="text-accent-primary">structure.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-faint mx-auto">
            Data structures // Categories. Choose a domain, open its problem path, and build signal through focused repetition.
          </p>
        </div>
        )}

        {/* Ledger rows */}
        <div className="border-b border-subtle-line">
          <div className="hidden grid-cols-[72px_1.1fr_2fr_110px_32px] gap-6 border-b border-subtle-line px-4 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-faint md:grid">
            <span>Index</span>
            <span>Domain</span>
            <span>Training focus</span>
            <span>Corpus</span>
            <span />
          </div>
          {categories.map(({ id, title, description, icon: Icon, accent, count, href }) => (
            <Link
              key={id}
              to={href}
              className="group relative grid gap-4 border-b border-line px-4 py-5 transition last:border-0 hover:bg-surface-hover md:grid-cols-[72px_1.1fr_2fr_110px_32px] md:items-center md:gap-6 md:py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              <span className={`font-mono text-sm font-bold ${accents[accent].split(" ")[0]}`}>{id}</span>
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 place-items-center border border-line bg-black/20 ${accents[accent].split(" ")[0]}`}>
                  <Icon size={16} />
                </span>
                <h3 className="font-mono text-base font-bold text-fg md:text-lg">{title}</h3>
              </div>
              <p className="max-w-xl text-xs leading-5 text-faint md:text-sm">{description}</p>
              <span className="font-mono text-[10px] uppercase tracking-widest text-faint">{count}</span>
              <ArrowUpRight
                size={16}
                className={`text-faint transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${accents[accent].split(" ")[0]}`}
              />
            </Link>
          ))}
        </div>

        {/* Footer strip */}
        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-subtle-line pt-6 font-mono text-[10px] uppercase tracking-widest text-faint md:flex-row">
          <span>Brace RCE / structured practice</span>
          <span className="flex items-center gap-2">
            <Sparkles size={13} className="text-accent-success" /> adaptive paths online
          </span>
        </div>
      </div>
    </section>
  );
}

export default CategoryDirectory;
