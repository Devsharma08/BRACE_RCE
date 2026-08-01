import { FileCode } from "lucide-react";

const EmptyTerminalState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600 font-mono fui-grid-bg">
      <div className="fui-brackets-box p-8 flex flex-col items-center max-w-sm text-center">
        <div className="p-4 border border-cyan-500/20 bg-cyan-950/10 mb-4 animate-pulse">
          <FileCode className="w-8 h-8 text-cyan-400" />
        </div>
        <p className="text-xs uppercase tracking-wider text-cyan-400/90 font-bold mb-2">
          SYS // TERMINAL_OFFLINE
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed uppercase">
          Select an active file template from the workspace explorer panel to initialize compiler runtime modules.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-[8px] text-slate-600 uppercase border-t border-white/5 pt-3 w-full justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-ping" />
          <span>awaiting_user_selection...</span>
        </div>
      </div>
    </div>
  );
};

export default EmptyTerminalState;
