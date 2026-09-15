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
      className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#0b0c0e] border-b border-cyan-500/20 select-none"
      style={{ marginLeft: sidebarWidth }}
    >
      {/* LEFT ACTIONS */}
      <div className="flex items-center gap-1.5 min-w-0">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            title="Back to dashboard"
            className="flex items-center justify-center rounded-none text-slate-500 hover:text-white hover:bg-white/5 p-1.5 transition-all duration-150 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        )}

        {showFileExplorerToggle && (
          <button
            type="button"
            onClick={onToggleFileExplorer}
            title={isFileExplorerOpen ? "Hide file explorer" : "Show file explorer"}
            className="flex items-center justify-center rounded-none text-slate-500 hover:text-white hover:bg-white/5 p-1.5 transition-all duration-150 cursor-pointer"
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
          className="flex items-center justify-center rounded-none border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5 text-slate-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* FORMAT CODE */}
        <button
          type="button"
          onClick={onFormat}
          title="Format active code"
          aria-label="Format active code"
          className="flex items-center justify-center rounded-none border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5 text-slate-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <IndentationIcon className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* NOTES TOGGLE */}
        {onToggleNotes && (
          <button
            type="button"
            onClick={onToggleNotes}
            title={isNotesOpen ? "Close notes" : "Open notes"}
            className={`flex items-center justify-center rounded-none border px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              isNotesOpen
                ? "border-amber-500/60 bg-amber-950/30 text-amber-300"
                : "border-cyan-500/20 bg-transparent text-cyan-400/60"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>
        )}

        {/* CLEAR OUTPUT */}
        <button
          type="button"
          onClick={() => {}}
          title="Clear output"
          aria-label="Clear output"
          className="flex items-center justify-center rounded-none border border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Clear className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* RESET TEMPLATE */}
        {!isCompact && (
          <button
            type="button"
            onClick={onReset}
            title="Reset to original problem template"
            aria-label="Reset to original problem template"
            className="flex items-center justify-center rounded-none border border-rose-500/20 bg-rose-950/5 hover:border-rose-500/40 hover:bg-rose-950/15 text-rose-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          </button>
        )}

        {/* LANGUAGE SELECTOR */}
        <select
          className="min-w-0 rounded-none border border-cyan-500/20 bg-[#0b0c0e] px-2 py-1.5 text-[10px] font-mono text-cyan-400 outline-none transition focus:border-cyan-500/40 whitespace-nowrap cursor-pointer"
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          aria-label="Select programming language"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0b0c0e] text-cyan-400">
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
          className={`flex items-center justify-center rounded-none border border-cyan-500/40 bg-slate-800/60 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 px-4 py-1.5 text-xs font-mono font-bold tracking-wider transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {executingMode === "RUN" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <Play className="w-3.5 h-3.5 text-cyan-400" />
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
            className={`flex items-center justify-center rounded-none border border-emerald-500/30 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 hover:font-black px-4 py-1.5 text-xs font-mono font-bold tracking-wider transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(0,255,102,0.3)] ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {executingMode === "SUBMIT" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Send className="w-3.5 h-3.5 text-emerald-400" />
            )}
            {!isCompact && <span className="ml-1 text-[10px]">SUBMIT</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;
