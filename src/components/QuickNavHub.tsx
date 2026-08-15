import React, { useState } from "react";
import { Swords, Users, Play, Activity, Lock } from "lucide-react";

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
  waitingTime,
}) => {
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [joinCode, setJoinCode] = useState("");

  const difficultyColors: Record<string, string> = {
    ANY: "text-slate-300",
    EASY: "text-emerald-400",
    MEDIUM: "text-amber-400",
    HARD: "text-rose-400",
  };

  return (
    <div className="relative bg-[#080a0d] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-rose-950/10 to-transparent pointer-events-none" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-500/70 font-bold tracking-[0.25em] uppercase">
            <Swords className="w-3.5 h-3.5" />
            Combat Operations Hub
          </div>
          <span className="text-[9px] font-mono text-slate-600 tracking-wider">SELECT MODE</span>
        </div>

        {/* ── ACTIVE CARDS ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* 1V1 PVP ARENA — ACTIVE */}
          <div className="relative bg-gradient-to-br from-rose-950/40 to-black/60 border border-rose-500/25 hover:border-rose-500/50 rounded-xl p-4 flex flex-col justify-between transition-all group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-black text-rose-400 flex items-center gap-2">
                  <Swords className="w-4 h-4" /> 1V1 PVP ARENA
                </span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={matchmakingStatus !== "IDLE"}
                  className={`bg-black/60 border border-white/10 text-xs rounded-lg px-2 py-1 font-mono font-bold focus:border-rose-500 focus:outline-none disabled:opacity-50 transition-colors ${difficultyColors[difficulty]}`}
                >
                  {["ANY", "EASY", "MEDIUM", "HARD"].map((d) => (
                    <option key={d} value={d} className="text-slate-300 bg-black">{d}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans mb-4">
                Real-time ranked match against a live opponent. Fastest correct solution wins.
              </p>
            </div>

            {matchmakingStatus === "SEARCHING" ? (
              <button
                onClick={onCancelMatch}
                className="w-full py-2.5 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 font-mono text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 animate-pulse"
              >
                <Activity className="w-3.5 h-3.5" /> SEARCHING... ({waitingTime}s) · ABORT
              </button>
            ) : (
              <button
                onClick={() => onFindMatch(difficulty)}
                disabled={matchmakingStatus !== "IDLE"}
                className="w-full py-2.5 bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-rose-100 font-mono text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]"
              >
                <Play className="w-3.5 h-3.5 fill-rose-400" /> QUEUE FOR BATTLE
              </button>
            )}
          </div>

          {/* CUSTOM ROOM HUB — ACTIVE */}
          <div className="relative bg-gradient-to-br from-amber-950/30 to-black/60 border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-4 flex flex-col justify-between transition-all group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <div>
              <span className="font-mono text-sm font-black text-amber-400 flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" /> CUSTOM ROOM HUB
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans mb-4">
                Host a private lobby or enter a room code to join an existing session.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCreateCustomRoom}
                className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-400 text-amber-300 font-mono text-[11px] font-black rounded-lg transition-all"
              >
                + HOST
              </button>
              <div className="flex gap-1 flex-1">
                <input
                  type="text"
                  placeholder="CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 min-w-0 bg-black/60 border border-white/10 text-slate-200 text-xs px-2 py-1 font-mono rounded-lg text-center uppercase focus:border-amber-500 focus:outline-none tracking-widest"
                />
                <button
                  onClick={() => joinCode && onJoinCustomRoom(joinCode)}
                  className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-black rounded-lg transition-all"
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── LOCKED / COMING SOON ROW ─────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "SQUAD CHALLENGE", desc: "Challenge active friends directly in real-time.", color: "emerald" },
            { label: "SOLO PLAYGROUND", desc: "Offline algorithm sandbox practice mode.", color: "purple" },
          ].map((item) => (
            <div
              key={item.label}
              className="relative bg-black/40 border border-white/[0.04] rounded-xl p-4 overflow-hidden"
            >
              {/* LOCK OVERLAY */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 rounded-xl">
                <Lock className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[9px] font-mono text-slate-600 font-bold tracking-widest">IN PROGRESS</span>
              </div>
              <span className="font-mono text-xs font-black text-slate-600">{item.label}</span>
              <p className="text-[10px] text-slate-700 mt-1 font-sans">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
