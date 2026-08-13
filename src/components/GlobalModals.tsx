import { useSocket } from "../context/socketContext";
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

  return (
    <>
      {/* ----------------------------- */}
      {/* MATCH ACCEPTANCE MODAL (Matchmaking) */}
      {/* ----------------------------- */}
      {matchmakingStatus === "FOUND_PENDING" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center p-12 bg-[#0b0c0e] border border-cyan-500/30 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(34,211,238,0)_0%,rgba(34,211,238,0.1)_100%)] animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-0 border-[40px] border-[#0b0c0e] rounded-full scale-150" />

            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-6">
              MATCH FOUND
            </h2>

            {/* Opponent Profile */}
            {pendingOpponent && (
              <div className="flex flex-col items-center mb-8 animate-in fade-in zoom-in duration-500">
                <img
                  src={pendingOpponent.avatarUrl}
                  alt="Opponent"
                  className="w-20 h-20 rounded-full border-2 border-cyan-500 mb-3 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                />
                <span className="text-xl font-bold text-white">
                  {pendingOpponent.username}
                </span>
                <span className="text-sm text-cyan-400">
                  "{pendingOpponent.bio}"
                </span>
              </div>
            )}

            <p className="text-cyan-400/70 text-xs tracking-widest mb-10 relative z-10 font-mono">
              AWAITING OPPONENT...
            </p>

            <div className="flex gap-4 w-full relative z-10">
              <button
                disabled={isClicked}
                onClick={declineMatch}
                className="w-1/2 py-4 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-mono font-bold tracking-widest rounded-lg transition-all"
              >
                [ DECLINE ]
              </button>
              <button
                disabled={isClicked}
                onClick={acceptMatch}
                className="w-1/2 py-4 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/80 hover:border-cyan-400 text-cyan-100 font-mono font-bold tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                [ ACCEPT ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* INCOMING CHALLENGE OVERLAY (Direct Friends) */}
      {/* ----------------------------- */}
      {incomingChallenge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="p-8 border-2 border-rose-500/50 bg-[#0b0c0e] flex flex-col items-center rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.2)]">
            <Swords className="w-16 h-16 text-rose-500 animate-bounce mb-4" />
            <h2 className="text-rose-400 font-mono text-xl font-bold mb-6">
              CHALLENGE RECEIVED
            </h2>
            <div className="flex gap-4">
              <button
                disabled={isClicked}
                onClick={() => declineChallenge(incomingChallenge.challengerId)}
                className="px-6 py-3 border border-slate-600 text-slate-400 font-mono text-sm hover:bg-slate-800 rounded-lg"
              >
                DECLINE
              </button>
              <button
                disabled={isClicked}
                onClick={() => acceptChallenge(incomingChallenge.challengerId)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold tracking-widest rounded-lg shadow-[0_0_20px_rgba(225,29,72,0.4)]"
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
