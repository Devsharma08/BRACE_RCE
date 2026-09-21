import type { FC } from "react";
import { Layers3, Waypoints } from "lucide-react";
import { CategoryDirectory } from "../features/home/components/CategoryDirectory";
import { DS_ALGORITHMS } from "../data/dsAlgorithms";

const domainCount = Object.keys(DS_ALGORITHMS).length;
const algorithmCount = Object.values(DS_ALGORITHMS).reduce(
  (total, topic) => total + topic.algorithms.length,
  0,
);

/**
 * /ds — data-structure taxonomy landing.
 *
 * Opens with the same console page-header idiom used across the app
 * (eyebrow strip → h1 → description → stat chips), then the ledger rows
 * route into each /ds/:slug console.
 */
const DataStructureDirectory: FC = () => (
  <div className="flex w-full min-w-0 flex-col bg-base text-fg">
    <div className="w-full px-4 pt-10 sm:px-6 md:pt-14">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 border-b border-subtle-line pb-8 md:flex-row md:items-end">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-accent-primary">
              <Layers3 size={13} />
              <span>problem corpus / taxonomy</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Master every <span className="text-accent-primary">structure.</span>
            </h1>
            <p className="max-w-xl text-xs leading-relaxed text-subtle">
              Data structures // Categories. Choose a domain, open its problem path, and build signal through focused repetition.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-widest">
            <span className="border border-accent-primary/25 bg-accent-primary/[0.05] px-2.5 py-1.5 text-accent-primary">
              Domains <strong className="ml-1 text-fg">{domainCount}</strong>
            </span>
            <span className="border border-accent-success/25 bg-accent-success/[0.05] px-2.5 py-1.5 text-accent-success">
              Algorithms <strong className="ml-1 text-fg">{algorithmCount}</strong>
            </span>
            <span className="border border-subtle-line px-2.5 py-1.5 text-faint">
              <Waypoints size={12} className="mr-1 inline" /> corpus synced
            </span>
          </div>
        </header>
      </div>
    </div>
    <CategoryDirectory showHeader={false} />
  </div>
);

export default DataStructureDirectory;
