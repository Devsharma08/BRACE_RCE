import { Loader2 } from "lucide-react";

type LoadingOverlayProps = {
  label?: string;
};

const LoadingOverlay = ({ label = "LOADING..." }: LoadingOverlayProps) => {
  return (
    <div className="ds-overlay absolute inset-0 z-20 flex items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-btn border border-accent-primary/30 bg-surface/95 px-4 py-3 text-xs font-mono text-accent-primary shadow-glow-accent">
        <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
        <span className="uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
