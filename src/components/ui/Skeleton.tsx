import React from "react";

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-900/80 border border-white/5 rounded ${className}`} />
);

export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#050505] p-6 md:p-12 font-mono flex flex-col gap-6 relative overflow-hidden">
    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-8 h-8 rounded-full border-cyan-500/30" />
        <SkeletonBox className="w-48 h-6" />
      </div>
      <SkeletonBox className="w-24 h-6" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonBox className="h-64 col-span-1" />
      <SkeletonBox className="h-64 col-span-2" />
    </div>
    <SkeletonBox className="h-48 w-full" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full space-y-3 font-mono">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between p-4 bg-slate-950/60 border border-white/5 rounded animate-pulse"
      >
        <div className="flex items-center gap-4">
          <SkeletonBox className="w-6 h-6 rounded-full" />
          <div className="space-y-1.5">
            <SkeletonBox className="w-44 h-4" />
            <SkeletonBox className="w-24 h-3" />
          </div>
        </div>
        <SkeletonBox className="w-20 h-6" />
      </div>
    ))}
  </div>
);

export const CardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-5 border border-cyan-500/10 bg-slate-950/50 rounded-xl space-y-3 animate-pulse">
        <div className="flex justify-between items-center">
          <SkeletonBox className="w-24 h-4" />
          <SkeletonBox className="w-6 h-6 rounded-full" />
        </div>
        <SkeletonBox className="w-16 h-8" />
        <SkeletonBox className="w-full h-2" />
      </div>
    ))}
  </div>
);
