import { Loader2 } from "lucide-react";

type LoadingOverlayProps = {
  label?: string;
};

const LoadingOverlay = ({ label = "LOADING..." }: LoadingOverlayProps) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070c]/80 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-none border border-cyan-500/30 bg-[#08090a]/95 px-4 py-3 text-xs font-mono text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        <span className="uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
