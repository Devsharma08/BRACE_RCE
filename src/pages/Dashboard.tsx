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
    return () => {
      socket.off("matchmaking_search_state", onSearchState);
    };
  }, [socket]);

  useEffect(() => {
    if (!isAuthenticated && !user) return;
    const load = async () => {
      try {
        const [profRes, statsRes, probRes] = await Promise.all([
          api.get("/profile").catch(() => null),
          api.get("/profile/stats").catch(() => null),
          api.get("/problem/all").catch(() => null),
        ]);

        if (profRes?.data?.data) {
          setProfile(profRes.data.data);
        }

        if (statsRes?.data?.stats) {
          const st = statsRes.data.stats;
          const calculatedScore = (st.wins * 100) - (st.losses * 20);
          setStats({
            totalScore: Math.max(0, calculatedScore),
            winRate: st.winRate || 0,
            totalMatches: st.totalMatches || 0,
            wins: st.wins || 0,
            losses: st.losses || 0,
            totalTimeMs: st.totalTimeMs || 0,
          });
        }

        if (statsRes?.data?.recentMatches) {
          setHistory(statsRes.data.recentMatches);
        } else if (profRes?.data?.data?.performances) {
          setHistory(profRes.data.data.performances);
        }

        if (probRes?.data?.problems) {
          setProblems(probRes.data.problems);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
      }
    };
    load();
  }, [isAuthenticated, user]);

  if (!isLoading && !isAuthenticated && !user) return <Navigate to="/signin" replace />;

  return (
    <section className="relative flex flex-col items-center px-4 pt-24 pb-20 sm:px-6 max-w-7xl mx-auto w-full gap-10">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] -z-10" />

      {/* ── SECTION 01: PROFILE & MATCHMAKING HUB ── */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
          <span className="text-cyan-400 font-bold">01 //</span> OPERATIVE DOSSIER & PVP MATCHMAKING
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          
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
      </div>

      {/* ── SECTION 02: BATTLE LEDGER ── */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
          <span className="text-emerald-400 font-bold">02 //</span> ENGAGEMENT HISTORY & REVIEWS
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          <HistoryLedgerSection history={history} currentUserId={profile?.id || user?.id || ""} />
        </div>
      </div>

      {/* ── SECTION 03: PROBLEM TABLE ── */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
          <span className="text-purple-400 font-bold">03 //</span> ALGORITHM REPOSITORY & DATABANK
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          <ProblemTableSection problems={problems} />
        </div>
      </div>

      {/* ── SECTION 04: CODE PLAYGROUND ── */}
      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
          <span className="text-amber-400 font-bold">04 //</span> ISOLATED CODE SANDBOX
        </div>
        <div className="relative">
          <div className="absolute top-1/2 right-10 w-80 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
          <PlaygroundShowcase />
        </div>
      </div>

      {/* ── MATCHMAKING SEARCH OVERLAY MODAL ── */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md font-mono">
          <div className="relative border border-rose-500/40 bg-slate-950/90 p-8 max-w-sm w-full mx-4 shadow-2xl shadow-rose-950/50">
            {/* L-bracket corners */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-rose-500" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rose-500" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-rose-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-rose-500" />

            <div className="text-[10px] text-rose-400 font-bold tracking-[0.3em] uppercase mb-4 flex items-center justify-between">
              <span>SYS // MATCHMAKING QUEUE</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>

            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2 animate-pulse">
              SEARCHING OPPONENT...
            </h2>
            <p className="text-[11px] text-slate-400 leading-relaxed uppercase tracking-wide mb-6">
              Scanning active player pools. Skill bracket window expands every 10 seconds.
            </p>

            <div className="border border-rose-500/20 bg-black/60 p-4 mb-6">
              <div className="flex justify-between text-[10px] uppercase tracking-widest mb-3">
                <span className="text-slate-400">SEARCH TIME</span>
                <span className="text-rose-400 font-black">{waitingTime}s</span>
              </div>
              {searchState?.levels?.length ? (
                <div className="flex gap-2 flex-wrap">
                  {searchState.levels.map((lvl) => (
                    <span
                      key={lvl}
                      className="text-[9px] border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 px-2 py-0.5 font-bold uppercase"
                    >
                      {lvl}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-rose-500/50 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 text-[11px] font-black tracking-widest uppercase transition-all shadow-lg hover:shadow-rose-900/40"
            >
              [ ABORT MATCHMAKING ]
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
