import { Loader2 } from "lucide-react";

type AppLoaderProps = {
  label?: string;
  compact?: boolean;
};

const AppLoader = ({ label = "Loading BRACE RCE...", compact = false }: AppLoaderProps) => {
  return (
    <div className={`flex ${compact ? "min-h-40" : "min-h-screen"} w-full items-center justify-center bg-base px-6 text-fg font-mono`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-none border border-accent-primary/40 bg-accent-primary/10 p-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent-primary">{label}</p>
      </div>
    </div>
  );
};

export default AppLoader;
