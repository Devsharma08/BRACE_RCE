import React from "react";
import { Shield, Trophy, Activity, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface ProfileScoreCardProps {
  profile: any;
  stats: any;
  activeBattleRoom: any;
}

export const ProfileScoreCard: React.FC<ProfileScoreCardProps> = ({ profile, stats, activeBattleRoom }) => {
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const totalMatches = stats?.totalMatches || 0;
  const score = stats?.totalScore || 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  const rank =
    score >= 10000 ? "APEX ARCHITECT"
    : score >= 5000 ? "MAINFRAME ELITE"
    : score >= 2000 ? "CYBER OPERATIVE"
    : score >= 500  ? "INITIATE"
    : "RECRUIT";

  const nextThreshold = score >= 10000 ? 15000 : score >= 5000 ? 10000 : score >= 2000 ? 5000 : score >= 500 ? 2000 : 500;
  const prevThreshold = score >= 10000 ? 10000 : score >= 5000 ? 5000 : score >= 2000 ? 2000 : score >= 500 ? 500 : 0;
  const xp = Math.min(100, Math.round(((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100));

  return (
    <div className="relative border border-white/5 bg-black/40 flex flex-col h-full">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/25" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/25" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/25" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/25" />

      <div className="p-6 flex flex-col gap-5 flex-1">
        {/* HEADER LABEL */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold tracking-[0.25em] uppercase">
            <Shield className="w-3 h-3" /> OPERATIVE DOSSIER
          </span>
          <span className="text-[9px] border border-cyan-500/20 bg-cyan-950/10 text-cyan-400 px-2 py-0.5 uppercase tracking-widest font-bold">
            {rank}
          </span>
        </div>

        {/* AVATAR + NAME */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || "user"}`}
              alt="Avatar"
              className="w-16 h-16 border border-cyan-500/30 bg-black object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black" />
          </div>
          <div>
            <h2 className="font-mono text-sm font-black text-white uppercase tracking-wider">
              {profile?.username || "OPERATIVE"}
            </h2>
            <p className="text-[10px] text-slate-600 mt-0.5 truncate">{profile?.email || "—"}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-amber-400 font-black text-xs flex items-center gap-1">
                <Trophy className="w-3 h-3" /> {score.toLocaleString()} PTS
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-emerald-400 font-black text-[11px]">{winRate}% WR</span>
            </div>
          </div>
        </div>

        {/* XP BAR */}
        <div>
          <div className="flex justify-between text-[9px] text-slate-600 font-mono mb-1">
            <span>XP TO NEXT RANK</span><span className="text-cyan-500">{xp}%</span>
          </div>
          <div className="h-1 bg-white/5 border border-white/[0.04]">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${xp}%` }} />
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "BATTLES", val: totalMatches, cls: "text-white" },
            { label: "WINS",    val: wins,         cls: "text-emerald-400" },
            { label: "LOSSES",  val: losses,       cls: "text-rose-400" },
          ].map((s) => (
            <div key={s.label} className="border border-white/5 bg-black/30 py-3 px-2">
              <span className={`block font-black text-base ${s.cls}`}>{s.val}</span>
              <span className="block text-[9px] text-slate-600 tracking-widest mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* WIN RATE BAR */}
        <div>
          <div className="flex justify-between text-[9px] text-slate-600 mb-1">
            <span className="flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5" /> WIN RATE</span>
            <span>{wins}W / {losses}L</span>
          </div>
          <div className="h-1.5 bg-rose-950/40">
            <div className="h-full bg-emerald-500" style={{ width: `${winRate}%` }} />
          </div>
        </div>

        <Link to="/profile" className="text-[9px] text-slate-600 hover:text-cyan-400 transition-colors tracking-widest uppercase mt-auto">
          [ VIEW FULL PROFILE ]
        </Link>
      </div>

      {/* BOTTOM CTA */}
      <div className="px-6 pb-6">
        {activeBattleRoom ? (
          <Link
            to={`/battle/${activeBattleRoom.roomId}?oid=${activeBattleRoom.problemId}`}
            className="w-full py-2.5 border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-mono text-[11px] font-black tracking-widest transition-all flex items-center justify-center gap-2 animate-pulse"
          >
            <Activity className="w-3.5 h-3.5" /> REJOIN ACTIVE BATTLE
          </Link>
        ) : (
          <div className="py-2 px-4 border border-white/5 bg-black/20 flex items-center justify-between text-[10px] font-mono">
            <span className="text-cyan-400 flex items-center gap-1.5"><Zap className="w-3 h-3" /> READY FOR COMBAT</span>
            <span className="w-2 h-2 bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};
