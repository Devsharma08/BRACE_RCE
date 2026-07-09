import { FileCode } from "lucide-react";

const EmptyTerminalState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
      <div className="p-6 rounded-full bg-white/5 border border-white/10">
        <FileCode className="w-12 h-12 opacity-20" />
      </div>
      <p className="text-lg font-medium">Select a file from the explorer to start coding</p>
      <p className="text-sm opacity-60">Choose a file from the sidebar on the left</p>
    </div>
  );
};

export default EmptyTerminalState;
