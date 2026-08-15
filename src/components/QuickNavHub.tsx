import React, { useState } from "react";
import { Swords, Users, UserPlus, Play, Lock, Sparkles, Activity } from "lucide-react";

interface QuickNavHubProps {
  onFindMatch: (difficulty: string) => void;
  matchmakingStatus: string;
  onCancelMatch: () => void;
  onCreateCustomRoom: () => void;
  onJoinCustomRoom: (code: string) => void;
  waitingTime: number;
}

export const QuickNavHub: React.FC<QuickNavHubProps> = ({
  onFindMatch,
  matchmakingStatus,
  onCancelMatch,
  onCreateCustomRoom,
  onJoinCustomRoom,
  waitingTime
}) => {
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="bg-[#0a0b0e] border border-cyan-500/20 rounded-2xl p-6 shadow-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold tracking-widest">
            <Sparkles className="w-4 h-4 text-cyan-400" /> QUICK ENGAGEMENT HUB
          </div>
          <span className="text-[10px] text-slate-500 font-mono">SELECT OPERATIONAL MODE</span>
        </div>

        {/* 4 QUICK LAUNCH CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* 1. INSTANT 1V1 PVP */}
          <div className="bg-black/60 border border-cyan-500/30 hover:border-cyan-400 rounded-xl p-4 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-cyan-400 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-rose-500" /> 1V1 PVP ARENA
                </span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={matchmakingStatus !== "IDLE"}
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ANY">ANY</option>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
                Instant ranked 1v1 battle against peer operatives.
              </p>
            </div>

            {matchmakingStatus === "SEARCHING" ? (
              <button
                onClick={onCancelMatch}
                className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 animate-pulse"
              >
                <Activity className="w-3.5 h-3.5" /> CANCEL QUEUE ({waitingTime}s)
              </button>
            ) : (
              <button
                onClick={() => onFindMatch(difficulty)}
                className="w-full py-2.5 bg-cyan-950/40 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-200 hover:text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> [ LAUNCH MATCH ]
              </button>
            )}
          </div>

          {/* 2. CUSTOM ROOM HUB */}
          <div className="bg-black/60 border border-amber-500/30 hover:border-amber-400 rounded-xl p-4 transition-all flex flex-col justify-between">
            <div>
              <span className="font-mono text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" /> CUSTOM ROOMS
              </span>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed font-sans">
                Create custom lobby or join private code.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCreateCustomRoom}
                className="flex-1 py-2 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/40 text-amber-200 hover:text-white font-mono text-[11px] font-bold rounded-lg transition-all text-center"
              >
                + CREATE
              </button>
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  placeholder="CODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-16 bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-1 font-mono rounded text-center uppercase focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={() => joinCode && onJoinCustomRoom(joinCode)}
                  className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-bold rounded transition-all"
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>

          {/* 3. FRIEND CHALLENGE */}
          <div className="bg-black/60 border border-emerald-500/30 hover:border-emerald-400 rounded-xl p-4 transition-all flex flex-col justify-between">
            <div>
              <span className="font-mono text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4" /> FRIEND CHALLENGE
              </span>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed font-sans">
                Challenge active squad members directly.
              </p>
            </div>
            <button className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white font-mono text-xs font-bold rounded-lg transition-all">
              [ OPEN SQUAD PANEL ]
            </button>
          </div>

          {/* 4. SOLO PRACTICE SANDBOX */}
          <div className="bg-black/60 border border-purple-500/30 hover:border-purple-400 rounded-xl p-4 transition-all flex flex-col justify-between">
            <div>
              <span className="font-mono text-sm font-bold text-purple-400 flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4" /> SOLO PLAYGROUND
              </span>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed font-sans">
                Practice algorithms offline at your own pace.
              </p>
            </div>
            <button className="w-full py-2 bg-purple-950/40 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white font-mono text-xs font-bold rounded-lg transition-all">
              [ ENTER PLAYGROUND ]
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
