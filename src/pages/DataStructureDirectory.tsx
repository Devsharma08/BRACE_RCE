import type { FC } from "react";
import { LayoutDashboard, Code2, Trophy } from "lucide-react";
import { CategoryDirectory } from "../features/home/components/CategoryDirectory";
import { DS_ALGORITHMS } from "../data/dsAlgorithms";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDsTopicProgress } from "../hooks/useDsTopicProgress";
import { MetricCard } from "../components/ui/MetricCard";

const domainCount = Object.keys(DS_ALGORITHMS).length;
const algorithmCount = Object.values(DS_ALGORITHMS).reduce(
  (total, topic) => total + topic.algorithms.length,
  0,
);

/**
 * /ds — data-structure taxonomy landing.
 *
 * Page header → metric row (secondary) → domain ledger (primary).
 * The ledger is the main content and gets the most space.
 */
const DataStructureDirectory: FC = () => {
  const { data: analytics } = useAnalytics(true);
  const { bySlug } = useDsTopicProgress();
  const totalSolved = analytics?.summary?.totalSolved ?? 0;
  const currentStreak = analytics?.summary?.currentStreak ?? 0;

  const progressByHref: Record<string, { total: number; completed: number; inProgress: number }> = {};
  Object.keys(DS_ALGORITHMS).forEach((slug) => {
    const href = `/ds/${slug}`;
    const page = bySlug[slug];
    if (page) progressByHref[href] = page;
  });

  return (
    <main className="relative z-10 flex-1 min-w-0 w-full py-5 pb-16 md:py-6 md:pb-6 selection:bg-accent/30 selection:text-accent-primary">
      <div className="mx-auto max-w-6xl">

        {/* ── PAGE HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-accent-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-glow-primary" />
            Learning taxonomy
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Data <span className="text-accent-primary">structures</span>
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-subtle sm:text-sm">
            Eight domains, one execution engine. Open a structure, study the
            theory and implementations, then solve the matching problems.
          </p>
        </div>

        {/* ── METRIC ROW (secondary importance) ── */}
        <div className="grid gap-3 mb-8 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <MetricCard
            label="Domains"
            value={domainCount}
            unit="total"
            icon={LayoutDashboard}
          />
          <MetricCard
            label="Algorithms"
            value={algorithmCount}
            unit="patterns"
            icon={Code2}
          />
          <MetricCard
            label="Solved"
            value={totalSolved}
            unit="challenges"
            icon={Trophy}
            trend={`${currentStreak} day streak`}
            trendTone="positive"
          />
        </div>

        {/* ── DOMAIN LEDGER (primary importance — most space) ── */}
        <CategoryDirectory showHeader={false} progressByHref={progressByHref} />

      </div>
    </main>
  );
};

export default DataStructureDirectory;
