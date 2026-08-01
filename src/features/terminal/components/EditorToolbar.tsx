import { useContext } from "react";
import { FileCode, Loader2, Play, Send, RotateCcw, Maximize } from "lucide-react";
import type { ExecutionMode, SupportedLanguage } from "../types";
import { CodeContext } from "../../../context/codeContext.tsx";
import {BrushCleaning as Clear,Indent as IndentationIcon} from 'lucide-react'


type EditorToolbarProps = {
  disabled: boolean;
  activeFile: string | null;
  fileName: string;
  language: SupportedLanguage;
  executingMode: ExecutionMode | null;
  setLanguage: (language: SupportedLanguage) => void;
  setCode: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  onFormat: () => void;
  onReset: () => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

const EditorToolbar = ({ disabled, activeFile, fileName, onRun, onSubmit, onFormat, onReset, language, executingMode, setLanguage, setCode, sidebarWidth, setSidebarWidth }: EditorToolbarProps) => {
  
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error("EditorToolbar must be used inside a CodeContext.Provider");
  }

  const isLocal = activeFile && activeFile.startsWith("local-");

  const handleMaximize = () => {
    if(sidebarWidth <= 50) {
      setSidebarWidth(window.innerWidth/3.1);
      return;
    }else{
      setSidebarWidth(50);
    }
  }
 
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
   }

  return (
    <div className="editor-toolbar flex flex-col gap-2 border-b border-white/5 bg-[#0b0c0e] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <FileCode className="w-4 h-4 text-cyan-400" />
        <input
          type="text"
          className="min-w-0 flex-1 truncate bg-transparent text-xs font-mono text-cyan-400/80 outline-none whitespace-nowrap"
          value={fileName}
          readOnly
          placeholder="ENTER_FILE..."
          aria-label="File name"
        />
      </div>

      <div className="grid w-full grid-cols-5 items-center gap-1 sm:flex sm:w-auto">
        {/* maximize monaco panel */}
        <button type="button" onClick={handleMaximize} title="Maximize editor panel" className="flex items-center justify-center rounded-none border border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap">
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          <Maximize className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>
        <button type="button" onClick={onFormat} title="Format active code" className="flex items-center justify-center rounded-none border border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap">
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          <IndentationIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>
        <button type="button" onClick={() => ClearChanges()} title="Clear current draft" className="flex items-center justify-center rounded-none border border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-500/40 hover:bg-cyan-950/15 text-cyan-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap">
          <span className="text-cyan-500/40 select-none mr-1">[</span>
          <Clear className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>
        {!isLocal && (
          <button type="button" onClick={onReset} title="Reset to original problem template" className="flex items-center justify-center rounded-none border border-rose-500/20 bg-rose-950/5 hover:border-rose-500/40 hover:bg-rose-950/15 text-rose-400 px-2 py-1.5 text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap">
            <span className="text-rose-500/40 select-none mr-1">[</span>
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-500/40 select-none ml-1">]</span>
          </button>
        )}
        <select className="min-w-0 rounded-none border border-white/10 bg-black/40 px-1 py-1.5 text-[10px] font-mono text-cyan-400 outline-none transition focus:border-cyan-500/40 whitespace-nowrap" value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}>
          <option value="javascript" className="whitespace-nowrap">JS</option>
          <option value="java" className="whitespace-nowrap">JV</option>
        </select>
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
          {executingMode === "RUN" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
          <span className="text-cyan-500/40 select-none ml-1">]</span>
        </button>

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
          {executingMode === "SUBMIT" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Send className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="text-emerald-500/40 select-none ml-1">]</span>
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
