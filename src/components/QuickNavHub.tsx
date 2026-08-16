import React, { useState } from "react";
import { Swords, Play, Activity, Sparkles } from "lucide-react";

interface QuickNavHubProps {
  onFindMatch: (difficulty: string) => void;
  matchmakingStatus: string;
  onCancelMatch: () => void;
  onCreateCustomRoom: () => void;
  onJoinCustomRoom: (code: string) => void;
  waitingTime: number;
}

const DIFFICULTIES = ["ANY", "EASY", "MEDIUM", "HARD"] as const;

const diffColors: Record<string, { text: string; border: string; bg: string }> = {
  ANY:    { text: "text-slate-200",  border: "border-slate-400/40",  bg: "bg-slate-900/60" },
  EASY:   { text: "text-emerald-400", border: "border-emerald-500/50", bg: "bg-emerald-950/40" },
  MEDIUM: { text: "text-amber-400",  border: "border-amber-500/50",  bg: "bg-amber-950/40" },
  HARD:   { text: "text-rose-400",   border: "border-rose-500/50",   bg: "bg-rose-950/40" },
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
    <div className="relative border border-rose-500/25 bg-gradient-to-b from-rose-950/15 via-slate-950/60 to-black flex flex-col h-full shadow-lg shadow-rose-950/10 font-mono">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-rose-500" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rose-500" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-rose-500" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-rose-500" />

      <div className="p-6 flex flex-col gap-6 flex-1">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] text-rose-400 font-bold tracking-[0.25em] uppercase">
            <Swords className="w-3.5 h-3.5 text-rose-500" /> PVP BATTLE ARENA
          </span>
          {isSearching ? (
            <span className="text-[9px] text-amber-300 border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 font-black tracking-widest animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> IN QUEUE ({waitingTime}s)
            </span>
          ) : (
            <span className="text-[9px] text-emerald-400 border border-emerald-500/30 bg-emerald-950/20 px-2 py-0.5 font-bold tracking-widest">
              SYSTEM ONLINE
            </span>
          )}
        </div>

        {/* HEADLINE */}
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none flex items-center gap-2">
            1V1 MATCHMAKING QUEUE
          </h2>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed uppercase tracking-wide">
            Ranked competitive coding battle against an online opponent. First to complete and pass test cases takes victory.
          </p>
        </div>

        {/* DIFFICULTY SELECTOR */}
        <div>
          <p className="text-[9px] text-slate-400 tracking-[0.2em] uppercase mb-2.5 font-bold">SELECT TARGET BRACKET</p>
          <div className="grid grid-cols-4 gap-2">
            {DIFFICULTIES.map((d) => {
              const active = difficulty === d;
              const c = diffColors[d];
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={isSearching}
                  className={`py-2.5 text-[11px] font-black tracking-widest uppercase border transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                    active
                      ? `${c.text} ${c.border} ${c.bg} shadow-md`
                      : "text-slate-500 border-white/10 bg-black/40 hover:border-white/20 hover:text-slate-300"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DIFF INFO */}
        <div className="border border-rose-500/20 bg-slate-950/70 p-4 flex items-center justify-between shadow-inner">
          <div>
            <p className="text-xs text-slate-300 uppercase tracking-widest font-bold">SELECTED BRACKET</p>
            <p className={`text-base font-black uppercase tracking-widest mt-0.5 ${dc.text}`}>{difficulty}</p>
          </div>
          {!isSearching ? (
            <span className="text-xs font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> READY TO MATCH
            </span>
          ) : (
            <div className="text-right">
              <p className="text-xs text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> IN QUEUE
              </p>
              <p className="text-base font-black text-white">{waitingTime}s</p>
            </div>
          )}
        </div>

        {/* SPACER */}
        <div className="flex-1" />

        {/* ACTION BUTTON */}
        {isSearching ? (
          <button
            onClick={onCancelMatch}
            className="w-full py-4 border border-rose-500/60 bg-rose-950/40 hover:bg-rose-950/70 text-rose-200 text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50"
          >
            <Activity className="w-4 h-4 animate-pulse text-rose-400" /> CANCEL MATCHMAKING QUEUE ({waitingTime}s)
          </button>
        ) : (
          <button
            onClick={() => onFindMatch(difficulty)}
            disabled={matchmakingStatus !== "IDLE"}
            className="w-full py-4 border border-rose-500/60 bg-rose-950/40 hover:bg-rose-950/70 hover:border-rose-400 text-rose-200 hover:text-white text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <Play className="w-4 h-4 fill-current text-rose-400 group-hover:scale-110 transition-transform" /> ENTER 1V1 MATCHMAKING BATTLE
          </button>
        )}
      </div>
    </div>
  );
};
