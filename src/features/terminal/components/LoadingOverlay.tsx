import { Loader2 } from "lucide-react";

const LoadingOverlay = () => {
  return (
    <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" />
    </div>
  );
};

export default LoadingOverlay;
