import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDsTopicProgress } from "../hooks/useDsTopicProgress";
import { useDebounce } from "../hooks/useDebounce";
import { fetchAllProblems } from "../utils/problemCache";
import { DS_TOPIC_LABELS } from "../data/dsTopics";

type Problem = {
  id: string;
  name: string;
  problem_number: number;
  difficulty_level: "EASY" | "MEDIUM" | "HARD";
  isSolved: boolean;
  attempts: number;
  lastLanguage: string;
  topic: string;
  pattern: string;
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

const PAGE_SIZE = 8;

const DIFFICULTIES = ["All difficulties", "Easy", "Medium", "Hard"];

export default function Problems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All difficulties");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(query, 300);

  useAnalytics(false);
  const { bySlug } = useDsTopicProgress();

  const {
    data: rawProblems = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["problems", "system", user?.id],
    queryFn: () => fetchAllProblems<SystemProblem>("/problems/system"),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    placeholderData: [],
  });

  // Reverse index: problem id -> topic label, reusing the learning-path graph so
  // every row/chip communicates the same group the DS pages teach.
  const topicByProblemId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [slug, progress] of Object.entries(bySlug)) {
      const label = DS_TOPIC_LABELS[slug] ?? slug;
      for (const problemId of progress?.problemIds ?? []) {
        if (!(problemId in map)) map[problemId] = label;
      }
    }
    return map;
  }, [bySlug]);


  const problems: Problem[] = useMemo(
    () =>
      rawProblems.map((p) => {
        const topic = topicByProblemId[String(p.id ?? p.github_oid ?? "")] ?? "Uncategorized";
        return {
          id: p.id ?? p.github_oid ?? String(p.problem_number ?? 0),
          name: p.name,
          problem_number: p.problem_number ?? 0,
          difficulty_level: (p.difficulty_level || "MEDIUM").toUpperCase() as Problem["difficulty_level"],
          isSolved: !!p.isSolved,
          attempts: p.attempts ?? 0,
          lastLanguage: p.lastLanguage ?? "javascript",
          topic,
          pattern: topic,
        };
      }),
    [rawProblems, topicByProblemId],
  );

  const filtered = useMemo(
    () =>
      problems.filter(
        (p) =>
          `${p.name} ${p.topic} ${p.pattern}`.toLowerCase().includes(debouncedQuery.toLowerCase()) &&
          (difficulty === "All difficulties" || p.difficulty_level === difficulty.toUpperCase()),
      ),
    [problems, debouncedQuery, difficulty],
  );

  // Pagination — reset to the first page whenever the filter changes so the
  // user never lands on a now-empty page two clicks away from their term.
  const setQueryAndPage = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const setDifficultyAndPage = (value: string) => {
    setDifficulty(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, filtered.length);


  return (
    <main className="flex-1 min-w-0 w-full bg-base text-fg font-mono px-4 py-5 md:px-6 md:py-6 pb-20 md:pb-8 selection:bg-accent/30 selection:text-accent-primary">
      {/* Dot-grid texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(rgba(0,212,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] z-0" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 relative z-10">
        {/* ── HERO ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shadow-glow-primary" />
            Training command center
          </div>
          <h1 className="max-w-2xl text-2xl font-bold tracking-tight text-fg sm:text-4xl ">
            Problem <span className="text-accent-primary">index</span>
          </h1>
          <p className="max-w-xl text-xs leading-relaxed text-subtle">
            A clean queue for deliberate practice. Browse the catalog, filter by
            difficulty or topic, and launch any challenge straight into the
            terminal.
          </p>
          {/* Learning entrypoint — button links to the /ds taxonomy page */}
          <div className="pt-1">
            <Link
              to="/ds"
              className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-ink transition hover:opacity-90"
            >
              <LayoutDashboard size={12} aria-hidden />
              Explore learning paths
            </Link>
          </div>
        </section>


        {/* ── PROBLEM INDEX ───────────────────────────────────────── */}
        <section
          aria-label="Problem index"
          className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel"
        >
          <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={15} className="text-accent-primary" />
              <h2 className="text-base font-bold text-fg">Queue</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <Search className="absolute left-3 top-2 text-faint" size={13} />
                <input
                  aria-label="Search problems"
                  value={query}
                  onChange={(e) => setQueryAndPage(e.target.value)}
                  placeholder="Search title, pattern..."
                  className="h-8 w-full rounded-lg border border-line bg-surface px-8 pr-3 text-[11px] text-fg outline-none placeholder:text-faint focus:border-accent/40 sm:w-56"
                />
              </label>
              <label className="relative">
                <Filter className="pointer-events-none absolute left-3 top-2.5 text-faint" size={14} />
                <select
                  aria-label="Filter by difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficultyAndPage(e.target.value)}
                  className="h-8 w-full appearance-none rounded-lg border border-line bg-surface px-8 pr-7 text-[11px] text-fg outline-none focus:border-accent/40 sm:w-44"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 text-faint" size={12} />
              </label>
            </div>
          </div>

          {/* Desktop table — hidden on mobile, shown at md+ */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line font-mono text-[8px] uppercase tracking-[0.15em] text-faint">
                  <th className="px-3 py-2 font-medium">Problem</th>
                  <th className="px-3 py-2 font-medium">Difficulty</th>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Attempts</th>
                  <th className="px-3 py-2 font-medium">Language</th>
                  <th className="px-3 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((problem) => (
                  <ProblemRow key={problem.id} problem={problem} navigate={navigate} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards — shown below md, hidden at md+ */}
          <div className="md:hidden space-y-2">
            {paged.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} navigate={navigate} />
            ))}
          </div>

          {filtered.length === 0 && !isLoading && (
            <p className="px-4 py-8 text-center text-xs text-subtle">
              {isError ? "Failed to load the problem catalog. Retry?" : "No problems match this filter."}
            </p>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[10px] font-mono text-faint sm:px-5">
              <span>
                {startIndex}-{endIndex} of {filtered.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-line text-subtle transition hover:border-accent/40 hover:text-fg disabled:opacity-30"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[8px] uppercase tracking-widest text-accent-primary">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-line text-subtle transition hover:border-accent/40 hover:text-fg disabled:opacity-30"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Badge({ value }: { value: Problem["difficulty_level"] }) {
  const tone =
    value === "EASY"
      ? "border-accent-success/20 bg-accent-success/10 text-accent-success"
      : value === "MEDIUM"
      ? "border-accent-warning/20 bg-accent-warning/10 text-accent-warning"
      : "border-accent-danger/20 bg-accent-danger/10 text-accent-danger";
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${tone}`}>
      {value}
    </span>
  );
}

function ProblemRow({ problem, navigate }: { problem: Problem; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <tr
      className="group border-b border-line transition hover:bg-accent/5"
      onClick={() => navigate(`/terminal?id=${problem.id}`)}
    >
      <td className="px-3 py-3 cursor-pointer">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] text-faint">#{problem.problem_number}</span>
          <div>
            <span className="font-semibold text-fg group-hover:text-accent-primary">{problem.name}</span>
            <p className="mt-0.5 text-[9px] text-faint">{problem.pattern}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge value={problem.difficulty_level} />
      </td>
      <td className="px-3 py-3 text-[11px] text-subtle">{problem.topic}</td>
      <td className="px-3 py-3 font-mono text-[11px] text-subtle">{problem.attempts}</td>
      <td className="px-3 py-3 font-mono text-[9px] text-faint">{problem.lastLanguage}</td>
      <td className="px-3 py-3 text-right text-[11px]">
        <span className={problem.isSolved ? "text-accent-success" : "text-faint"}>
          {problem.isSolved ? "Solved" : "Open"}
        </span>
      </td>
    </tr>
  );
}

function ProblemCard({ problem, navigate }: { problem: Problem; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/terminal?id=${problem.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/terminal?id=${problem.id}`);
        }
      }}
      className="flex flex-col gap-2.5 rounded-panel border border-line bg-surface p-3.5 transition hover:border-accent/40 hover:bg-accent/5 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-faint shrink-0">#{problem.problem_number}</span>
          <span className="font-semibold text-fg">{problem.name}</span>
        </div>
        <Badge value={problem.difficulty_level} />
      </div>
      <p className="text-[10px] text-faint">{problem.pattern}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className="text-subtle">Topic: <span className="text-fg">{problem.topic}</span></span>
        <span className="text-subtle">Attempts: <span className="font-mono text-fg">{problem.attempts}</span></span>
        <span className="text-subtle">Lang: <span className="font-mono text-fg">{problem.lastLanguage}</span></span>
      </div>
      <span className={`self-start text-xs ${problem.isSolved ? "text-accent-success" : "text-faint"}`}>
        {problem.isSolved ? "Solved" : "Open"}
      </span>
    </div>
  );
}
