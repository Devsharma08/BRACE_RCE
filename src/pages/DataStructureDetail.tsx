import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchFileNames } from "../features/terminal/api";
import type { FileEntry } from "../context/fileNamesContext";
import { Loader2, ArrowLeft, Terminal, LayoutGrid, Award } from "lucide-react";
import { TableSkeleton } from "../components/ui/Skeleton";

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

const DataStructureDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dsData = slug ? DS_DETAILS_MAP[slug] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadFiles = async () => {
      try {
        setLoading(true);
        const data = await fetchFileNames();
        setFiles(data);
      } catch {
        setError("Failed to fetch repository challenge files.");
      } finally {
        setLoading(false);
      }
    };
    loadFiles();
  }, []);

  if (!dsData) {
    return (
      <div className="min-h-screen bg-[#08090a] text-white flex flex-col items-center justify-center font-mono px-4">
        <div className="border border-red-500/25 bg-red-950/5 px-6 py-8 rounded-none max-w-md text-center space-y-4 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <span className="text-red-400 font-bold tracking-widest text-xs uppercase">SYS // CONCEPT_NOT_FOUND</span>
          <p className="text-slate-400 text-sm">The requested data structure category does not match our verified repository database schemas.</p>
          <Link to="/" className="inline-block border border-white/10 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-950/10 px-4 py-2 text-xs transition duration-300">
            [ RETURN TO HOME ]
          </Link>
        </div>
      </div>
    );
  }

  const matchingFiles = files.filter((file) => {
    const ds = file.data_structure?.toLowerCase() || "";
    return dsData.slugs.includes(ds);
  });

  const getDifficultyColor = (level?: string) => {
    const l = level?.toUpperCase() || "E";
    if (l === "H" || l === "HARD") return "text-red-400 border-red-500/25 bg-red-950/10";
    if (l === "M" || l === "MEDIUM") return "text-yellow-400 border-yellow-500/25 bg-yellow-950/10";
    return "text-green-400 border-green-500/25 bg-green-950/10";
  };

  const getDifficultyLabel = (level?: string) => {
    const l = level?.toUpperCase() || "E";
    if (l === "H" || l === "HARD") return "HARD";
    if (l === "M" || l === "MEDIUM") return "MED";
    return "EASY";
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-textwhite font-mono relative pb-24">
      {/* Premium FUI L-Bracket Accents */}
      <div className="max-w-6xl mx-auto px-4 pt-32 relative">
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-white/5 bg-black/40 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-950/10 px-4 py-2 text-xs uppercase tracking-wider text-slate-500 transition-all duration-300 mb-8 cursor-pointer select-none"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>[ Back to Dashboard ]</span>
        </Link>

        {/* Header Block */}
        <div className="border border-white/10 bg-black/30 p-8 rounded-none mb-8 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 p-3 text-[9px] text-cyan-500/30 select-none tracking-widest uppercase">
            CONCEPT // {slug?.replace("-", "_").toUpperCase()}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <LayoutGrid className="h-5 w-5 text-cyan-400/60" />
            <span className="text-[10px] text-cyan-500/50 tracking-[0.2em] uppercase font-bold">Data Structure Classification</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 hover:text-cyan-400 transition duration-300">
            {dsData.title}
          </h1>
          <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">{dsData.details}</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Complexity Card */}
          <div className="lg:col-span-2 border border-white/10 bg-black/40 p-6 relative rounded-none flex flex-col justify-between">
            <div className="absolute top-[-1px] left-[10%] w-[80%] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-cyan-400/40" />
                <span>// COMPLEXITY_ANALYSIS_METRICS</span>
              </div>
              <div className="grid grid-cols-3 border border-white/5 bg-black/60 text-center text-xs mb-4 select-none">
                <div className="border-r border-b border-white/5 p-3 text-[9px] text-slate-500 uppercase font-bold">Operation</div>
                <div className="border-r border-b border-white/5 p-3 text-[9px] text-slate-500 uppercase font-bold">Average Case</div>
                <div className="border-b border-white/5 p-3 text-[9px] text-slate-500 uppercase font-bold">Worst Case</div>

                <div className="border-r border-b border-white/5 p-3 text-slate-400">Search</div>
                <div className="border-r border-b border-white/5 p-3 text-cyan-400 font-bold">{dsData.complexities.search.average}</div>
                <div className="border-b border-white/5 p-3 text-amber-500">{dsData.complexities.search.worst}</div>

                <div className="border-r border-b border-white/5 p-3 text-slate-400">Insertion</div>
                <div className="border-r border-b border-white/5 p-3 text-cyan-400 font-bold">{dsData.complexities.insert.average}</div>
                <div className="border-b border-white/5 p-3 text-amber-500">{dsData.complexities.insert.worst}</div>

                <div className="border-r border-white/5 p-3 text-slate-400">Deletion</div>
                <div className="border-r border-white/5 p-3 text-cyan-400 font-bold">{dsData.complexities.delete.average}</div>
                <div className="p-3 text-amber-500">{dsData.complexities.delete.worst}</div>
              </div>
            </div>
            <div className="border-t border-white/5 pt-4 flex items-center justify-between text-[11px] select-none">
              <span className="text-slate-500 uppercase tracking-wider">Auxiliary Space Complexity</span>
              <span className="text-emerald-400 font-bold">{dsData.complexities.space}</span>
            </div>
          </div>

          {/* Use Cases Card */}
          <div className="border border-white/10 bg-black/40 p-6 relative rounded-none flex flex-col">
            <div className="absolute top-[-1px] left-[10%] w-[80%] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-cyan-400/40" />
              <span>// PRODUCTION_USE_CASES</span>
            </div>
            <ul className="space-y-3 flex-grow">
              {dsData.useCases.map((useCase, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-400 font-mono">
                  <span className="text-cyan-500/50 mt-0.5 select-none">&gt;</span>
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Challenges Header */}
        <div className="border-b border-white/10 pb-3 mb-6 flex items-center justify-between tracking-wider select-none">
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
            SYS // COMPATIBLE_PRACTICE_CHALLENGES
          </span>
          <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/15 border border-cyan-500/20 px-2 py-0.5">
            {loading ? "SEARCHING..." : `${matchingFiles.length} FILES FOUND`}
          </span>
        </div>

        {/* Live Challenges List */}
        {loading ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <div className="text-center py-16 border border-white/5 bg-black/20 text-rose-400 text-xs">
            {error}
          </div>
        ) : matchingFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchingFiles.map((file) => (
              <Link
                key={file.oid}
                to={`/terminal?file=${file.name}&category=${slug}&lang=${file.language}`}
                className="group border border-white/5 bg-black/40 hover:border-cyan-500/30 hover:bg-cyan-950/10 p-4 rounded-none flex items-center justify-between transition-all duration-300 border-l-2 border-l-cyan-500/10 hover:border-l-cyan-400"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 flex items-center justify-center border border-white/10 bg-black/40 text-[10px] font-bold text-cyan-400/60 group-hover:text-cyan-400 group-hover:border-cyan-500/20 transition-all duration-300">
                    {file.language?.toLowerCase() === "java" ? "JV" : "JS"}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
                      {file.name}
                    </span>
                    <span className="block text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">
                      language: {file.language || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 select-none">
                  <span className={`px-2 py-0.5 border text-[8px] font-bold tracking-wider rounded-none uppercase ${getDifficultyColor(file.difficulty_level)}`}>
                    [ {getDifficultyLabel(file.difficulty_level)} ]
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-white/5 bg-black/20 rounded-none text-slate-500 text-xs">
            // NO_ACTIVE_CHALLENGES_FOUND_IN_REPOSITORY
          </div>
        )}
      </div>
    </div>
  );
};

export default DataStructureDetail;
