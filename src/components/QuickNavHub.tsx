import React, { useState } from "react";
import { Swords, Play, Activity } from "lucide-react";

interface QuickNavHubProps {
  onFindMatch: (difficulty: string) => void;
  matchmakingStatus: string;
  onCancelMatch: () => void;
  onCreateCustomRoom: () => void;
  onJoinCustomRoom: (code: string) => void;
  waitingTime: number;
}

const DIFFICULTIES = ["ANY", "EASY", "MEDIUM", "HARD"] as const;

const diffColors: Record<string, { text: string; border: string; badge: string }> = {
  ANY:    { text: "text-slate-300",  border: "border-slate-500/30",  badge: "border-slate-500/25 text-slate-400" },
  EASY:   { text: "text-emerald-400", border: "border-emerald-500/30", badge: "border-emerald-500/25 text-emerald-400" },
  MEDIUM: { text: "text-amber-400",  border: "border-amber-500/30",  badge: "border-amber-500/25 text-amber-400" },
  HARD:   { text: "text-rose-400",   border: "border-rose-500/30",   badge: "border-rose-500/25 text-rose-400" },
};

export const QuickNavHub: React.FC<QuickNavHubProps> = ({
  onFindMatch,
  matchmakingStatus,
  onCancelMatch,
  waitingTime,
}) => {
  const [difficulty, setDifficulty] = useState<"ANY" | "EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const dc = diffColors[difficulty];
  const isSearching = matchmakingStatus === "SEARCHING";

  return (
    <div className="relative border border-white/5 bg-black/40 flex flex-col h-full">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-rose-500/25" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-rose-500/25" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-rose-500/25" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-rose-500/25" />

      <div className="p-6 flex flex-col gap-6 flex-1">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[9px] text-rose-400/80 font-bold tracking-[0.25em] uppercase">
            <Swords className="w-3 h-3" /> PVP ARENA
          </span>
          {isSearching && (
            <span className="text-[9px] text-amber-400 border border-amber-500/30 bg-amber-950/10 px-2 py-0.5 font-bold tracking-widest animate-pulse">
              SEARCHING
            </span>
          )}
        </div>

        {/* HEADLINE */}
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">
            1V1 BATTLE QUEUE
          </h2>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed uppercase tracking-wide">
            Ranked real-time match against a live opponent. Fastest accepted solution wins the round.
          </p>
        </div>

        {/* DIFFICULTY SELECTOR */}
        <div>
          <p className="text-[9px] text-slate-600 tracking-[0.2em] uppercase mb-2 font-bold">SELECT DIFFICULTY</p>
          <div className="grid grid-cols-4 gap-1.5">
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              const c = diffColors[d];
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={isSearching}
                  className={`py-2 text-[10px] font-black tracking-widest uppercase border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? `${c.text} ${c.border} bg-black/60`
                      : "text-slate-600 border-white/5 hover:border-white/15 hover:text-slate-400"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DIFF INFO */}
        <div className="border border-white/5 bg-black/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-widest">SELECTED MODE</p>
            <p className={`text-sm font-black uppercase tracking-widest mt-0.5 ${dc.text}`}>{difficulty}</p>
          </div>
          {!isSearching ? (
            <span className="text-[9px] text-slate-600 border border-white/5 px-2 py-1 uppercase tracking-widest">IDLE</span>
          ) : (
            <div className="text-right">
              <p className="text-[9px] text-amber-400 uppercase tracking-widest">IN QUEUE</p>
              <p className="text-sm font-black text-white">{waitingTime}s</p>
            </div>
          )}
        </div>

        {/* SPACER */}
        <div className="flex-1" />

        {/* ACTION */}
        {isSearching ? (
          <button
            onClick={onCancelMatch}
            className="w-full py-3 border border-rose-500/40 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 font-mono text-[11px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" /> CANCEL SEARCH ({waitingTime}s)
          </button>
        ) : (
          <button
            onClick={() => onFindMatch(difficulty)}
            disabled={matchmakingStatus !== "IDLE"}
            className="w-full py-3 border border-rose-500/30 bg-rose-950/10 hover:bg-rose-950/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-300 font-mono text-[11px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5 fill-rose-400" /> QUEUE FOR BATTLE
          </button>
        )}
      </div>
    </div>
  );
};
