import React from "react";
import { Shield, Users, Clock, Play, Lock, UserCheck, X, AlertTriangle, Loader2 } from "lucide-react";

interface StagingParticipant {
  id?: string;
  userId: string;
  status: string;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

interface BattleStagingRoomProps {
  roomName: string;
  roomCode?: string;
  hostName: string;
  isHost: boolean;
  maxUsers: number;
  participants: StagingParticipant[];
  myUserId: string;
  totalTimeLimitMs?: number | null;
  closesAt?: string | null;
  onStart: () => void;
  onRejectParticipant?: (userId: string) => void;
  onKickParticipant?: (userId: string) => void;
  onLeave: () => void;
}

export const BattleStagingRoom: React.FC<BattleStagingRoomProps> = ({
  roomName,
  roomCode,
  hostName,
  isHost,
  maxUsers,
  participants,
  myUserId,
  totalTimeLimitMs,
  closesAt,
  onStart,
  onRejectParticipant,
  onKickParticipant,
  onLeave,
}) => {
  const timeLimitMinutes = totalTimeLimitMs ? Math.round(totalTimeLimitMs / 60000) : 30;

  return (
    <div className="flex h-screen w-screen flex-col bg-base text-fg font-sans select-none overflow-hidden">
      {/* ── TOP HEADER ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-subtle-line bg-raised px-6 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-accent-primary font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-accent-primary animate-pulse" />
            <span>STAGING PROTOCOL</span>
          </div>
          <span className="text-subtle font-mono text-[10px] border border-line-low bg-base/60 px-2 py-0.5 rounded">
            ROOM #{roomCode || "SECURE"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-faint text-[11px]">
            <Clock className="w-3.5 h-3.5 text-accent-warning" />
            <span>LIMIT: {timeLimitMinutes} MINS</span>
          </div>
          <button
            onClick={onLeave}
            className="border border-subtle-line bg-surface-hover/50 hover:bg-surface-hover px-3 py-1 rounded text-[11px] font-mono text-subtle hover:text-fg transition-colors"
          >
            EXIT TO LOBBY
          </button>
        </div>
      </header>

      {/* ── MAIN STAGING BODY ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-accent-primary/5 blur-[120px]" />
        </div>

        <div className="w-full max-w-3xl flex flex-col gap-6 relative z-10">
          {/* OPERATION BANNER */}
          <div className="border border-line bg-raised/80 backdrop-blur-md rounded-xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle-line pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-accent-primary uppercase">
                  OPERATION CODENAME
                </span>
                <h1 className="text-2xl font-bold font-mono tracking-wide text-fg mt-1">
                  {roomName || "Untitled Operation"}
                </h1>
                <p className="text-xs text-subtle font-mono mt-1">
                  Host: <span className="text-fg font-semibold">{hostName}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end font-mono">
                  <span className="text-[10px] text-faint uppercase">CAPACITY</span>
                  <span className="text-sm font-bold text-accent-primary">
                    {participants.length} / {maxUsers} OPERATIVES
                  </span>
                </div>
              </div>
            </div>

            {/* STATUS DISPLAY */}
            <div className="mt-5 flex items-center justify-between gap-4 bg-base/50 border border-line-low rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-ping" />
                <div>
                  <h4 className="text-xs font-mono font-bold tracking-wider text-accent-warning uppercase">
                    AWAITING MISSION LAUNCH
                  </h4>
                  <p className="text-[11px] text-faint font-sans mt-0.5">
                    {isHost
                      ? "You are the moderator. Review confirmed operatives and initiate when ready."
                      : "The system is locked. The editor and problem briefing will unlock once the moderator starts the match."}
                  </p>
                </div>
              </div>

              {isHost && (
                <button
                  onClick={onStart}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-primary text-ink font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent-primary/90 transition-all shadow-lg shadow-accent-primary/20 shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" /> START OPERATION
                </button>
              )}
            </div>
          </div>

          {/* OPERATIVES ROSTER */}
          <div className="border border-line bg-raised/80 backdrop-blur-md rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-faint flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-primary" /> Confirmed Operatives ({participants.length})
              </h3>
              <span className="text-[10px] font-mono text-faint">
                {isHost ? "MODERATOR PRIVILEGES ACTIVE" : "SYNCHRONIZED"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {participants.length === 0 ? (
                <div className="col-span-2 py-8 flex flex-col items-center justify-center text-faint gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
                  <span className="text-xs font-mono">WAITING FOR OPERATIVES TO CONNECT...</span>
                </div>
              ) : (
                participants.map((p) => {
                  const pid = p.user?.id || p.userId;
                  const uname = p.user?.username || "Unknown Operative";
                  const isMe = pid === myUserId;
                  const isThisHost = pid === myUserId && isHost;

                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between p-3 rounded-lg border border-line-low bg-base/40 hover:border-line transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-xs font-mono font-bold text-fg shrink-0">
                          {uname[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-semibold text-fg truncate flex items-center gap-1.5">
                            {uname}
                            {isMe && <span className="text-[9px] text-accent-primary">(YOU)</span>}
                          </p>
                          <span className="text-[10px] font-mono text-accent-success flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" /> READY
                          </span>
                        </div>
                      </div>

                      {/* Moderator Controls */}
                      {isHost && !isThisHost && (
                        <div className="flex items-center gap-1">
                          {onRejectParticipant && (
                            <button
                              onClick={() => onRejectParticipant(pid)}
                              title={`Reject ${uname} (returns to lobby)`}
                              className="px-2 py-1 rounded border border-subtle-line bg-surface-hover/40 text-subtle hover:text-accent-danger hover:border-accent-danger/40 text-[10px] font-mono transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          {onKickParticipant && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Kick & block ${uname} from this event permanently?`)) {
                                  onKickParticipant(pid);
                                }
                              }}
                              title={`Kick & block ${uname}`}
                              className="px-2 py-1 rounded border border-accent-danger/40 bg-accent-danger/10 text-accent-danger hover:bg-accent-danger/20 text-[10px] font-mono font-bold transition-colors"
                            >
                              Kick & Block
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RULES & BRIEFING REMINDER */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-line-low bg-base/30 text-faint text-[11px] font-mono">
            <Lock className="w-4 h-4 text-subtle shrink-0 mt-0.5" />
            <div>
              <p className="text-subtle font-semibold mb-0.5">SECURITY PROTOCOL ENGAGED</p>
              Problem specifications, test suites, and Monaco IDE are locked until operation launch to preserve integrity. Tab-switching or focus loss during combat incurs automatic scoring penalties.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
