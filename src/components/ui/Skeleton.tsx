import React from "react";

// ─── Page Skeleton ───────────────────────────────────────────────────────────
export const PageSkeleton = () => (
  <div className="min-h-screen bg-[#050811] p-8">
    <div className="flex items-center justify-between mb-8">
      <SkeletonBox className="w-48 h-8" />
      <SkeletonBox className="w-32 h-8" />
    </div>
    <div className="grid grid-cols-4 gap-4 mb-8">
      <SkeletonBox className="h-24" />
      <SkeletonBox className="h-24" />
      <SkeletonBox className="h-24" />
      <SkeletonBox className="h-24" />
    </div>
    <SkeletonBox className="h-64" />
  </div>
);

// ─── Table Skeleton ──────────────────────────────────────────────────────────
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-[#050811] border border-white/10 p-4">
    <SkeletonBox className="w-48 h-6 mb-4" />
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBox key={i} className="h-12" />
      ))}
    </div>
  </div>
);

// ─── Card Skeleton Grid ──────────────────────────────────────────────────────
export const CardSkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonBox key={i} className="h-40" />
    ))}
  </div>
);

// ─── Generic Skeleton Box ────────────────────────────────────────────────────
export const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-none bg-[#0b1021] border border-cyan-500/10 animate-pulse ${className}`} />
);

// ─── Skeleton Surface ────────────────────────────────────────────────────────
export const SkeletonSurface = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[#050811] ${className}`}>{children}</div>
);
