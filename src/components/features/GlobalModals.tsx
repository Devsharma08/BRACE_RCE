import { useSocket } from "../../context/SocketContext";
import { useSocketInvalidation } from "../../hooks/useSocketInvalidation";
import { Swords } from "lucide-react";

export default function GlobalModals() {
  const {
    matchmakingStatus,
    pendingOpponent,
    declineMatch,
    acceptMatch,
    isClicked,
    incomingChallenge,
    acceptChallenge,
    declineChallenge,
  } = useSocket();
  // Global `friends:update` invalidation. The Friends workspace registers its
  // own listener, but a request can be ACCEPTED from the bell popover on ANY
  // page (NotificationCenter) — without a global listener the shared
  // ["friends-list"] (presence, owned by SocketContext), ["friend-requests"],
  // ["blocked-users"] and ["friend-discover"] caches stayed stale, so the newly
  // accepted friend only appeared after a manual refresh. Layout mounts this
  // component on every route, so the friend graph now updates in realtime no
  // matter where the accept happens.
  useSocketInvalidation("friends:update", [
    ["friends-list"],
    ["friend-requests"],
    ["blocked-users"],
    ["friend-discover"],
  ]);

  return (
    <>
      {/* ----------------------------- */}
      {/* MATCH ACCEPTANCE MODAL (Matchmaking) */}
      {/* ----------------------------- */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-hover p-4 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center p-8 bg-raised border border-accent-primary/30 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden sm:p-12">
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(0,212,255,0)_0%,rgba(0,212,255,0.1)_100%)] animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-0 border-[40px] border-base rounded-full scale-150" />

            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-success mb-6">
              MATCH FOUND
            </h2>

            {/* Opponent Profile */}
            {pendingOpponent && (
              <div className="flex flex-col items-center mb-8 animate-in fade-in zoom-in duration-500">
                {pendingOpponent.avatarUrl ? (
                  <img
                    src={pendingOpponent.avatarUrl}
                    alt="Opponent"
                    className="w-20 h-20 rounded-full border-2 border-accent-primary mb-3 shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-accent-primary mb-3 shadow-[0_0_15px_rgba(0,212,255,0.4)] bg-surface-hover flex items-center justify-center text-accent-primary font-bold text-2xl">
                    {pendingOpponent.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span className="text-xl font-bold text-fg">
                  {pendingOpponent.username}
                </span>
                <span className="text-sm text-accent-primary">
                  "{pendingOpponent.bio}"
                </span>
              </div>
            )}

            <p className="text-accent-primary/70 text-xs tracking-widest mb-10 relative z-10 font-mono">
              AWAITING OPPONENT...
            </p>

            <div className="flex gap-4 w-full relative z-10">
              <button
                disabled={isClicked}
                onClick={() => {
                  declineMatch();}}
                className="w-1/2 py-4 bg-accent-danger/10 hover:bg-accent-danger/30 border border-accent-danger/50 text-accent-danger font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                DECLINE
              </button>
              <button
                disabled={isClicked}
                onClick={() => {
                  acceptMatch();
                  }}
                className="w-1/2 py-4 bg-accent-primary/10 hover:bg-accent-primary/30 border border-accent-primary/80 hover:border-accent-primary text-accent-primary font-mono font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)]"
              >
                ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* INCOMING CHALLENGE OVERLAY (Direct Friends) */}
      {/* ----------------------------- */}
      {incomingChallenge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-hover backdrop-blur-sm">
          <div className="p-8 border-2 border-accent-danger/50 bg-raised flex flex-col items-center rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.2)]">
            <Swords className="w-16 h-16 text-accent-danger animate-bounce mb-4" />
            <h2 className="text-accent-danger font-mono text-xl font-bold mb-2">
              CHALLENGE RECEIVED
            </h2>
            <p className="text-subtle font-mono text-xs tracking-widest mb-1">
              FROM // {(incomingChallenge.challengerUsername ?? "FRIEND").toUpperCase()}
            </p>
            <p className="text-[11px] font-mono tracking-widest mb-6 px-3 py-1.5 border border-accent-danger/30 bg-accent-danger/10 text-accent-danger">
              {incomingChallenge.mode === "CUSTOM"
                ? `CUSTOM // ${incomingChallenge.problemName ?? incomingChallenge.problemId ?? "ARENA"}`
                : `RANDOM // ${incomingChallenge.difficulty ?? "MEDIUM"}`}
            </p>
            <div className="flex gap-4">
              <button
                disabled={isClicked}
                onClick={() => declineChallenge(incomingChallenge.challengerId)}
                className="px-6 py-3 border border-subtle-line text-subtle font-mono text-sm hover:bg-surface rounded-lg"
              >
                DECLINE
              </button>
              <button
                disabled={isClicked}
                onClick={() => acceptChallenge(incomingChallenge.challengerId, {
                  problemId: incomingChallenge.problemId,
                  mode: incomingChallenge.mode,
                  difficulty: incomingChallenge.difficulty,
                })}
                className="px-6 py-3 bg-accent-danger hover:bg-accent-danger text-fg font-mono font-bold tracking-widest rounded-lg shadow-[0_0_20px_rgba(255,59,92,0.4)]"
              >
                ACCEPT BATTLE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
