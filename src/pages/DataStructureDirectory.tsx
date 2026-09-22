import type { FC } from "react";
import { Layers3, Waypoints } from "lucide-react";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
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
  <div className="flex min-h-screen bg-base text-fg font-mono relative">
    {/* Dot-grid texture */}
    <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />

    {/* Desktop sidebar */}
    <DashboardSidebar rating={undefined} />

    {/* Mobile bottom nav */}
    <MobileBottomNav />

    {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
    <main
      className="
        flex-1 min-w-0 w-full
        ml-0 md:ml-[60px] lg:ml-[245px]
        pt-14 px-4 py-6 md:px-8 md:py-8
        pb-20 md:pb-8
        flex flex-col gap-6
      "
    >
      {/* HEADER — eyebrow strip → h1 → description → stat chips */}
      <header className="flex flex-col justify-between gap-5 border-b border-subtle-line pb-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-accent-primary">
            <Layers3 size={13} />
            <span>DS // corpus taxonomy</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Master every <span className="text-accent-primary">structure.</span>
          </h1>
          <p className="text-xs text-subtle leading-relaxed max-w-xl">
            Data structures // Categories. Choose a domain, open its problem path, and build signal through focused repetition.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-widest">
          <span className="border border-accent-primary/25 bg-accent-primary/5 px-2.5 py-1.5 text-accent-primary">
            Domains <strong className="ml-1 text-fg">{domainCount}</strong>
          </span>
          <span className="border border-accent-success/25 bg-accent-success/5 px-2.5 py-1.5 text-accent-success">
            Algorithms <strong className="ml-1 text-fg">{algorithmCount}</strong>
          </span>
          <span className="border border-subtle-line px-2.5 py-1.5 text-faint">
            <Waypoints size={12} className="mr-1 inline" /> corpus synced
          </span>
        </div>
      </header>

      {/* DOMAIN LEDGER */}
      <CategoryDirectory showHeader={false} />
    </main>
  </div>
);

export default DataStructureDirectory;
