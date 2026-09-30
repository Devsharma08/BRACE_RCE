import React, { useState } from "react";
import { Trophy, Copy, Check, Swords, Clock, MemoryStick, ListChecks } from "lucide-react";

export interface Submission {
  id: string;
  attemptNumber: number;
  submittedCode: string;
  language: string;
  status: string;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  passedCase: number;
  totalCases: number;
  isBestSubmission: boolean;
  /** Present on server payloads — used to merge both sides into one timeline. */
  createdAt?: string | null;
}

export interface PerformanceData {
  userId: string;
  user: { id: string; username: string; avatarUrl: string };
  submissions: Submission[];
  score: number;
  timeTakenMs?: number | null;
}

export interface LegacyPerformanceFields {
  submittedCode?: unknown;
  code?: unknown;
  sourceCode?: unknown;
  language?: unknown;
  status?: unknown;
}

const getEffectiveSubmissions = (perf: PerformanceData | undefined): Submission[] => {
  if (!perf) return [];
  if (perf.submissions && perf.submissions.length > 0) {
    return perf.submissions;
  }
  const legacy = perf as PerformanceData & LegacyPerformanceFields;
  const code =
    typeof legacy.submittedCode === "string"
      ? legacy.submittedCode
      : typeof legacy.code === "string"
        ? legacy.code
        : typeof legacy.sourceCode === "string"
          ? legacy.sourceCode
          : "";
  const language = typeof legacy.language === "string" ? legacy.language : "javascript";
  const status = typeof legacy.status === "string" ? legacy.status : "COMPLETED";
  return [{
    id: perf.userId || "sub-1",
    attemptNumber: 1,
    submittedCode: code || "// Code submission recorded",
    language,
    status,
    runtimeMs: perf.timeTakenMs || null,
    memoryKb: null,
    passedCase: status === "WON" || status === "PASSED" ? 1 : 0,
    totalCases: 1,
    isBestSubmission: true
  }];
};

/** "12.4 MB" / "820 KB" — raw `memoryKb` was rendered unformatted in the old grid. */
const formatMemory = (kb?: number | null): string => {
  if (!kb) return "N/A";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
};

const formatRuntime = (ms?: number | null): string => {
  if (ms === undefined || ms === null) return "N/A";
  return `${ms} ms`;
};

/** Thin wrapper so the two comparison columns stay byte-identical in markup. */
const MetricTile = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) => (
  <div className="rounded-btn border border-subtle-line bg-base/60 px-2.5 py-2 text-center">
    <span className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest text-faint">
      <Icon className="h-3 w-3" />
      {label}
    </span>
    <span className={`mt-1 block font-mono text-xs font-bold tabular-nums ${tone}`}>{value}</span>
  </div>
);

const AttemptPicker = ({
  submissions,
  selected,
  onSelect,
  tone,
}: {
  submissions: Submission[];
  selected?: Submission;
  onSelect: (submission: Submission) => void;
  tone: string;
}) => (
  <label className="flex shrink-0 items-center gap-1.5">
    <span className="sr-only">Select attempt</span>
    <select
      value={selected?.id}
      onChange={(e) => {
        const next = submissions.find((s) => s.id === e.target.value);
        if (next) onSelect(next);
      }}
      className={`max-w-[11rem] cursor-pointer rounded-btn border border-subtle-line bg-base px-2 py-1 font-mono text-[10px] text-fg outline-none transition-colors focus:border-accent-primary${tone}`}
    >
      {submissions.map((s) => (
        <option key={s.id} value={s.id}>
          Attempt #{s.attemptNumber}
          {s.isBestSubmission ? " (Best)" : ""} — {s.passedCase}/{s.totalCases}
        </option>
      ))}
    </select>
  </label>
);

/** Wash colour per side, shared by the header chip and the column border. */
const washFor = (tone: "primary" | "danger") =>
  tone === "primary" ? "bg-accent-primary/10" : "bg-accent-danger/10";

export interface CodeComparisonContentProps {
  currentUserId: string;
  performances: PerformanceData[];
  /** Extra classes on the outer flex column (height control on the page). */
  className?: string;
}

/**
 * The battle review body — comparative summary columns + side-by-side code
 * panes. Extracted from CodeComparisonModal so the post-battle analysis page
 * (/analysis/:matchId) can reuse the exact same review UI inline.
 */
export const CodeComparisonContent: React.FC<CodeComparisonContentProps> = ({
  currentUserId,
  performances = [],
  className = "",
}) => {
  const myPerf = performances.find(p => p.userId === currentUserId) || performances[0];
  const oppPerf = performances.find(p => p.userId !== currentUserId) || (performances.length > 1 ? performances[1] : undefined);

  const mySubmissions = getEffectiveSubmissions(myPerf);
  const oppSubmissions = getEffectiveSubmissions(oppPerf);

  const myBestSub = mySubmissions.find(s => s.isBestSubmission) || mySubmissions[0];
  const oppBestSub = oppSubmissions.find(s => s.isBestSubmission) || oppSubmissions[0];

  // Selected attempts derive from the incoming performances (props), not from
  // local state that needs syncing: `useState` initialisers only apply on the
  // first render, so key them by the performance/user identity. When a new
  // match arrives the key changes and React mounts a fresh selection state.
  const [selectedMySub, setSelectedMySub] = useState<Submission | undefined>(myBestSub);
  const [selectedOppSub, setSelectedOppSub] = useState<Submission | undefined>(oppBestSub);
  const [copied, setCopied] = useState(false);

  const handleCopyOpponentCode = () => {
    if (!selectedOppSub?.submittedCode) return;
    navigator.clipboard.writeText(selectedOppSub.submittedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderCodePane = (
    heading: string,
    submission: Submission | undefined,
    tone: "primary" | "danger",
    onCopy?: () => void,
  ) => {
    const border = tone === "primary" ? "border-accent-primary/30" : "border-accent-danger/30";
    const accent = tone === "primary" ? "text-accent-primary" : "text-accent-danger";

    return (
      <div className={`flex min-h-0 flex-col overflow-hidden rounded-card border ${border} bg-surface`}>
        <div className={`flex shrink-0 items-center justify-between gap-2 border-b ${border} ${washFor(tone)} px-4 py-2.5`}>
          <span className={`truncate font-mono text-[10px] font-bold uppercase tracking-widest ${accent}`}>
            {heading}
          </span>
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="flex shrink-0 items-center gap-1 rounded-btn border border-subtle-line bg-base px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-subtle transition-colors hover:border-accent-primary/40 hover:text-accent-primary"
            >
              {copied ? <Check className="h-3 w-3 text-accent-success" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        {/* themed-scroll, not scrollbar-hide — long solutions were unreachable. */}
        <pre className="themed-scroll min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-fg">
          {submission?.submittedCode || "// No submission recorded"}
        </pre>
      </div>
    );
  };


  const renderColumn = (
    title: string,
    perf: PerformanceData | undefined,
    submission: Submission | undefined,
    submissions: Submission[],
    onSelect: (s: Submission) => void,
    tone: "primary" | "danger",
  ) => {
    const border = tone === "primary" ? "border-accent-primary/25" : "border-accent-danger/25";
    const accent = tone === "primary" ? "text-accent-primary" : "text-accent-danger";
    const allPassed =
      submission != null && submission.totalCases > 0 && submission.passedCase === submission.totalCases;

    return (
      <div className={`flex flex-col gap-3 rounded-card border ${border} bg-surface p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {tone === "primary" ? (
              <Trophy className="h-3.5 w-3.5 shrink-0 text-accent-warning" />
            ) : (
              <Swords className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className={`truncate font-mono text-xs font-bold uppercase tracking-widest ${accent}`}>
              {title}
            </span>
            {submission?.isBestSubmission && (
              <span className={`shrink-0 rounded-btn border ${border} ${washFor(tone)} px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${accent}`}>
                Best
              </span>
            )}
          </span>
          {submissions.length > 0 && (
            <AttemptPicker
              submissions={submissions}
              selected={submission}
              onSelect={onSelect}
              tone={tone === "primary" ? "focus:border-accent-primary" : "focus:border-accent-danger"}
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricTile icon={Clock} label="Runtime" value={formatRuntime(submission?.runtimeMs)} tone={accent} />
          <MetricTile icon={MemoryStick} label="Memory" value={formatMemory(submission?.memoryKb)} tone={accent} />
          <MetricTile
            icon={ListChecks}
            label="Cases"
            value={`${submission?.passedCase ?? 0}/${submission?.totalCases ?? 0}`}
            tone={allPassed ? "text-accent-success" : "text-accent-danger"}
          />
        </div>

        {perf && (
          <div className="flex items-center justify-between border-t border-subtle-line pt-2 text-[10px]">
            <span className="uppercase tracking-widest text-faint">Battle score</span>
            <span className={`font-mono font-bold tabular-nums ${accent}`}>{perf.score}</span>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {/* COMPARATIVE SUMMARY */}
      <div className="themed-scroll grid shrink-0 grid-cols-1 gap-3 overflow-y-auto border-b border-subtle-line bg-base/40 p-4 lg:grid-cols-2">
        {renderColumn(
          "Your submission",
          myPerf,
          selectedMySub,
          mySubmissions,
          setSelectedMySub,
          "primary",
        )}
        {renderColumn(
          `Opponent — ${oppPerf?.user?.username || "unknown"}`,
          oppPerf,
          selectedOppSub,
          oppSubmissions,
          setSelectedOppSub,
          "danger",
        )}
      </div>

      {/* SIDE BY SIDE CODE VIEW */}
      <div className="themed-scroll grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 lg:grid-cols-2">
        {renderCodePane(
          `Your code${selectedMySub?.language ? ` (${selectedMySub.language})` : ""}`,
          selectedMySub,
          "primary",
        )}
        {renderCodePane(
          `Opponent code${selectedOppSub?.language ? ` (${selectedOppSub.language})` : ""}`,
          selectedOppSub,
          "danger",
          selectedOppSub?.submittedCode ? handleCopyOpponentCode : undefined,
        )}
      </div>
    </div>
  );
};

