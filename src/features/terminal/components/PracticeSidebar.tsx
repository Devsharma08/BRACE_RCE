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
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>) => void;
  isLoading?: boolean;
}

// ─────────────────────────────────────────
// Difficulty label helpers
// ─────────────────────────────────────────
const diffColors: Record<string, string> = {
  EASY: "text-accent-success border-accent-success/30 bg-accent-success/10",
  MEDIUM: "text-accent-warning border-accent-warning/30 bg-accent-warning/10",
  HARD: "text-accent-danger border-accent-danger/30 bg-accent-danger/10",
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
    <div className="rounded border border-accent-warning/20 bg-accent-warning/5 p-3 font-mono text-xs mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-accent-warning font-bold flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          HINTS ({unlocked}/{parsed.length})
        </span>
        {unlocked < parsed.length && (
          <button
            type="button"
            onClick={() => setUnlocked((p) => Math.min(parsed.length, p + 1))}
            className="text-[9px] font-bold text-accent-warning border border-accent-warning/30 bg-accent-warning/5 px-2 py-0.5 uppercase tracking-wider hover:bg-accent-warning/10 transition-all cursor-pointer"
          >
            {unlocked === 0 ? "[ REVEAL HINT ]" : `[ HINT #${unlocked + 1} ]`}
          </button>
        )}
      </div>
      {unlocked === 0 ? (
        <div className="flex items-center gap-1.5 text-[10px] text-faint italic">
          <Lock className="w-3 h-3" /> Hints are locked. Click to unlock step-by-step.
        </div>
      ) : (
        <div className="space-y-1.5 mt-2">
          {parsed.slice(0, unlocked).map((text, i) => (
            <div key={i} className="border-l-2 border-accent-warning bg-surface-hover p-2 text-[10px] text-accent-warning/90 leading-relaxed">
              <span className="font-bold text-accent-warning block mb-0.5">// HINT #{i + 1}</span>
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
      <div className="flex flex-col items-center justify-center h-full text-center text-faint p-8 gap-3">
        <BookOpen className="w-12 h-12 opacity-30" />
        <p className="text-xs font-mono uppercase tracking-widest">SELECT A PROBLEM TO VIEW DETAILS</p>
      </div>
    );
  }

  const diff = (problem.difficulty_level || "MEDIUM").toUpperCase();
  const diffClass = getDiffClass(diff);
  const publicCases = (problem.test_cases || []).filter((tc) => tc.is_public);

  return (
    <div className="problem-contain flex flex-col h-full min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 gap-4 themed-scroll">
      {/* Title & metadata */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 max-w-full break-words text-sm font-bold leading-tight text-fg [overflow-wrap:anywhere]">
            {problem.problem_number != null ? `#${problem.problem_number} ` : ""}
            {problem.name}
          </h2>
          {problem.isSolved && (
            <span className="shrink-0 flex items-center gap-1 text-[10px] text-accent-success border border-accent-success/30 bg-accent-success/10 px-2 py-0.5 rounded font-bold uppercase">
              <CheckCircle2 className="w-3 h-3" /> SOLVED
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded border font-bold uppercase ${diffClass}`}>{diff}</span>
          {problem.attempts != null && problem.attempts > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-subtle-line bg-surface-hover text-subtle">
              <Cpu className="w-3 h-3" /> {problem.attempts} ATTEMPT{problem.attempts !== 1 ? "S" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-subtle-line" />

      {/* Problem Definition */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent-primary font-bold mb-2">
          <AlignLeft className="w-3 h-3" /> PROBLEM DESCRIPTION
        </div>
        {problem.problem_definition && problem.problem_definition.trim().length > 0 ? (
          <div
            className="min-w-0 max-w-full break-words overflow-hidden text-sm leading-relaxed text-subtle font-sans [overflow-wrap:anywhere] [&>p]:mb-3 [&>ul]:ml-4 [&>ul]:list-disc [&>pre]:max-w-full [&>pre]:overflow-x-auto [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:rounded [&>pre]:bg-surface-hover [&>pre]:p-2 [&>code]:text-accent-primary [&>code]:break-words [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: problem.problem_definition }}
          />
        ) : (
          <p className="text-xs text-faint italic">Problem description unavailable.</p>
        )}
      </div>

      {/* Public Test Cases — explicit section: descriptions are plain text for some
          problems, so never rely solely on examples embedded in the statement HTML. */}
      {publicCases.length > 0 && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent-primary font-bold mb-2">
            <FlaskConical className="w-3 h-3" /> TEST CASES
            <span className="ml-auto text-[8px] text-faint normal-case tracking-normal">
              {publicCases.length} CASE{publicCases.length !== 1 ? "S" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {publicCases.map((tc, i) => (
              <div key={tc.id} className="border border-subtle-line bg-surface-hover overflow-hidden">
                <div className="px-3 py-1 border-b border-subtle-line text-[8px] font-bold text-faint uppercase tracking-widest">
                  CASE #{i + 1}
                </div>
                <div className="px-3 py-2 space-y-2">
                  <div className="min-w-0">
                    <span className="text-[8px] text-accent-success/70 font-bold uppercase tracking-widest block mb-1">
                      INPUT
                    </span>
                    <pre className="text-[10px] text-subtle font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{tc.input || "(empty)"}</pre>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8px] text-accent-primary/70 font-bold uppercase tracking-widest block mb-1">
                      EXPECTED_OUTPUT
                    </span>
                    <pre className="text-[10px] text-fg font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{tc.expectedOutput}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hints */}
      <HintsAccordion hints={problem.problem_hints} />

      {/* Solved timestamp */}
      {problem.isSolved && problem.solvedAt && (
        <div className="text-[9px] text-faint font-mono border-t border-subtle-line pt-2">
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
      <div className="px-3 py-2.5 bg-surface-hover border-b border-subtle-line">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
          <span className="text-faint uppercase tracking-widest">PROGRESS</span>
          <span className="text-accent-primary font-bold">
            {solved} / {problems.length} SOLVED
          </span>
        </div>
        <div className="h-1 rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-success transition-all duration-700"
            style={{ width: problems.length > 0 ? `${(solved / problems.length) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-subtle-line">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-hover border border-subtle-line text-[11px] text-fg pl-8 pr-3 py-1.5 rounded focus:outline-none focus:border-accent-primary/50 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Difficulty filters */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-subtle-line">
        <Filter className="w-3 h-3 text-faint shrink-0" />
        {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDiffFilter(d)}
            className={`px-2 py-0.5 text-[9px] font-bold rounded border transition-all cursor-pointer ${diffFilter === d
                ? "bg-accent-primary/15 border-accent-primary/60 text-accent-primary"
                : "bg-surface-hover border-subtle-line text-faint hover:text-fg hover:border-subtle-line"
              }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Problem list — themed scrollbar */}
      <div className="flex-1 overflow-y-auto themed-scroll">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-faint text-[10px] font-mono uppercase tracking-widest">
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
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-b border-subtle-line transition-all cursor-pointer group ${isActive
                    ? "bg-accent-primary/10 border-l-2 border-l-accent-primary"
                    : "hover:bg-surface-hover border-l-2 border-l-transparent"
                  }`}
              >
                {/* Solved icon */}
                <span className="shrink-0">
                  {p.isSolved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-faint" />
                  )}
                </span>

                {/* Problem info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.problem_number != null && (
                      <span className="text-[9px] text-subtle font-mono shrink-0">#{p.problem_number}</span>
                    )}
                    <span className={`text-[11px] font-bold truncate ${isActive ? "text-accent-primary" : "text-fg group-hover:text-fg"}`}>
                      {p.name}
                    </span>
                  </div>
                  {p.attempts != null && p.attempts > 0 && !p.isSolved && (
                    <span className="text-[9px] text-accent-warning/70 font-mono">{p.attempts} attempt{p.attempts !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Difficulty badge */}
                <span
                  className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${getDiffClass(diff)}`}
                >
                  {diff.charAt(0)}
                </span>

                <ChevronRight className={`w-3 h-3 shrink-0 transition-colors ${isActive ? "text-accent-primary" : "text-faint group-hover:text-subtle"}`} />
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
      <div key={i} className="h-10 rounded bg-surface-hover" />
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
      className="relative flex flex-col h-full bg-raised border-r border-subtle-line overflow-hidden select-none shrink-0"
      style={{ width }}
    >
      {/* TAB BAR */}
      <div className="flex border-b border-subtle-line bg-surface-hover shrink-0">
        {(["PROBLEM", "PROBLEMS"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activeTab === tab
                ? "border-b-accent-primary text-accent-primary bg-accent-primary/5"
                : "border-b-transparent text-faint hover:text-subtle hover:bg-surface-hover"
              }`}
          >
            {tab === "PROBLEM" ? <BookOpen className="w-3 h-3" /> : <LayoutList className="w-3 h-3" />}
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT — contained scroll w/ themed scrollbar, never overflows panel */}
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
        onPointerDown={onResizeStart}
        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-accent-primary/50 active:bg-accent-primary z-40 transition-colors group flex items-center justify-center touch-none"
        title="Drag to resize sidebar"
      >
        <div className="w-0.5 h-12 bg-accent-primary/40 group-hover:bg-accent-primary rounded" />
      </div>
    </aside>
  );
};

export default PracticeSidebar;
