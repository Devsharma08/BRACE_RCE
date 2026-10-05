import React, { useState, useMemo, useTransition } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { queryKeys } from "../lib/queryKeys";
import { useDebounce } from "../hooks/useDebounce";
import { fetchAllProblems } from "../utils/problemCache";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  Filter,
  Flame,
  LayoutGrid,
  List,
  Search,
  Target,
  Trophy,
} from "lucide-react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDsTopicProgress } from "../hooks/useDsTopicProgress";
import { DS_TOPIC_LABELS } from "../data/dsTopics";
import BentoGrid from "../features/problems/components/BentoGrid";

/**
 * EVERY data structure on this page lives in ONE side panel — the mock's
 * "Data structure progress" card — instead of being spread across bento tiles.
 * `accent` keys into PROGRESS_ACCENT; `description` is the one-line teaser the
 * panel shows under each structure's name. Array order is the panel order.
 */
const DS_PANEL = [
  { slug: "array", accent: "cyan", description: "Indexing, traversal, and window patterns." },
  { slug: "stack", accent: "amber", description: "Ordering, buffering, and monotonic patterns." },
  { slug: "linked-list", accent: "lime", description: "Pointer movement and structural updates." },
  { slug: "tree", accent: "pink", description: "Recursion, traversal, and hierarchical search." },
  { slug: "searching", accent: "cyan", description: "Divide-and-conquer sorting and boundary lookups." },
  { slug: "dynamic-programming", accent: "violet", description: "Optimal substructure over overlapping subproblems." },
  { slug: "math", accent: "violet", description: "Number theory, modular arithmetic, and geometry." },
  { slug: "greedy", accent: "lime", description: "Local-choice heuristics and interval scheduling." },
] as const;

/** Two-letter chip colours per accent — the mock's progressAccent map, on tokens. */
const PROGRESS_ACCENT: Record<string, string> = {
  cyan: "text-accent-primary border-accent-primary/25 bg-accent-primary/[0.05]",
  violet: "text-accent-violet border-accent-violet/25 bg-accent-violet/[0.05]",
  lime: "text-accent-success border-accent-success/25 bg-accent-success/[0.05]",
  amber: "text-accent-warning border-accent-warning/25 bg-accent-warning/[0.05]",
  pink: "text-accent-pink border-accent-pink/25 bg-accent-pink/[0.05]",
};

/** Difficulty pills on the semantic ramp (lime / amber / rose in the mock). */
const difficultyStyles: Record<string, string> = {
  EASY: "border-accent-success/30 bg-accent-success/[0.06] text-accent-success",
  MEDIUM: "border-accent-warning/30 bg-accent-warning/[0.06] text-accent-warning",
  HARD: "border-accent-danger/30 bg-accent-danger/[0.06] text-accent-danger",
};

/**
 * Shared pager for both views.
 *
 * Card view needs it outside the table's panel (the cards are their own
 * surfaces), so it was extracted rather than duplicated — two copies of paging
 * arithmetic is exactly how "Showing 1–15" and "Showing 16–30" drift apart.
 */
const ProblemsPagination: React.FC<{
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  itemsPerPage: number;
  onPage: (page: number) => void;
}> = ({ currentPage, totalPages, filteredCount, itemsPerPage, onPage }) => {
  if (filteredCount === 0) return null;
  const first = (currentPage - 1) * itemsPerPage + 1;
  const last = Math.min(currentPage * itemsPerPage, filteredCount);
  return (
    <nav
      aria-label="Problem index pagination"
      className="mt-4 flex flex-col gap-3 rounded-panel border border-subtle-line bg-raised px-5 py-4 text-[9px] uppercase tracking-widest text-faint sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Showing {first}–{last} of {filteredCount}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="border border-subtle-line px-3 py-2 text-subtle transition hover:border-accent-primary/30 hover:text-accent-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={13} className="inline" /> PREV
        </button>
        <span className="border border-accent-primary/30 px-3 py-2 text-accent-primary">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="border border-subtle-line px-3 py-2 text-subtle transition hover:border-accent-primary/30 hover:text-accent-primary disabled:pointer-events-none disabled:opacity-30"
        >
          NEXT <ChevronRight size={13} className="inline" />
        </button>
      </div>
    </nav>
  );
};

export const Problems: React.FC = () => {
  const { data: analytics } = useAnalytics(false);
  const { bySlug: dsProgress } = useDsTopicProgress();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;
  // Cards are the default: the catalog is browsed, not scanned. The table stays
  // available because it is denser and easier to compare numbers across rows.
  const [view, setView] = useState<"cards" | "table">("cards");

  const handleSearchChange = (val: string) => {
    startTransition(() => {
      setSearchTerm(val);
      setCurrentPage(1);
    });
  };

  const handleDifficultyChange = (diff: string) => {
    startTransition(() => {
      setSelectedDifficulty(diff);
      setCurrentPage(1);
    });
  };

  const { data: problems = [], isLoading: loading, isError: isProblemsError, refetch: refetchProblems } = useQuery<any[]>({
    queryKey: queryKeys.problems.system({ userId: user?.id }),
    // Problem definitions never change during a session — fetch once per mount
    // window instead of on every visit. Progress changes (solved/attempts) are
    // handled by invalidateProblemQueries() at the write sites.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      // Paginated endpoint — fetch every page so the list matches the
      // Terminal sidebar catalog instead of just the first 25 rows.
      return fetchAllProblems("/problems/system");
    },
  });

  /** One panel row per structure: real progress from the learning-path graph
   *  plus the teaser copy from DS_PANEL. */
  const dsSummaries = useMemo(
    () =>
      DS_PANEL.map(({ slug, accent, description }) => {
        const progress = dsProgress[slug];
        const problemIds = new Set(progress?.problemIds ?? []);
        const solved = problems.filter((problem: any) => problem.isSolved && problemIds.has(String(problem.id))).length;
        const total = problemIds.size;
        return {
          slug,
          accent,
          description,
          title: DS_TOPIC_LABELS[slug] ?? slug,
          solved,
          total,
          completion: total > 0 ? Math.round((solved / total) * 100) : 0,
        };
      }),
    [dsProgress, problems],
  );

  /** Reverse index built from the learning-path graph: problem id → topic label.
   *  Feeds the DOMAIN column and the domain half of the search query; problems
   *  that belong to no structure fall back to an em dash. */
  const topicByProblemId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [slug, progress] of Object.entries(dsProgress)) {
      for (const problemId of progress?.problemIds ?? []) {
        if (!(problemId in map)) map[problemId] = DS_TOPIC_LABELS[slug] ?? slug;
      }
    }
    return map;
  }, [dsProgress]);

  const solvedCount = useMemo(
    () => problems.filter((problem: any) => problem.isSolved).length,
    [problems],
  );

  // Filter by title, problem number, or the structure the problem belongs to.
  const filteredProblems = problems.filter((p) => {
    const domain = topicByProblemId[String(p.id ?? p.github_oid ?? "")] ?? "";
    const matchesSearch = `${p.name} ${p.problem_number ?? ""} ${domain}`
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase());

    const matchesDiff =
      selectedDifficulty === "ALL" ||
      (p.difficulty_level || "MEDIUM").toUpperCase() === selectedDifficulty.toUpperCase();

    return matchesSearch && matchesDiff;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / itemsPerPage));
  const currentProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <main className="bg-void px-4 py-5 font-mono text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <header className="flex flex-col justify-between gap-5 border-b border-subtle-line pb-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent-primary">
              <Code2 size={14} />
              <span>Training command center</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Build your next <span className="text-accent-primary">signal.</span>
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-5 text-subtle">
              Choose a path, study the pattern, then prove it in the execution workspace.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 text-[9px] uppercase tracking-widest md:w-auto">
            <span className="border border-accent-success/25 bg-accent-success/[0.05] px-3 py-2 text-accent-success">
              Solved <b className="text-fg">{solvedCount}</b>
            </span>
            <span className="border border-accent-primary/25 bg-accent-primary/[0.05] px-3 py-2 text-accent-primary">
              Indexed <b className="text-fg">{problems.length}</b>
            </span>
          </div>
        </header>

        {/* ── TRAINING OVERVIEW ───────────────────────────────────────────
            Two columns at lg: the three bento tiles on the left, and ONE
            "Data structure progress" panel on the right that owns every
            structure — no per-structure tiles anywhere else on the page. */}
        <section
          aria-label="Training overview"
          className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]"
        >
          <div className="grid min-w-0 gap-4 md:grid-cols-2 md:grid-rows-[3fr_2fr]">
            {/* HERO — full-width anchor tile with the ghost 01 watermark */}
            <article className="group relative flex min-h-[260px] flex-col overflow-hidden rounded-panel border border-accent-primary/20 bg-accent-primary/[0.045] p-5 transition hover:border-accent-primary/40 md:col-span-2">
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-accent-primary/10 transition duration-500 group-hover:scale-110" />
              <div className="pointer-events-none absolute bottom-5 right-7 font-mono text-[8rem] font-bold leading-none text-fg/[0.03]">
                01
              </div>
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-primary">
                  <Target size={14} />
                  Next move
                </span>
                <ArrowUpRight size={15} className="text-accent-primary transition group-hover:-translate-y-1 group-hover:translate-x-1" />
              </div>
              <div className="relative mt-auto max-w-md">
                <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-faint">Your next training action</p>
                <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Choose a pattern to practice.</h2>
                <p className="mt-3 max-w-sm text-xs leading-5 text-subtle">
                  Start with an indexed problem, open it in the terminal, and validate your
                  reasoning against real test cases.
                </p>
                <Link
                  to="/ds"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-accent-primary/30 px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/10"
                >
                  Browse patterns <ChevronRight size={13} />
                </Link>
              </div>
            </article>
            {/* STUDY ROUTE */}
            <article className="group flex min-h-[180px] flex-col overflow-hidden rounded-panel border border-subtle-line bg-raised p-5 transition hover:border-accent-success/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-success">
                  <BookOpen size={14} />
                  Study route
                </span>
                <span className="font-mono text-[9px] text-faint">01 / 04</span>
              </div>
              <div className="mt-auto">
                <p className="text-lg font-bold text-fg">Foundations</p>
                <p className="mt-1 text-xs text-subtle">Arrays &rarr; stacks &rarr; trees &rarr; graphs</p>
                <div className="mt-4 flex gap-1">
                  {["bg-accent-success", "bg-fg/20", "bg-fg/20", "bg-fg/20"].map((tone, index) => (
                    <span key={index} className={`h-1.5 flex-1 ${tone}`} />
                  ))}
                </div>
              </div>
            </article>

            {/* TRAINING SIGNAL */}
            <article className="group flex min-h-[180px] flex-col overflow-hidden rounded-panel border border-subtle-line bg-raised p-5 transition hover:border-accent-warning/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-accent-warning">
                  <Flame size={14} />
                  Training signal
                </span>
                <Trophy size={15} className="text-faint" />
              </div>
              <div className="mt-auto">
                <div className="flex items-end gap-5">
                  <div>
                    <p className="text-3xl font-bold text-fg">{analytics?.summary?.currentStreak ?? "—"}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-faint">active streak</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-fg">{analytics?.summary?.totalSolved ?? solvedCount}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-faint">completed</p>
                  </div>
                </div>
                <p className="mt-3 text-[9px] uppercase tracking-widest text-faint">Connect your profile to track progress</p>
              </div>
            </article>
          </div>

          {/* ── DATA STRUCTURE PROGRESS — the single home for all of them ── */}
          <section
            aria-label="Data structure progress"
            className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-subtle-line bg-raised shadow-panel"
          >
            <div className="border-b border-subtle-line bg-white/[0.025] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">Domain coverage</p>
                  <h2 className="mt-1 text-lg font-bold text-fg">Data structure progress</h2>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-faint">
                  {solvedCount} / {problems.length} solved
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col divide-y divide-subtle-line">
              {dsSummaries.map(({ slug, accent, description, title, solved, total, completion }) => (
                <Link
                  key={slug}
                  to={`/ds/${slug}`}
                  aria-label={`${title}: ${solved} of ${total || 0} problems solved`}
                  className="group flex flex-1 items-center gap-3 px-5 py-3 transition hover:bg-white/[0.04]"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-[9px] font-bold ${PROGRESS_ACCENT[accent]}`}
                  >
                    {title.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-xs font-bold text-fg group-hover:text-accent-primary">{title}</h3>
                      <span className="shrink-0 font-mono text-sm font-bold text-fg">
                        {solved}
                        <span className="text-[8px] font-normal text-faint">/{total || 0}</span>
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[9px] text-subtle">{description}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent-primary/60 transition-all duration-500"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="shrink-0 text-faint transition group-hover:text-accent-primary" />
                </Link>
              ))}
            </div>
          </section>
        </section>

        {/* ── PROBLEM FILTERS ─────────────────────────────────────────── */}
        <section aria-label="Problem filters" className="mt-6 rounded-2xl border border-subtle-line bg-raised p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full lg:max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-primary/50" />
              <input
                type="text"
                aria-label="Search problems"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search title or problem number..."
                className="w-full border border-subtle-line bg-void py-3 pl-10 pr-4 text-xs text-fg outline-none transition placeholder:text-faint focus:border-accent-primary/50"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-2 text-[9px] uppercase tracking-widest text-faint">
                <Filter size={13} /> Difficulty
              </span>
              {["ALL", "EASY", "MEDIUM", "HARD"].map((level) => (
                <button
                  key={level}
                  onClick={() => handleDifficultyChange(level)}
                  aria-pressed={selectedDifficulty === level}
                  className={`border px-3 py-2 text-[9px] font-bold uppercase tracking-widest transition ${
                    selectedDifficulty === level
                      ? "border-accent-primary/50 bg-accent-primary/[0.08] text-accent-primary"
                      : "border-subtle-line text-subtle hover:border-white/25 hover:text-fg"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* View switch — cards vs table */}
            <div className="flex items-center gap-1 border border-subtle-line p-1">
              {([
                { id: "cards" as const, label: "Cards", Icon: LayoutGrid },
                { id: "table" as const, label: "Table", Icon: List },
              ]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition ${
                    view === id
                      ? "bg-accent-primary/[0.10] text-accent-primary"
                      : "text-subtle hover:text-fg"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* QUERY FAILURE — not in the mock, but losing the list silently would
            be worse; same themed retry block this page has always had. */}
        {isProblemsError && !loading && (
          <div className="mt-6 flex flex-col items-center gap-3 border border-accent-danger/30 bg-accent-danger/10 p-10 text-center">
            <div className="w-12 h-12 rounded-none border border-accent-danger/40 bg-accent-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent-danger" />
            </div>
            <p className="text-sm font-mono font-bold tracking-widest text-accent-danger">
              FAILED TO QUERY PROBLEM REPOSITORY
            </p>
            <p className="text-xs font-mono text-subtle max-w-md">
              The server did not return the problem list. Check your connection and retry the query.
            </p>
            <button
              onClick={() => refetchProblems()}
              className="mt-1 px-5 py-2 text-xs font-mono font-bold tracking-widest border border-accent-danger/50 bg-accent-danger/20 hover:bg-accent-danger/30 text-accent-danger rounded-none transition-all active:scale-95"
            >
              [ RETRY QUERY ]
            </button>
          </div>
        )}
        {/* ── CARD VIEW (default) ────────────────────────────────────────
              The bento grid sits OUTSIDE the bordered table panel below, so
              the cards own their own rounded surfaces instead of being stacked
              inside a second frame. */}
        {!isProblemsError && view === "cards" && (
          <section aria-label="Problem cards" className="mt-3">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">Problem index</p>
                <p className="mt-1 text-xs text-subtle">
                  {loading
                    ? "Syncing the catalog…"
                    : `${filteredProblems.length} challenge${filteredProblems.length === 1 ? "" : "s"} ready to solve.`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[132px] animate-pulse rounded-panel border border-subtle-line bg-raised"
                  />
                ))}
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="rounded-panel border border-subtle-line bg-raised px-6 py-14 text-center">
                <p className="text-xs uppercase tracking-widest text-subtle">
                  No challenges match those filters
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedDifficulty("ALL");
                  }}
                  className="mt-4 border border-accent-primary/40 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/10"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <BentoGrid problems={currentProblems} topicByProblemId={topicByProblemId} />
            )}

            {!loading && filteredProblems.length > 0 && (
              <ProblemsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                filteredCount={filteredProblems.length}
                itemsPerPage={itemsPerPage}
                onPage={setCurrentPage}
              />
            )}
          </section>
        )}

        {/* ── TABLE VIEW ─────────────────────────────────────────────── */}
        {!isProblemsError && view === "table" && (
          <section
            aria-label="Problem index"
            className="mt-3 overflow-hidden rounded-2xl border border-subtle-line bg-raised shadow-panel"
          >
            <div className="flex items-center justify-between border-b border-subtle-line bg-white/[0.025] px-5 py-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-accent-primary">Problem index</p>
                <p className="mt-1 text-xs text-subtle">Select a challenge to open its execution workspace.</p>
              </div>
              <span className="text-[9px] uppercase tracking-widest text-faint">{filteredProblems.length} matches</span>
            </div>

            {/* Column heads are md+ only — below that every row stacks (mock). */}
            <div className="hidden grid-cols-[70px_1.6fr_120px_1fr_110px] gap-5 border-b border-subtle-line bg-white/[0.025] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-faint md:grid">
              <span>#</span>
              <span>Problem</span>
              <span>Difficulty</span>
              <span>Domain</span>
              <span />
            </div>

            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={8} />
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                <AlertTriangle size={22} className="text-accent-warning" />
                <p className="text-xs uppercase tracking-widest text-subtle">No matching problems</p>
                <p className="text-xs text-faint">Adjust the search or difficulty filter.</p>
              </div>
            ) : (
              <div className={`flex flex-col ${isPending ? "opacity-60 transition-opacity" : ""}`}>
                {currentProblems.map((p, idx) => {
                  const diff = (p.difficulty_level || "MEDIUM").toUpperCase();
                  const problemNumber = p.problem_number || (currentPage - 1) * itemsPerPage + idx + 1;
                  const domainLabel = topicByProblemId[String(p.id ?? p.github_oid ?? "")] ?? "—";

                  return (
                    <button
                      key={p.id || idx}
                      onClick={() => navigate(`/terminal?id=${p.id || p.github_oid}`)}
                      className="group grid w-full gap-3 border-b border-white/5 px-5 py-4 text-left transition last:border-0 hover:bg-accent-primary/[0.035] md:grid-cols-[70px_1.6fr_120px_1fr_110px] md:items-center md:gap-5"
                    >
                      <span className="text-[10px] text-faint">#{problemNumber}</span>

                      {/* STATUS BOX + TITLE */}
                      <span className="flex min-w-0 items-center gap-3 text-sm font-bold text-fg transition group-hover:text-accent-primary">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center border text-[9px] ${
                            p.isSolved
                              ? "border-accent-success/30 bg-accent-success/[0.06] text-accent-success"
                              : "border-subtle-line bg-void text-faint"
                          }`}
                        >
                          {p.isSolved ? "✓" : String(problemNumber).slice(-1)}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </span>

                      {/* DIFFICULTY */}
                      <span
                        className={`w-fit border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${
                          difficultyStyles[diff] ?? difficultyStyles.MEDIUM
                        }`}
                      >
                        {diff}
                      </span>

                      {/* DOMAIN — the structure this problem was indexed under */}
                      <span className="truncate text-xs text-subtle">{domainLabel}</span>

                      {/* OPEN affordance: always visible on touch, hover-revealed on md+ */}
                      <span className="text-right text-[9px] uppercase tracking-widest text-accent-primary opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                        Open <ChevronRight size={13} className="inline" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {/* PAGINATION — the shared pager, rendered inside the table's bottom border. */}
            {!loading && filteredProblems.length > 0 && (
              <footer className="border-t border-subtle-line bg-white/[0.02]">
                <ProblemsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  filteredCount={filteredProblems.length}
                  itemsPerPage={itemsPerPage}
                  onPage={setCurrentPage}
                />
              </footer>
            )}
          </section>
        )}
      </div>
    </main>
  );
};
