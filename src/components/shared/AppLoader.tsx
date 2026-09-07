import { Loader2 } from "lucide-react";

type AppLoaderProps = {
  label?: string;
  compact?: boolean;
};

const AppLoader = ({ label = "Loading BRACE RCE...", compact = false }: AppLoaderProps) => {
  return (
    <div className={`flex ${compact ? "min-h-40" : "min-h-screen"} w-full items-center justify-center bg-[#02040a] px-6 text-slate-100 font-mono`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-none border border-cyan-500/40 bg-cyan-950/30 p-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">{label}</p>
      </div>
    </div>
  );
};

export default AppLoader;
