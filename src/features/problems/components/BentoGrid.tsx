/**
 * Bento card grid for the problem index.
 *
 * Replaces the plain row list with the card language the home page already uses
 * (rounded-card, shadow-panel, accent washes, uppercase mono labels), so the
 * catalog reads as part of the same system rather than a separate admin table.
 *
 * Every field shown here comes off the problem object the /problems/system
 * endpoint already returns — no new fetching, no reshaping of server data.
 */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Check, Clock3, Hash, Layers, Play, Target } from "lucide-react";

export type BentoProblem = {
  id?: string;
  github_oid?: string;
  name: string;
  problem_number?: number | null;
  difficulty_level?: string | null;
  data_structure?: string | null;
  timeLimitMs?: number | null;
  isSolved?: boolean;
  attempts?: number;
  solvedAt?: string | null;
  test_cases?: { input?: string; expectedOutput?: string; is_public?: boolean }[];
};

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: "border-accent-success/30 bg-accent-success/[0.08] text-accent-success",
  MEDIUM: "border-accent-warning/30 bg-accent-warning/[0.08] text-accent-warning",
  HARD: "border-accent-danger/30 bg-accent-danger/[0.08] text-accent-danger",
};

const ACCENTS = [
  "text-accent-primary border-accent-primary/25 bg-accent-primary/[0.05]",
  "text-accent-violet border-accent-violet/25 bg-accent-violet/[0.05]",
  "text-accent-success border-accent-success/25 bg-accent-success/[0.05]",
  "text-accent-warning border-accent-warning/25 bg-accent-warning/[0.05]",
  "text-accent-pink border-accent-pink/25 bg-accent-pink/[0.05]",
] as const;

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "??";

/** Count of stored cases, split into samples and withheld ones. */
const caseStats = (p: BentoProblem) => {
  const all = p.test_cases ?? [];
  return { total: all.length, samples: all.filter((t) => t.is_public).length };
};

type BentoCardProps = {
  problem: BentoProblem;
  domain: string;
  accent: string;
};

const BentoCard: React.FC<BentoCardProps> = ({ problem, domain, accent }) => {
  const difficulty = (problem.difficulty_level || "MEDIUM").toUpperCase();
  const solved = Boolean(problem.isSolved);
  const { total, samples } = caseStats(problem);
  const oid = String(problem.id ?? problem.github_oid ?? "");

  return (
    <Link
      to={`/terminal?id=${encodeURIComponent(oid)}`}
      aria-label={`${problem.name}, ${difficulty}, ${solved ? "solved" : "unsolved"}`}
      className={`group relative flex flex-col overflow-hidden rounded-card border bg-surface p-4 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-primary/40 hover:shadow-accent-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary ${
        solved ? "border-accent-success/25" : "border-subtle-line"
      }`}
    >
      {/* Solved problems carry a solid accent rail down the left edge. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${
          solved ? "bg-accent-success" : "bg-transparent group-hover:bg-accent-primary/60"
        }`}
      />
<div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[10px] font-bold ${accent}`}
        >
          {solved ? <Check size={15} /> : initials(problem.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold leading-tight text-fg transition group-hover:text-accent-primary">
              {problem.name}
            </h3>
            <span
              className={`shrink-0 border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${
                DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES.MEDIUM
              }`}
            >
              {difficulty}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-widest text-faint">
            {problem.problem_number != null && (
              <span className="inline-flex items-center gap-1">
                <Hash size={10} /> {problem.problem_number}
              </span>
            )}
            {domain && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Layers size={10} />
                <span className="truncate">{domain}</span>
              </span>
            )}
            {total > 0 && (
              <span
                className="inline-flex items-center gap-1"
                title={`${samples} sample cases, ${total - samples} withheld`}
              >
                <Target size={10} /> {total} cases
              </span>
            )}
            {problem.timeLimitMs ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={10} /> {(problem.timeLimitMs / 1000).toFixed(1)}s
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer: progress state, or an explicit call to action. */}
      <div className="mt-4 flex items-center justify-between border-t border-subtle-line pt-3">
        {solved ? (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent-success">
            <Check size={11} /> Solved
            {problem.attempts ? (
              <span className="font-normal text-faint">· {problem.attempts} tries</span>
            ) : null}
          </span>
        ) : (
          <span className="text-[9px] uppercase tracking-widest text-faint">
            {problem.attempts
              ? `${problem.attempts} attempt${problem.attempts === 1 ? "" : "s"}`
              : "Not attempted"}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-accent-primary opacity-0 transition group-hover:opacity-100">
          Solve <Play size={10} />
        </span>
      </div>
    </Link>
  );
};
type BentoGridProps = {
  problems: BentoProblem[];
  topicByProblemId: Record<string, string>;
};

const BentoGrid: React.FC<BentoGridProps> = ({ problems, topicByProblemId }) => {
  // Accent is assigned by position so a page of cards stays visually varied
  // without the category having to carry a colour.
  const cards = useMemo(
    () =>
      problems.map((problem, i) => {
        const key = String(problem.id ?? problem.github_oid ?? "");
        return (
          <BentoCard
            key={problem.id ?? problem.github_oid ?? `${problem.name}-${i}`}
            problem={problem}
            domain={topicByProblemId[key] ?? problem.data_structure ?? ""}
            accent={ACCENTS[i % ACCENTS.length]}
          />
        );
      }),
    [problems, topicByProblemId],
  );

  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{cards}</div>;
};

export default BentoGrid;