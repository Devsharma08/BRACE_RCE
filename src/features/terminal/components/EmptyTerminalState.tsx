import { FileCode } from "lucide-react";

const EmptyTerminalState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-faint font-mono fui-grid-bg">
      <div className="fui-brackets-box p-8 flex flex-col items-center max-w-sm text-center">
        <div className="p-4 border border-accent-primary/20 bg-accent-primary/5 mb-4 animate-pulse">
          <FileCode className="w-8 h-8 text-accent-primary" />
        </div>
        <p className="text-xs uppercase tracking-wider text-accent-primary/90 font-bold mb-2">
          SYS // TERMINAL_OFFLINE
        </p>
        <p className="text-[11px] text-faint leading-relaxed uppercase">
          Select an active file template from the workspace explorer panel to initialize compiler runtime modules.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-[8px] text-faint uppercase border-t border-subtle-line pt-3 w-full justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/40 animate-ping" />
          <span>awaiting_user_selection...</span>
        </div>
      </div>
    </div>
  );
};

export default EmptyTerminalState;
