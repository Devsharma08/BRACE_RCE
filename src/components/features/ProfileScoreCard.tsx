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
    <div className="relative border border-accent-primary/15 bg-raised flex flex-col h-full shadow-lg shadow-accent-primary/10">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-primary" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent-primary" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent-primary" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-primary" />

      <div className="p-6 flex flex-col gap-5 flex-1 font-mono">
        {/* HEADER LABEL */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] text-accent-primary font-bold tracking-[0.25em] uppercase">
            <Shield className="w-3.5 h-3.5" /> OPERATIVE DOSSIER
          </span>
          <span className="text-[9px] font-mono font-black border border-accent-primary/40 bg-accent-primary/10 text-accent-primary px-2 py-0.5 uppercase tracking-[0.15em] shadow-sm">
            {rank}
          </span>
        </div>

        {/* AVATAR + NAME */}
        <div className="flex items-center gap-4 border-b border-accent-primary/10 pb-5">
          <div className="relative shrink-0">
            <img
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || "user"}`}
              alt="Avatar"
              className="w-16 h-16 border-2 border-accent-primary/40 bg-black object-cover shadow-md shadow-accent-primary/30"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent-success border-2 border-black rounded-full" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-base font-black text-fg uppercase tracking-wider truncate">
              {profile?.username || "OPERATIVE"}
            </h2>
            <p className="text-[10px] text-subtle mt-0.5 truncate">{profile?.email || "—"}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-accent-warning font-black text-xs flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> {score.toLocaleString()} PTS
              </span>
              <span className="text-faint">·</span>
              <span className="text-accent-success font-black text-[11px]">{winRate}% WR</span>
            </div>
          </div>
        </div>

        {/* XP BAR */}
        <div>
          <div className="flex justify-between text-[9px] text-subtle mb-1.5">
            <span>XP TO NEXT RANK</span>
            <span className="text-accent-primary font-bold">{xp}%</span>
          </div>
          <div className="h-1.5 bg-base border border-accent-primary/20 overflow-hidden">
            <div className="h-full bg-accent-primary transition-all duration-500 shadow-[0_0_8px_rgba(0,212,255,0.4)]" style={{ width: `${xp}%` }} />
          </div>
        </div>

        {/* STATS HIGHLIGHT */}
        <div className="grid grid-cols-3 gap-2 text-center my-1">
          {[
            { label: "BATTLES", val: totalMatches, cls: "text-fg border-subtle-line bg-surface-hover" },
            { label: "WINS",    val: wins,         cls: "text-accent-success border-accent-success/20 bg-accent-success/5" },
            { label: "LOSSES",  val: losses,       cls: "text-accent-danger border-accent-danger/20 bg-accent-danger/5" },
          ].map((s) => (
            <div key={s.label} className={`border py-3 px-2 ${s.cls}`}>
              <span className="block font-black text-base leading-tight">{s.val}</span>
              <span className="block text-[8px] text-subtle tracking-widest mt-1 uppercase">{s.label}</span>
            </div>
          ))}
        </div>

        {/* WIN RATE BAR */}
        <div>
          <div className="flex justify-between text-[9px] text-subtle mb-1.5">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-accent-success" /> WIN RATE</span>
            <span className="font-bold text-subtle">{wins}W / {losses}L</span>
          </div>
          <div className="h-1.5 bg-accent-danger/10 border border-accent-danger/20 overflow-hidden">
            <div className="h-full bg-accent-success transition-all duration-500 shadow-sm shadow-accent-success/30" style={{ width: `${winRate}%` }} />
          </div>
        </div>

        <Link
          to="/profile"
          className="text-xs font-bold text-accent-primary hover:text-accent-primary transition-colors tracking-wider uppercase mt-auto pt-3 flex items-center justify-between border-t border-accent-primary/15 group"
        >
          <span>[ VIEW FULL OPERATIVE DOSSIER ]</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>

      {/* BOTTOM CTA */}
      <div className="px-6 pb-6 font-mono">
        {activeBattleRoom ? (
          <Link
            to={`/battle/${activeBattleRoom.roomId}?oid=${activeBattleRoom.problemId}`}
            className="w-full py-3.5 border border-accent-success/50 bg-accent-success/10 hover:bg-accent-success/20 text-accent-success text-xs font-black tracking-widest transition-all flex items-center justify-center gap-2 animate-pulse shadow-lg shadow-accent-success/30"
          >
            <Activity className="w-4 h-4" /> REJOIN ACTIVE BATTLE
          </Link>
        ) : (
          <div className="py-3 px-4 border border-accent-primary/30 bg-accent-primary/10 flex items-center justify-between text-xs font-semibold">
            <span className="text-accent-primary flex items-center gap-2 font-bold"><Zap className="w-4 h-4 text-accent-warning fill-accent-warning" /> READY FOR COMBAT</span>
            <span className="w-2.5 h-2.5 bg-accent-success rounded-full animate-ping" />
          </div>
        )}
      </div>
    </div>
  );
};
