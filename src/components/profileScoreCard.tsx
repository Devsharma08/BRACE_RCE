import React from "react";
import { Shield, Trophy, Activity, Zap, TrendingUp, Target } from "lucide-react";
import { Link } from "react-router-dom";

interface ProfileScoreCardProps {
  profile: any;
  stats: any;
  activeBattleRoom: any;
}

export const ProfileScoreCard: React.FC<ProfileScoreCardProps> = ({
  profile,
  stats,
  activeBattleRoom,
}) => {
  const winRate = stats?.winRate || 0;
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const totalMatches = stats?.totalMatches || 0;
  const score = stats?.totalScore || 0;

  // Derive rank from score
  const rank =
    score >= 10000 ? "APEX ARCHITECT"
    : score >= 5000 ? "MAINFRAME ELITE"
    : score >= 2000 ? "CYBER OPERATIVE"
    : score >= 500  ? "INITIATE"
    : "RECRUIT";

  const rankColor =
    score >= 10000 ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : score >= 5000 ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10"
    : score >= 2000 ? "text-purple-400 border-purple-500/40 bg-purple-500/10"
    : score >= 500  ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    : "text-slate-400 border-slate-600/40 bg-slate-500/10";

  const nextLevelScore = score >= 10000 ? 15000 : score >= 5000 ? 10000 : score >= 2000 ? 5000 : score >= 500 ? 2000 : 500;
  const prevLevelScore = score >= 10000 ? 10000 : score >= 5000 ? 5000 : score >= 2000 ? 2000 : score >= 500 ? 500 : 0;
  const xpProgress = Math.round(((score - prevLevelScore) / (nextLevelScore - prevLevelScore)) * 100);

  return (
    <div className="relative bg-[#080a0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl">
      {/* TOP ACCENT BAR */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cyan-950/20 to-transparent pointer-events-none" />

      <div className="p-5 flex flex-col gap-5 flex-1">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-500/70 font-bold tracking-[0.25em] uppercase">
            <Shield className="w-3.5 h-3.5" />
            Operative Dossier
          </div>
          <span className={`text-[9px] px-2.5 py-1 rounded-full border font-mono font-black tracking-wider ${rankColor}`}>
            {rank}
          </span>
        </div>

        {/* AVATAR + USERNAME */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-[72px] h-[72px] rounded-full p-[2px] bg-gradient-to-br from-cyan-500 via-purple-600 to-rose-500">
              <img
                src={
                  profile?.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || "user"}`
                }
                alt="Avatar"
                className="w-full h-full rounded-full bg-black object-cover"
              />
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-mono text-base font-black tracking-wider text-white uppercase truncate">
              {profile?.username || "OPERATIVE"}
            </h2>
            <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
              {profile?.email || "cyber@brace.net"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-amber-400 font-mono text-xs font-black flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> {score.toLocaleString()} PTS
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-emerald-400 font-mono text-xs font-black">
                {winRate}% WR
              </span>
            </div>
          </div>
        </div>

        {/* XP PROGRESS BAR */}
        <div>
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1.5">
            <span>XP TO NEXT RANK</span>
            <span className="text-cyan-400">{xpProgress}%</span>
          </div>
          <div className="h-1.5 bg-black/60 rounded-full border border-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* STAT GRID */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "BATTLES", value: totalMatches, color: "text-slate-200" },
            { label: "WINS", value: wins, color: "text-emerald-400" },
            { label: "LOSSES", value: losses, color: "text-rose-400" },
          ].map((s) => (
            <div key={s.label} className="bg-black/50 border border-white/[0.05] rounded-xl py-3 px-2 text-center">
              <span className={`block font-mono text-base font-black ${s.color}`}>{s.value}</span>
              <span className="block font-mono text-[9px] text-slate-600 tracking-widest mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* WIN RATE BAR */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-mono text-slate-600">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> WIN RATE TREND</span>
            <span className="text-emerald-400">{wins}W / {losses}L</span>
          </div>
          <div className="h-2 bg-rose-950/50 rounded-full overflow-hidden border border-white/[0.03]">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>

        {/* PROFILE LINK */}
        <Link
          to="/profile"
          className="text-[10px] font-mono text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1.5 mt-auto"
        >
          <Target className="w-3 h-3" /> VIEW FULL PROFILE & HISTORY
        </Link>
      </div>

      {/* BOTTOM: ACTIVE BATTLE OR STATUS */}
      <div className="px-5 pb-5">
        {activeBattleRoom ? (
          <Link
            to={`/battle/${activeBattleRoom.roomId}?oid=${activeBattleRoom.problemId}`}
            className="w-full py-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-black tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse"
          >
            <Activity className="w-4 h-4" /> REJOIN ACTIVE BATTLE
          </Link>
        ) : (
          <div className="py-2.5 px-4 bg-black/40 border border-white/[0.04] rounded-xl flex items-center justify-between font-mono text-[11px]">
            <span className="text-cyan-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> READY FOR COMBAT
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};
