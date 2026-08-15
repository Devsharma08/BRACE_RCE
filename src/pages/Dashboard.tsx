import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useSocket } from "../context/socketContext";
import { ProfileScoreCard } from "../components/profileScoreCard";
import { QuickNavHub } from "../components/QuickNavHub";
import { HistoryLedgerSection } from "../components/HistoryLedgerSection";
import { ProblemTableSection } from "../components/ProblemTableSection";
import { PlaygroundShowcase } from "../components/PlaygroundShowcase";
import { api } from "../config/api";

export const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { findMatch, socket, matchmakingStatus, activeBattleRoom, cancelMatch, waitingTime } = useSocket();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [searchState, setSearchState] = useState<{ levels: string[] } | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onSearchState = (data: any) => {
      setSearchState({ levels: data.allowedDifficulties || [] });
    };
    socket.on("matchmaking_search_state", onSearchState);
    return () => { socket.off("matchmaking_search_state", onSearchState); };
  }, [socket]);

  useEffect(() => {
    if (!isAuthenticated && !user) return;
    const load = async () => {
      try {
        const [profRes, probRes] = await Promise.all([
          api.get("/profile").catch(() => null),
          api.get("/problem/all").catch(() => null),
        ]);
        if (profRes?.data?.data) {
          const u = profRes.data.data;
          setProfile(u);
          setStats({ totalScore: u.score || 0, winRate: u.winRate || 0, totalMatches: u.totalMatches || 0, wins: u.wins || 0, losses: u.losses || 0 });
          setHistory(u.performances || u.history || []);
        }
        if (probRes?.data?.problems) setProblems(probRes.data.problems);
      } catch (e) {
        console.error("Dashboard load error:", e);
      }
    };
    load();
  }, [isAuthenticated, user]);

  if (!isLoading && !isAuthenticated && !user) return <Navigate to="/signin" replace />;

  return (
    <section className="relative flex flex-col items-center px-4 pt-24 pb-20 sm:px-6 max-w-7xl mx-auto w-full gap-6">
      {/* Blueprint dot grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:14px_14px] -z-10" />

      {/* ── ROW 1: PROFILE + PVP HUB ── */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ProfileScoreCard profile={profile || user} stats={stats} activeBattleRoom={activeBattleRoom} />
        </div>
        <div className="md:col-span-2">
          <QuickNavHub
            onFindMatch={findMatch}
            matchmakingStatus={matchmakingStatus}
            onCancelMatch={cancelMatch}
            onCreateCustomRoom={() => {}}
            onJoinCustomRoom={() => {}}
            waitingTime={waitingTime}
          />
        </div>
      </div>

      {/* ── ROW 2: BATTLE LEDGER ── */}
      <HistoryLedgerSection history={history} currentUserId={profile?.id || user?.id || ""} />

      {/* ── ROW 3: PROBLEM TABLE ── */}
      <ProblemTableSection problems={problems} />

      {/* ── ROW 4: CODE PLAYGROUND ── */}
      <PlaygroundShowcase />

      {/* ── MATCHMAKING SEARCH OVERLAY ── */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md font-mono">
          <div className="relative border border-white/10 bg-black/80 p-10 max-w-sm w-full mx-4">
            {/* L-bracket corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-rose-500/50" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-rose-500/50" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-rose-500/50" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-rose-500/50" />

            <div className="text-[9px] text-rose-500/70 tracking-[0.3em] uppercase mb-4">SYS // MATCHMAKING</div>
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2 animate-pulse">
              FINDING OPPONENT...
            </h2>
            <p className="text-[11px] text-slate-600 uppercase tracking-wide mb-6">
              Searching across all skill brackets. Queue expands every 10 seconds.
            </p>

            <div className="border border-white/5 bg-black/40 p-4 mb-6">
              <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
                <span className="text-slate-600">WAIT TIME</span>
                <span className="text-white font-black">{waitingTime}s</span>
              </div>
              {searchState?.levels?.length ? (
                <div className="flex gap-2 flex-wrap">
                  {searchState.levels.map((lvl) => (
                    <span key={lvl} className="text-[9px] border border-cyan-500/25 text-cyan-400 px-2 py-0.5 font-bold uppercase">
                      {lvl}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              onClick={cancelMatch}
              className="w-full py-2.5 border border-rose-500/40 text-rose-400 hover:bg-rose-950/20 text-[11px] font-black tracking-widest uppercase transition-all"
            >
              [ ABORT SEARCH ]
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
