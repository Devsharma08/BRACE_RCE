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
  Waypoints,
} from "lucide-react";
import { dsCompletionState } from "../../../data/dsTopics";

/**
 * CategoryDirectory — home "master every structure" ledger.
 *
 * Eight data-structure domains as ledger rows (index / domain / focus /
 * corpus / action). Same accent-role mapping as WorkspaceDirectory so the
 * home page stays visually uniform with the token system.
 *
 * On /ds the optional `progressByHref` map (from useDsTopicProgress) marks
 * completed domains with a green icon border + chip and in-progress domains
 * amber — real-time from the learning-path API.
 */

type AccentKey = "cyan" | "lime" | "violet" | "amber" | "pink";

type ProgressEntry = { total: number; completed: number; inProgress: number };

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
  progressByHref,
}: {
  showHeader?: boolean;
  progressByHref?: Record<string, ProgressEntry>;
}) {
  return (
    <section aria-label="Problem categories" className="w-full px-2 py-6 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        {/* Section header */}
        {showHeader && (
        <div className="mb-8 sm:mb-12 text-center max-w-3xl mx-auto">
          <h2 className="mt-2 font-mono text-xl font-bold tracking-[-0.03em] text-fg md:text-2xl">
            Every structure
          </h2>
          <p className="mt-3 max-w-2xl text-xs leading-5 text-faint mx-auto md:text-sm">
            Data structures // Categories. Choose a domain, open its problem path, and build signal through focused repetition.
          </p>
        </div>
        )}

        {/* Ledger rows */}
        <div className="border-b border-subtle-line">
          <div className="hidden grid-cols-[60px_1fr_1.5fr_80px_28px] gap-4 border-b border-subtle-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.2em] text-faint md:grid md:grid-cols-[72px_1.1fr_2fr_110px_32px] md:px-4 md:py-3 md:text-[9px]">
            <span>Index</span>
            <span>Domain</span>
            <span>Training focus</span>
            <span>Corpus</span>
            <span />
          </div>
          {categories.map(({ id, title, description, icon: Icon, accent, count, href }) => {
            const progress = progressByHref?.[href];
            const state = dsCompletionState(progress);
            return (
              <Link
                key={id}
                to={href}
                className={`group relative grid gap-3 border-b border-line px-3 py-3 transition last:border-0 hover:bg-surface-hover md:grid-cols-[72px_1.1fr_2fr_110px_32px] md:items-center md:gap-6 md:py-4 md:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary ${
                  state === "COMPLETED" ? "bg-accent-success/[0.03]" : ""
                }`}
              >
                <span className={`font-mono text-xs font-bold ${accents[accent].split(" ")[0]} md:text-sm`}>{id}</span>
                <div className="flex items-center gap-2.5 md:gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center border bg-surface/60 ${
                      state === "COMPLETED"
                        ? "border-accent-success/70 text-accent-success"
                        : state === "PARTIAL"
                          ? "border-accent-warning/60 text-accent-warning"
                          : `border-line ${accents[accent].split(" ")[0]}`
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                  <h3 className="font-mono text-sm font-bold text-fg md:text-base">{title}</h3>
                </div>
                <p className="max-w-lg text-[10px] leading-4 text-faint md:hidden">{description}</p>
                <p className="hidden max-w-xl text-xs leading-5 text-faint md:block md:text-sm">{description}</p>
                <span className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-faint">
                  {count}
                  {state === "COMPLETED" && (
                    <span className="w-max border border-accent-success/50 bg-accent-success/10 px-1.5 py-0.5 text-accent-success">
                      completed
                    </span>
                  )}
                  {state === "PARTIAL" && progress && (
                    <span className="w-max border border-accent-warning/50 bg-accent-warning/10 px-1.5 py-0.5 text-accent-warning">
                      {progress.completed}/{progress.total} done
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  size={14}
                  className={`text-faint transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                    state === "COMPLETED" ? "text-accent-success" : accents[accent].split(" ")[0]
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CategoryDirectory;
