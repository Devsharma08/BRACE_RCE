import React from "react";

// ─── Page Skeleton ───────────────────────────────────────────────────────────
/**
 * FULL-PAGE skeleton, for routes that own the whole viewport: ProtectedRoute,
 * AdminRoute, Login/Signup, Battle.
 *
 * Do NOT use this inside the console shell. `min-h-screen bg-void` there both
 * forces a second viewport height inside Layout's own min-h-screen (a phantom
 * scrollbar) and paints a different surface colour than the shell, so the
 * content area visibly blanks on every visit. Use ContentSkeleton instead.
 */
export const PageSkeleton = () => (
  <div className="min-h-screen bg-void p-8">
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

/**
 * CONTENT-AREA skeleton, for pages rendered inside <ConsoleShell />.
 *
 * Fills the shell's column with no extra viewport height and inherits the
 * shell's surface, so the rail and nav stay put and nothing flashes.
 */
export const ContentSkeleton = () => (
  <div className="w-full px-4 py-6 md:px-8 md:py-8" aria-busy="true" aria-live="polite">
    <div className="flex items-center justify-between mb-8">
      <SkeletonBox className="w-48 h-8" />
      <SkeletonBox className="w-32 h-8" />
    </div>
    <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
      <SkeletonBox className="h-24" />
      <SkeletonBox className="h-24" />
      <SkeletonBox className="h-24" />
      <SkeletonBox className="h-24" />
    </div>
    <SkeletonBox className="h-64" />
  </div>
);

export const RouteLoadingSkeleton = () => (
  <div className="min-h-screen bg-void flex items-center justify-center">
    <span className="text-[10px] font-mono text-accent-primary/50 uppercase tracking-[0.2em] animate-pulse">LOADING…</span>
  </div>
);

// ─── Table Skeleton ──────────────────────────────────────────────────────────
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-raised border border-accent-primary/15 p-4">
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
  <div className={`rounded-none bg-raised border border-accent-primary/10 animate-pulse ${className}`} />
);

// ─── Skeleton Surface ────────────────────────────────────────────────────────
export const SkeletonSurface = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-void ${className}`}>{children}</div>
);
