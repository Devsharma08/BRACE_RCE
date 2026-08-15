import React from "react";
import { Shield, Trophy, Activity, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface ProfileScoreCardProps {
  profile: any;
  stats: any;
  activeBattleRoom: any;
}

export const ProfileScoreCard: React.FC<ProfileScoreCardProps> = ({
  profile,
  stats,
  activeBattleRoom
}) => {
  return (
    <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-rose-500" />
      
      {/* HEADER & AVATAR */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold tracking-widest">
            <Shield className="w-4 h-4 text-cyan-500" /> OPERATIVE DOSSIER
          </div>
          <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold">
            LEVEL 14
          </span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <img 
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`} 
              alt="Avatar" 
              className="w-20 h-20 rounded-full border-2 border-cyan-500/50 p-1 shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-black"
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />
          </div>

          <div>
            <h2 className="font-mono text-xl font-bold tracking-wider text-white uppercase">
              {profile?.username || "OPERATIVE"}
            </h2>
            <p className="text-xs text-slate-500 font-mono mb-2">{profile?.email || "cyber@brace.net"}</p>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> +{stats?.totalScore || 1000} PTS
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">
                {stats?.winRate || 0}% WR
              </span>
            </div>
          </div>
        </div>

        {/* COMBAT METRICS GRID */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs mb-6">
          <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl">
            <span className="text-slate-500 block text-[10px] mb-0.5">MATCHES</span>
            <span className="text-white font-bold">{stats?.totalMatches || 0}</span>
          </div>
          <div className="bg-black/50 border border-emerald-500/20 p-2.5 rounded-xl">
            <span className="text-slate-500 block text-[10px] mb-0.5">VICTORIES</span>
            <span className="text-emerald-400 font-bold">{stats?.wins || 0}</span>
          </div>
          <div className="bg-black/50 border border-rose-500/20 p-2.5 rounded-xl">
            <span className="text-slate-500 block text-[10px] mb-0.5">DEFEATS</span>
            <span className="text-rose-400 font-bold">{stats?.losses || 0}</span>
          </div>
        </div>
      </div>

      {/* REJOIN ACTIVE BATTLE BANNER */}
      {activeBattleRoom ? (
        <Link
          to={`/battle/${activeBattleRoom.roomId}?oid=${activeBattleRoom.problemId}`}
          className="w-full py-3.5 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-mono text-xs font-bold tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
        >
          <Activity className="w-4 h-4" /> [ REJOIN ACTIVE BATTLE ]
        </Link>
      ) : (
        <div className="p-3 bg-black/40 border border-cyan-500/10 rounded-xl flex items-center justify-between font-mono text-xs text-slate-400">
          <span className="flex items-center gap-2 text-cyan-400">
            <Zap className="w-3.5 h-3.5" /> STATUS: READY FOR COMBAT
          </span>
          <span className="text-[10px] text-slate-500">IDLE</span>
        </div>
      )}
    </div>
  );
};
