import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { GlobalTimer } from "../../../components/common/GlobalTimer";

export function SpectateView({
  room,
  playerProgress,
  battleState,
  onJoin,
}: {
  room: any;
  playerProgress: Record<
    string,
    { status: string; progress: number; linesWritten?: number }
  >;
  battleState: any;
  onJoin: () => void;
}) {
  const navigate = useNavigate();
  const participants = room?.performances || [];
  return (
    <div className="min-h-screen bg-void text-fg font-mono flex flex-col items-center justify-center p-8 relative">
      {/* bg grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent-danger animate-pulse" />
              <span className="text-[10px] text-accent-danger/70 tracking-[0.3em] uppercase">
                LIVE SPECTATE MODE
              </span>
            </div>
            <h1 className="text-2xl font-black text-fg tracking-widest flex items-center gap-3">
              <Eye className="w-6 h-6 text-accent-danger" />
              {room?.name || "LIVE MATCH"}
            </h1>
            <p className="text-xs text-faint mt-1 tracking-wider">
              CODE: {room?.roomCode}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onJoin}
              className="text-xs font-bold tracking-widest border border-accent-primary/40 bg-accent-primary/10 text-accent-primary px-4 py-2 rounded-lg hover:bg-accent-primary hover:text-ink transition-all"
            >
              JOIN MATCH
            </button>
            <button
              onClick={() => navigate("/lobby")}
              className="text-xs font-bold tracking-widest border border-subtle-line bg-surface-hover/60 text-subtle px-4 py-2 rounded-lg hover:bg-surface-hover transition-all"
            >
              LOBBY
            </button>
          </div>
        </div>

        {/* Status banner */}
        <div
          className={`w-full py-2.5 px-4 rounded-lg mb-6 flex items-center justify-between text-xs font-bold tracking-widest ${
            battleState?.status === "IN_PROGRESS"
              ? "bg-accent-success/15 border border-accent-success/30 text-accent-success"
              : battleState?.status === "WAITING"
                ? "bg-accent-warning/15 border border-accent-warning/30 text-accent-warning"
                : "bg-surface-hover/60 border border-subtle-line text-subtle"
          }`}
        >
          <span>STATUS: {battleState?.status || "LOADING"}</span>
          {battleState?.startedAt && battleState?.totalDurationMs && (
            <GlobalTimer
              startedAt={battleState.startedAt}
              totalDurationMs={battleState.totalDurationMs}
              variant="compact"
            />
          )}
        </div>

        {/* Participants intel */}
        <div className="bg-void border border-subtle-line rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-subtle-line bg-base/40">
            <p className="text-[10px] text-faint tracking-widest">
              LIVE OPERATIVES ({participants.length})
            </p>
          </div>
          <div className="divide-y divide-subtle-line">
            {participants.length === 0 && (
              <div className="py-12 text-center text-faint text-xs tracking-widest">
                NO OPERATIVES REGISTERED
              </div>
            )}
            {participants.map((p: any) => {
              const uid = p.user?.id || p.userId;
              const intel = playerProgress[uid];
              const prog = intel?.progress ?? 0;
              return (
                <div key={uid} className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={p.user?.avatarUrl || null}
                      alt=""
                      className="w-9 h-9 rounded-full border border-subtle-line"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-mono text-xs text-fg">
                          {p.user?.username || "Operative"}
                        </span>
                        {intel && (
                          <span className="shrink-0 font-mono text-[9px] font-bold text-accent-primary">
                            {prog}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-hover">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            prog >= 100
                              ? "bg-accent-success"
                              : "bg-accent-primary"
                          }`}
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-subtle font-mono text-left">
                    {p.status || "WAITING"} • {intel?.linesWritten ?? 0} lines
                    written
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
