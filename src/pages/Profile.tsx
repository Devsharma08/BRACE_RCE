import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useAnalytics } from "../hooks/useAnalytics";
import DashboardSidebar from "../components/layout/DashboardSidebar";
import { AnalyticsPanels } from "../components/features/AnalyticsPanels";
import { AnalyticsErrorBoundary } from "../components/features/AnalyticsErrorBoundary";
import { api } from "../config/api";
import { useMyRating } from "../hooks/useLeaderboard";
import { Activity, BarChart2, Trophy } from "lucide-react";

export const Profile = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(Boolean(isAuthenticated || user));
  const { data: myRating } = useMyRating(Boolean(isAuthenticated || user));

  const { data: profileData } = useQuery({
    queryKey: ["profile-data", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const res = await api.get("/profile");
      return res.data?.data || null;
    },
  });

  const profile = profileData || null;

  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated && !user) return <Link to="/signin" />;

  return (
    <div className="flex min-h-screen bg-[#050811] text-slate-100 font-mono relative overflow-x-hidden">
      <DashboardSidebar rating={myRating?.rating} />
      <main className="flex-1 ml-0 md:ml-[60px] lg:ml-[245px] w-full relative pt-16 p-4 md:p-8 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(rgba(0,243,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] -z-10" />

      {/* IDENTITY CARD */}
      <div className="mb-8 border-t border-t-cyan-400/50 border border-white/8 bg-[#0c0f18] p-6 shadow-[0_-4px_20px_rgba(0,243,255,0.1)]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#111520] border border-white/8 flex items-center justify-center">
            <span className="text-lg font-mono font-bold text-[#00D4FF]">{(profile?.username || "?").slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Profile</h1>
            <p className="text-xs text-[#8892A4]">{profile?.email || user?.username || "Operative"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-base font-black font-mono text-cyan-400">{myRating?.totalMatches ?? "--"}</div>
            <div className="text-[9px] text-[#3D4657] uppercase tracking-widest">Battles</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-cyan-400">{myRating?.winRate ? `${Math.round(myRating.winRate)}%` : "--"}</div>
            <div className="text-[9px] text-[#3D4657] uppercase tracking-widest">Win Rate</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-cyan-400">{myRating?.rating ?? "--"}</div>
            <div className="text-[9px] text-[#3D4657] uppercase tracking-widest">Score</div>
          </div>
        </div>
      </div>

      {/* BATTLE HISTORY */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-cyan-500/50" />
          <span className="text-[11px] text-[#8892A4] font-mono font-bold uppercase tracking-widest">Battle history</span>
          <hr className="flex-1 border-white/6" />
        </div>
        <div className="border-t border-t-[#00D4FF]/40 border border-white/8 bg-[#0c0f18] p-6">
          <p className="text-xs text-[#8892A4]">No match history yet. <Link to="/lobby" className="text-[#00D4FF]">Enter lobby →</Link></p>
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-cyan-500/50" />
          <span className="text-[11px] text-[#8892A4] font-mono font-bold uppercase tracking-widest">Analytics</span>
          <hr className="flex-1 border-white/6" />
        </div>
        <AnalyticsErrorBoundary>
          <AnalyticsPanels />
        </AnalyticsErrorBoundary>
      </div>

      {/* LOGOUT */}
      <button
        onClick={logout}
        className="text-xs text-[#FF3B5C] border border-[#FF3B5C]/25 px-4 py-2 hover:bg-[#FF3B5C]/7 transition-all"
      >
        Sign out
      </button>
      </main>
    </div>
  );
};
