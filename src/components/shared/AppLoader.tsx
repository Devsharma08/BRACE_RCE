import { Loader2 } from "lucide-react";

type AppLoaderProps = {
  label?: string;
  compact?: boolean;
};

const AppLoader = ({ label = "Loading DSAHub...", compact = false }: AppLoaderProps) => {
  return (
    <div className={`flex ${compact ? "min-h-40" : "min-h-screen"} w-full items-center justify-center bg-darkbg px-6 text-textwhite`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full border border-indigo-400/30 bg-indigo-500/10 p-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
        </div>
        <p className="text-sm font-medium text-textdimwhite">{label}</p>
      </div>
    </div>
  );
};

export default AppLoader;
