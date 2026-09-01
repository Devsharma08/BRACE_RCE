import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCode,
  Loader2,
  Play,
  Send,
  RotateCcw,
  Maximize,
  StickyNote,
  Home,
  BrushCleaning as Clear,
  Indent as IndentationIcon,
  FolderTree,
} from "lucide-react";
import type { ExecutionMode, SupportedLanguage } from "../types";
import { CodeContext } from "../../../context/CodeContext.tsx";

import ProblemTimer, { type ProblemTimerRef } from "./ProblemTimer";

type EditorToolbarProps = {
  disabled: boolean;
  activeFile: string | null;
  fileName: string;
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
};

const EditorToolbar = ({
  disabled,
  activeFile,
  fileName,
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
  showSubmit = true,
  mode = "problem",
  showFileExplorerToggle = false,
  onToggleFileExplorer,
  isFileExplorerOpen = false,
  submissionTrigger = 0,
  timerRef,
  initialSubmissionTimes = [],
}: EditorToolbarProps) => {
  const navigate = useNavigate();
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error("EditorToolbar must be used inside a CodeContext.Provider");
  }

  const isLocal = activeFile && activeFile.startsWith("local-");

  const handleMaximize = () => {
    if (sidebarWidth <= 50) {
      setSidebarWidth(window.innerWidth / 3.1);
      return;
    } else {
      setSidebarWidth(50);
    }
  };

  const {
    setCode: setContextCode,
    setOutput: setContextOutput,
    setCustomInput: setContextCustomInput,
  } = context;

  const ClearChanges = () => {
    setCode("");
    setContextCode("");
    setContextOutput(null);
    setContextCustomInput("");
  };

  const handleExitClick = () => {
    if (onExit) {
      onExit();
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="editor-toolbar flex flex-col gap-2 border-b border-white/5 bg-[#0b0c0e] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* FILE EXPLORER TOGGLE BUTTON (FOR TERMINAL / PROBLEM MODES) */}
        {showFileExplorerToggle && onToggleFileExplorer && (
          <button
            type="button"
            onClick={onToggleFileExplorer}
            title={isFileExplorerOpen ? "Hide File Explorer" : "Show File Explorer"}
            className={`flex items-center justify-center border px-2 py-1 text-xs font-mono transition-all cursor-pointer ${
              isFileExplorerOpen
                ? "border-cyan-500/60 bg-cyan-950/40 text-cyan-300"
                : "border-white/10 bg-black/40 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
          </button>
        )}

        <FileCode className="w-4 h-4 text-cyan-400" />
        <input
          type="text"
          className="min-w-0 flex-1 truncate bg-transparent text-xs font-mono text-cyan-400/80 outline-none whitespace-nowrap"
          value={fileName}
          readOnly
          placeholder="ENTER_FILE..."
          aria-label="File name"
        />

        {mode === "problem" && (
          <ProblemTimer ref={timerRef} problemId={activeFile} submissionTrigger={submissionTrigger} initialSubmissionTimes={initialSubmissionTimes} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:w-auto">
        {/* NOTES BUTTON */}
        <button
          type="button"
          onClick={onToggleNotes}
          title="Toggle Global Scratchpad Notes"
          className={`flex items-center justify-center rounded-none border px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
            isNotesOpen
              ? "border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              : "border-amber-500/25 bg-amber-950/10 text-amber-400/90 hover:border-amber-500/50 hover:bg-amber-950/20 hover:text-amber-300"
          }`}
        >
          <span className="text-amber-500/40 select-none mr-1">[</span>
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
          <span className="ml-1 hidden xs:inline">NOTES</span>
          <span className="text-amber-500/40 select-none ml-1">]</span>
        </button>

        {/* EXIT TO DASHBOARD / HOME BUTTON */}
        <button
          type="button"
          onClick={handleExitClick}
          title="Exit to Dashboard / Home"
          className="flex items-center justify-center rounded-none border border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span className="text-rose-500/40 select-none mr-1">[</span>
          <Home className="w-3.5 h-3.5 text-rose-400" />
          <span className="ml-1 hidden xs:inline">EXIT</span>
          <span className="text-rose-500/40 select-none ml-1">]</span>
        </button>

        {/* MAXIMIZE MONACO PANEL */}
        <button
          type="button"
          onClick={handleMaximize}
          title="Maximize editor panel"
          className="flex items-center justify-center rounded-none border border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          <Maximize className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>

        {/* FORMAT CODE */}
        <button
          type="button"
          onClick={onFormat}
          title="Format active code"
          className="flex items-center justify-center rounded-none border border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          <IndentationIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>

        {/* CLEAR DRAFT */}
        <button
          type="button"
          onClick={() => ClearChanges()}
          title="Clear current draft"
          className="flex items-center justify-center rounded-none border border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          <Clear className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>

        {/* RESET TEMPLATE */}
        {!isLocal && (
          <button
            type="button"
            onClick={onReset}
            title="Reset to original problem template"
            className="flex items-center justify-center rounded-none border border-rose-500/20 bg-rose-950/5 hover:border-rose-500/40 hover:bg-rose-950/15 text-rose-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <span className="text-rose-500/40 select-none mr-1">[</span>
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-500/40 select-none ml-1">]</span>
          </button>
        )}

        {/* LANGUAGE SELECTOR */}
        <select
          className="min-w-0 rounded-none border border-white/10 bg-black/40 px-2 py-1.5 text-[10px] font-mono text-cyan-400 outline-none transition focus:border-cyan-500/40 whitespace-nowrap cursor-pointer"
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
        >
          <option value="javascript" className="bg-[#0b0c0e] text-cyan-400">
            JavaScript
          </option>
          <option value="python" className="bg-[#0b0c0e] text-cyan-400">
            Python
          </option>
          <option value="c++" className="bg-[#0b0c0e] text-cyan-400">
            C++
          </option>
          <option value="java" className="bg-[#0b0c0e] text-cyan-400">
            Java
          </option>
          <option value="c" className="bg-[#0b0c0e] text-cyan-400">
            C
          </option>
        </select>

        {/* RUN CODE BUTTON */}
        <button
          onClick={onRun}
          disabled={disabled}
          aria-busy={executingMode === "RUN"}
          title="Run solution (Ctrl+Enter)"
          className={`flex items-center justify-center rounded-none border border-cyan-500/30 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-950/20 hover:border-cyan-400 px-2.5 py-1.5 text-xs font-mono tracking-wider transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          {executingMode === "RUN" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <Play className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="ml-1 text-[10px]">RUN</span>
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>

        {/* SUBMIT CODE BUTTON (CONDITIONALLY RENDERED FOR BATTLE / FULL MODES) */}
        {showSubmit && onSubmit && (
          <button
            onClick={onSubmit}
            disabled={disabled}
            aria-busy={executingMode === "SUBMIT"}
            title="Submit solution for full tests validation"
            className={`flex items-center justify-center rounded-none border border-emerald-500/30 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20 hover:border-emerald-400 px-2.5 py-1.5 text-xs font-mono tracking-wider transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span className="text-emerald-500/40 select-none mr-1">[</span>
            {executingMode === "SUBMIT" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Send className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="ml-1 text-[10px]">SUBMIT</span>
            <span className="text-emerald-500/40 select-none ml-1">]</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;
