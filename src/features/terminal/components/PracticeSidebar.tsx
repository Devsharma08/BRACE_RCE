import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  LayoutList,
  Cpu,
  AlignLeft,
  Lightbulb,
  Lock,
  FlaskConical,
  Tag,
} from "lucide-react";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface PracticeProblem {
  id: string;
  name: string;
  problem_number?: number | null;
  github_oid?: string | null;
  difficulty_level: string;
  timeLimitMs?: number | null;
  isSolved: boolean;
  solvedAt?: string | null;
  attempts?: number;
  lastCode?: string | null;
  lastLanguage?: string | null;
  code_snippets?: Array<{ language: string; code: string }>;
  test_cases?: Array<{ id: string; input: string; expectedOutput: string; is_public: boolean }>;
  problem_definition?: string;
  problem_hints?: string[];
  submissionTimes?: string[];
}

interface PracticeSidebarProps {
  problems: PracticeProblem[];
  activeProblem: PracticeProblem | null;
  onSelectProblem: (problem: PracticeProblem) => void;
  width: number;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  isLoading?: boolean;
}

// ─────────────────────────────────────────
// Difficulty label helpers
// ─────────────────────────────────────────
const diffColors: Record<string, string> = {
  EASY: "text-emerald-400 border-emerald-500/30 bg-emerald-950/30",
  MEDIUM: "text-amber-400 border-amber-500/30 bg-amber-950/30",
  HARD: "text-rose-400 border-rose-500/30 bg-rose-950/30",
};

const getDiffClass = (level: string) =>
  diffColors[(level || "MEDIUM").toUpperCase()] ?? diffColors.MEDIUM;

// ─────────────────────────────────────────
// Hints accordion (identical to Battle.tsx)
// ─────────────────────────────────────────
const HintsAccordion = ({ hints }: { hints?: string[] | null }) => {
  const [unlocked, setUnlocked] = useState(0);
  const parsed = useMemo(() => {
    if (Array.isArray(hints) && hints.length > 0) return hints;
    return [
      "Analyse input constraints and identify edge cases (empty inputs, duplicates, etc.).",
      "Consider a more efficient data structure (hash map, two-pointers, sliding window).",
      "Optimal target: O(N) time, O(1) auxiliary space where feasible.",
    ];
  }, [hints]);

  return (
    <div className="rounded border border-amber-500/20 bg-amber-950/5 p-3 font-mono text-xs mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          HINTS ({unlocked}/{parsed.length})
        </span>
        {unlocked < parsed.length && (
          <button
            type="button"
            onClick={() => setUnlocked((p) => Math.min(parsed.length, p + 1))}
            className="text-[9px] font-bold text-amber-300 border border-amber-500/30 bg-amber-950/20 px-2 py-0.5 uppercase tracking-wider hover:bg-amber-950/50 transition-all cursor-pointer"
          >
            {unlocked === 0 ? "[ REVEAL HINT ]" : `[ HINT #${unlocked + 1} ]`}
          </button>
        )}
      </div>
      {unlocked === 0 ? (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic">
          <Lock className="w-3 h-3" /> Hints are locked. Click to unlock step-by-step.
        </div>
      ) : (
        <div className="space-y-1.5 mt-2">
          {parsed.slice(0, unlocked).map((text, i) => (
            <div key={i} className="border-l-2 border-amber-400 bg-black/40 p-2 text-[10px] text-amber-200/90 leading-relaxed">
              <span className="font-bold text-amber-400 block mb-0.5">// HINT #{i + 1}</span>
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Problem Description Tab
// ─────────────────────────────────────────
const ProblemTab = ({ problem }: { problem: PracticeProblem | null }) => {
  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-600 p-8 gap-3">
        <BookOpen className="w-12 h-12 opacity-30" />
        <p className="text-xs font-mono uppercase tracking-widest">SELECT A PROBLEM TO VIEW DETAILS</p>
      </div>
    );
  }

  const diff = (problem.difficulty_level || "MEDIUM").toUpperCase();
  const diffClass = getDiffClass(diff);
  const publicCases = (problem.test_cases || []).filter((tc) => tc.is_public);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-4 gap-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {/* Title & metadata */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 max-w-full break-words text-sm font-bold leading-tight text-white [overflow-wrap:anywhere]">
            {problem.problem_number != null ? `#${problem.problem_number} ` : ""}
            {problem.name}
          </h2>
          {problem.isSolved && (
            <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 rounded font-bold uppercase">
              <CheckCircle2 className="w-3 h-3" /> SOLVED
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded border font-bold uppercase ${diffClass}`}>{diff}</span>
          {problem.attempts != null && problem.attempts > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-black/30 text-slate-400">
              <Cpu className="w-3 h-3" /> {problem.attempts} ATTEMPT{problem.attempts !== 1 ? "S" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Problem Definition */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-2">
          <AlignLeft className="w-3 h-3" /> PROBLEM DESCRIPTION
        </div>
        <div
          className="min-w-0 max-w-full break-words text-[11px] leading-relaxed text-slate-300 font-sans [overflow-wrap:anywhere] [&>p]:mb-3 [&>ul]:ml-4 [&>ul]:list-disc [&>pre]:max-w-full [&>pre]:overflow-x-auto [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:rounded [&>pre]:bg-black/30 [&>pre]:p-2 [&>code]:text-cyan-300"
          dangerouslySetInnerHTML={{ __html: problem.problem_definition || "No description available." }}
        />
      </div>

      {/* Public Test Cases */}
      {/* {publicCases.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-2">
            <FlaskConical className="w-3 h-3" /> EXAMPLES
          </div>
          <div className="flex flex-col gap-2">
            {publicCases.slice(0, 2).map((tc, i) => (
              <div key={tc.id} className="rounded border border-white/10 bg-black/40 text-[10px] font-mono overflow-hidden">
                <div className="px-3 py-1 bg-white/5 text-slate-500 font-bold border-b border-white/5">
                  EXAMPLE {i + 1}
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  <div>
                    <span className="text-slate-500">Input: </span>
                    <span className="text-slate-200 break-all">{tc.input || "(empty)"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="text-emerald-300 break-all">{tc.expectedOutput}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Hints */}
      <HintsAccordion hints={problem.problem_hints} />

      {/* Solved timestamp */}
      {problem.isSolved && problem.solvedAt && (
        <div className="text-[9px] text-slate-600 font-mono border-t border-white/5 pt-2">
          Solved: {new Date(problem.solvedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Problems Browser Tab
// ─────────────────────────────────────────
const ProblemsListTab = ({
  problems,
  activeProblem,
  onSelect,
}: {
  problems: PracticeProblem[];
  activeProblem: PracticeProblem | null;
  onSelect: (p: PracticeProblem) => void;
}) => {
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return problems.filter((p) => {
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.problem_number != null && String(p.problem_number).includes(q));
      const matchesDiff =
        diffFilter === "ALL" ||
        (p.difficulty_level || "MEDIUM").toUpperCase() === diffFilter;
      return matchesQ && matchesDiff;
    });
  }, [problems, search, diffFilter]);

  const solved = problems.filter((p) => p.isSolved).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress bar */}
      <div className="px-3 py-2.5 bg-black/30 border-b border-white/5">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
          <span className="text-slate-500 uppercase tracking-widest">PROGRESS</span>
          <span className="text-cyan-400 font-bold">
            {solved} / {problems.length} SOLVED
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700"
            style={{ width: problems.length > 0 ? `${(solved / problems.length) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/50 border border-white/10 text-[11px] text-slate-200 pl-8 pr-3 py-1.5 rounded focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Difficulty filters */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
        <Filter className="w-3 h-3 text-slate-500 shrink-0" />
        {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDiffFilter(d)}
            className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer ${diffFilter === d
                ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300"
                : "bg-black/40 border-white/10 text-slate-500 hover:text-slate-200 hover:border-white/20"
              }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Problem list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-[10px] font-mono uppercase tracking-widest">
            NO PROBLEMS MATCH YOUR FILTERS
          </div>
        ) : (
          filtered.map((p) => {
            const diff = (p.difficulty_level || "MEDIUM").toUpperCase();
            const isActive = activeProblem?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-b border-white/5 transition-all cursor-pointer group ${isActive
                    ? "bg-cyan-950/30 border-l-2 border-l-cyan-400"
                    : "hover:bg-white/5 border-l-2 border-l-transparent"
                  }`}
              >
                {/* Solved icon */}
                <span className="shrink-0">
                  {p.isSolved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </span>

                {/* Problem info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.problem_number != null && (
                      <span className="text-[9px] text-slate-600 font-mono shrink-0">#{p.problem_number}</span>
                    )}
                    <span className={`text-[11px] font-bold truncate ${isActive ? "text-cyan-300" : "text-slate-200 group-hover:text-white"}`}>
                      {p.name}
                    </span>
                  </div>
                  {p.attempts != null && p.attempts > 0 && !p.isSolved && (
                    <span className="text-[9px] text-amber-500/70 font-mono">{p.attempts} attempt{p.attempts !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Difficulty badge */}
                <span
                  className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${getDiffClass(diff)}`}
                >
                  {diff.charAt(0)}
                </span>

                <ChevronRight className={`w-3 h-3 shrink-0 transition-colors ${isActive ? "text-cyan-400" : "text-slate-700 group-hover:text-slate-400"}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Skeleton Loader
// ─────────────────────────────────────────
const SidebarSkeleton = () => (
  <div className="flex flex-col gap-3 p-4 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="h-10 rounded bg-white/5" />
    ))}
  </div>
);

// ─────────────────────────────────────────
// Main PracticeSidebar
// ─────────────────────────────────────────
type Tab = "PROBLEM" | "PROBLEMS";

const PracticeSidebar = ({
  problems,
  activeProblem,
  onSelectProblem,
  width,
  onResizeStart,
  isLoading,
}: PracticeSidebarProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("PROBLEM");

  return (
    <aside
      className="relative flex flex-col h-full bg-[#06080e] border-r border-white/10 overflow-hidden select-none shrink-0"
      style={{ width }}
    >
      {/* TAB BAR */}
      <div className="flex border-b border-white/10 bg-black/30 shrink-0">
        {(["PROBLEM", "PROBLEMS"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activeTab === tab
                ? "border-b-cyan-400 text-cyan-300 bg-cyan-950/20"
                : "border-b-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
          >
            {tab === "PROBLEM" ? <BookOpen className="w-3 h-3" /> : <LayoutList className="w-3 h-3" />}
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <SidebarSkeleton />
        ) : activeTab === "PROBLEM" ? (
          <ProblemTab problem={activeProblem} />
        ) : (
          <ProblemsListTab
            problems={problems}
            activeProblem={activeProblem}
            onSelect={(p) => {
              onSelectProblem(p);
              setActiveTab("PROBLEM"); // auto-switch to PROBLEM tab after selection
            }}
          />
        )}
      </div>

      {/* RESIZE HANDLE */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-cyan-500/40 transition-colors z-10"
        title="Drag to resize"
      />
    </aside>
  );
};

export default PracticeSidebar;
