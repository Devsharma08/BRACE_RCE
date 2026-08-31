import React from "react";
import { useLocation } from "react-router-dom";

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

const SkeletonHeader: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
    <div className="flex items-center gap-3">
      <SkeletonBox className="h-8 w-8 rounded-full border-cyan-500/30" />
      <SkeletonBox className={compact ? "h-5 w-32" : "h-6 w-48"} />
    </div>
    <SkeletonBox className="h-6 w-24" />
  </div>
);

const SkeletonSurface: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`min-h-screen overflow-hidden bg-[#02040a] p-5 font-mono md:p-10 ${className}`}>
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col gap-6">{children}</div>
  </div>
);

export const HomeSkeleton: React.FC = () => (
  <SkeletonSurface>
    <SkeletonHeader />
    <div className="grid flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col justify-center gap-5">
        <SkeletonBox className="h-5 w-32" />
        <SkeletonBox className="h-16 w-full max-w-2xl" />
        <SkeletonBox className="h-16 w-4/5" />
        <div className="flex gap-3"><SkeletonBox className="h-10 w-32" /><SkeletonBox className="h-10 w-28" /></div>
      </div>
      <SkeletonBox className="min-h-72" />
    </div>
    <div className="grid gap-4 md:grid-cols-3"><SkeletonBox className="h-32" /><SkeletonBox className="h-32" /><SkeletonBox className="h-32" /></div>
  </SkeletonSurface>
);

export const AboutSkeleton: React.FC = () => (
  <SkeletonSurface>
    <SkeletonHeader compact />
    <SkeletonBox className="mx-auto h-12 w-3/4 max-w-2xl" />
    <SkeletonBox className="mx-auto h-5 w-full max-w-xl" />
    <div className="grid flex-1 gap-4 md:grid-cols-2"><SkeletonBox className="h-56" /><SkeletonBox className="h-56" /><SkeletonBox className="h-56" /><SkeletonBox className="h-56" /></div>
  </SkeletonSurface>
);

export const AuthSkeleton: React.FC = () => (
  <SkeletonSurface className="flex items-center justify-center">
    <div className="mx-auto w-full max-w-md space-y-5 border border-cyan-500/15 bg-slate-950/50 p-6 md:p-8">
      <SkeletonBox className="mx-auto h-10 w-10 rounded-full" />
      <SkeletonBox className="mx-auto h-7 w-48" />
      <SkeletonBox className="h-11 w-full" /><SkeletonBox className="h-11 w-full" />
      <SkeletonBox className="h-11 w-full" /><SkeletonBox className="mx-auto h-4 w-40" />
    </div>
  </SkeletonSurface>
);

export const DashboardSkeleton: React.FC = () => (
  <SkeletonSurface>
    <SkeletonHeader />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SkeletonBox className="h-28" /><SkeletonBox className="h-28" /><SkeletonBox className="h-28" /><SkeletonBox className="h-28" /></div>
    <div className="grid flex-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]"><SkeletonBox className="min-h-80" /><SkeletonBox className="min-h-80" /></div>
  </SkeletonSurface>
);

export const ListSkeleton: React.FC = () => (
  <SkeletonSurface>
    <SkeletonHeader compact /><SkeletonBox className="h-10 w-full max-w-xl" />
    <div className="flex flex-col gap-3"><SkeletonBox className="h-16 w-full" /><SkeletonBox className="h-16 w-full" /><SkeletonBox className="h-16 w-full" /><SkeletonBox className="h-16 w-full" /><SkeletonBox className="h-16 w-full" /></div>
  </SkeletonSurface>
);

export const DetailSkeleton: React.FC = () => (
  <SkeletonSurface>
    <SkeletonHeader compact />
    <div className="grid flex-1 gap-6 lg:grid-cols-[0.7fr_1.3fr]"><SkeletonBox className="min-h-96" /><div className="space-y-4"><SkeletonBox className="h-12 w-3/4" /><SkeletonBox className="h-5 w-full" /><SkeletonBox className="h-5 w-full" /><SkeletonBox className="h-56 w-full" /></div></div>
  </SkeletonSurface>
);

export const FormSkeleton: React.FC = () => (
  <SkeletonSurface>
    <SkeletonHeader compact /><SkeletonBox className="h-10 w-64" />
    <div className="grid gap-5 lg:grid-cols-2"><SkeletonBox className="h-12" /><SkeletonBox className="h-12" /><SkeletonBox className="h-12" /><SkeletonBox className="h-12" /><SkeletonBox className="h-48 lg:col-span-2" /><SkeletonBox className="h-12 w-36" /></div>
  </SkeletonSurface>
);

export const TerminalSkeleton: React.FC = () => (
  <div className="flex h-[100dvh] min-h-screen overflow-hidden bg-[#02040a] p-2 font-mono md:p-3">
    <SkeletonBox className="hidden h-full w-72 shrink-0 md:block" />
    <div className="flex min-w-0 flex-1 flex-col gap-2 md:pl-2"><SkeletonBox className="h-10 w-full" /><div className="flex min-h-0 flex-1 flex-col gap-2"><SkeletonBox className="min-h-0 flex-1" /><SkeletonBox className="h-40 w-full" /></div></div>
  </div>
);

export const BattleSkeleton: React.FC = () => (
  <div className="flex h-screen flex-col gap-3 overflow-hidden bg-[#050505] p-3 font-mono md:p-5"><SkeletonBox className="h-10 w-full" /><div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2"><SkeletonBox className="min-h-72" /><SkeletonBox className="min-h-72" /></div><SkeletonBox className="h-36 w-full" /></div>
);

export const LobbySkeleton: React.FC = () => (
  <SkeletonSurface><SkeletonHeader compact /><div className="mx-auto w-full max-w-3xl space-y-4"><SkeletonBox className="h-12 w-2/3" /><SkeletonBox className="h-20 w-full" /><SkeletonBox className="h-20 w-full" /><SkeletonBox className="h-12 w-36" /></div></SkeletonSurface>
);

export const WorkInProgressPage: React.FC = () => (
  <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-[#02040a] px-6 py-16 font-mono">
    <div className="w-full max-w-xl border border-cyan-500/20 bg-slate-950/60 p-8 text-center shadow-[0_0_40px_rgba(8,145,178,0.08)] md:p-12">
      <SkeletonBox className="mx-auto mb-6 h-16 w-16 rounded-full border-cyan-500/30" />
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">MODULE // LOBBY</p>
      <h1 className="mb-4 text-2xl font-bold uppercase tracking-widest text-white md:text-3xl">Work in progress</h1>
      <p className="text-sm leading-relaxed text-slate-400">The lobby experience is being prepared for a future release.</p>
    </div>
  </div>
);

export const RouteLoadingSkeleton: React.FC = () => {
  const { pathname } = useLocation();

  if (pathname === "/terminal") return <TerminalSkeleton />;
  if (pathname.includes("/battle")) return <BattleSkeleton />;
  if (pathname === "/signin" || pathname === "/signup") return <AuthSkeleton />;
  if (pathname === "/about") return <AboutSkeleton />;
  if (pathname === "/ds" || pathname.startsWith("/ds/")) return <DetailSkeleton />;
  if (pathname === "/dashboard" || pathname === "/friends" || pathname === "/profile") return <DashboardSkeleton />;
  if (pathname === "/problems") return <ListSkeleton />;
  if (pathname === "/rooms/create") return <FormSkeleton />;
  if (pathname === "/lobby") return <LobbySkeleton />;
  return <HomeSkeleton />;
};

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
