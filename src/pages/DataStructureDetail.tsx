import { useEffect, useMemo, useState } from "react";
import { useParams, Link,useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../config/api";
import { fetchSystemProblems } from "../features/terminal/api";
import { ArrowLeft, ChevronLeft, ChevronRight, Terminal, LayoutGrid, Award, CheckCircle2, Loader2, Play } from "lucide-react";
import { TableSkeleton } from "../components/ui/Skeleton";
import { AlgorithmLibrary } from "../components/features/AlgorithmLibrary";
import { useDsTopicProgress } from "../hooks/useDsTopicProgress";
import {
  canonicalDsSlug,
  dsCompletionState,
  dsTopicLabel,
  LEARNING_ITEM_SLUG,
} from "../data/dsTopics";

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

/** Max recommended-challenge links per page (pagination beyond this). */
const CHALLENGE_PAGE_SIZE = 5;

/**
 * System-problem fields the /ds/:slug page actually reads. The API payload
 * carries more (snippets, test cases, attempts); this narrows the shape so the
 * filter/slice logic stays type-safe without an `any` cast.
 */
type DsProblem = {
  id: string;
  name: string;
  problem_number?: number | null;
  difficulty_level?: string;
  isSolved?: boolean;
  category?: string;
  problem_definition?: string;
  problem_hints?: string[];
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
      space: "O(N * M) or O(N) optimized",
    },
  },
  array: {
    title: "Arrays & Strings",
    slugs: ["array", "string"],
    desc: "The core foundation of sequential memory allocation and sequence logic.",
    details: "Arrays and Strings store homogeneous collections of elements in contiguous, indexable memory blocks. Advanced concepts utilize Two-Pointer indexes, Sliding Windows for dynamic subarrays, Prefix Sum precomputations, Kadane's maximum array ranges, and optimized sequence filters. They represent the foundational structures for buffer management and stream sorting.",
    useCases: ["Contiguous Memory Buffer Allocation", "Sequence Matching & Parsing (KMP)", "Sliding Window Range Sweeps", "Linear Transformation Sweeps"],
    complexities: {
      search: { average: "O(N) (O(log N) sorted)", worst: "O(N)" },
      insert: { average: "O(N)", worst: "O(N)" },
      delete: { average: "O(N)", worst: "O(N)" },
      space: "O(N)",
    },
  },
  "linked-list": {
    title: "Linked Lists",
    slugs: ["linked list"],
    desc: "Sequential access structures utilizing dynamic reference pointer connections.",
    details: "Linked Lists are collections of node objects linked sequentially by reference memory pointers. Topics cover Singly and Doubly Linked Lists, pointer manipulation, Floyd's Tortoise and Hare (cycle detection), node swaps, reversals, and recursive mergers. Essential for dynamic allocations where contiguous space is restricted.",
    useCases: ["OS Task Scheduling & Memory Pools", "Circular Playlist Buffers", "LRU Cache Conflict Chaining", "Undo/Redo History Stacks"],
    complexities: {
      search: { average: "O(N)", worst: "O(N)" },
      insert: { average: "O(1) at head", worst: "O(1)" },
      delete: { average: "O(1) at head", worst: "O(1)" },
      space: "O(N)",
    },
  },
  searching: {
    title: "Sorting & Searching",
    slugs: ["searching"],
    desc: "Divide-and-conquer collection sorting and optimized binary boundary lookups.",
    details: "Searching and Sorting arrange collections and explore binary boundary domains. Mastery covers optimized Quick Sort/Merge Sort partitions, standard Binary Search structures, and finding optimal limits inside search boundary ranges (e.g. eating bananas, capacity packing limits). Fundamental for analytical database indexes and searching spaces.",
    useCases: ["Database Query Optimization Indexes", "Binary Lookup Range Boundaries", "Analytical Sorting Pipelines", "Task Scheduling Priority Queues"],
    complexities: {
      search: { average: "O(log N) search", worst: "O(log N)" },
      insert: { average: "O(N log N) sort", worst: "O(N log N)" },
      delete: { average: "O(N)", worst: "O(N)" },
      space: "O(N) or O(1) in-place",
    },
  },
  math: {
    title: "Math & Geometry",
    slugs: ["math"],
    desc: "Number theory, modular arithmetic, prime sieves, and coordinate geometric sweeps.",
    details: "Math and Geometry challenges utilize coordinate equations, prime grids, matrix transformations, GCD boundaries, and modular arithmetic loops. Topics include the Sieve of Eratosthenes for prime ranges, Euclidean GCD, coordinate vector bounds, modular exponentiation, and coordinate intersections.",
    useCases: ["Public Key Cryptography (RSA)", "Coordinate Graphic Rendering Engines", "Scientific Analytical Matrix Calculators", "Coordinate GPS Geometric Sweeps"],
    complexities: {
      search: { average: "O(1) math proof", worst: "O(sqrt(N)) primality" },
      insert: { average: "O(1)", worst: "O(1)" },
      delete: { average: "O(1)", worst: "O(1)" },
      space: "O(1) or O(N) prime tables",
    },
  },
  stack: {
    title: "Stacks & Queues",
    slugs: ["stack", "queue"],
    desc: "Linear structures regulating data flow with strict LIFO and FIFO protocols.",
    details: "Stacks and Queues manage elements sequentially using restricted entry rules. Stacks operate via Last-In First-Out (LIFO), fundamental for recursion tracking, backtracks, and nested scope evaluation. Queues operate via First-In First-Out (FIFO) and Priority Queue engines (Heaps), fundamental for network pacing, schedules, and BFS sweeps.",
    useCases: ["Compiler Function Scope Call Stacks", "OS Network Buffer & Event Loops", "BFS Queue Traversals", "Min/Max Priority Heap Schedulers"],
    complexities: {
      search: { average: "O(N)", worst: "O(N)" },
      insert: { average: "O(1) push/enq", worst: "O(1)" },
      delete: { average: "O(1) pop/deq", worst: "O(1)" },
      space: "O(N)",
    },
  },
  greedy: {
    title: "Greedy & Intervals",
    slugs: ["greedy", "interval"],
    desc: "Make optimal local step choices and sweep overlapping coordinate ranges.",
    details: "Greedy algorithms make optimal local choices at each junction to resolve global optimums. Interval sweeps sort coordinate ranges by endpoints to sweep ranges (e.g. merge overlaps, insert intervals, schedule rooms). Essential for time-slot compression and optimal resource scheduling.",
    useCases: ["Overlapping Time Slot Scheduling", "High-frequency Interval Mergers", "Optimal Cost Pathfinding (Prim's)", "Data Compression Schemes (Huffman)"],
    complexities: {
      search: { average: "O(N log N) sorted sweep", worst: "O(N log N)" },
      insert: { average: "O(1) greedy step", worst: "O(1)" },
      delete: { average: "O(1)", worst: "O(1)" },
      space: "O(N) for sorted intervals",
    },
  },
};

/** Stable ordering of the /ds/:slug pages — used for the prev/next fallback. */
const DS_PAGE_KEYS = Object.keys(DS_DETAILS_MAP);

const DataStructureDetail = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const key = (slug ?? "not-found").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const canonicalSlug = canonicalDsSlug(key);
  const dsData = DS_DETAILS_MAP[key] ?? DS_DETAILS_MAP[canonicalSlug];

  const [problems, setProblems] = useState<DsProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pager is scoped to the route slug: changing structures resets to page 1
  // during render (the React-recommended alternative to setState-in-effect).
  const [pager, setPager] = useState({ key, page: 1 });
  const challengePage = pager.key === key ? pager.page : 1;
  const setChallengePage = (page: number) => setPager({ key, page });
  const [marking, setMarking] = useState(false);

  // Live learning-path graph for this page: completion badge, recommended
  // problemIds, prev/next structures. Refetches on window focus.
  const {
    bySlug: topicProgress,
    items: pathItems,
    isLoading: progressLoading,
  } = useDsTopicProgress();
  const progressForPage = topicProgress[key] ?? topicProgress[canonicalSlug];
  const pageItemIds = (pathItems ?? [])
    .filter((item) => LEARNING_ITEM_SLUG[item.name] === canonicalSlug)
    .map((item) => item.id);
  const pageItemsDone = (pathItems ?? []).filter(
    (item) =>
      LEARNING_ITEM_SLUG[item.name] === canonicalSlug &&
      item.progress?.progressStatus === "COMPLETED",
  ).length;

  const markPageComplete = async () => {
    const pending = pageItemIds.filter((id) => {
      const row = (pathItems ?? []).find((i) => i.id === id);
      return row?.progress?.progressStatus !== "COMPLETED";
    });
    if (pending.length === 0) return;
    try {
      setMarking(true);
      await Promise.all(
        pending.map((id) =>
          api.post(`/learning-paths/${id}/progress`, { progressStatus: "COMPLETED" }),
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
      toast.success("Structure marked complete");
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setMarking(false);
    }
  };

  const markPageStart = async () => {
    if (pageItemIds.length === 0) return;
    try {
      await api.post(`/learning-paths/${pageItemIds[0]}/progress`, {
        progressStatus: "IN_PROGRESS",
      });
      queryClient.invalidateQueries({ queryKey: ["learning-paths"] });
    } catch {
      /* non-blocking: progress write is best-effort */
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    const loadProblems = async () => {
      try {
        setLoading(true);
        const data = await fetchSystemProblems();
        if (!cancelled) {
          setProblems(data || []);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Failed to fetch repository problems.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProblems();
    return () => {
      cancelled = true;
    };
  }, []);

  const matchingProblems = useMemo(() => {
    const pool = problems;
    const byId = new Map(pool.map((p) => [String(p.id), p]));
    // Primary: learning-path graph → DB-verified recommended problemIds.
    if (progressForPage && progressForPage.problemIds.length > 0) {
      const picked = progressForPage.problemIds
        .map((id) => byId.get(String(id)))
        .filter((problem): problem is DsProblem => Boolean(problem));
      if (picked.length > 0) return picked;
    }
    // Fallback: legacy slug match (Problem rows carry no category column, so
    // the system-problem payload never has one — match name/all-fields text).
    if (!dsData) return [];
    return pool.filter((problem) => {
      const haystack = [
        problem.category,
        problem.name,
        problem.problem_definition,
        Array.isArray(problem.problem_hints) ? problem.problem_hints.join(" ") : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return dsData.slugs.some((s) => haystack.includes(s.toLowerCase()));
    });
  }, [problems, dsData, progressForPage]);

  // Paged slice: max CHALLENGE_PAGE_SIZE links per page.
  const challengePages = Math.max(1, Math.ceil(matchingProblems.length / CHALLENGE_PAGE_SIZE));
  const safeChallengePage = Math.min(challengePage, challengePages);
  const visibleProblems = matchingProblems.slice(
    (safeChallengePage - 1) * CHALLENGE_PAGE_SIZE,
    safeChallengePage * CHALLENGE_PAGE_SIZE,
  );

  // Prev/next structures from the learning-path graph, with a linear
  // fallback so the nav buttons always point at a real /ds/:slug page.
  const pageIndex = DS_PAGE_KEYS.indexOf(key);
  const completion = dsCompletionState(progressForPage);
  const prevSlugs = (() => {
    const fromGraph = (progressForPage?.previous ?? []).filter(
      (s) => DS_DETAILS_MAP[s] && s !== key && s !== canonicalSlug,
    );
    if (fromGraph.length > 0) return fromGraph;
    return pageIndex > 0 ? [DS_PAGE_KEYS[pageIndex - 1]] : [];
  })();
  const nextSlugs = (() => {
    const fromGraph = (progressForPage?.next ?? []).filter(
      (s) => DS_DETAILS_MAP[s] && s !== key && s !== canonicalSlug,
    );
    if (fromGraph.length > 0) return fromGraph;
    return pageIndex >= 0 && pageIndex < DS_PAGE_KEYS.length - 1 ? [DS_PAGE_KEYS[pageIndex + 1]] : [];
  })();

  const getDifficultyColor = (level?: string) => {
    const l = level?.toUpperCase() || "EASY";
    if (l === "H" || l === "HARD") return "text-accent-danger border-accent-danger/30 bg-accent-danger/5";
    if (l === "M" || l === "MEDIUM") return "text-accent-warning border-accent-warning/30 bg-accent-warning/5";
    return "text-accent-success border-accent-success/30 bg-accent-success/5";
  };

  const getDifficultyLabel = (level?: string) => {
    const l = level?.toUpperCase() || "EASY";
    if (l === "H" || l === "HARD") return "HARD";
    if (l === "M" || l === "MEDIUM") return "MED";
    return "EASY";
  };

  // Guard AFTER every hook so the hook order stays stable across slugs.
  if (!dsData) {
    return (
      <div className="min-h-screen bg-base text-fg flex flex-col items-center justify-center font-mono px-4">
        <div className="border border-accent-danger/25 bg-accent-danger/5 px-6 py-8 rounded-none max-w-md text-center space-y-4 shadow-[0_0_15px_rgba(255,59,92,0.05)]">
          <span className="text-accent-danger font-bold tracking-widest text-xs uppercase">SYS // CONCEPT_NOT_FOUND</span>
          <p className="text-subtle text-sm">The requested data structure category does not match our verified repository database schemas.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={()=>navigate(-1)} className="inline-block border border-subtle-line hover:border-accent-primary/30 hover:text-accent-primary hover:bg-accent-primary/5 px-4 py-2 text-xs transition duration-300">
              Back
            </button>
            <Link to="/dashboard" className="inline-block border border-subtle-line hover:border-accent-primary/30 hover:text-accent-primary hover:bg-accent-primary/5 px-4 py-2 text-xs transition duration-300">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full text-fg font-mono relative">
      {/* Dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />



      {/* MAIN CONTENT */}
      <main
        className="
          flex-1 min-w-0 w-full
         
          pt-14 px-4 py-6 md:px-8 md:py-8
          pb-20 md:pb-8
          flex flex-col gap-6
        "
      >
        {/* BACK NAVIGATION — back to /ds (plus dashboard jump) */}
        <div className="flex justify-between flex-wrap items-center w-full">
          <Link
            to="/ds"
            className="flex items-center gap-2 border border-subtle-line bg-surface-hover hover:border-accent-primary/30 hover:text-accent-primary hover:bg-accent-primary/5 px-4 py-2 text-xs uppercase tracking-wider text-faint transition-all duration-300 cursor-pointer select-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span> Back</span>
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 border border-subtle-line bg-surface-hover hover:border-accent-primary/30 hover:text-accent-primary hover:bg-accent-primary/5 px-4 py-2 text-xs uppercase tracking-wider text-faint transition-all duration-300 cursor-pointer select-none"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* HEADER BLOCK — concept header + completion badge */}
        <div className={`flex flex-col gap-4 border-b border-subtle-line pb-5 ${completion === "COMPLETED" ? "border-l-2 border-l-accent-success/60 pl-4" : ""}`}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Data Structure Classification</span>
              </div>
              {completion === "COMPLETED" ? (
                <span className="inline-flex items-center gap-1.5 border border-accent-success/50 bg-accent-success/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-success">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              ) : completion === "PARTIAL" && progressForPage ? (
                <span className="inline-flex items-center gap-1.5 border border-accent-warning/50 bg-accent-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-warning">
                  {progressForPage.completed}/{progressForPage.total} done
                </span>
              ) : progressLoading ? null : (
                <span className="inline-flex items-center gap-1.5 border border-subtle-line px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-faint">
                  Not started
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-fg hover:text-accent-primary transition duration-300">
              {dsData.title}
            </h1>
            {pageItemIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="border border-subtle-line px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-faint">
                  Path signal <strong className="ml-1 text-fg">{pageItemsDone}/{pageItemIds.length}</strong>
                </span>
                {completion !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={markPageStart}
                    className="flex items-center gap-1.5 border border-accent-primary/40 bg-accent-primary/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition hover:bg-accent-primary/20"
                  >
                    <Play className="h-3 w-3" /> Start
                  </button>
                )}
                <button
                  type="button"
                  onClick={markPageComplete}
                  disabled={marking || completion === "COMPLETED"}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition ${
                    completion === "COMPLETED"
                      ? "cursor-not-allowed border-accent-success/40 bg-accent-success/10 text-accent-success"
                      : "border-accent-success/40 text-accent-success hover:bg-accent-success/10"
                  }`}
                >
                  {marking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {completion === "COMPLETED" ? "Completed" : "Mark complete"}
                </button>
              </div>
            )}
          </div>
          <p className="text-subtle text-sm max-w-3xl leading-relaxed">{dsData.details}</p>

          {/* Eyebrow — CONCEPT // label */}
          <div className="flex justify-end">
            <span className="text-[9px] text-accent-primary/30 select-none tracking-widest uppercase">
              CONCEPT // {slug?.replace("-", "_").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Complexity Card */}
          <div className="lg:col-span-2 border border-subtle-line bg-surface-hover p-6 relative rounded-none flex flex-col justify-between">
            <div className="absolute top-[-1px] left-[10%] w-[80%] h-[1px] bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent"></div>
            <div>
              <div className="text-[10px] text-faint uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-accent-primary/40" />
                <span>// COMPLEXITY_ANALYSIS_METRICS</span>
              </div>
              <div className="grid grid-cols-3 border border-subtle-line bg-surface-hover text-center text-xs mb-4 select-none">
                <div className="border-r border-b border-subtle-line p-3 text-[9px] text-faint uppercase font-bold">Operation</div>
                <div className="border-r border-b border-subtle-line p-3 text-[9px] text-faint uppercase font-bold">Average Case</div>
                <div className="border-b border-subtle-line p-3 text-[9px] text-faint uppercase font-bold">Worst Case</div>

                <div className="border-r border-b border-subtle-line p-3 text-subtle">Search</div>
                <div className="border-r border-b border-subtle-line p-3 text-accent-primary font-bold">{dsData.complexities.search.average}</div>
                <div className="border-b border-subtle-line p-3 text-accent-warning">{dsData.complexities.search.worst}</div>

                <div className="border-r border-b border-subtle-line p-3 text-subtle">Insertion</div>
                <div className="border-r border-b border-subtle-line p-3 text-accent-primary font-bold">{dsData.complexities.insert.average}</div>
                <div className="border-b border-subtle-line p-3 text-accent-warning">{dsData.complexities.insert.worst}</div>

                <div className="border-r border-b border-subtle-line p-3 text-subtle">Deletion</div>
                <div className="border-r border-subtle-line p-3 text-accent-primary font-bold">{dsData.complexities.delete.average}</div>
                <div className="p-3 text-accent-warning">{dsData.complexities.delete.worst}</div>
              </div>
            </div>
            <div className="border-t border-subtle-line pt-4 flex items-center justify-between text-[11px] select-none">
              <span className="text-faint uppercase tracking-wider">Auxiliary Space Complexity</span>
              <span className="text-accent-success font-bold">{dsData.complexities.space}</span>
            </div>
          </div>

          {/* Use Cases Card */}
          <div className="border border-subtle-line bg-surface-hover p-6 relative rounded-none flex flex-col">
            <div className="absolute top-[-1px] left-[10%] w-[80%] h-[1px] bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent"></div>
            <div className="text-[10px] text-faint uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-accent-primary/40" />
              <span>// PRODUCTION_USE_CASES</span>
            </div>
            <ul className="space-y-3 flex-grow">
              {dsData.useCases.map((useCase, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-subtle font-mono">
                  <span className="text-accent-primary/50 mt-0.5 select-none">&gt;</span>
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── ALGORITHM LIBRARY (theory → syntax → practice) ────────────── */}
        <AlgorithmLibrary slug={slug ?? ""} />

        {/* Challenges Header */}
        <div className="border-b border-subtle-line pb-3 mb-6 flex items-center justify-between tracking-wider select-none">
          <span className="text-xs uppercase tracking-widest text-faint font-bold">
            SYS // RECOMMENDED_CHALLENGES
          </span>
          <span className="text-[10px] font-mono text-accent-primary/80 bg-accent-primary/5 border border-accent-primary/20 px-2 py-0.5">
            {loading ? "SEARCHING..." : `${matchingProblems.length} RECOMMENDED`}
          </span>
        </div>

        {/* Recommended Challenges List — max 5 links per page with pagination */}
        {loading ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <div className="text-center py-16 border border-subtle-line bg-surface-hover text-accent-danger text-xs">
            {error}
          </div>
        ) : matchingProblems.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleProblems.map((problem) => (
              <Link
                key={problem.id}
                to={`/terminal?id=${problem.id}`}
                className="group border border-subtle-line bg-surface-hover hover:border-accent-primary/30 hover:bg-accent-primary/5 p-4 rounded-none flex flex-col justify-between transition-all duration-300 border-l-2 border-l-accent-primary/10 hover:border-l-accent-primary"
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 flex items-center justify-center border border-subtle-line bg-surface-hover text-[10px] font-bold text-accent-primary/60 group-hover:text-accent-primary group-hover:border-accent-primary/20 transition-all duration-300 shrink-0">
                      #{problem.problem_number || "•"}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-fg truncate group-hover:text-accent-primary transition-colors">
                        {problem.name}
                      </span>
                      <span className="block text-[8px] text-faint uppercase tracking-widest mt-0.5">
                        {problem.isSolved ? "Status: Solved" : "Status: Unsolved"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 select-none shrink-0">
                    <span className={`px-2 py-0.5 border text-[8px] font-bold tracking-wider rounded-none uppercase ${getDifficultyColor(problem.difficulty_level)}`}>
                      [ {getDifficultyLabel(problem.difficulty_level)} ]
                    </span>
                  </div>
                </div>
              </Link>
              ))}
            </div>
            {challengePages > 1 && (
              <div className="flex items-center justify-between border-t border-subtle-line pt-3 text-[9px] uppercase tracking-widest text-faint">
                <span>Page {safeChallengePage} / {challengePages}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={safeChallengePage <= 1}
                    onClick={() => setChallengePage(safeChallengePage - 1)}
                    className="grid h-7 w-7 place-items-center border border-subtle-line disabled:opacity-30 hover:border-accent-primary/40 hover:text-accent-primary"
                    aria-label="Previous challenges page"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={safeChallengePage >= challengePages}
                    onClick={() => setChallengePage(safeChallengePage + 1)}
                    className="grid h-7 w-7 place-items-center border border-subtle-line disabled:opacity-30 hover:border-accent-primary/40 hover:text-accent-primary"
                    aria-label="Next challenges page"
                  >
                    <ChevronRight size={13} />
                  </button>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 border border-subtle-line bg-surface-hover rounded-none text-faint text-xs">
            // NO_RECOMMENDED_CHALLENGES_FOR_THIS_STRUCTURE
          </div>
        )}

        {/* ── PREV / NEXT STRUCTURE NAV ─────────────────────────────────── */}
        {(prevSlugs.length > 0 || nextSlugs.length > 0) && (
          <nav aria-label="Recommended structures" className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-faint">Previous structure</span>
              {prevSlugs.length > 0 ? (
                prevSlugs.map((target) => (
                  <Link
                    key={target}
                    to={`/ds/${target}`}
                    onClick={() => setChallengePage(1)}
                    className="flex w-fit items-center gap-2 border border-subtle-line bg-surface-hover px-4 py-3 text-xs text-subtle transition hover:border-accent-primary/40 hover:text-accent-primary"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate"> {dsTopicLabel(target)}</span>
                  </Link>
                ))
              ) : (
                <span className="border border-subtle-line px-4 py-3 text-[10px] uppercase tracking-widest text-faint">Start of path</span>
              )}
            </div>
            <div className="flex items-end w-full flex-col gap-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-faint">Recommended next</span>
              {nextSlugs.length > 0 ? (
                nextSlugs.map((target) => (
                  <Link
                    key={target}
                    to={`/ds/${target}`}
                    onClick={() => setChallengePage(1)}
                    className="flex items-center w-fit justify-end gap-2 border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 text-xs text-accent-primary transition hover:bg-accent-primary/10"
                  >
                    <span className="truncate"> {dsTopicLabel(target)}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                ))
              ) : (
                <span className="border border-subtle-line px-4 py-3 text-[10px] uppercase tracking-widest text-faint">End of path</span>
              )}
            </div>
          </nav>
        )}
    </main>
  </div>
  );
};

export default DataStructureDetail;
