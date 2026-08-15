import { useAuth } from "../context/authContext";
import BentoGrid from "../features/home/components/BentoGrid";
import HeroSection from "../features/home/components/HeroSection";
import StickyFeatureShowcase from "../features/home/components/StickyFeatureShowcase";
import { ProfileScoreCard } from "../components/profileScoreCard";
import { QuickNavHub } from "../components/QuickNavHub";
import { HistoryLedgerSection } from "../components/HistoryLedgerSection";
import { ProblemTableSection } from "../components/ProblemTableSection";
import { PlaygroundShowcase } from "../components/PlaygroundShowcase";
import { Footer } from "../components/Footer";
import { useSocket } from "../context/socketContext";
import { useState, useEffect } from "react";
import { api } from "../config/api";

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    findMatch,
    socket,
    matchmakingStatus,
    activeBattleRoom,
    isConnected,
    cancelMatch,
    createCustomRoom,
    joinCustomRoom,
    startCustomMatch,
    leaveCustomMatch,
    customLobby,
    waitingTime
  } = useSocket();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);

  // Custom Room Form & Modal States
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [roomMaxUsers, setRoomMaxUsers] = useState<number>(2);
  const [roomPassword, setRoomPassword] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>("");
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
    const loadDashboardData = async () => {
      try {
        const [profRes, probRes] = await Promise.all([
          api.get("/profile").catch(() => null),
          api.get("/problem/all").catch(() => null)
        ]);

        if (profRes?.data?.data) {
          const u = profRes.data.data;
          setProfile(u);
          setStats({
            totalScore: u.score || 1000,
            winRate: u.winRate || 0,
            totalMatches: u.totalMatches || 0,
            wins: u.wins || 0,
            losses: u.losses || 0
          });
          setHistory(u.performances || u.history || []);
        }

        if (probRes?.data?.problems) {
          setProblems(probRes.data.problems);
        }
      } catch (err) {
        console.error("Failed to load dashboard telemetry:", err);
      }
    };

    loadDashboardData();
  }, [isAuthenticated]);

  return (
    <section className="flex h-full w-full flex-col gap-8 items-center px-4 pt-24 sm:px-6 max-w-7xl mx-auto">
      {isAuthenticated || profile || user ? (
        <>
          {/* ============================================================ */}
          {/* LOGGED IN USER: WIREFRAME COMMAND CENTER DASHBOARD           */}
          {/* ============================================================ */}

          {/* 1. TOP GRID: PROFILE WITH SCORE (LEFT) & QUICK NAV'S (RIGHT) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ProfileScoreCard
                profile={profile || user}
                stats={stats}
                activeBattleRoom={activeBattleRoom}
              />
            </div>
            <div className="md:col-span-2">
              <QuickNavHub
                onFindMatch={(diff) => findMatch(diff)}
                matchmakingStatus={matchmakingStatus}
                onCancelMatch={cancelMatch}
                onCreateCustomRoom={() => setShowCreateModal(true)}
                onJoinCustomRoom={(code) => {
                  setJoinCode(code);
                  setShowJoinModal(true);
                }}
                waitingTime={waitingTime}
              />
            </div>
          </div>

          {/* 2. MIDDLE SECTION: HISTORY LEDGER */}
          <HistoryLedgerSection
            history={history}
            currentUserId={profile?.id || user?.id || ""}
          />

          {/* 3. MIDDLE LOWER SECTION: PROBLEM'S TABLE WITH PAGINATION */}
          <ProblemTableSection problems={problems} />

          {/* 4. LOWER SECTION: UPCOMING FEATURES / PLAYGROUND */}
          <PlaygroundShowcase />
        </>
      ) : (
        <>
          <HeroSection />
          <StickyFeatureShowcase />
          <BentoGrid />
        </>
      )}
      {/* CANCEL SEARCH BUTTON */}
      {/* MATCHMAKING SEARCH MODAL */}
      {matchmakingStatus === "SEARCHING" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center p-12 bg-[#0b0c0e] border border-cyan-500/30 rounded-2xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-white tracking-widest mb-6 animate-pulse">
              FINDING OPPONENT...
            </h2>

            <div className="w-full bg-black/50 p-6 rounded-lg border border-slate-800 mb-8">
              <p className="text-slate-400 text-xs mb-4 uppercase tracking-widest">
                Searching Difficulties:
              </p>
              <div className="flex gap-3 mb-6">
                {searchState && searchState.levels.map((lvl) => (
                  <span
                    key={lvl}
                    className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-xs font-bold"
                  >
                    {lvl}
                  </span>
                ))}
              </div>

                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>WAITING: {waitingTime}s</span>
                  <span>
                    {waitingTime < 10
                      ? "Expanding search in " + (10 - waitingTime) + "s..."
                      : waitingTime < 20
                        ? "Expanding search in " + (20 - waitingTime) + "s..."
                        : "Search fully expanded"}
                  </span>
                </div>
            </div>

            <button
              onClick={cancelMatch}
              className="w-full py-3 border border-rose-500/50 text-rose-400 hover:bg-rose-950/40 rounded-lg tracking-widest font-bold"
            >
              [ CANCEL SEARCH ]
            </button>
          </div>
        </div>
      )}



      {/* ----------------------------- */}
      {/* CREATE ROOM MODAL */}
      {/* ----------------------------- */}
      {showCreateModal && !customLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col p-8 bg-[#0b0c0e] border border-violet-500/30 rounded-2xl w-full max-w-md">
            <h2 className="font-mono text-2xl font-bold tracking-[0.2em] text-violet-400 mb-6">
              CONFIGURE ROOM
            </h2>

            <label className="text-xs font-mono text-violet-300/70 mb-2">
              MAX PLAYERS
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={roomMaxUsers}
              onChange={(e) => setRoomMaxUsers(Number(e.target.value))}
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-4 focus:border-violet-500 outline-none"
            />

            <label className="text-xs font-mono text-violet-300/70 mb-2">
              PASSWORD (OPTIONAL)
            </label>
            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Leave blank for open room"
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-8 focus:border-violet-500 outline-none"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-1/2 py-3 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  createCustomRoom(roomMaxUsers, roomPassword, difficulty);
                  setShowCreateModal(false);
                }}
                className="w-1/2 py-3 bg-violet-950/40 border border-violet-500/50 hover:bg-violet-900 text-violet-300 font-mono text-xs font-bold tracking-widest rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* JOIN ROOM MODAL */}
      {/* ----------------------------- */}
      {showJoinModal && !customLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col p-8 bg-[#0b0c0e] border border-orange-500/30 rounded-2xl w-full max-w-md">
            <h2 className="font-mono text-2xl font-bold tracking-[0.2em] text-orange-400 mb-6">
              JOIN ROOM
            </h2>

            <label className="text-xs font-mono text-orange-300/70 mb-2">
              ROOM CODE
            </label>
            <input
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. A7X9B2"
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-4 focus:border-orange-500 outline-none uppercase tracking-widest"
            />

            <label className="text-xs font-mono text-orange-300/70 mb-2">
              PASSWORD (IF REQUIRED)
            </label>
            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              className="bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono mb-8 focus:border-orange-500 outline-none"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-1/2 py-3 border border-slate-600 text-slate-400 font-mono text-xs tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  joinCustomRoom(joinCode, roomPassword);
                  setShowJoinModal(false);
                }}
                className="w-1/2 py-3 bg-orange-950/40 border border-orange-500/50 hover:bg-orange-900 text-orange-300 font-mono text-xs font-bold tracking-widest rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- */}
      {/* ACTIVE WAITING LOBBY */}
      {/* ----------------------------- */}
      {customLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
          <div className="flex flex-col items-center p-12 bg-[#060709] border-2 border-violet-500/50 rounded-2xl shadow-[0_0_50px_rgba(139,92,246,0.15)] max-w-lg w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

            <p className="text-violet-400/70 text-xs tracking-[0.3em] mb-2 relative z-10 font-mono uppercase">
              LOBBY CODE
            </p>
            <h1 className="font-mono text-6xl font-black tracking-[0.2em] text-white mb-8 relative z-10 drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              {customLobby.roomCode}
            </h1>

            <div className="w-full bg-black/40 border border-violet-500/20 rounded-xl p-4 mb-10 relative z-10 flex flex-col items-center gap-2">
              <p className="font-mono text-sm text-slate-400 uppercase tracking-widest">
                Players Connected
              </p>
              <p className="font-mono text-3xl font-bold text-violet-300">
                {customLobby.currentUsers}{" "}
                <span className="text-violet-500/50 text-xl">
                  / {customLobby.maxUsers}
                </span>
              </p>
            </div>

            <div className="flex gap-4 w-full relative z-10">
              <button
                onClick={leaveCustomMatch}
                className="w-1/3 py-4 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 font-mono text-xs font-bold tracking-widest rounded-xl transition-all"
              >
                LEAVE
              </button>

              {customLobby.isHost ? (
                <button
                  onClick={startCustomMatch}
                  className="w-2/3 py-4 bg-violet-600 hover:bg-violet-500 text-white font-mono text-sm font-bold tracking-widest rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all"
                >
                  START MATCH
                </button>
              ) : (
                <button
                  disabled
                  className="w-2/3 py-4 bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs font-bold tracking-widest rounded-xl"
                >
                  WAITING FOR HOST...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Home;
