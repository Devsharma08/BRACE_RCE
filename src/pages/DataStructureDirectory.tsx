import type { FC } from "react";
import { Link } from "react-router-dom";
import { Layers3, Waypoints, Target, BookOpen, Flame, Trophy, ChevronRight, ArrowUpRight, Trees, List, Braces, Search } from "lucide-react";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { CategoryDirectory } from "../features/home/components/CategoryDirectory";
import { DS_ALGORITHMS } from "../data/dsAlgorithms";
import { useAnalytics } from "../hooks/useAnalytics";

const domainCount = Object.keys(DS_ALGORITHMS).length;
const algorithmCount = Object.values(DS_ALGORITHMS).reduce(
  (total, topic) => total + topic.algorithms.length,
  0,
);

const { data: analytics } = useAnalytics(true);
const totalSolved = analytics?.summary?.totalSolved ?? 0;
const currentStreak = analytics?.summary?.currentStreak ?? 0;

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
        ml-0 md:ml-[var(--sidebar-width)]
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

      {/* OVERVIEW CARDS */}
      {/* JUMP TO A PROTOCOL — four foundational DS entry points */}
      <section aria-label="Jump to a protocol">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-accent-primary/20 bg-accent-primary/5">
            <Target size={11} className="text-accent-primary" />
          </span>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Jump to a protocol
          </h2>
          <span className="h-px flex-1 bg-subtle-line" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
                        { href: "/ds/tree", icon: Trees, title: "Trees", desc: "DFS / BFS traversals, level order, diameter." },
            { href: "/ds/array", icon: List, title: "Arrays", desc: "Two-pointers, sliding windows, prefix sums." },
            { href: "/ds/stack", icon: Braces, title: "Stacks", desc: "Monotonic stacks, min-stack, parenthesis matching." },
            { href: "/ds/searching", icon: Search, title: "Searching", desc: "Binary search on answer, lower bounds, rotation." },
          ].map((entry) => (
            <Link
              key={entry.href}
              to={entry.href}
              className="group relative flex flex-col gap-2 rounded-card border border-subtle-line bg-surface px-4 py-3.5 transition hover:border-accent-primary/40 hover:bg-surface-hover"
            >
              <entry.icon size={16} className="text-accent-primary/60 transition group-hover:text-accent-primary" />
              <h3 className="text-sm font-bold text-fg group-hover:text-accent-primary">{entry.title}</h3>
              <p className="text-[9px] text-subtle">{entry.desc}</p>
            </Link>
          ))}
        </div>
      </section>


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="group relative overflow-hidden rounded-2xl border border-accent-primary/20 bg-accent-primary/5 p-5 transition hover:border-accent-primary/40">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-accent-primary/10" />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-primary">
              <Layers3 size={13} />
              Corpus roadmap
            </span>
            <ArrowUpRight size={14} className="text-accent-primary" />
          </div>
          <h2 className="relative mt-7 text-lg font-bold text-fg">{domainCount} domains</h2>
          <p className="relative mt-2 text-xs leading-5 text-subtle">
            {algorithmCount} algorithm patterns across eight data-structure domains. Each domain opens into its own /ds/:slug console — pseudocode, implementation, and a matching problem set.
          </p>
          <button className="relative mt-5 flex items-center gap-2 border border-accent-primary/30 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/10">
            Browse corpus
            <ChevronRight size={12} />
          </button>
        </article>

        <article className="rounded-2xl border border-subtle-line bg-surface p-5">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-success">
            <BookOpen size={13} />
            Study route
          </div>
          <div className="mt-7 flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-fg">Arrays</p>
              <p className="mt-1 text-xs text-subtle">Lists, stacks, queues, matrices</p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">path / open</span>
          </div>
          <div className="mt-5 h-1 overflow-hidden bg-surface-hover">
            <div className="h-full w-1/4 bg-accent-success" />
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-widest text-muted">
            Continue when your training data is connected
          </p>
        </article>

        <article className="rounded-2xl border border-subtle-line bg-surface p-5 md:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-warning">
            <Flame size={13} />
            Training signal
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="border-l border-accent-warning/40 pl-3">
              <p className="text-lg font-bold text-fg">
                {currentStreak}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-muted">active streak</p>
            </div>
            <div className="border-l border-subtle-line pl-3">
              <p className="text-lg font-bold text-fg">
                {totalSolved}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-muted">completed</p>
            </div>
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-widest text-muted">
            <Trophy size={12} className="inline mr-1 text-accent-warning" />
            Complete a challenge to populate your performance telemetry
          </p>
        </article>
      </div>

      {/* DOMAIN LEDGER */}
      <CategoryDirectory showHeader={false} />
    </main>
  </div>
);

export default DataStructureDirectory;
