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
  ANY:    { text: "text-fg",  border: "border-subtle-line",  bg: "bg-base" },
  EASY:   { text: "text-accent-success", border: "border-accent-success/50", bg: "bg-accent-success/10" },
  MEDIUM: { text: "text-accent-warning",  border: "border-accent-warning/40",  bg: "bg-accent-warning/10" },
  HARD:   { text: "text-accent-danger",   border: "border-accent-danger/50",   bg: "bg-accent-danger/10" },
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
    <div className="relative border border-accent-danger/25 bg-gradient-to-b from-accent-danger/10 via-black/60 to-black flex flex-col h-full shadow-lg shadow-accent-danger/10 font-mono">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent-danger" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent-danger" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent-danger" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent-danger" />

      <div className="p-6 flex flex-col gap-6 flex-1">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] text-accent-danger font-bold tracking-[0.25em] uppercase">
            <Swords className="w-3.5 h-3.5 text-accent-danger" /> PVP BATTLE ARENA
          </span>
          {isSearching ? (
            <span className="text-[9px] text-accent-warning border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 font-black tracking-widest animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> IN QUEUE ({waitingTime}s)
            </span>
          ) : (
            <span className="text-[9px] text-accent-success border border-accent-success/30 bg-accent-success/5 px-2 py-0.5 font-bold tracking-widest">
              SYSTEM ONLINE
            </span>
          )}
        </div>

        {/* HEADLINE */}
        <div>
          <h2 className="text-xl font-black text-fg uppercase tracking-tight leading-none flex items-center gap-2">
            1V1 MATCHMAKING QUEUE
          </h2>
          <p className="text-[11px] text-subtle mt-2 leading-relaxed uppercase tracking-wide">
            Ranked competitive coding battle against an online opponent. First to complete and pass test cases takes victory.
          </p>
        </div>

        {/* DIFFICULTY SELECTOR */}
        <div>
          <p className="text-[9px] text-subtle tracking-[0.2em] uppercase mb-2.5 font-bold">SELECT TARGET BRACKET</p>
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
                      : "text-faint border-subtle-line bg-black/60 hover:border-subtle-line hover:text-subtle"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DIFF INFO */}
        <div className="border border-accent-danger/20 bg-black/70 p-4 flex items-center justify-between shadow-inner">
          <div>
            <p className="text-xs text-subtle uppercase tracking-widest font-bold">SELECTED BRACKET</p>
            <p className={`text-base font-black uppercase tracking-widest mt-0.5 ${dc.text}`}>{difficulty}</p>
          </div>
          {!isSearching ? (
            <span className="text-xs font-bold text-accent-success border border-accent-success/40 bg-accent-success/10 px-3 py-1 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" /> READY TO MATCH
            </span>
          ) : (
            <div className="text-right">
              <p className="text-xs text-accent-warning uppercase tracking-widest font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-warning animate-ping" /> IN QUEUE
              </p>
              <p className="text-base font-black text-fg">{waitingTime}s</p>
            </div>
          )}
        </div>

        {/* SPACER */}
        <div className="flex-1" />

        {/* ACTION BUTTON */}
        {isSearching ? (
          <button
            onClick={onCancelMatch}
            className="w-full py-4 border border-accent-danger/60 bg-accent-danger/10 hover:bg-accent-danger/20 text-accent-danger text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-danger/30"
          >
            <Activity className="w-4 h-4 animate-pulse text-accent-danger" /> CANCEL MATCHMAKING QUEUE ({waitingTime}s)
          </button>
        ) : (
          <button
            onClick={() => onFindMatch(difficulty)}
            disabled={matchmakingStatus !== "IDLE"}
            className="w-full py-4 border border-accent-danger/60 bg-accent-danger/10 hover:bg-accent-danger/20 hover:border-accent-danger text-accent-danger hover:text-fg text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-danger/30 disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <Play className="w-4 h-4 fill-current text-accent-danger group-hover:scale-110 transition-transform" /> ENTER 1V1 MATCHMAKING BATTLE
          </button>
        )}
      </div>
    </div>
  );
};
