import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Play,
  Send,
  RotateCcw,
  Maximize,
  StickyNote,
  Home,
  Copy,
  Check,
  BrushCleaning as Clear,
  Indent as IndentationIcon,
  FolderTree,
} from "lucide-react";
import type { ExecutionMode, SupportedLanguage } from "../types";
import { CodeContext } from "../../../context/CodeContext.tsx";
import { toast } from "sonner";

import ProblemTimer, { type ProblemTimerRef } from "./ProblemTimer";

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; shortLabel: string }[] = [
  { value: "javascript", label: "JavaScript", shortLabel: "JS" },
  { value: "python", label: "Python", shortLabel: "PY" },
  { value: "c++", label: "C++", shortLabel: "C++" },
  { value: "java", label: "Java", shortLabel: "JAVA" },
  { value: "c", label: "C", shortLabel: "C" },
  { value: "c11", label: "C11", shortLabel: "C11" },
];

type EditorToolbarProps = {
  disabled: boolean;
  activeFile: string | null;
  fileName?: string;
  language: SupportedLanguage;
  executingMode: ExecutionMode | null;
  setLanguage: (language: SupportedLanguage) => void;
  setCode: (code: string) => void;
  onRun: () => void;
  onSubmit?: () => void;
  onFormat: () => void;
  onReset: () => void;
  onClearOutput?: () => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  onToggleNotes?: () => void;
  isNotesOpen?: boolean;
  onExit?: () => void;
  showSubmit?: boolean;
  mode?: "terminal" | "problem" | "battle";
  showFileExplorerToggle?: boolean;
  onToggleFileExplorer?: () => void;
  isFileExplorerOpen?: boolean;
  submissionTrigger?: number;
  timerRef?: React.RefObject<ProblemTimerRef | null>;
  initialSubmissionTimes?: string[];
  problemId?: string | null;
  code: string;
};

const EditorToolbar = ({
  disabled,
  activeFile,
  onRun,
  onSubmit,
  onFormat,
  onReset,
  onClearOutput,
  language,
  executingMode,
  setLanguage,
  setCode,
  sidebarWidth,
  setSidebarWidth,
  onToggleNotes,
  isNotesOpen = false,
  onExit,
  code,
  showSubmit = true,
  mode = "problem",
  showFileExplorerToggle = false,
  onToggleFileExplorer,
  isFileExplorerOpen = false,
  submissionTrigger = 0,
  timerRef,
  initialSubmissionTimes = [],
  problemId = null,
}: EditorToolbarProps) => {
  const navigate = useNavigate();
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error("EditorToolbar must be used inside a CodeContext.Provider");
  }

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
        copyResetTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => {
        setIsCompact(window.innerWidth < 640);
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < 640);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="flex items-center justify-between gap-2 border-b border-subtle-line bg-surface px-3 py-1.5 select-none"
    >
      {/* LEFT ACTIONS */}
      <div className="flex items-center gap-1.5 min-w-0">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            title="Back to dashboard"
            className="flex items-center justify-center rounded-btn p-1.5 text-subtle transition-all duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        )}

        {showFileExplorerToggle && (
          <button
            type="button"
            onClick={onToggleFileExplorer}
            title={isFileExplorerOpen ? "Hide file explorer" : "Show file explorer"}
            className="flex items-center justify-center rounded-btn p-1.5 text-subtle transition-all duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <FolderTree className="w-3.5 h-3.5" />
          </button>
        )}

        <ProblemTimer
          problemId={problemId}
          submissionTrigger={submissionTrigger}
          initialSubmissionTimes={initialSubmissionTimes}
          ref={timerRef}
        />
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {/* COPY CODE */}
        <button
          type="button"
          onClick={handleCopyCode}
          title="Copy code to clipboard"
          aria-label={copied ? "Code copied to clipboard" : "Copy code to clipboard"}
          className="flex items-center justify-center rounded-btn border border-subtle-line bg-base/50 px-2 py-1.5 text-xs font-mono text-subtle transition-all duration-150 hover:border-border-hi hover:bg-surface-hover active:scale-95"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-accent-success" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-subtle" />
          )}
        </button>

        {/* FORMAT CODE */}
        <button
          type="button"
          onClick={onFormat}
          title="Format active code"
          aria-label="Format active code"
          className="flex items-center justify-center rounded-btn border border-subtle-line bg-base/50 px-2 py-1.5 text-xs font-mono text-subtle transition-all duration-150 hover:border-border-hi hover:bg-surface-hover active:scale-95"
        >
          <IndentationIcon className="w-3.5 h-3.5 text-subtle" />
        </button>

        {/* NOTES TOGGLE */}
        {onToggleNotes && (
          <button
            type="button"
            onClick={onToggleNotes}
            title={isNotesOpen ? "Close notes" : "Open notes"}
            className={`flex items-center justify-center rounded-none border px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              isNotesOpen
                ? "border-accent-warning/60 bg-accent-warning/10 text-accent-warning"
                : "border-accent-primary/20 bg-transparent text-accent-primary/60"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>
        )}

        {/* CLEAR OUTPUT */}
        <button
          type="button"
          onClick={onClearOutput}
          title="Clear output"
          aria-label="Clear output"
          className="flex items-center justify-center rounded-btn border border-accent-primary/40 px-2 py-1.5 text-xs font-mono text-accent-primary transition-all duration-150 hover:bg-accent-primary/10 active:scale-95"
        >
          <Clear className="w-3.5 h-3.5 text-accent-primary" />
        </button>

        {/* RESET TEMPLATE */}
        {!isCompact && (
          <button
            type="button"
            onClick={onReset}
            title="Reset to original problem template"
            aria-label="Reset to original problem template"
            className="flex items-center justify-center rounded-btn border border-accent-danger/20 bg-accent-danger/5 px-2 py-1.5 text-xs font-mono text-accent-danger transition-all duration-150 hover:border-accent-danger/40 hover:bg-accent-danger/10 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent-danger" />
          </button>
        )}

        {/* LANGUAGE SELECTOR */}
        <select
          className="min-w-0 rounded-btn border border-accent-primary/20 bg-surface px-2 py-1.5 text-[10px] font-mono text-accent-primary outline-none transition focus:border-accent-primary/40"
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          aria-label="Select programming language"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-accent-primary">
              {isCompact ? opt.shortLabel : opt.label}
            </option>
          ))}
        </select>

        {/* RUN CODE BUTTON */}
        <button
          onClick={onRun}
          disabled={disabled}
          aria-busy={executingMode === "RUN"}
          title="Run solution (Ctrl+Enter)"
          aria-label="Run solution"
          className={`flex items-center justify-center rounded-btn border border-accent-primary/40 bg-elevated px-4 py-1.5 text-xs font-mono font-bold tracking-wider text-accent-primary transition-all duration-150 hover:border-accent-primary hover:bg-accent-primary/10 active:scale-95 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {executingMode === "RUN" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-primary" />
          ) : (
            <Play className="w-3.5 h-3.5 text-accent-primary" />
          )}
          {!isCompact && <span className="ml-1 text-[10px]">RUN</span>}
        </button>

        {/* SUBMIT CODE BUTTON */}
        {showSubmit && onSubmit && (
          <button
            onClick={onSubmit}
            disabled={disabled}
            aria-busy={executingMode === "SUBMIT"}
            title="Submit solution for full tests validation"
            aria-label="Submit solution"
            className={`flex items-center justify-center rounded-btn border border-accent-success/30 bg-accent-success/10 px-4 py-1.5 text-xs font-mono font-bold tracking-wider text-accent-success transition-all duration-150 hover:bg-accent-success hover:text-ink hover:font-black active:scale-95 shadow-glow-success ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {executingMode === "SUBMIT" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-success" />
            ) : (
              <Send className="w-3.5 h-3.5 text-accent-success" />
            )}
            {!isCompact && <span className="ml-1 text-[10px]">SUBMIT</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;
