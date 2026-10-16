
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, LayoutGrid, Target, Zap, Code2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AlgorithmLibrary } from "../components/features/AlgorithmLibrary";
import { useDsTopicProgress } from "../hooks/useDsTopicProgress";
import { fetchAllProblems } from "../utils/problemCache";
import { dsTopicLabel } from "../data/dsTopics";
import { PanelHeader } from "../components/ui/Panel";


type Complexity = {
  average: string;
  worst: string;
};

type DSMetadata = {
  title: string;
  slugs: string[];
  desc: string;
  details: string;
  useCases: string[];
  complexities: {
    search: Complexity;
    insert: Complexity;
    delete: Complexity;
    space: string;
  };
};

type DsProblem = {
  id: string;
  name: string;
  problem_number?: number | null;
  difficulty_level?: string;
  isSolved?: boolean;
  category?: string;
};

const DS_DETAILS_MAP: Record<string, DSMetadata> = {
  tree: {
    title: "Trees & Graphs",
    slugs: ["tree", "graph"],
    desc: "Traverse deep into non-linear node networks. Master BSTs, Tries, and complex Graph algorithms.",
    details: "Trees and Graphs represent hierarchical and networked relationships between nodes containing data and reference connections. Tree traversal algorithms (DFS, BFS), Union-Find cycle trackers, Binary Search Trees (BST), Prefix Tries, and network pathfinders (Dijkstra's shortest path, Bellman-Ford) are fundamental to network routing, compiler scoping, and hierarchical storage.",
    useCases: ["Social Network Connections", "GPS Routing & Shortest Paths", "Autocomplete & Directory Indexes", "Hierarchical File Systems"],
    complexities: {
      search: { average: "O(log N)", worst: "O(N)" },
      insert: { average: "O(log N)", worst: "O(N)" },
      delete: { average: "O(log N)", worst: "O(N)" },
      space: "O(N)",
    },
  },
  "dynamic-programming": {
    title: "Dynamic Programming",
    slugs: ["dynamic prog"],
    desc: "Break down complex problems and build up highly optimized sub-solutions.",
    details: "Dynamic Programming solves optimization problems by partitioning them into simpler, overlapping subproblems. By storing the results of these subproblems utilizing Memoization (Top-down caching) or Tabulation (Bottom-up iterations), redundant processing is eliminated, transforming exponential time complexities into linear or quadratic runtime spaces.",
    useCases: ["Resource Optimization (Knapsack)", "Text Similarity & Diffing (LCS)", "Financial Path Analysis & Grid Sweeps", "Genetic Alignment Algorithms"],
    complexities: {
      search: { average: "O(1) lookup", worst: "O(N * M) compute" },
      insert: { average: "O(1)", worst: "O(N)" },
      delete: { average: "O(1)", worst: "O(N)" },
      space: "O(N * M)",
    },
  },
  array: {
    title: "Arrays & Strings",
    slugs: ["array"],
    desc: "The core foundation of sequence logic, indexing, windows, and transformations.",
    details: "Arrays and strings are contiguous memory structures enabling O(1) indexed access. Core techniques include two-pointers, sliding window, prefix sums, and frequency maps — the building blocks of nearly every algorithmic problem.",
    useCases: ["Sliding Window Optimization", "Two-Pointer Search", "Frequency Counting", "String Pattern Matching"],
    complexities: {
      search: { average: "O(N)", worst: "O(N)" },
      insert: { average: "O(N)", worst: "O(N)" },
      delete: { average: "O(N)", worst: "O(N)" },
      space: "O(1)",
    },
  },
  "linked-list": {
    title: "Linked Lists",
    slugs: ["linked-list"],
    desc: "Sequential access, cycle detection, and pointer mastery under pressure.",
    details: "Linked Lists store elements as nodes with pointers, enabling O(1) insertions/deletions at known positions but O(N) access. Core problems include cycle detection (Floyd's), reversal, merge, and intersection.",
    useCases: ["LRU Cache Implementation", "Undo/Redo History", "Music Playlist Navigation", "Symbol Table Chaining"],
    complexities: {
      search: { average: "O(N)", worst: "O(N)" },
      insert: { average: "O(1)", worst: "O(1)" },
      delete: { average: "O(1)", worst: "O(1)" },
      space: "O(N)",
    },
  },
  searching: {
    title: "Sorting & Searching",
    slugs: ["searching"],
    desc: "Optimize collection performance with lookup and ordering techniques.",
    details: "Searching covers binary search (O(log N) on sorted data), linear search, and sorting algorithms (quicksort, mergesort, heapsort). Essential for understanding algorithmic efficiency and divide-and-conquer.",
    useCases: ["Database Index Lookup", "Dictionary Search", "Leaderboard Ranking", "File System Search"],
    complexities: {
      search: { average: "O(log N)", worst: "O(N)" },
      insert: { average: "O(N)", worst: "O(N)" },
      delete: { average: "O(N)", worst: "O(N)" },
      space: "O(log N)",
    },
  },
  math: {
    title: "Math & Geometry",
    slugs: ["math"],
    desc: "Number theory, primes, modular arithmetic, and spatial algorithms.",
    details: "Mathematical algorithms cover primality testing, GCD/LCM, modular exponentiation, combinatorics, and computational geometry — the theoretical underpinnings of cryptography and graphics.",
    useCases: ["Cryptographic Key Generation", "Random Number Generation", "Collision Detection", "Financial Calculations"],
    complexities: {
      search: { average: "O(sqrt N)", worst: "O(sqrt N)" },
      insert: { average: "O(1)", worst: "O(1)" },
      delete: { average: "O(1)", worst: "O(1)" },
      space: "O(1)",
    },
  },
  stack: {
    title: "Stacks & Queues",
    slugs: ["stack"],
    desc: "Master linear data flow using LIFO and FIFO structures.",
    details: "Stacks (LIFO) and Queues (FIFO) manage ordered collections with restricted access points. Used in expression evaluation, BFS, call stacks, task scheduling, and breadth-first traversal.",
    useCases: ["Expression Evaluation", "Call Stack Management", "BFS Traversal", "Task Scheduling Queues"],
    complexities: {
      search: { average: "O(N)", worst: "O(N)" },
      insert: { average: "O(1)", worst: "O(1)" },
      delete: { average: "O(1)", worst: "O(1)" },
      space: "O(N)",
    },
  },
  greedy: {
    title: "Greedy & Intervals",
    slugs: ["greedy"],
    desc: "Make optimal local choices and solve range intersection problems.",
    details: "Greedy algorithms make locally optimal choices at each step. Classic problems include activity selection, interval scheduling, Huffman coding, and minimum spanning trees via Prim's/Kruskal's.",
    useCases: ["Interval Scheduling", "Coin Change (canonical)", "Huffman Compression", "Network Routing (MST)"],
    complexities: {
      search: { average: "O(N log N)", worst: "O(N log N)" },
      insert: { average: "O(log N)", worst: "O(N)" },
      delete: { average: "O(log N)", worst: "O(N)" },
      space: "O(N)",
    },
  },
};

const ACCENT_MAP: Record<string, { accent: string; bg: string; border: string }> = {
  tree: { accent: "text-accent-primary", bg: "bg-accent-primary/[0.08]", border: "border-accent-primary/20" },
  "dynamic-programming": { accent: "text-accent-success", bg: "bg-accent-success/[0.08]", border: "border-accent-success/20" },
  array: { accent: "text-accent-violet", bg: "bg-accent-violet/[0.08]", border: "border-accent-violet/20" },
  "linked-list": { accent: "text-accent-warning", bg: "bg-accent-warning/[0.08]", border: "border-accent-warning/20" },
  searching: { accent: "text-accent-pink", bg: "bg-accent-pink/[0.08]", border: "border-accent-pink/20" },
  math: { accent: "text-accent-primary", bg: "bg-accent-primary/[0.08]", border: "border-accent-primary/20" },
  stack: { accent: "text-accent-success", bg: "bg-accent-success/[0.08]", border: "border-accent-success/20" },
  greedy: { accent: "text-accent-violet", bg: "bg-accent-violet/[0.08]", border: "border-accent-violet/20" },
};

type SystemProblem = {
  id?: string;
  github_oid?: string;
  name: string;
  problem_number?: number;
  difficulty_level?: string;
  isSolved?: boolean;
  attempts?: number;
  lastLanguage?: string;
};

const DS_ORDER: string[] = [
  "array", "linked-list", "stack", "searching", "tree", "math", "greedy", "dynamic-programming",
];

const CHALLENGE_PAGE_SIZE = 6;

export default function DataStructureDetail() {
  const { slug } = useParams();
  const { bySlug } = useDsTopicProgress();

  const meta = slug ? DS_DETAILS_MAP[slug as keyof typeof DS_DETAILS_MAP] : null;
  const theme = slug ? ACCENT_MAP[slug] : ACCENT_MAP.tree;

  const currentIndex = slug ? DS_ORDER.indexOf(slug) : -1;
  const prevSlugs = currentIndex > 0 ? [DS_ORDER[currentIndex - 1]] : [];
  const nextSlugs = currentIndex >= 0 && currentIndex < DS_ORDER.length - 1 ? [DS_ORDER[currentIndex + 1]] : [];

  const { data: allProblems = [] } = useQuery({
    queryKey: ["ds-detail-problems", slug],
    queryFn: () => fetchAllProblems<SystemProblem>("/problems/system"),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    placeholderData: [],
  });

  // Match problems whose id appears in this topic's learning-path problemIds.
  const topicProgress = slug ? bySlug[slug] : null;
  const progressIds = useMemo(() => new Set(topicProgress?.problemIds ?? []), [topicProgress]);
  const challenges: DsProblem[] = useMemo(
    () =>
      allProblems
        .filter((p) => {
          const pid = String(p.id ?? p.github_oid ?? p.problem_number ?? "");
          return progressIds.has(pid);
        })
        .map((p) => ({
          id: p.id ?? p.github_oid ?? String(p.problem_number ?? 0),
          name: p.name,
          problem_number: p.problem_number ?? 0,
          difficulty_level: (p.difficulty_level || "MEDIUM").toUpperCase(),
          isSolved: p.isSolved ?? false,
          category: topicProgress ? dsTopicLabel(slug ?? "") : undefined,
        })),
    [allProblems, progressIds, topicProgress, slug],
  );

  // Pagination for the recommended challenges panel.
  const [challengePage, setChallengePage] = useState(1);
  const challengeTotalPages = Math.max(1, Math.ceil(challenges.length / CHALLENGE_PAGE_SIZE));
  // Clamp the current page to the available range so navigating between DS pages
  // (e.g. from a long list to a short one) never lands on an empty page.
  const effectivePage = Math.min(challengePage, challengeTotalPages);
  const pagedChallenges = useMemo(
    () => challenges.slice((effectivePage - 1) * CHALLENGE_PAGE_SIZE, effectivePage * CHALLENGE_PAGE_SIZE),
    [challenges, effectivePage],
  );

  const complexityItems = meta ? [
    { label: "Search", icon: Target, value: meta.complexities.search.average, worst: meta.complexities.search.worst },
    { label: "Insert", icon: Zap, value: meta.complexities.insert.average, worst: meta.complexities.insert.worst },
    { label: "Delete", icon: LayoutGrid, value: meta.complexities.delete.average, worst: meta.complexities.delete.worst },
    { label: "Space", icon: Code2, value: meta.complexities.space, worst: "" },
  ] : [];

  return (
    <main className="relative z-10 flex-1 min-w-0 w-full px-3 py-5 md:px-6 md:py-6 pb-16 md:pb-6 selection:bg-accent/30 selection:text-accent-primary">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">

        {/* ── PAGE HEADER ── */}
        <div className="mb-8">
          {meta && (
            <>
              <div className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-accent-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-glow-primary" />
                Learning taxonomy
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                {meta.title}
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-subtle sm:text-sm">
                {meta.desc}
              </p>
            </>
          )}
        </div>

        {/* ── COMPLEXITY + DESCRIPTION + USE CASES (side by side) ── */}
        {meta && (
          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            {/* Complexity profile */}
            <div className="rounded-xl border border-line bg-surface p-4">
              <PanelHeader title="Complexity profile" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {complexityItems.map(({ label, icon: Icon, value, worst }) => (
                  <div key={label} className="rounded-lg border border-line bg-surface-hover p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="size-3.5 text-accent-primary" aria-hidden="true" />
                      <p className="text-[9px] font-bold uppercase tracking-widest text-faint">{label}</p>
                    </div>
                    <p className="font-mono font-bold text-sm text-fg">{value}</p>
                    {worst && (
                      <p className="mt-0.5 text-[9px] text-faint">Worst: {worst}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-line bg-surface p-4 lg:col-span-1">
              <PanelHeader title="How it works" />
              <div className="mt-3">
                <p className="text-xs leading-relaxed text-subtle">{meta.details}</p>
              </div>
            </div>

            {/* Use cases */}
            <div className="rounded-xl border border-line bg-surface p-4 lg:col-span-1">
              <PanelHeader title="Use cases" />
              <div className="mt-3 space-y-2">
                {meta.useCases.map((useCase, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className={`shrink-0 mt-0.5 grid size-4 place-items-center rounded-full border ${theme.border} ${theme.accent}`}>
                      <span className="text-[8px] font-bold">{idx + 1}</span>
                    </span>
                    <p className="text-xs leading-relaxed text-subtle">{useCase}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ALGORITHM LIBRARY (high importance) ── */}
        <div className="mb-8">
          <div className="border border-subtle-line bg-surface rounded-card p-3 sm:p-4">
            <PanelHeader title="Algorithm library" />
            <AlgorithmLibrary slug={slug ?? ""} />
          </div>
        </div>

        {/* ── RECOMMENDED CHALLENGES (highest importance — most space) ── */}
        <div className="mb-8">
          <div className="border border-subtle-line bg-surface rounded-card p-3 sm:p-4">
            <PanelHeader title="Recommended challenges" />
            <div className="mt-3">
              {pagedChallenges.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {pagedChallenges.map((problem) => (
                      <div
                        key={problem.id}
                        className="flex items-center gap-3 rounded border border-line bg-surface-hover p-2.5 transition hover:bg-accent/5 sm:gap-4 sm:p-3"
                      >
                        <span className="shrink-0 text-center font-mono text-[9px] text-faint">
                          #{problem.problem_number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/terminal?id=${problem.id}`}
                            className="font-semibold text-xs text-fg hover:text-accent-primary"
                          >
                            {problem.name}
                          </Link>
                          <p className="mt-0.5 text-[9px] text-faint">
                            <span className="hidden sm:inline">
                              {problem.difficulty_level} · {problem.category}
                            </span>
                            <span className="sm:hidden">
                              {problem.difficulty_level}
                            </span>
                          </p>
                        </div>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${
                          problem.difficulty_level === "EASY"
                            ? "border-accent-success/20 bg-accent-success/10 text-accent-success"
                            : problem.difficulty_level === "MEDIUM"
                              ? "border-accent-warning/20 bg-accent-warning/10 text-accent-warning"
                              : "border-accent-danger/20 bg-accent-danger/10 text-accent-danger"
                        }`}>
                          {problem.difficulty_level}
                        </span>
                      </div>
                    ))}
                  </div>
                  {challenges.length > CHALLENGE_PAGE_SIZE && (
                    <div className="mt-4 flex items-center justify-between border-t border-subtle-line pt-3 text-[9px] font-mono text-faint">
                      <span>
                        {(challengePage - 1) * CHALLENGE_PAGE_SIZE + 1}-
                        {Math.min(challengePage * CHALLENGE_PAGE_SIZE, challenges.length)} of {challenges.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Previous page"
                          onClick={() => setChallengePage((p) => Math.max(1, p - 1))}
                          disabled={effectivePage <= 1}
                          className="grid h-6 w-6 place-items-center rounded border border-line text-subtle transition hover:border-accent-primary/40 hover:text-fg disabled:opacity-30"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <span className="text-[8px] uppercase tracking-widest text-accent-primary">
                          Page {effectivePage} / {challengeTotalPages}
                        </span>
                        <button
                          type="button"
                          aria-label="Next page"
                          onClick={() => setChallengePage((p) => Math.min(challengeTotalPages, p + 1))}
                          disabled={effectivePage >= challengeTotalPages}
                          className="grid h-6 w-6 place-items-center rounded border border-line text-subtle transition hover:border-accent-primary/40 hover:text-fg disabled:opacity-30"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center border border-subtle-line bg-surface-hover rounded-card">
                  <p className="text-xs font-mono text-faint">
                    No recommended challenges for this structure yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PREV / NEXT STRUCTURE NAV (low importance — compact) ── */}
        {(prevSlugs.length > 0 || nextSlugs.length > 0) && (
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] uppercase tracking-[0.2em] text-faint">
                Previous structure
              </span>
              {prevSlugs.length > 0 ? (
                prevSlugs.map((target) => (
                  <Link
                    key={target}
                    to={`/ds/${target}`}
                    className="flex w-fit items-center gap-1.5 border border-accent-primary/30 bg-accent-primary/5 px-2.5 py-1.5 text-xs text-accent-primary transition hover:bg-accent-primary/10"
                  >
                    <ChevronLeft className="h-3 w-3 shrink-0" />
                    <span className="truncate">{dsTopicLabel(target)}</span>
                  </Link>
                ))
              ) : (
                <span className="border border-subtle-line px-2.5 py-1 text-[9px] uppercase tracking-widest text-faint">
                  Start of path
                </span>
              )}
            </div>
            <div className="flex items-end w-full flex-col gap-1.5 md:flex-row md:ml-auto md:justify-end">
              <span className="text-[8px] uppercase tracking-[0.2em] text-faint">
                Recommended next
              </span>
              {nextSlugs.length > 0 ? (
                nextSlugs.map((target) => (
                  <Link
                    key={target}
                    to={`/ds/${target}`}
                    className="flex items-center w-fit justify-end gap-1.5 border border-accent-primary/30 bg-accent-primary/5 px-2.5 py-1.5 text-xs text-accent-primary transition hover:bg-accent-primary/10"
                  >
                    <span className="truncate">{dsTopicLabel(target)}</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </Link>
                ))
              ) : (
                <span className="border border-subtle-line px-2.5 py-1 text-[9px] uppercase tracking-widest text-faint">
                  End of path
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
